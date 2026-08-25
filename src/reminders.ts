import type { AccountData, PrestationData, Vertical } from './data'
import type { EntitlementMode } from './entitlements'
import { canUseFeature } from './entitlements'

export type ReminderStatus = 'scheduled' | 'sent' | 'cancelled' | 'failed'
export type ReminderSlot = 'primary' | 'secondary'

export type AppointmentReminder = {
  id: number
  workspaceId: number
  prestationId: number
  accountId: number
  recipientEmail: string
  scheduledFor: string
  status: ReminderStatus
  slot: ReminderSlot
  leadHours: number
  sentAt?: string
  provider: 'mock' | 'resend'
  providerMessageId?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export type ReminderSettings = {
  emailEnabled: boolean
  primaryLeadHours: number
  secondaryEnabled: boolean
  secondaryLeadHours: number
  entitlementMode: EntitlementMode
}

export type ReminderSyncContext = {
  supportsAppointmentReminders: boolean
  scheduledStatus: string
  settings: ReminderSettings
  now?: Date
}

export type EmailMessage = {
  to: string
  fromName: string
  fromEmail: string
  replyTo?: string
  subject: string
  text: string
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ messageId: string }>
}

export class MockEmailProvider implements EmailProvider {
  async send(_message: EmailMessage) {
    return { messageId: `mock_${Date.now()}` }
  }
}

export const reminderLeadOptions = [48, 24, 12, 2, 1] as const

export const defaultReminderSettings: ReminderSettings = {
  emailEnabled: true,
  primaryLeadHours: 24,
  secondaryEnabled: false,
  secondaryLeadHours: 2,
  entitlementMode: 'demo_plus',
}

const months: Record<string, number> = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 }

export function normalizeReminderEmail(value?: string) {
  return (value || '').trim().toLowerCase()
}

export function isValidReminderEmail(value?: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeReminderEmail(value))
}

export function parseAppointmentDate(value: string) {
  const match = value.match(/(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóú]{3})\s*·\s*(\d{1,2}):(\d{2})/)
  if (!match) return undefined
  const month = months[match[2].toLowerCase().slice(0, 3)]
  if (month === undefined) return undefined
  return new Date(2026, month, Number(match[1]), Number(match[3]), Number(match[4]), 0, 0)
}

export function reminderSlots(settings: ReminderSettings) {
  const slots: Array<{ slot: ReminderSlot; leadHours: number }> = [{ slot: 'primary', leadHours: settings.primaryLeadHours }]
  if (settings.secondaryEnabled && settings.secondaryLeadHours !== settings.primaryLeadHours) slots.push({ slot: 'secondary', leadHours: settings.secondaryLeadHours })
  return slots
}

export function reminderEligibility(prestation: Pick<PrestationData, 'date' | 'status'>, account: AccountData | undefined, context: ReminderSyncContext) {
  if (!context.supportsAppointmentReminders) return { eligible: false, reason: 'Esta prestación no corresponde a una cita.' }
  if (!context.settings.emailEnabled) return { eligible: false, reason: 'Los recordatorios están desactivados.' }
  if (!canUseFeature('email_reminders', { mode: context.settings.entitlementMode })) return { eligible: false, reason: 'Esta función requiere Hazento Plus.' }
  if (prestation.status !== context.scheduledStatus) return { eligible: false, reason: 'La cita no está programada.' }
  if (!parseAppointmentDate(prestation.date)) return { eligible: false, reason: 'La cita necesita fecha y hora.' }
  if (!isValidReminderEmail(account?.email)) return { eligible: false, reason: `No se programará el recordatorio porque ${account?.name || 'esta persona'} no tiene email.` }
  return { eligible: true as const }
}

function nextId(records: Array<{ id: number }>) {
  return records.reduce((maximum, record) => Math.max(maximum, record.id), 0) + 1
}

export function reconcileAppointmentReminders(
  records: AppointmentReminder[],
  prestation: PrestationData,
  account: AccountData | undefined,
  context: ReminderSyncContext,
) {
  const now = context.now ?? new Date()
  const nowIso = now.toISOString()
  const eligibility = reminderEligibility(prestation, account, context)
  const related = records.filter(record => record.prestationId === prestation.id)
  if (!eligibility.eligible) {
    return records.map(record => record.prestationId === prestation.id && record.status === 'scheduled'
      ? { ...record, status: 'cancelled' as const, errorMessage: eligibility.reason, updatedAt: nowIso }
      : record)
  }

  const appointmentDate = parseAppointmentDate(prestation.date)!
  const email = normalizeReminderEmail(account?.email)
  let nextRecords = [...records]
  const desired = reminderSlots(context.settings).map(({ slot, leadHours }) => ({
    slot,
    leadHours,
    scheduledFor: new Date(appointmentDate.getTime() - leadHours * 60 * 60 * 1000).toISOString(),
  })).filter(item => new Date(item.scheduledFor).getTime() > now.getTime())

  nextRecords = nextRecords.map(record => record.prestationId === prestation.id && record.status === 'scheduled' && !desired.some(item => item.slot === record.slot && item.scheduledFor === record.scheduledFor)
    ? { ...record, status: 'cancelled' as const, errorMessage: 'Reprogramado o desactivado', updatedAt: nowIso }
    : record)

  desired.forEach(item => {
    const exact = nextRecords.find(record => record.prestationId === prestation.id && record.slot === item.slot && record.scheduledFor === item.scheduledFor && record.recipientEmail === email && (record.status === 'scheduled' || record.status === 'sent'))
    if (exact) return
    const reusable = nextRecords.find(record => record.prestationId === prestation.id && record.slot === item.slot && record.status !== 'sent')
    if (reusable) {
      nextRecords = nextRecords.map(record => record.id === reusable.id ? {
        ...record,
        recipientEmail: email,
        scheduledFor: item.scheduledFor,
        leadHours: item.leadHours,
        status: 'scheduled' as const,
        sentAt: undefined,
        providerMessageId: undefined,
        errorMessage: undefined,
        updatedAt: nowIso,
      } : record)
      return
    }
    nextRecords.push({
      id: nextId(nextRecords),
      workspaceId: account?.workspaceId ?? 1,
      prestationId: prestation.id,
      accountId: prestation.accountId,
      recipientEmail: email,
      scheduledFor: item.scheduledFor,
      status: 'scheduled',
      slot: item.slot,
      leadHours: item.leadHours,
      provider: 'mock',
      createdAt: nowIso,
      updatedAt: nowIso,
    })
  })
  return nextRecords
}

export function appointmentEmailTemplate({ professionalName, recipientName, prestation, appointmentDate, address, recipientEmail, replyTo }: {
  professionalName: string
  recipientName: string
  prestation: string
  appointmentDate: Date
  address: string
  recipientEmail: string
  replyTo?: string
}): EmailMessage {
  const formattedDate = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Santiago' }).format(appointmentDate)
  const formattedTime = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santiago' }).format(appointmentDate)
  return {
    to: recipientEmail,
    fromName: `${professionalName} vía Hazento`,
    fromEmail: 'recordatorios@hazento.cl',
    replyTo,
    subject: `Recordatorio de tu ${prestation.toLowerCase()} con ${professionalName}`,
    text: `Hola ${recipientName},\n\nTe recordamos que tienes una ${prestation.toLowerCase()} programada:\n\nFecha: ${formattedDate}\nHora: ${formattedTime}\nDirección: ${address}\n\nSi necesitas realizar algún cambio, contacta directamente a ${professionalName}.\n\nEnviado mediante Hazento`,
  }
}
