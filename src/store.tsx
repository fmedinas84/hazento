import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  type AccountData,
  type ActivityData,
  type ContactData,
  type DocumentAdjustmentData,
  type DocumentData,
  type DocumentPaymentAllocationData,
  type EngagementData,
  type OpportunityData,
  type OrganizationData,
  type PaymentData,
  type PaymentRequestAllocationData,
  type PaymentRequestData,
  type PaymentRequestItemData,
  type PrestationData,
  accounts as seedAccounts,
  activities as seedActivities,
  contacts as seedContacts,
  documentAdjustments as seedDocumentAdjustments,
  documentPaymentAllocations as seedDocumentPaymentAllocations,
  documents as seedDocuments,
  engagements as seedEngagements,
  opportunities as seedOpportunities,
  organizations as seedOrganizations,
  paymentAllocations as seedPaymentAllocations,
  paymentRequestAllocations as seedPaymentRequestAllocations,
  paymentRequestItems as seedPaymentRequestItems,
  paymentRequests as seedPaymentRequests,
  payments as seedPayments,
  prestations as seedPrestations,
  services as seedServices,
} from './data'
import { findAccountByEmail, normalizeEmail, prepareAccountCreate, type NewAccountRecord } from './accountEmail'
import { findOrganizationByName, type NewOrganizationRecord } from './organizationName'
import { validateAdjustment, validateAllocation } from './documentPayments'
import { migrateLegacyIds } from './demoIdMigration'
import {
  defaultReminderSettings,
  reconcileAppointmentReminders,
  type AppointmentReminder,
  type ReminderSettings,
  type ReminderSyncContext,
} from './reminders'

export type Account = AccountData
export type Contact = ContactData
export type Opportunity = OpportunityData
export type Organization = OrganizationData
export type Engagement = EngagementData
export type Prestation = PrestationData
export type ActivityRecord = ActivityData
export type Payment = PaymentData
export type PaymentAllocation = (typeof seedPaymentAllocations)[number]
export type PaymentRequest = PaymentRequestData
export type PaymentRequestItem = PaymentRequestItemData
export type PaymentRequestAllocation = PaymentRequestAllocationData
export type Document = DocumentData
export type DocumentPaymentAllocation = DocumentPaymentAllocationData
export type DocumentAdjustment = DocumentAdjustmentData
export type Service = (typeof seedServices)[number]
export type ProfileSettings = { firstName: string; lastName: string; email: string; phone: string }
export type WorkspaceSettings = { name: string; address: string; country: string; currency: string; timezone: string; vertical?: import('./data').Vertical }

const seedAppointmentReminders: AppointmentReminder[] = [{
  id: '1',
  workspaceId: '1',
  prestationId: '9',
  accountId: '5',
  recipientEmail: 'daniela@oslo.cl',
  scheduledFor: '2026-08-19T19:30:00.000Z',
  status: 'scheduled',
  slot: 'primary',
  leadHours: 24,
  provider: 'mock',
  createdAt: '2026-08-18T12:00:00.000Z',
  updatedAt: '2026-08-18T12:00:00.000Z',
}]

export type DataState = {
  profile: ProfileSettings
  workspace: WorkspaceSettings
  accounts: Account[]
  organizations: Organization[]
  contacts: Contact[]
  opportunities: Opportunity[]
  engagements: Engagement[]
  prestations: Prestation[]
  activities: ActivityRecord[]
  payments: Payment[]
  paymentAllocations: PaymentAllocation[]
  paymentRequests: PaymentRequest[]
  paymentRequestItems: PaymentRequestItem[]
  paymentRequestAllocations: PaymentRequestAllocation[]
  documents: Document[]
  documentPaymentAllocations: DocumentPaymentAllocation[]
  documentAdjustments: DocumentAdjustment[]
  services: Service[]
  appointmentReminders: AppointmentReminder[]
  reminderSettings: ReminderSettings
}

export type DataStore = DataState & {
  repositoryStatus: 'loading' | 'ready' | 'error'
  repositoryError: string | null
  retryRepository: () => void
  signOut: () => Promise<void>
  updateProfile: (changes: Partial<ProfileSettings>) => Promise<void>
  updateWorkspace: (changes: Partial<WorkspaceSettings>) => Promise<void>
  addAccount: (record: NewAccountRecord) => Promise<Account>
  updateAccount: (id: string, changes: Partial<Account>, reminderContext?: Omit<ReminderSyncContext, 'settings'>) => Promise<void>
  addOrganization: (record: NewOrganizationRecord) => Promise<Organization>
  updateOrganization: (id: string, changes: Partial<Organization>) => Promise<void>
  archiveOrganization: (id: string) => Promise<void>
  addContact: (record: Omit<Contact, 'id'>) => Promise<Contact>
  addOpportunity: (record: Omit<Opportunity, 'id'>) => Promise<Opportunity>
  updateOpportunity: (id: string, changes: Partial<Opportunity>) => Promise<void>
  addEngagement: (record: Omit<Engagement, 'id'>) => Promise<Engagement>
  updateEngagement: (id: string, changes: Partial<Engagement>) => Promise<void>
  addPrestation: (record: Omit<Prestation, 'id'>, reminderContext?: Omit<ReminderSyncContext, 'settings'>) => Promise<Prestation>
  updatePrestation: (id: string, changes: Partial<Prestation>, reminderContext?: Omit<ReminderSyncContext, 'settings'>) => Promise<void>
  updateReminderSettings: (changes: Partial<ReminderSettings>, reminderContext: Omit<ReminderSyncContext, 'settings'>) => Promise<void>
  cancelAppointmentReminders: (prestationId: string) => Promise<void>
  markReminderSent: (id: string) => Promise<void>
  markReminderFailed: (id: string) => Promise<void>
  addActivity: (record: Omit<ActivityRecord, 'id'>) => Promise<ActivityRecord>
  toggleActivity: (id: string) => Promise<void>
  addPayment: (record: Omit<Payment, 'id'>, allocations: Array<{ prestationId: string; amount: number }>, documentAllocations?: Array<{ documentId: string; amount: number }>) => Promise<Payment>
  addPaymentRequest: (record: Omit<PaymentRequest, 'id' | 'createdAt' | 'updatedAt' | 'waivedAmount' | 'status'>, items: Array<Omit<PaymentRequestItem, 'id' | 'paymentRequestId'>>) => Promise<PaymentRequest>
  settlePaymentRequest: (id: string, receivedAmount: number, method: string, differenceAction?: 'transfer' | 'waive', waiverReason?: string) => Promise<void>
  cancelPaymentRequest: (id: string) => Promise<void>
  voidPayment: (id: string, reason: string) => Promise<void>
  updatePayment: (id: string, changes: Partial<Payment>) => Promise<void>
  updatePaymentWithDocumentAllocations: (id: string, changes: Partial<Payment>, allocations: Array<{ documentId: string; amount: number }>) => Promise<void>
  saveDocumentAllocation: (record: Omit<DocumentPaymentAllocation, 'id'>, allocationId?: string) => Promise<void>
  deleteDocumentAllocation: (id: string) => Promise<void>
  addDocumentAdjustment: (record: Omit<DocumentAdjustment, 'id' | 'taxCorrectionStatus'>) => Promise<void>
  addService: (record: Omit<Service, 'id'>) => Promise<Service>
  updateService: (id: string, changes: Partial<Service>) => Promise<void>
  toggleService: (id: string) => Promise<void>
  resetDemo: () => Promise<void>
}

const STORAGE_KEY = 'hazento-demo-v4'
const DEMO_SCHEMA_VERSION = 5
const colors = ['#dff5e8', '#ede9ff', '#fff0d8', '#dceeff', '#f5e6f0']
const seedState: DataState = {
  profile: { firstName: 'Francisca', lastName: 'Medina', email: 'francisca@hazento.cl', phone: '+56 9 1234 5678' },
  workspace: { name: 'Consulta Demo', address: 'Av. Providencia 1234, Santiago', country: 'Chile', currency: 'CLP', timezone: 'America/Santiago' },
  accounts: seedAccounts,
  organizations: seedOrganizations,
  contacts: seedContacts,
  opportunities: seedOpportunities,
  engagements: seedEngagements,
  prestations: seedPrestations,
  activities: seedActivities,
  payments: seedPayments,
  paymentAllocations: seedPaymentAllocations,
  paymentRequests: seedPaymentRequests,
  paymentRequestItems: seedPaymentRequestItems,
  paymentRequestAllocations: seedPaymentRequestAllocations,
  documents: seedDocuments,
  documentPaymentAllocations: seedDocumentPaymentAllocations,
  documentAdjustments: seedDocumentAdjustments,
  services: seedServices,
  appointmentReminders: seedAppointmentReminders,
  reminderSettings: defaultReminderSettings,
}

type StoredDemoState = { demoSchemaVersion: number; state: DataState }

/** One-way, idempotent migration for numeric and numeric-looking legacy IDs. */
export function migrateLegacyDemoIds(saved: DataState): DataState {
  return migrateLegacyIds(saved)
}

function migrateDemoState(saved: DataState): DataState {
  saved = migrateLegacyDemoIds(saved)
  const accounts = saved.accounts.map(account => {
    const nameParts = account.name.trim().split(/\s+/)
    return { ...account, workspaceId: account.workspaceId ?? 'workspace-demo-001', displayName: account.displayName || account.name, firstName: account.firstName || nameParts[0], lastName: account.lastName || nameParts.slice(1).join(' '), email: account.email ? normalizeEmail(account.email) : undefined }
  })
  const accountIdFor = (name: string) => accounts.find(account => account.name === name)?.id
  return {
    ...saved,
    profile: saved.profile ?? seedState.profile,
    workspace: { ...seedState.workspace, ...saved.workspace },
    accounts,
    organizations: saved.organizations ?? seedOrganizations,
    contacts: saved.contacts ?? seedContacts,
    opportunities: saved.opportunities.map(opportunity => ({ ...opportunity, stage: opportunity.stage === 'Negociación' ? 'Propuesta' : opportunity.stage, accountId: opportunity.accountId ?? accountIdFor(opportunity.account), status: opportunity.status ?? (['Ganada', 'Perdida'].includes(opportunity.stage) ? opportunity.stage as 'Ganada' | 'Perdida' : 'Abierta') })),
    engagements: saved.engagements.map(engagement => ({ ...engagement, accountId: engagement.accountId ?? accountIdFor(engagement.account) })),
    prestations: saved.prestations.map(prestation => ({
      ...prestation,
      accountId: prestation.accountId ?? accountIdFor(prestation.account) ?? '',
      serviceId: prestation.serviceId ?? seedServices.find(service => service.name === prestation.name)?.id,
    })),
    activities: saved.activities.map(activity => ({ ...activity, accountId: activity.accountId ?? accountIdFor(activity.relation.split(' · ')[0]) })),
    payments: saved.payments.map(payment => ({ ...payment, accountId: payment.accountId ?? accountIdFor(payment.account) })),
    paymentRequests: saved.paymentRequests ?? seedPaymentRequests,
    paymentRequestItems: saved.paymentRequestItems ?? seedPaymentRequestItems,
    paymentRequestAllocations: saved.paymentRequestAllocations ?? seedPaymentRequestAllocations,
    documents: saved.documents ?? seedDocuments,
    documentPaymentAllocations: saved.documentPaymentAllocations ?? seedDocumentPaymentAllocations,
    documentAdjustments: saved.documentAdjustments ?? seedDocumentAdjustments,
    appointmentReminders: saved.appointmentReminders ?? seedAppointmentReminders,
    reminderSettings: saved.reminderSettings ?? defaultReminderSettings,
  }
}

export const DataStoreContext = createContext<DataStore | null>(null)

function nextId(_records: Array<{ id: string }>) {
  return crypto.randomUUID()
}

function formatActivityDate(isoDate: string) {
  const parts = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santiago' }).formatToParts(new Date(isoDate))
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || ''
  const month = value('month').replace('.', '')
  return `${value('day')} ${month.charAt(0).toUpperCase()}${month.slice(1)} · ${value('hour')}:${value('minute')}`
}

export function syncFollowUpActivity(activities: ActivityRecord[], prestation: Prestation, noteValue: string, savedAt: string) {
  const note = noteValue.trim()
  const existing = activities.find(activity => activity.source === 'prestation_follow_up' && activity.prestationId === prestation.id)
  if (!note) return activities.filter(activity => activity.id !== existing?.id)

  const activity: ActivityRecord = {
    id: existing?.id ?? nextId(activities),
    title: 'Seguimiento',
    relation: '',
    date: formatActivityDate(savedAt),
    type: 'Nota',
    activityType: 'note',
    status: 'Completada',
    description: note,
    accountId: prestation.accountId,
    prestationId: prestation.id,
    engagementId: prestation.engagementId,
    opportunityId: prestation.opportunityId,
    source: 'prestation_follow_up',
    createdAt: existing?.createdAt ?? savedAt,
    updatedAt: savedAt,
    completedAt: savedAt,
  }
  return existing ? activities.map(record => record.id === existing.id ? activity : record) : [activity, ...activities]
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>(() => migrateDemoState(seedState))
  const [repositoryStatus, setRepositoryStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [repositoryError, setRepositoryError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setRepositoryStatus('loading'); setRepositoryError(null)
    Promise.resolve().then(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return migrateDemoState(seedState)
      const parsed = JSON.parse(saved) as DataState | StoredDemoState
      const legacy = 'state' in parsed ? parsed.state : parsed
      return migrateDemoState(legacy)
    } catch {
      throw new Error('No pudimos cargar los datos guardados en este navegador.')
    }
    }).then(next => { if (active) { setState(next); setRepositoryStatus('ready') } }).catch(cause => {
      if (active) { setRepositoryStatus('error'); setRepositoryError(cause instanceof Error ? cause.message : 'No pudimos cargar tus datos.') }
    })
    return () => { active = false }
  }, [loadAttempt])

  useEffect(() => {
    if (repositoryStatus !== 'ready') return
    const stored: StoredDemoState = { demoSchemaVersion: DEMO_SCHEMA_VERSION, state }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  }, [state, repositoryStatus])

  const value = useMemo<DataStore>(() => ({
    ...state,
    repositoryStatus,
    repositoryError,
    retryRepository: () => setLoadAttempt(value => value + 1),
    async signOut() {},
    async updateProfile(changes) {
      setState(current => ({ ...current, profile: { ...current.profile, ...changes } }))
    },
    async updateWorkspace(changes) {
      setState(current => ({ ...current, workspace: { ...current.workspace, ...changes } }))
    },
    async addAccount(record) {
      const result = prepareAccountCreate(state.accounts, record, colors)
      if (result.created) setState(current => ({ ...current, accounts: [result.account, ...current.accounts] }))
      return result.account
    },
    async updateAccount(id, changes, reminderContext) {
      setState(current => {
        const normalizedChanges = Object.prototype.hasOwnProperty.call(changes, 'email') ? { ...changes, email: normalizeEmail(changes.email || '') || undefined } : changes
        if (normalizedChanges.email && findAccountByEmail(current.accounts, normalizedChanges.email, id)) return current
        const previous = current.accounts.find(record => record.id === id)
        const nextName = normalizedChanges.name?.trim()
        const nextAccounts = current.accounts.map(record => record.id === id ? { ...record, ...normalizedChanges } : record)
        let reminders = current.appointmentReminders
        if (reminderContext && Object.prototype.hasOwnProperty.call(normalizedChanges, 'email')) {
          const nextAccount = nextAccounts.find(record => record.id === id)
          current.prestations.filter(record => record.accountId === id).forEach(prestation => {
            reminders = reconcileAppointmentReminders(reminders, prestation, nextAccount, { ...reminderContext, settings: current.reminderSettings })
          })
        }
        return {
          ...current,
          accounts: nextAccounts,
          appointmentReminders: reminders,
          // Relations remain ID-based; these names are only synchronized display snapshots
          // for legacy list rows that have not yet moved to repository joins.
          opportunities: current.opportunities.map(record => record.accountId === id && nextName ? { ...record, account: nextName, contact: record.contact === previous?.name ? nextName : record.contact } : record),
          engagements: current.engagements.map(record => record.accountId === id && nextName ? { ...record, account: nextName } : record),
          prestations: current.prestations.map(record => record.accountId === id && nextName ? { ...record, account: nextName } : record),
          payments: current.payments.map(record => record.accountId === id && nextName ? { ...record, account: nextName } : record),
        }
      })
    },
    async addOrganization(record) {
      const existing = findOrganizationByName(state.organizations, record.name)
      if (existing) return existing
      const savedAt = new Date().toISOString()
      const created: Organization = { ...record, name: record.name.trim().replace(/\s+/g, ' '), id: nextId(state.organizations), createdAt: savedAt, updatedAt: savedAt }
      setState(current => ({ ...current, organizations: [created, ...current.organizations] }))
      return created
    },
    async updateOrganization(id, changes) {
      setState(current => {
        if (changes.name && findOrganizationByName(current.organizations, changes.name, id)) return current
        return { ...current, organizations: current.organizations.map(record => record.id === id ? { ...record, ...changes, name: changes.name?.trim().replace(/\s+/g, ' ') || record.name, updatedAt: new Date().toISOString() } : record) }
      })
    },
    async archiveOrganization(id) {
      setState(current => ({ ...current, organizations: current.organizations.map(record => record.id === id ? { ...record, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : record) }))
    },
    async addContact(record) {
      const created: Contact = { ...record, id: nextId(state.contacts) }
      setState(current => ({ ...current, contacts: [...current.contacts, created] }))
      return created
    },
    async addOpportunity(record) {
      const savedAt = new Date().toISOString()
      const created: Opportunity = { ...record, id: nextId(state.opportunities), createdAt: record.createdAt ?? savedAt, updatedAt: record.updatedAt ?? savedAt }
      setState(current => ({ ...current, opportunities: [created, ...current.opportunities] }))
      return created
    },
    async updateOpportunity(id, changes) {
      setState(current => ({ ...current, opportunities: current.opportunities.map(record => record.id === id ? { ...record, ...changes, updatedAt: new Date().toISOString() } : record) }))
    },
    async addEngagement(record) {
      const savedAt = new Date().toISOString()
      const created: Engagement = { ...record, id: nextId(state.engagements), createdAt: record.createdAt ?? savedAt, updatedAt: record.updatedAt ?? savedAt }
      setState(current => ({ ...current, engagements: [created, ...current.engagements] }))
      return created
    },
    async updateEngagement(id, changes) {
      setState(current => ({ ...current, engagements: current.engagements.map(record => record.id === id ? { ...record, ...changes, updatedAt: new Date().toISOString() } : record) }))
    },
    async addPrestation(record, reminderContext) {
      const savedAt = new Date().toISOString()
      const created: Prestation = { ...record, id: nextId(state.prestations), createdAt: record.createdAt ?? savedAt }
      setState(current => {
        const account = current.accounts.find(item => item.id === created.accountId)
        const reminders = reminderContext
          ? reconcileAppointmentReminders(current.appointmentReminders, created, account, { ...reminderContext, settings: current.reminderSettings })
          : current.appointmentReminders
        return {
          ...current,
          prestations: [created, ...current.prestations],
          activities: syncFollowUpActivity(current.activities, created, created.followUpNote || '', savedAt),
          appointmentReminders: reminders,
        }
      })
      return created
    },
    async updatePrestation(id, changes, reminderContext) {
      setState(current => {
        const existing = current.prestations.find(record => record.id === id)
        if (!existing) return current
        const updated = { ...existing, ...changes }
        const shouldSyncFollowUp = Object.prototype.hasOwnProperty.call(changes, 'followUpNote')
        const account = current.accounts.find(item => item.id === updated.accountId)
        const reminders = reminderContext
          ? reconcileAppointmentReminders(current.appointmentReminders, updated, account, { ...reminderContext, settings: current.reminderSettings })
          : current.appointmentReminders
        return {
          ...current,
          prestations: current.prestations.map(record => record.id === id ? updated : record),
          activities: shouldSyncFollowUp ? syncFollowUpActivity(current.activities, updated, updated.followUpNote || '', new Date().toISOString()) : current.activities,
          appointmentReminders: reminders,
        }
      })
    },
    async updateReminderSettings(changes, reminderContext) {
      setState(current => {
        const settings = { ...current.reminderSettings, ...changes }
        let reminders = current.appointmentReminders
        current.prestations.forEach(prestation => {
          reminders = reconcileAppointmentReminders(reminders, prestation, current.accounts.find(account => account.id === prestation.accountId), { ...reminderContext, settings })
        })
        return { ...current, reminderSettings: settings, appointmentReminders: reminders }
      })
    },
    async cancelAppointmentReminders(prestationId) {
      setState(current => ({ ...current, appointmentReminders: current.appointmentReminders.map(record => record.prestationId === prestationId && record.status === 'scheduled' ? { ...record, status: 'cancelled', errorMessage: 'Cancelado manualmente', updatedAt: new Date().toISOString() } : record) }))
    },
    async markReminderSent(id) {
      setState(current => ({ ...current, appointmentReminders: current.appointmentReminders.map(record => record.id === id ? { ...record, status: 'sent', sentAt: new Date().toISOString(), providerMessageId: `mock_${record.id}_${Date.now()}`, errorMessage: undefined, updatedAt: new Date().toISOString() } : record) }))
    },
    async markReminderFailed(id) {
      setState(current => ({ ...current, appointmentReminders: current.appointmentReminders.map(record => record.id === id ? { ...record, status: 'failed', errorMessage: 'Fallo simulado del proveedor de desarrollo', updatedAt: new Date().toISOString() } : record) }))
    },
    async addActivity(record) {
      const created: ActivityRecord = { ...record, id: nextId(state.activities), createdAt: record.createdAt ?? new Date().toISOString() }
      setState(current => ({ ...current, activities: [created, ...current.activities] }))
      return created
    },
    async toggleActivity(id) {
      setState(current => ({ ...current, activities: current.activities.map(record => record.id === id ? { ...record, status: record.status === 'Completada' ? 'Pendiente' : 'Completada' } : record) }))
    },
    async addPayment(record, allocations, documentAllocations = []) {
      const created: Payment = { ...record, id: nextId(state.payments), createdAt: record.createdAt ?? new Date().toISOString() }
      const createdAllocations: PaymentAllocation[] = allocations.map((allocation, index) => ({
        id: nextId(state.paymentAllocations),
        paymentId: created.id,
        prestationId: allocation.prestationId,
        amount: allocation.amount,
      }))
      setState(current => {
        const payments = [created, ...current.payments]
        let nextDocumentAllocations = current.documentPaymentAllocations
        documentAllocations.forEach(record => {
          const document = current.documents.find(item => item.id === record.documentId)
          if (!document) throw new Error('No encontramos la boleta.')
          validateAllocation({ payment: created, document, amount: record.amount, payments, allocations: nextDocumentAllocations, adjustments: current.documentAdjustments })
          nextDocumentAllocations = [...nextDocumentAllocations, { ...record, paymentId: created.id, id: nextId(nextDocumentAllocations) }]
        })
        return { ...current, payments, paymentAllocations: [...current.paymentAllocations, ...createdAllocations], documentPaymentAllocations: nextDocumentAllocations }
      })
      return created
    },
    async addPaymentRequest(record, items) {
      const savedAt = new Date().toISOString()
      const created: PaymentRequest = { ...record, id: nextId(state.paymentRequests), status: 'Pendiente', waivedAmount: 0, createdAt: savedAt, updatedAt: savedAt }
      const createdItems = items.map(item => ({ ...item, id: nextId(state.paymentRequestItems), paymentRequestId: created.id }))
      if (!created.amount || created.amount <= 0) throw new Error('El monto solicitado debe ser mayor que cero.')
      if (!createdItems.length) throw new Error('Agrega al menos un concepto.')
      setState(current => ({ ...current, paymentRequests: [created, ...current.paymentRequests], paymentRequestItems: [...current.paymentRequestItems, ...createdItems] }))
      return created
    },
    async settlePaymentRequest(id, receivedAmount, method, differenceAction, waiverReason) {
      setState(current => {
        const request = current.paymentRequests.find(item => item.id === id)
        if (!request || request.status !== 'Pendiente') throw new Error('La solicitud ya no está pendiente.')
        const paid = current.paymentRequestAllocations.filter(item => item.paymentRequestId === id).reduce((sum, item) => sum + item.amount, 0)
        const outstanding = Math.max(0, request.amount - paid - request.waivedAmount)
        if (receivedAmount <= 0 || receivedAmount > outstanding) throw new Error('El monto recibido no es válido.')
        if (receivedAmount < outstanding && !differenceAction) throw new Error('Indica qué hacer con la diferencia.')
        if (differenceAction === 'waive' && !waiverReason?.trim()) throw new Error('Indica el motivo de la condonación.')
        const account = current.accounts.find(item => item.id === request.accountId)
        const now = new Date().toISOString()
        const payment: Payment = { id: nextId(current.payments), accountId: request.accountId, account: account?.name || 'Persona', amount: `$${receivedAmount.toLocaleString('es-CL')}`, date: new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(new Date()), method, status: 'Pagado', allocations: 'Solicitud de pago', createdAt: now }
        const allocation: PaymentRequestAllocation = { id: nextId(current.paymentRequestAllocations), paymentId: payment.id, paymentRequestId: id, amount: receivedAmount }
        let requests = current.paymentRequests.map(item => item.id === id ? { ...item, status: (receivedAmount === outstanding ? 'Pagada' : differenceAction === 'transfer' ? 'Cerrada con saldo trasladado' : 'Cerrada con diferencia condonada') as PaymentRequest['status'], waivedAmount: differenceAction === 'waive' ? outstanding - receivedAmount : item.waivedAmount, waiverReason: differenceAction === 'waive' ? waiverReason!.trim() : item.waiverReason, updatedAt: now } : item)
        let items = current.paymentRequestItems
        if (differenceAction === 'transfer') {
          const successor: PaymentRequest = { ...request, id: nextId(requests), parentRequestId: request.id, status: 'Pendiente', amount: outstanding - receivedAmount, waivedAmount: 0, waiverReason: undefined, note: `Saldo trasladado desde solicitud #${request.id}`, createdAt: now, updatedAt: now }
          const sourceItems = current.paymentRequestItems.filter(item => item.paymentRequestId === id)
          items = [...items, ...sourceItems.map((item, index) => ({ ...item, id: nextId(items), paymentRequestId: successor.id, amount: index === 0 ? successor.amount : 0 }))]
          requests = [successor, ...requests]
        }
        return { ...current, payments: [payment, ...current.payments], paymentRequests: requests, paymentRequestItems: items, paymentRequestAllocations: [...current.paymentRequestAllocations, allocation] }
      })
    },
    async cancelPaymentRequest(id) {
      setState(current => ({ ...current, paymentRequests: current.paymentRequests.map(item => item.id === id && item.status === 'Pendiente' ? { ...item, status: 'Cancelada', updatedAt: new Date().toISOString() } : item) }))
    },
    async voidPayment(id, reason) {
      const cleanReason = reason.trim()
      if (!cleanReason) throw new Error('Indica el motivo de la anulación.')
      setState(current => {
        const payment = current.payments.find(item => item.id === id)
        if (!payment || payment.status !== 'Pagado') throw new Error('Solo puedes anular un pago recibido vigente.')
        const now = new Date().toISOString()
        const requestIds = new Set(current.paymentRequestAllocations.filter(item => item.paymentId === id).map(item => item.paymentRequestId))
        const transferredRequestIds = new Set(current.paymentRequests.filter(item => requestIds.has(item.id) && item.status === 'Cerrada con saldo trasladado').map(item => item.id))
        const payments = current.payments.map(item => item.id === id ? { ...item, status: 'Anulado', voidedAt: now, voidedBy: 'Usuario demo', voidReason: cleanReason } : item)
        const paymentRequests = current.paymentRequests.map(request => {
          if (request.parentRequestId && transferredRequestIds.has(request.parentRequestId) && request.status === 'Pendiente') return { ...request, status: 'Cancelada' as const, note: `${request.note || ''}${request.note ? ' · ' : ''}Cancelada al anular el pago de origen.`, updatedAt: now }
          if (!requestIds.has(request.id)) return request
          return { ...request, status: 'Pendiente' as const, updatedAt: now }
        })
        return { ...current, payments, paymentRequests }
      })
    },
    async updatePayment(id, changes) {
      setState(current => {
        const payment = current.payments.find(record => record.id === id)
        if (!payment) return current
        const updated = { ...payment, ...changes }
        const related = current.documentPaymentAllocations.filter(allocation => allocation.paymentId === id)
        const allocated = related.reduce((sum, allocation) => sum + allocation.amount, 0)
        if (allocated > Number(updated.amount.replace(/[^0-9-]/g, ''))) throw new Error('El monto del pago no puede ser menor que sus asignaciones.')
        return { ...current, payments: current.payments.map(record => record.id === id ? updated : record) }
      })
    },
    async updatePaymentWithDocumentAllocations(id, changes, allocations) {
      setState(current => {
        const payment = current.payments.find(record => record.id === id)
        if (!payment) throw new Error('No encontramos el pago.')
        const updated = { ...payment, ...changes }
        const payments = current.payments.map(record => record.id === id ? updated : record)
        let nextAllocations = current.documentPaymentAllocations.filter(allocation => allocation.paymentId !== id)
        allocations.forEach(record => {
          const document = current.documents.find(item => item.id === record.documentId)
          if (!document) throw new Error('No encontramos la boleta.')
          validateAllocation({ payment: updated, document, amount: record.amount, payments, allocations: nextAllocations, adjustments: current.documentAdjustments })
          nextAllocations = [...nextAllocations, { ...record, paymentId: id, id: nextId(nextAllocations) }]
        })
        return { ...current, payments, documentPaymentAllocations: nextAllocations }
      })
    },
    async saveDocumentAllocation(record, allocationId) {
      setState(current => {
        const payment = current.payments.find(item => item.id === record.paymentId)
        const document = current.documents.find(item => item.id === record.documentId)
        if (!payment || !document) throw new Error('No encontramos el pago o la boleta.')
        validateAllocation({ payment, document, amount: record.amount, payments: current.payments, allocations: current.documentPaymentAllocations, adjustments: current.documentAdjustments, exceptAllocationId: allocationId })
        const allocation = { ...record, id: allocationId ?? nextId(current.documentPaymentAllocations) }
        return { ...current, documentPaymentAllocations: allocationId ? current.documentPaymentAllocations.map(item => item.id === allocationId ? allocation : item) : [...current.documentPaymentAllocations, allocation] }
      })
    },
    async deleteDocumentAllocation(id) {
      setState(current => ({ ...current, documentPaymentAllocations: current.documentPaymentAllocations.filter(item => item.id !== id) }))
    },
    async addDocumentAdjustment(record) {
      setState(current => {
        const document = current.documents.find(item => item.id === record.documentId)
        if (!document) throw new Error('No encontramos la boleta.')
        validateAdjustment(document, record.amount, current.payments, current.documentPaymentAllocations, current.documentAdjustments)
        const adjustment: DocumentAdjustment = { ...record, id: nextId(current.documentAdjustments), taxCorrectionStatus: document.taxStatus === 'Emitida' ? 'Pendiente' : 'No requerida' }
        return { ...current, documentAdjustments: [...current.documentAdjustments, adjustment] }
      })
    },
    async addService(record) {
      const created: Service = { ...record, id: nextId(state.services) }
      setState(current => ({ ...current, services: [created, ...current.services] }))
      return created
    },
    async updateService(id, changes) {
      setState(current => ({ ...current, services: current.services.map(record => record.id === id ? { ...record, ...changes } : record) }))
    },
    async toggleService(id) {
      setState(current => ({ ...current, services: current.services.map(record => record.id === id ? { ...record, active: !record.active } : record) }))
    },
    async resetDemo() {
      setState(seedState)
    },
  }), [state, repositoryStatus, repositoryError])

  return <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>
}

export function useDemoStore() {
  const store = useContext(DataStoreContext)
  if (!store) throw new Error('useDemoStore must be used within DemoProvider')
  return store
}
