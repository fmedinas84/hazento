import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  type ActivityData,
  type PrestationData,
  accounts as seedAccounts,
  activities as seedActivities,
  engagements as seedEngagements,
  opportunities as seedOpportunities,
  paymentAllocations as seedPaymentAllocations,
  payments as seedPayments,
  prestations as seedPrestations,
  services as seedServices,
} from './data'

export type Account = (typeof seedAccounts)[number]
export type Opportunity = (typeof seedOpportunities)[number]
export type Engagement = (typeof seedEngagements)[number]
export type Prestation = PrestationData
export type ActivityRecord = ActivityData
export type Payment = (typeof seedPayments)[number]
export type PaymentAllocation = (typeof seedPaymentAllocations)[number]
export type Service = (typeof seedServices)[number]

type DemoState = {
  accounts: Account[]
  opportunities: Opportunity[]
  engagements: Engagement[]
  prestations: Prestation[]
  activities: ActivityRecord[]
  payments: Payment[]
  paymentAllocations: PaymentAllocation[]
  services: Service[]
}

type DemoStore = DemoState & {
  addAccount: (record: Omit<Account, 'id' | 'initials' | 'color'>) => Account
  updateAccount: (id: number, changes: Partial<Account>) => void
  addOpportunity: (record: Omit<Opportunity, 'id'>) => Opportunity
  updateOpportunity: (id: number, changes: Partial<Opportunity>) => void
  addEngagement: (record: Omit<Engagement, 'id'>) => Engagement
  updateEngagement: (id: number, changes: Partial<Engagement>) => void
  addPrestation: (record: Omit<Prestation, 'id'>) => Prestation
  updatePrestation: (id: number, changes: Partial<Prestation>) => void
  addActivity: (record: Omit<ActivityRecord, 'id'>) => ActivityRecord
  toggleActivity: (id: number) => void
  addPayment: (record: Omit<Payment, 'id'>, allocations: Array<{ prestationId: number; amount: number }>) => Payment
  addService: (record: Omit<Service, 'id'>) => Service
  updateService: (id: number, changes: Partial<Service>) => void
  toggleService: (id: number) => void
  resetDemo: () => void
}

const STORAGE_KEY = 'hazento-demo-v4'
const colors = ['#dff5e8', '#ede9ff', '#fff0d8', '#dceeff', '#f5e6f0']
const seedState: DemoState = {
  accounts: seedAccounts,
  opportunities: seedOpportunities,
  engagements: seedEngagements,
  prestations: seedPrestations,
  activities: seedActivities,
  payments: seedPayments,
  paymentAllocations: seedPaymentAllocations,
  services: seedServices,
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
      return saved ? JSON.parse(saved) as DemoState : seedState
    } catch {
      return seedState
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const value = useMemo<DemoStore>(() => ({
    ...state,
    addAccount(record) {
      const names = record.name.trim().split(/\s+/)
      const created: Account = {
        ...record,
        id: nextId(state.accounts),
        initials: names.slice(0, 2).map(name => name[0]?.toUpperCase()).join(''),
        color: colors[state.accounts.length % colors.length],
      }
      setState(current => ({ ...current, accounts: [created, ...current.accounts] }))
      return created
    },
    updateAccount(id, changes) {
      setState(current => ({ ...current, accounts: current.accounts.map(record => record.id === id ? { ...record, ...changes } : record) }))
    },
    addOpportunity(record) {
      const created: Opportunity = { ...record, id: nextId(state.opportunities) }
      setState(current => ({ ...current, opportunities: [created, ...current.opportunities] }))
      return created
    },
    updateOpportunity(id, changes) {
      setState(current => ({ ...current, opportunities: current.opportunities.map(record => record.id === id ? { ...record, ...changes } : record) }))
    },
    addEngagement(record) {
      const created: Engagement = { ...record, id: nextId(state.engagements) }
      setState(current => ({ ...current, engagements: [created, ...current.engagements] }))
      return created
    },
    updateEngagement(id, changes) {
      setState(current => ({ ...current, engagements: current.engagements.map(record => record.id === id ? { ...record, ...changes } : record) }))
    },
    addPrestation(record) {
      const created: Prestation = { ...record, id: nextId(state.prestations) }
      const savedAt = new Date().toISOString()
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
      const created: ActivityRecord = { ...record, id: nextId(state.activities) }
      setState(current => ({ ...current, activities: [created, ...current.activities] }))
      return created
    },
    toggleActivity(id) {
      setState(current => ({ ...current, activities: current.activities.map(record => record.id === id ? { ...record, status: record.status === 'Completada' ? 'Pendiente' : 'Completada' } : record) }))
    },
    addPayment(record, allocations) {
      const created: Payment = { ...record, id: nextId(state.payments) }
      const firstAllocationId = nextId(state.paymentAllocations)
      const createdAllocations: PaymentAllocation[] = allocations.map((allocation, index) => ({
        id: firstAllocationId + index,
        paymentId: created.id,
        prestationId: allocation.prestationId,
        amount: allocation.amount,
      }))
      setState(current => ({
        ...current,
        payments: [created, ...current.payments],
        paymentAllocations: [...current.paymentAllocations, ...createdAllocations],
      }))
      return created
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
