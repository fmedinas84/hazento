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
export type WorkspaceSettings = { name: string; country: string; currency: string; timezone: string }

type DemoState = {
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
}

type DemoStore = DemoState & {
  updateProfile: (changes: Partial<ProfileSettings>) => void
  updateWorkspace: (changes: Partial<WorkspaceSettings>) => void
  addAccount: (record: NewAccountRecord) => Account
  updateAccount: (id: number, changes: Partial<Account>) => void
  addOrganization: (record: NewOrganizationRecord) => Organization
  updateOrganization: (id: number, changes: Partial<Organization>) => void
  archiveOrganization: (id: number) => void
  addContact: (record: Omit<Contact, 'id'>) => Contact
  addOpportunity: (record: Omit<Opportunity, 'id'>) => Opportunity
  updateOpportunity: (id: number, changes: Partial<Opportunity>) => void
  addEngagement: (record: Omit<Engagement, 'id'>) => Engagement
  updateEngagement: (id: number, changes: Partial<Engagement>) => void
  addPrestation: (record: Omit<Prestation, 'id'>) => Prestation
  updatePrestation: (id: number, changes: Partial<Prestation>) => void
  addActivity: (record: Omit<ActivityRecord, 'id'>) => ActivityRecord
  toggleActivity: (id: number) => void
  addPayment: (record: Omit<Payment, 'id'>, allocations: Array<{ prestationId: number; amount: number }>, documentAllocations?: Array<{ documentId: number; amount: number }>) => Payment
  addPaymentRequest: (record: Omit<PaymentRequest, 'id' | 'createdAt' | 'updatedAt' | 'waivedAmount' | 'status'>, items: Array<Omit<PaymentRequestItem, 'id' | 'paymentRequestId'>>) => PaymentRequest
  settlePaymentRequest: (id: number, receivedAmount: number, method: string, differenceAction?: 'transfer' | 'waive', waiverReason?: string) => void
  cancelPaymentRequest: (id: number) => void
  voidPayment: (id: number, reason: string) => void
  updatePayment: (id: number, changes: Partial<Payment>) => void
  updatePaymentWithDocumentAllocations: (id: number, changes: Partial<Payment>, allocations: Array<{ documentId: number; amount: number }>) => void
  saveDocumentAllocation: (record: Omit<DocumentPaymentAllocation, 'id'>, allocationId?: number) => void
  deleteDocumentAllocation: (id: number) => void
  addDocumentAdjustment: (record: Omit<DocumentAdjustment, 'id' | 'taxCorrectionStatus'>) => void
  addService: (record: Omit<Service, 'id'>) => Service
  updateService: (id: number, changes: Partial<Service>) => void
  toggleService: (id: number) => void
  resetDemo: () => void
}

const STORAGE_KEY = 'hazento-demo-v4'
const colors = ['#dff5e8', '#ede9ff', '#fff0d8', '#dceeff', '#f5e6f0']
const seedState: DemoState = {
  profile: { firstName: 'Francisca', lastName: 'Medina', email: 'francisca@hazento.cl', phone: '+56 9 1234 5678' },
  workspace: { name: 'Consulta Demo', country: 'Chile', currency: 'CLP', timezone: 'America/Santiago' },
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
}

function migrateDemoState(saved: DemoState): DemoState {
  const accounts = saved.accounts.map(account => {
    const nameParts = account.name.trim().split(/\s+/)
    return { ...account, workspaceId: account.workspaceId ?? 1, displayName: account.displayName || account.name, firstName: account.firstName || nameParts[0], lastName: account.lastName || nameParts.slice(1).join(' '), email: account.email ? normalizeEmail(account.email) : undefined }
  })
  const accountIdFor = (name: string) => accounts.find(account => account.name === name)?.id
  return {
    ...saved,
    profile: saved.profile ?? seedState.profile,
    workspace: saved.workspace ?? seedState.workspace,
    accounts,
    organizations: saved.organizations ?? seedOrganizations,
    contacts: saved.contacts ?? seedContacts,
    opportunities: saved.opportunities.map(opportunity => ({ ...opportunity, stage: opportunity.stage === 'Negociación' ? 'Propuesta' : opportunity.stage, accountId: opportunity.accountId ?? accountIdFor(opportunity.account), status: opportunity.status ?? (['Ganada', 'Perdida'].includes(opportunity.stage) ? opportunity.stage as 'Ganada' | 'Perdida' : 'Abierta') })),
    engagements: saved.engagements.map(engagement => ({ ...engagement, accountId: engagement.accountId ?? accountIdFor(engagement.account) })),
    prestations: saved.prestations.map(prestation => ({
      ...prestation,
      accountId: prestation.accountId ?? accountIdFor(prestation.account) ?? 0,
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
  }
}

const DemoContext = createContext<DemoStore | null>(null)

function nextId(records: Array<{ id: number }>) {
  return records.reduce((max, record) => Math.max(max, record.id), 0) + 1
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
  const [state, setState] = useState<DemoState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? migrateDemoState(JSON.parse(saved) as DemoState) : seedState
    } catch {
      return seedState
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const value = useMemo<DemoStore>(() => ({
    ...state,
    updateProfile(changes) {
      setState(current => ({ ...current, profile: { ...current.profile, ...changes } }))
    },
    updateWorkspace(changes) {
      setState(current => ({ ...current, workspace: { ...current.workspace, ...changes } }))
    },
    addAccount(record) {
      const result = prepareAccountCreate(state.accounts, record, colors)
      if (result.created) setState(current => ({ ...current, accounts: [result.account, ...current.accounts] }))
      return result.account
    },
    updateAccount(id, changes) {
      setState(current => {
        const normalizedChanges = Object.prototype.hasOwnProperty.call(changes, 'email') ? { ...changes, email: normalizeEmail(changes.email || '') || undefined } : changes
        if (normalizedChanges.email && findAccountByEmail(current.accounts, normalizedChanges.email, id)) return current
        const previous = current.accounts.find(record => record.id === id)
        const nextName = normalizedChanges.name?.trim()
        return {
          ...current,
          accounts: current.accounts.map(record => record.id === id ? { ...record, ...normalizedChanges } : record),
          // Relations remain ID-based; these names are only synchronized display snapshots
          // for legacy list rows that have not yet moved to repository joins.
          opportunities: current.opportunities.map(record => record.accountId === id && nextName ? { ...record, account: nextName, contact: record.contact === previous?.name ? nextName : record.contact } : record),
          engagements: current.engagements.map(record => record.accountId === id && nextName ? { ...record, account: nextName } : record),
          prestations: current.prestations.map(record => record.accountId === id && nextName ? { ...record, account: nextName } : record),
          payments: current.payments.map(record => record.accountId === id && nextName ? { ...record, account: nextName } : record),
        }
      })
    },
    addOrganization(record) {
      const existing = findOrganizationByName(state.organizations, record.name)
      if (existing) return existing
      const savedAt = new Date().toISOString()
      const created: Organization = { ...record, name: record.name.trim().replace(/\s+/g, ' '), id: nextId(state.organizations), createdAt: savedAt, updatedAt: savedAt }
      setState(current => ({ ...current, organizations: [created, ...current.organizations] }))
      return created
    },
    updateOrganization(id, changes) {
      setState(current => {
        if (changes.name && findOrganizationByName(current.organizations, changes.name, id)) return current
        return { ...current, organizations: current.organizations.map(record => record.id === id ? { ...record, ...changes, name: changes.name?.trim().replace(/\s+/g, ' ') || record.name, updatedAt: new Date().toISOString() } : record) }
      })
    },
    archiveOrganization(id) {
      setState(current => ({ ...current, organizations: current.organizations.map(record => record.id === id ? { ...record, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : record) }))
    },
    addContact(record) {
      const created: Contact = { ...record, id: nextId(state.contacts) }
      setState(current => ({ ...current, contacts: [...current.contacts, created] }))
      return created
    },
    addOpportunity(record) {
      const savedAt = new Date().toISOString()
      const created: Opportunity = { ...record, id: nextId(state.opportunities), createdAt: record.createdAt ?? savedAt, updatedAt: record.updatedAt ?? savedAt }
      setState(current => ({ ...current, opportunities: [created, ...current.opportunities] }))
      return created
    },
    updateOpportunity(id, changes) {
      setState(current => ({ ...current, opportunities: current.opportunities.map(record => record.id === id ? { ...record, ...changes, updatedAt: new Date().toISOString() } : record) }))
    },
    addEngagement(record) {
      const savedAt = new Date().toISOString()
      const created: Engagement = { ...record, id: nextId(state.engagements), createdAt: record.createdAt ?? savedAt, updatedAt: record.updatedAt ?? savedAt }
      setState(current => ({ ...current, engagements: [created, ...current.engagements] }))
      return created
    },
    updateEngagement(id, changes) {
      setState(current => ({ ...current, engagements: current.engagements.map(record => record.id === id ? { ...record, ...changes, updatedAt: new Date().toISOString() } : record) }))
    },
    addPrestation(record) {
      const savedAt = new Date().toISOString()
      const created: Prestation = { ...record, id: nextId(state.prestations), createdAt: record.createdAt ?? savedAt }
      setState(current => ({
        ...current,
        prestations: [created, ...current.prestations],
        activities: syncFollowUpActivity(current.activities, created, created.followUpNote || '', savedAt),
      }))
      return created
    },
    updatePrestation(id, changes) {
      setState(current => {
        const existing = current.prestations.find(record => record.id === id)
        if (!existing) return current
        const updated = { ...existing, ...changes }
        const shouldSyncFollowUp = Object.prototype.hasOwnProperty.call(changes, 'followUpNote')
        return {
          ...current,
          prestations: current.prestations.map(record => record.id === id ? updated : record),
          activities: shouldSyncFollowUp ? syncFollowUpActivity(current.activities, updated, updated.followUpNote || '', new Date().toISOString()) : current.activities,
        }
      })
    },
    addActivity(record) {
      const created: ActivityRecord = { ...record, id: nextId(state.activities), createdAt: record.createdAt ?? new Date().toISOString() }
      setState(current => ({ ...current, activities: [created, ...current.activities] }))
      return created
    },
    toggleActivity(id) {
      setState(current => ({ ...current, activities: current.activities.map(record => record.id === id ? { ...record, status: record.status === 'Completada' ? 'Pendiente' : 'Completada' } : record) }))
    },
    addPayment(record, allocations, documentAllocations = []) {
      const created: Payment = { ...record, id: nextId(state.payments), createdAt: record.createdAt ?? new Date().toISOString() }
      const firstAllocationId = nextId(state.paymentAllocations)
      const createdAllocations: PaymentAllocation[] = allocations.map((allocation, index) => ({
        id: firstAllocationId + index,
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
    addPaymentRequest(record, items) {
      const savedAt = new Date().toISOString()
      const created: PaymentRequest = { ...record, id: nextId(state.paymentRequests), status: 'Pendiente', waivedAmount: 0, createdAt: savedAt, updatedAt: savedAt }
      const firstItemId = nextId(state.paymentRequestItems)
      const createdItems = items.map((item, index) => ({ ...item, id: firstItemId + index, paymentRequestId: created.id }))
      if (!created.amount || created.amount <= 0) throw new Error('El monto solicitado debe ser mayor que cero.')
      if (!createdItems.length) throw new Error('Agrega al menos un concepto.')
      setState(current => ({ ...current, paymentRequests: [created, ...current.paymentRequests], paymentRequestItems: [...current.paymentRequestItems, ...createdItems] }))
      return created
    },
    settlePaymentRequest(id, receivedAmount, method, differenceAction, waiverReason) {
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
          const firstItemId = nextId(items)
          items = [...items, ...sourceItems.map((item, index) => ({ ...item, id: firstItemId + index, paymentRequestId: successor.id, amount: index === 0 ? successor.amount : 0 }))]
          requests = [successor, ...requests]
        }
        return { ...current, payments: [payment, ...current.payments], paymentRequests: requests, paymentRequestItems: items, paymentRequestAllocations: [...current.paymentRequestAllocations, allocation] }
      })
    },
    cancelPaymentRequest(id) {
      setState(current => ({ ...current, paymentRequests: current.paymentRequests.map(item => item.id === id && item.status === 'Pendiente' ? { ...item, status: 'Cancelada', updatedAt: new Date().toISOString() } : item) }))
    },
    voidPayment(id, reason) {
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
    updatePayment(id, changes) {
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
    updatePaymentWithDocumentAllocations(id, changes, allocations) {
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
    saveDocumentAllocation(record, allocationId) {
      setState(current => {
        const payment = current.payments.find(item => item.id === record.paymentId)
        const document = current.documents.find(item => item.id === record.documentId)
        if (!payment || !document) throw new Error('No encontramos el pago o la boleta.')
        validateAllocation({ payment, document, amount: record.amount, payments: current.payments, allocations: current.documentPaymentAllocations, adjustments: current.documentAdjustments, exceptAllocationId: allocationId })
        const allocation = { ...record, id: allocationId ?? nextId(current.documentPaymentAllocations) }
        return { ...current, documentPaymentAllocations: allocationId ? current.documentPaymentAllocations.map(item => item.id === allocationId ? allocation : item) : [...current.documentPaymentAllocations, allocation] }
      })
    },
    deleteDocumentAllocation(id) {
      setState(current => ({ ...current, documentPaymentAllocations: current.documentPaymentAllocations.filter(item => item.id !== id) }))
    },
    addDocumentAdjustment(record) {
      setState(current => {
        const document = current.documents.find(item => item.id === record.documentId)
        if (!document) throw new Error('No encontramos la boleta.')
        validateAdjustment(document, record.amount, current.payments, current.documentPaymentAllocations, current.documentAdjustments)
        const adjustment: DocumentAdjustment = { ...record, id: nextId(current.documentAdjustments), taxCorrectionStatus: document.taxStatus === 'Emitida' ? 'Pendiente' : 'No requerida' }
        return { ...current, documentAdjustments: [...current.documentAdjustments, adjustment] }
      })
    },
    addService(record) {
      const created: Service = { ...record, id: nextId(state.services) }
      setState(current => ({ ...current, services: [created, ...current.services] }))
      return created
    },
    updateService(id, changes) {
      setState(current => ({ ...current, services: current.services.map(record => record.id === id ? { ...record, ...changes } : record) }))
    },
    toggleService(id) {
      setState(current => ({ ...current, services: current.services.map(record => record.id === id ? { ...record, active: !record.active } : record) }))
    },
    resetDemo() {
      setState(seedState)
    },
  }), [state])

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemoStore() {
  const store = useContext(DemoContext)
  if (!store) throw new Error('useDemoStore must be used within DemoProvider')
  return store
}
