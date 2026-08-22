import { createCapability, mercadoPagoRequest, PLUS_AMOUNT, presentSubscription, requireBillingEnvironment, verifyCapability, type MercadoPagoSubscription } from '../_lib/mercadoPago.js'

type Request = { method?: string; body?: Record<string, unknown>; headers: Record<string, string | string[] | undefined> }
type Response = { status: (code: number) => Response; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CLIENT_REFERENCE = /^demo_[0-9a-f-]{36}$/i

const bearer = (headers: Request['headers']) => {
  const value = headers.authorization
  const header = Array.isArray(value) ? value[0] : value
  return header?.startsWith('Bearer ') ? header.slice(7) : ''
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (req.method === 'POST') {
      const email = String(req.body?.email || '').trim().toLowerCase()
      const cardToken = String(req.body?.cardToken || '')
      const idempotencyKey = String(req.body?.idempotencyKey || '')
      const clientReference = String(req.body?.clientReference || '')
      if (!EMAIL.test(email) || !cardToken || !UUID.test(idempotencyKey) || !CLIENT_REFERENCE.test(clientReference)) {
        return res.status(400).json({ message: 'Revisa el email y los datos del medio de pago.' })
      }

      const { appBaseUrl: baseUrl } = requireBillingEnvironment()
      const subscription = await mercadoPagoRequest<MercadoPagoSubscription>('/preapproval', {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Hazento Plus',
          external_reference: clientReference,
          payer_email: email,
          card_token_id: cardToken,
          status: 'authorized',
          back_url: `${baseUrl}/settings?billing=return`,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: PLUS_AMOUNT,
            currency_id: 'CLP',
          },
        }),
      }, idempotencyKey)
      const capability = createCapability({ subscriptionId: subscription.id, clientReference, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })
      return res.status(201).json({ subscription: await presentSubscription(subscription), capability })
    }

    const capability = verifyCapability(bearer(req.headers))
    if (req.method === 'GET') {
      const subscription = await mercadoPagoRequest<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(capability.subscriptionId)}`)
      return res.status(200).json({ subscription: await presentSubscription(subscription) })
    }

    if (req.method === 'PATCH') {
      const action = String(req.body?.action || '')
      const statusByAction: Record<string, string> = { pause: 'paused', reactivate: 'authorized', cancel: 'canceled' }
      const status = statusByAction[action]
      if (!status) return res.status(400).json({ message: 'Acción de suscripción inválida.' })
      const subscription = await mercadoPagoRequest<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(capability.subscriptionId)}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      return res.status(200).json({ subscription: await presentSubscription(subscription) })
    }

    return res.status(405).json({ message: 'Método no permitido.' })
  } catch (error) {
    const status = (error as Error & { status?: number }).status
    const safeStatus = status && status >= 400 && status < 500 ? status : 500
    return res.status(safeStatus).json({ message: safeStatus === 500 ? 'No pudimos completar la operación con Mercado Pago.' : (error as Error).message })
  }
}
