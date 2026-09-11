import { supabase } from './lib/supabase'
import { dataSource } from './persistence/dataSource'
import { productPlans } from './productPlans'

export type BillingStatus = 'free' | 'pending' | 'active' | 'paused' | 'cancelled' | 'payment_failed'

export type BillingSubscription = {
  plan: 'free' | 'plus'
  status: BillingStatus
  amount: number
  currency: 'CLP'
  nextPaymentDate?: string
  paymentMethod?: string
  provider?: string
}

type BillingConfig = {
  configured: boolean
  publicKey?: string
  mode?: 'test' | 'production'
  message?: string
}

type StoredBillingSession = {
  capability: string
  clientReference: string
}

const SESSION_KEY = 'hazento-billing-session-v1'
const REQUEST_KEY = 'hazento-billing-request-v1'

const readSession = (): StoredBillingSession | null => {
  try {
    const value = localStorage.getItem(SESSION_KEY)
    return value ? JSON.parse(value) as StoredBillingSession : null
  } catch {
    return null
  }
}

const saveSession = (session: StoredBillingSession) => localStorage.setItem(SESSION_KEY, JSON.stringify(session))

const getClientReference = () => {
  const current = readSession()?.clientReference
  if (current) return current
  const created = `demo_${crypto.randomUUID()}`
  saveSession({ capability: '', clientReference: created })
  return created
}

const getIdempotencyKey = () => {
  const current = localStorage.getItem(REQUEST_KEY)
  if (current) return current
  const created = crypto.randomUUID()
  localStorage.setItem(REQUEST_KEY, created)
  return created
}

const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, init)
  const body = await response.json().catch(() => ({})) as { message?: string }
  if (!response.ok) throw new Error(body.message || 'No pudimos comunicarnos con Facturación.')
  return body as T
}

export const billingRepository = {
  getConfig: () => api<BillingConfig>('/api/billing/config'),
  getStoredSession: readSession,
  clearSession: () => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(REQUEST_KEY)
  },
  createSubscription: async (input: { email: string; cardToken: string }) => {
    const result = await api<{ subscription: BillingSubscription; capability: string }>('/api/billing/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        clientReference: getClientReference(),
        idempotencyKey: getIdempotencyKey(),
      }),
    })
    saveSession({ capability: result.capability, clientReference: getClientReference() })
    localStorage.removeItem(REQUEST_KEY)
    return result.subscription
  },
  getSubscription: async () => {
    if (dataSource === 'supabase') {
      if (!supabase) throw new Error('No pudimos conectar con tu workspace.')
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth.user) throw new Error('Tu sesión no está disponible.')
      const { data: member, error: memberError } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', auth.user.id).order('created_at').order('id').limit(1).single()
      if (memberError || !member) throw new Error('No pudimos recuperar tu workspace.')
      const { data: row, error } = await supabase.from('subscriptions').select('*').eq('workspace_id', member.workspace_id).maybeSingle()
      if (error) throw new Error('No pudimos recuperar tu suscripción.')
      if (!row) return null
      if (row.plan !== 'free' && row.plan !== 'plus') throw new Error('No pudimos interpretar tu plan.')
      return { plan: row.plan, status: row.status, amount: productPlans[row.plan].price, currency: 'CLP', provider: row.provider || undefined, nextPaymentDate: row.next_payment_date || undefined, paymentMethod: row.provider === 'manual' ? 'Habilitación manual' : undefined } as BillingSubscription
    }
    const session = readSession()
    if (!session?.capability) return null
    const result = await api<{ subscription: BillingSubscription }>('/api/billing/subscription', {
      headers: { Authorization: `Bearer ${session.capability}` },
    })
    return result.subscription
  },
  updateSubscription: async (action: 'pause' | 'reactivate' | 'cancel') => {
    const session = readSession()
    if (!session?.capability) throw new Error('No encontramos una suscripción para administrar.')
    const result = await api<{ subscription: BillingSubscription }>('/api/billing/subscription', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.capability}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (result.subscription.status === 'cancelled') billingRepository.clearSession()
    return result.subscription
  },
}

