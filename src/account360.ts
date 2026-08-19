import type { ActivityData, EngagementData, OpportunityData, PaymentData, PrestationData } from './data'

export type Account360Source = {
  prestations: PrestationData[]
  activities: ActivityData[]
  payments: PaymentData[]
  paymentAllocations: Array<{ paymentId: number; prestationId: number; amount: number }>
  opportunities: OpportunityData[]
  engagements: EngagementData[]
}

export type AccountTimelineEvent = {
  id: string
  recordId: number
  type: 'prestation' | 'activity' | 'payment' | 'opportunity' | 'engagement'
  timestamp: number
  date: string
  title: string
  detail: string
  status?: string
  amount?: string
}

export type AccountNextEvent = {
  type: 'prestation' | 'activity'
  recordId: number
  timestamp: number
  title: string
  date: string
}

const MONTHS: Record<string, number> = { Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5, Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11 }
export const DEMO_NOW = new Date('2026-08-18T00:00:00-04:00').getTime()

const moneyValue = (value: string) => Number(value.replace(/[^0-9-]/g, '')) || 0

export function displayDateTimestamp(value?: string) {
  if (!value) return 0
  const iso = Date.parse(value)
  if (!Number.isNaN(iso)) return iso
  if (value.startsWith('Hoy')) {
    const time = value.match(/(\d{1,2}):(\d{2})/)
    return new Date(2026, 7, 18, Number(time?.[1] || 12), Number(time?.[2] || 0)).getTime()
  }
  if (value.startsWith('Mañana')) {
    const time = value.match(/(\d{1,2}):(\d{2})/)
    return new Date(2026, 7, 19, Number(time?.[1] || 12), Number(time?.[2] || 0)).getTime()
  }
  const relative = value.match(/Hace (\d+) días?/i)
  if (relative) return DEMO_NOW - Number(relative[1]) * 86400000
  if (value === 'Ayer') return DEMO_NOW - 86400000
  const display = value.match(/(\d{1,2}) ([A-ZÁÉÍÓÚ][a-záéíóú]{2})(?:\s*[·,]\s*(\d{1,2}):(\d{2}))?/)
  if (!display || MONTHS[display[2]] === undefined) return 0
  return new Date(2026, MONTHS[display[2]], Number(display[1]), Number(display[3] || 12), Number(display[4] || 0)).getTime()
}

export function formatAccountEventDate(timestamp: number) {
  if (!timestamp) return 'Sin fecha'
  const parts = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santiago' }).formatToParts(new Date(timestamp))
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || ''
  const month = value('month').replace('.', '')
  return `${value('day')} ${month.charAt(0).toUpperCase()}${month.slice(1)} · ${value('hour')}:${value('minute')}`
}

export const getAccountPrestations = (source: Account360Source, accountId: number) => source.prestations.filter(prestation => prestation.accountId === accountId)
export const getAccountPayments = (source: Account360Source, accountId: number) => source.payments.filter(payment => payment.accountId === accountId)

export function getOutstandingAmountForPrestation(source: Account360Source, prestationId: number) {
  const prestation = source.prestations.find(record => record.id === prestationId)
  if (!prestation || prestation.status === 'Cancelada') return 0
  const paidPaymentIds = new Set(source.payments.filter(payment => payment.status === 'Pagado').map(payment => payment.id))
  const allocated = source.paymentAllocations
    .filter(allocation => allocation.prestationId === prestationId && paidPaymentIds.has(allocation.paymentId))
    .reduce((sum, allocation) => sum + allocation.amount, 0)
  return Math.max(0, moneyValue(prestation.amount) - allocated)
}

export function getAccountWorkedAmount(source: Account360Source, accountId: number) {
  return getAccountPrestations(source, accountId)
    .filter(prestation => prestation.status !== 'Cancelada')
    .reduce((sum, prestation) => sum + moneyValue(prestation.amount), 0)
}

export function getAccountAllocatedAmount(source: Account360Source, accountId: number) {
  return getAccountPrestations(source, accountId)
    .filter(prestation => prestation.status !== 'Cancelada')
    .reduce((sum, prestation) => sum + moneyValue(prestation.amount) - getOutstandingAmountForPrestation(source, prestation.id), 0)
}

export function getAccountOutstandingAmount(source: Account360Source, accountId: number) {
  return Math.max(0, getAccountWorkedAmount(source, accountId) - getAccountAllocatedAmount(source, accountId))
}

export function getNextAccountEvent(source: Account360Source, accountId: number): AccountNextEvent | undefined {
  const prestations: AccountNextEvent[] = getAccountPrestations(source, accountId)
    .filter(prestation => prestation.status === 'Programada')
    .map(prestation => ({ type: 'prestation', recordId: prestation.id, timestamp: displayDateTimestamp(prestation.date), title: prestation.name, date: prestation.date }))
  const activities: AccountNextEvent[] = source.activities
    .filter(activity => activity.accountId === accountId && activity.status === 'Pendiente')
    .map(activity => ({ type: 'activity', recordId: activity.id, timestamp: displayDateTimestamp(activity.scheduledAt || activity.date), title: activity.title, date: activity.date }))
  return [...prestations, ...activities].filter(event => event.timestamp >= DEMO_NOW).sort((left, right) => left.timestamp - right.timestamp)[0]
}

export function getAccountTimeline(source: Account360Source, accountId: number): AccountTimelineEvent[] {
  const prestations: AccountTimelineEvent[] = getAccountPrestations(source, accountId).map(prestation => ({
    id: `prestation-${prestation.id}`, recordId: prestation.id, type: 'prestation', timestamp: displayDateTimestamp(prestation.date), date: prestation.date,
    title: prestation.name, detail: prestation.origin, status: prestation.status, amount: prestation.amount,
  }))
  const activities: AccountTimelineEvent[] = source.activities.filter(activity => activity.accountId === accountId).map(activity => ({
    id: `activity-${activity.id}`, recordId: activity.id, type: 'activity', timestamp: displayDateTimestamp(activity.completedAt || activity.scheduledAt || activity.updatedAt || activity.createdAt || activity.date), date: activity.date,
    title: activity.title, detail: activity.description || activity.type, status: activity.status,
  }))
  const payments: AccountTimelineEvent[] = getAccountPayments(source, accountId).map(payment => ({
    id: `payment-${payment.id}`, recordId: payment.id, type: 'payment', timestamp: displayDateTimestamp(payment.createdAt || payment.date), date: payment.date,
    title: 'Pago recibido', detail: payment.method, status: payment.status, amount: payment.amount,
  }))
  const opportunities: AccountTimelineEvent[] = source.opportunities.filter(opportunity => opportunity.accountId === accountId).map(opportunity => ({
    id: `opportunity-${opportunity.id}`, recordId: opportunity.id, type: 'opportunity', timestamp: displayDateTimestamp(opportunity.updatedAt || opportunity.createdAt || opportunity.last), date: formatAccountEventDate(displayDateTimestamp(opportunity.updatedAt || opportunity.createdAt || opportunity.last)),
    title: opportunity.title, detail: 'Oportunidad', status: opportunity.stage, amount: opportunity.amount,
  }))
  const engagements: AccountTimelineEvent[] = source.engagements.filter(engagement => engagement.accountId === accountId).map(engagement => ({
    id: `engagement-${engagement.id}`, recordId: engagement.id, type: 'engagement', timestamp: displayDateTimestamp(engagement.createdAt), date: formatAccountEventDate(displayDateTimestamp(engagement.createdAt)),
    title: engagement.name, detail: engagement.type, status: engagement.status, amount: engagement.amount,
  }))
  return [...prestations, ...activities, ...payments, ...opportunities, ...engagements].sort((left, right) => right.timestamp - left.timestamp)
}
