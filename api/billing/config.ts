import { getBillingEnvironment } from '../_lib/mercadoPago.js'

type Response = { status: (code: number) => Response; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }

export default function handler(req: { method?: string }, res: Response) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') return res.status(405).json({ message: 'Método no permitido.' })
  const config = getBillingEnvironment()
  if (config.missing.length || !config.credentialsMatch) {
    return res.status(200).json({
      configured: false,
      message: config.credentialsMatch
        ? 'Mercado Pago aún no está configurado en este entorno.'
        : 'Las credenciales públicas y privadas pertenecen a entornos distintos.',
    })
  }
  return res.status(200).json({ configured: true, publicKey: config.publicKey, mode: config.mode })
}

