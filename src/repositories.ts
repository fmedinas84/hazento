import { useMemo } from 'react'
import { findAccountByEmail } from './accountEmail'
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
    const paidPaymentIds = new Set(store.payments.filter(payment => payment.status === 'Pagado').map(payment => payment.id))
    const allocatedFor = (prestationId: number) => store.paymentAllocations
      .filter(allocation => allocation.prestationId === prestationId && paidPaymentIds.has(allocation.paymentId))
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

    const getAccountPrestations = (accountId: number) => prestations.filter(prestation => prestation.accountId === accountId)
    const getAccountPayments = (accountId: number) => store.payments.filter(payment => payment.accountId === accountId)
    const getAccountAllocatedAmount = (accountId: number) => getAccountPrestations(accountId)
      .filter(prestation => prestation.status !== 'Cancelada')
      .reduce((sum, prestation) => sum + allocatedFor(prestation.id), 0)
    const getAccountWorkedAmount = (accountId: number) => getAccountPrestations(accountId)
      .filter(prestation => prestation.status !== 'Cancelada')
      .reduce((sum, prestation) => sum + parseMoney(prestation.amount), 0)
    const getAccountOutstandingAmount = (accountId: number) => Math.max(0, getAccountWorkedAmount(accountId) - getAccountAllocatedAmount(accountId))

    const accounts = {
      records: store.accounts,
      create: store.addAccount,
      update: store.updateAccount,
      findByEmail: (email: string) => findAccountByEmail(store.accounts, email),
      archive: (id: number) => store.updateAccount(id, { status: 'Inactivo', next: '—' }),
      getPrestations: getAccountPrestations,
      getPayments: getAccountPayments,
      getWorkedAmount: getAccountWorkedAmount,
      getAllocatedAmount: getAccountAllocatedAmount,
      getOutstandingAmount: getAccountOutstandingAmount,
    }
    const contacts = { records: store.contacts, create: store.addContact }
    const opportunities = { records: store.opportunities, create: store.addOpportunity, update: store.updateOpportunity }
    const engagements = { records: store.engagements, create: store.addEngagement, update: store.updateEngagement }
    const prestationsRepository = {
      records: prestations,
      create: store.addPrestation,
      update: store.updatePrestation,
      allocatedFor,
      balanceFor,
      getOutstandingAmountForPrestation: balanceFor,
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
      contacts: store.contacts,
      opportunities: store.opportunities,
      engagements: store.engagements,
      prestations,
      activities: store.activities,
      payments: store.payments,
      paymentAllocations: store.paymentAllocations,
      services: store.services,
      addAccount: store.addAccount,
      updateAccount: store.updateAccount,
      addContact: store.addContact,
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
      contactRepository: contacts,
      opportunityRepository: opportunities,
      engagementRepository: engagements,
      prestationRepository: prestationsRepository,
      activityRepository: activities,
      paymentRepository: payments,
      serviceRepository: services,
    }
  }, [store])
}
