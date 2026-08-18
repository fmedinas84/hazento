import { useMemo } from 'react'
import { useDemoStore } from './store'

export const parseMoney = (value: string) => Number(value.replace(/[^0-9-]/g, '')) || 0
export const formatMoney = (value: number) => `$${Math.max(0, Math.round(value)).toLocaleString('es-CL')}`

/**
 * Temporary data-access boundary for the product validation phase.
 *
 * React screens consume this contract and never access localStorage. A future
 * Supabase implementation can satisfy the same repositories without changing
 * the screens or the product flows.
 */
export function useRepositories() {
  const store = useDemoStore()

  return useMemo(() => {
    const allocatedFor = (prestationId: number) => store.paymentAllocations
      .filter(allocation => allocation.prestationId === prestationId)
      .reduce((sum, allocation) => sum + allocation.amount, 0)

    const balanceFor = (prestationId: number) => {
      const prestation = store.prestations.find(record => record.id === prestationId)
      return Math.max(0, parseMoney(prestation?.amount || '$0') - allocatedFor(prestationId))
    }

    const statusFor = (prestationId: number) => {
      const prestation = store.prestations.find(record => record.id === prestationId)
      const total = parseMoney(prestation?.amount || '$0')
      const allocated = allocatedFor(prestationId)
      if (allocated <= 0) return 'Pendiente'
      return allocated >= total ? 'Pagado' : 'Parcial'
    }

    const prestations = store.prestations.map(prestation => ({
      ...prestation,
      payment: statusFor(prestation.id),
    }))

    const accounts = {
      records: store.accounts,
      create: store.addAccount,
      update: store.updateAccount,
      archive: (id: number) => store.updateAccount(id, { status: 'Inactivo', next: '—' }),
    }
    const opportunities = { records: store.opportunities, create: store.addOpportunity, update: store.updateOpportunity }
    const engagements = { records: store.engagements, create: store.addEngagement, update: store.updateEngagement }
    const prestationsRepository = {
      records: prestations,
      create: store.addPrestation,
      update: store.updatePrestation,
      allocatedFor,
      balanceFor,
      statusFor,
    }
    const activities = { records: store.activities, create: store.addActivity, toggle: store.toggleActivity }
    const payments = {
      records: store.payments,
      allocations: store.paymentAllocations,
      create: store.addPayment,
    }
    const services = { records: store.services, create: store.addService, update: store.updateService, toggle: store.toggleService }

    return {
      accounts: store.accounts,
      opportunities: store.opportunities,
      engagements: store.engagements,
      prestations,
      activities: store.activities,
      payments: store.payments,
      paymentAllocations: store.paymentAllocations,
      services: store.services,
      addAccount: store.addAccount,
      updateAccount: store.updateAccount,
      addOpportunity: store.addOpportunity,
      updateOpportunity: store.updateOpportunity,
      addEngagement: store.addEngagement,
      updateEngagement: store.updateEngagement,
      addPrestation: store.addPrestation,
      updatePrestation: store.updatePrestation,
      addActivity: store.addActivity,
      toggleActivity: store.toggleActivity,
      addPayment: store.addPayment,
      addService: store.addService,
      updateService: store.updateService,
      toggleService: store.toggleService,
      resetDemo: store.resetDemo,
      accountRepository: accounts,
      opportunityRepository: opportunities,
      engagementRepository: engagements,
      prestationRepository: prestationsRepository,
      activityRepository: activities,
      paymentRepository: payments,
      serviceRepository: services,
    }
  }, [store])
}
