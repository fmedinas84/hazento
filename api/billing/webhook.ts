import { getBillingEnvironment, mercadoPagoRequest, verifyWebhookSignature } from '../_lib/mercadoPago.js'

type Request = { method?: string; body?: { type?: string; data?: { id?: string | number } }; headers: Record<string, string | string[] | undefined>; query?: Record<string, string | string[] | undefined> }
type Response = { status: (code: number) => Response; json: (body: unknown) => void }

const header = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value || ''

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método no permitido.' })
  const config = getBillingEnvironment()
  if (!config.webhookSecret) return res.status(503).json({ message: 'Webhook no configurado.' })

  const dataId = String(header(req.query?.['data.id']) || req.body?.data?.id || '').toLowerCase()
  const signature = header(req.headers['x-signature'])
  const requestId = header(req.headers['x-request-id'])
  if (!dataId || !signature || !requestId || !verifyWebhookSignature(signature, requestId, dataId, config.webhookSecret)) {
    return res.status(401).json({ message: 'Firma inválida.' })
  }

  const type = String(req.body?.type || header(req.query?.type))
  const resources: Record<string, string> = {
    subscription_preapproval: `/preapproval/${encodeURIComponent(dataId)}`,
    subscription_authorized_payment: `/authorized_payments/${encodeURIComponent(dataId)}`,
    payment: `/v1/payments/${encodeURIComponent(dataId)}`,
  }
  const resource = resources[type]
  if (!resource) return res.status(200).json({ received: true, ignored: true })

  try {
    // Authoritative read only: repeated webhooks have no duplicate side effect.
    await mercadoPagoRequest(resource)
    return res.status(200).json({ received: true })
  } catch {
    return res.status(502).json({ message: 'No pudimos confirmar el recurso notificado.' })
  }
}

