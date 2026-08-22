import { createHmac, timingSafeEqual } from 'node:crypto'

const API_URL = 'https://api.mercadopago.com'
export const PLUS_AMOUNT = 4990

type MercadoPagoSubscription = {
  id: string
  status: string
  next_payment_date?: string
  payment_method_id?: string
  auto_recurring?: { transaction_amount?: number; currency_id?: string }
}

export const getBillingEnvironment = () => {
  const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY?.trim()
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
  const capabilitySecret = process.env.BILLING_CAPABILITY_SECRET?.trim()
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()
  const appBaseUrl = process.env.APP_BASE_URL?.replace(/\/$/, '')
  const missing = [
    !publicKey && 'MERCADOPAGO_PUBLIC_KEY',
    !accessToken && 'MERCADOPAGO_ACCESS_TOKEN',
    !webhookSecret && 'MERCADOPAGO_WEBHOOK_SECRET',
    !capabilitySecret && 'BILLING_CAPABILITY_SECRET',
    !appBaseUrl && 'APP_BASE_URL',
  ].filter(Boolean)
  const publicIsTest = publicKey?.startsWith('TEST-') ?? false
  const tokenIsTest = accessToken?.startsWith('TEST-') ?? false

  return {
    publicKey,
    accessToken,
    capabilitySecret,
    webhookSecret,
    appBaseUrl,
    missing,
    mode: publicIsTest && tokenIsTest ? 'test' as const : 'production' as const,
    credentialsMatch: publicIsTest === tokenIsTest,
  }
}

export const requireBillingEnvironment = () => {
  const config = getBillingEnvironment()
  if (config.missing.length) throw new Error(`Faltan variables de Facturación: ${config.missing.join(', ')}`)
  if (!config.credentialsMatch) throw new Error('La Public Key y el Access Token deben pertenecer al mismo entorno de Mercado Pago.')
  return config as Required<Omit<typeof config, 'webhookSecret' | 'missing'>> & { webhookSecret?: string; missing: never[] }
}

export const mercadoPagoRequest = async <T>(path: string, init: RequestInit = {}, idempotencyKey?: string): Promise<T> => {
  const { accessToken } = requireBillingEnvironment()
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
      ...init.headers,
    },
  })
  const body = await response.json().catch(() => ({})) as { message?: string; error?: string }
  if (!response.ok) {
    const error = new Error(body.message || body.error || 'Mercado Pago rechazó la solicitud.')
    ;(error as Error & { status?: number }).status = response.status
    throw error
  }
  return body as T
}

const mapStatus = (status: string, latestPaymentStatus?: string) => {
  if (latestPaymentStatus === 'rejected' || latestPaymentStatus === 'recycling') return 'payment_failed' as const
  const statuses: Record<string, 'pending' | 'active' | 'paused' | 'cancelled'> = {
    pending: 'pending',
    authorized: 'active',
    paused: 'paused',
    canceled: 'cancelled',
    cancelled: 'cancelled',
  }
  return statuses[status] || 'pending'
}

export const presentSubscription = async (subscription: MercadoPagoSubscription) => {
  let latestPaymentStatus: string | undefined
  try {
    const invoices = await mercadoPagoRequest<{ results?: Array<{ status?: string; payment?: { status?: string } }> }>(`/authorized_payments/search?preapproval_id=${encodeURIComponent(subscription.id)}&limit=1&sort=date_created:desc`)
    const latest = invoices.results?.[0]
    latestPaymentStatus = latest?.payment?.status || latest?.status
  } catch {
    // The preapproval remains authoritative when there are no invoices yet.
  }
  return {
    plan: 'plus' as const,
    status: mapStatus(subscription.status, latestPaymentStatus),
    amount: Number(subscription.auto_recurring?.transaction_amount || PLUS_AMOUNT),
    currency: 'CLP' as const,
    nextPaymentDate: subscription.next_payment_date,
    paymentMethod: subscription.payment_method_id ? 'Tarjeta registrada en Mercado Pago' : undefined,
  }
}

type Capability = { subscriptionId: string; clientReference: string; exp: number }

export const createCapability = (payload: Capability) => {
  const { capabilitySecret } = requireBillingEnvironment()
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', capabilitySecret!).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

export const verifyCapability = (token: string): Capability => {
  const { capabilitySecret } = requireBillingEnvironment()
  const [encoded, received] = token.split('.')
  if (!encoded || !received) throw new Error('Sesión de Facturación inválida.')
  const expected = createHmac('sha256', capabilitySecret!).update(encoded).digest('base64url')
  const valid = received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  if (!valid) throw new Error('Sesión de Facturación inválida.')
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as Capability
  if (!payload.subscriptionId || payload.exp < Date.now()) throw new Error('La sesión de Facturación expiró.')
  return payload
}

export const verifyWebhookSignature = (signatureHeader: string, requestId: string, dataId: string, secret: string) => {
  const parts = Object.fromEntries(signatureHeader.split(',').map(part => part.trim().split('=')))
  if (!parts.ts || !parts.v1) return false
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  return parts.v1.length === expected.length && timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected))
}

export type { MercadoPagoSubscription }
