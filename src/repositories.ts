import { useMemo } from 'react'
import { findAccountByEmail } from './accountEmail'
import { findOrganizationByName } from './organizationName'
import { useDemoStore } from './store'
import { documentSummary, paymentAvailable } from './documentPayments'
import { verticalLabels, type Vertical } from './data'
import { scenarioActivities, scenarioEngagements, scenarioOpportunities, scenarioPrestations } from './demoScenario'
import { DEMO_NOW } from './demoTime'
import { dataSource } from './persistence/dataSource'

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
  const vertical = ((localStorage.getItem('hazento-vertical') as Vertical) || 'health')

  return useMemo(() => {
    const labels = verticalLabels[vertical]
    const reminderContext = { supportsAppointmentReminders: labels.supportsAppointmentReminders, scheduledStatus: labels.scheduledStatus, now: DEMO_NOW }
    const addPrestation = (record: Parameters<typeof store.addPrestation>[0]) => store.addPrestation(record, reminderContext)
    const updatePrestation = (id: string, changes: Parameters<typeof store.updatePrestation>[1]) => store.updatePrestation(id, changes, reminderContext)
    const updateAccount = (id: string, changes: Parameters<typeof store.updateAccount>[1]) => store.updateAccount(id, changes, reminderContext)
    const paidPaymentIds = new Set(store.payments.filter(payment => payment.status === 'Pagado').map(payment => payment.id))
    const allocatedFor = (prestationId: string) => store.paymentAllocations
      .filter(allocation => allocation.prestationId === prestationId && paidPaymentIds.has(allocation.paymentId))
      .reduce((sum, allocation) => sum + allocation.amount, 0)

    const balanceFor = (prestationId: string) => {
      const prestation = store.prestations.find(record => record.id === prestationId)
      return Math.max(0, parseMoney(prestation?.amount || '$0') - allocatedFor(prestationId))
    }

    const statusFor = (prestationId: string) => {
      const prestation = store.prestations.find(record => record.id === prestationId)
      const total = parseMoney(prestation?.amount || '$0')
      const allocated = allocatedFor(prestationId)
      if (allocated <= 0) return 'Pendiente'
      return allocated >= total ? 'Pagado' : 'Parcial'
    }

    const scenarioPrestationRecords = dataSource === 'demo' ? scenarioPrestations(store.prestations, vertical) : store.prestations
    const opportunityRecords = dataSource === 'demo' ? scenarioOpportunities(store.opportunities, vertical) : store.opportunities
    const engagementRecords = dataSource === 'demo' ? scenarioEngagements(store.engagements, vertical) : store.engagements
    const activityRecords = dataSource === 'demo' ? scenarioActivities(store.activities, vertical) : store.activities
    const prestations = scenarioPrestationRecords.map(prestation => ({
      ...prestation,
      payment: statusFor(prestation.id),
    }))

    const getAccountPrestations = (accountId: string) => prestations.filter(prestation => prestation.accountId === accountId)
    const getAccountPayments = (accountId: string) => store.payments.filter(payment => payment.accountId === accountId)
    const getAccountAllocatedAmount = (accountId: string) => getAccountPrestations(accountId)
      .filter(prestation => prestation.status !== 'Cancelada')
      .reduce((sum, prestation) => sum + allocatedFor(prestation.id), 0)
    const getAccountWorkedAmount = (accountId: string) => getAccountPrestations(accountId)
      .filter(prestation => prestation.status !== 'Cancelada')
      .reduce((sum, prestation) => sum + parseMoney(prestation.amount), 0)
    const getAccountOutstandingAmount = (accountId: string) => Math.max(0, getAccountWorkedAmount(accountId) - getAccountAllocatedAmount(accountId))

    const accounts = {
      records: store.accounts,
      list: async () => store.accounts,
      getById: async (id: string) => store.accounts.find(record => record.id === id) ?? null,
      create: store.addAccount,
      update: updateAccount,
      findByEmail: (email: string) => findAccountByEmail(store.accounts, email),
      archive: (id: string) => updateAccount(id, { status: 'Inactivo', next: '—' }),
      getPrestations: getAccountPrestations,
      getPayments: getAccountPayments,
      getWorkedAmount: getAccountWorkedAmount,
      getAllocatedAmount: getAccountAllocatedAmount,
      getOutstandingAmount: getAccountOutstandingAmount,
    }
    const organizations = {
      records: store.organizations.filter(record => !record.archivedAt),
      list: async () => store.organizations.filter(record => !record.archivedAt),
      getById: async (id: string) => store.organizations.find(record => record.id === id) ?? null,
      create: store.addOrganization,
      update: store.updateOrganization,
      archive: store.archiveOrganization,
      findByName: (name: string) => findOrganizationByName(store.organizations, name),
    }
    const contacts = { records: store.contacts, list: async () => store.contacts, getById: async (id: string) => store.contacts.find(record => record.id === id) ?? null, create: store.addContact }
    const opportunities = { records: opportunityRecords, list: async () => opportunityRecords, getById: async (id: string) => opportunityRecords.find(record => record.id === id) ?? null, create: store.addOpportunity, update: store.updateOpportunity }
    const engagements = { records: engagementRecords, list: async () => engagementRecords, getById: async (id: string) => engagementRecords.find(record => record.id === id) ?? null, create: store.addEngagement, update: store.updateEngagement }
    const prestationsRepository = {
      records: prestations,
      list: async () => prestations,
      getById: async (id: string) => prestations.find(record => record.id === id) ?? null,
      create: addPrestation,
      update: updatePrestation,
      allocatedFor,
      balanceFor,
      getOutstandingAmountForPrestation: balanceFor,
      statusFor,
    }
    const activities = { records: activityRecords, list: async () => activityRecords, getById: async (id: string) => activityRecords.find(record => record.id === id) ?? null, create: store.addActivity, toggle: store.toggleActivity }
    const payments = {
      records: store.payments,
      list: async () => store.payments,
      getById: async (id: string) => store.payments.find(record => record.id === id) ?? null,
      allocations: store.paymentAllocations,
      create: store.addPayment,
      update: store.updatePayment,
      updateWithDocumentAllocations: store.updatePaymentWithDocumentAllocations,
      available: (paymentId: string) => {
        const payment = store.payments.find(item => item.id === paymentId)
        return payment ? paymentAvailable(payment, store.documentPaymentAllocations) : 0
      },
    }
    const paymentRequests = {
      records: store.paymentRequests,
      list: async () => store.paymentRequests,
      getById: async (id: string) => store.paymentRequests.find(record => record.id === id) ?? null,
      items: store.paymentRequestItems,
      allocations: store.paymentRequestAllocations,
      create: store.addPaymentRequest,
      settle: store.settlePaymentRequest,
      cancel: store.cancelPaymentRequest,
      summary: (requestId: string) => {
        const request = store.paymentRequests.find(item => item.id === requestId)
        if (!request) return undefined
        const paid = store.paymentRequestAllocations.filter(item => item.paymentRequestId === requestId)
          .filter(item => store.payments.some(payment => payment.id === item.paymentId && payment.status === 'Pagado'))
          .reduce((sum, item) => sum + item.amount, 0)
        const rawOutstanding = Math.max(0, request.amount - paid - request.waivedAmount)
        const transferredAmount = request.status === 'Cerrada con saldo trasladado'
          ? store.paymentRequests.filter(item => item.parentRequestId === request.id).reduce((sum, item) => sum + item.amount, 0)
          : 0
        const collectibleOutstanding = request.status === 'Pendiente' ? rawOutstanding : 0
        return { requested: request.amount, paid, waived: request.waivedAmount, forgivenAmount: request.waivedAmount, rawOutstanding, collectibleOutstanding, transferredAmount, outstanding: collectibleOutstanding }
      },
      forPrestation: (prestationId: string) => store.paymentRequests.filter(request => request.originPrestationId === prestationId || store.paymentRequestItems.some(item => item.paymentRequestId === request.id && item.prestationId === prestationId)),
      forEngagement: (engagementId: string) => store.paymentRequests.filter(request => request.originEngagementId === engagementId || store.paymentRequestItems.some(item => item.paymentRequestId === request.id && item.engagementId === engagementId)),
      collectionStatusForPrestation: (prestationId: string) => {
        const related = store.paymentRequests.filter(request => request.originPrestationId === prestationId || store.paymentRequestItems.some(item => item.paymentRequestId === request.id && item.prestationId === prestationId))
        const relevant = related.filter(request => request.status !== 'Cancelada')
        const paid = related.reduce((sum, request) => sum + store.paymentRequestAllocations
          .filter(allocation => allocation.paymentRequestId === request.id && store.payments.some(payment => payment.id === allocation.paymentId && payment.status === 'Pagado'))
          .reduce((subtotal, allocation) => subtotal + allocation.amount, 0), 0)
        const requested = related.filter(request => !request.parentRequestId).reduce((sum, request) => sum + request.amount, 0)
        if (!relevant.length && paid === 0) return 'Pago no solicitado'
        if (paid === 0) return 'Solicitado'
        return paid >= requested ? 'Pagado' : 'Pagado parcial'
      },
    }
    const voidPayment = store.voidPayment
    const documents = {
      records: store.documents,
      allocations: store.documentPaymentAllocations,
      adjustments: store.documentAdjustments,
      summary: (documentId: string) => {
        const document = store.documents.find(item => item.id === documentId)
        return document ? documentSummary(document, store.payments, store.documentPaymentAllocations, store.documentAdjustments) : undefined
      },
      saveAllocation: store.saveDocumentAllocation,
      deleteAllocation: store.deleteDocumentAllocation,
      addAdjustment: store.addDocumentAdjustment,
    }
    const services = { records: store.services, list: async () => store.services, getById: async (id: string) => store.services.find(record => record.id === id) ?? null, create: store.addService, update: store.updateService, toggle: store.toggleService }
    const reminders = {
      records: store.appointmentReminders,
      settings: store.reminderSettings,
      schedule: (prestationId: string) => updatePrestation(prestationId, {}),
      reschedule: (prestationId: string) => updatePrestation(prestationId, {}),
      cancel: store.cancelAppointmentReminders,
      getByPrestation: (prestationId: string) => store.appointmentReminders.filter(record => record.prestationId === prestationId),
      markSent: store.markReminderSent,
      markFailed: store.markReminderFailed,
      updateSettings: (changes: Parameters<typeof store.updateReminderSettings>[0]) => store.updateReminderSettings(changes, reminderContext),
    }

    return {
      repositoryStatus: store.repositoryStatus,
      repositoryError: store.repositoryError,
      retryRepository: store.retryRepository,
      signOut: store.signOut,
      profile: store.profile,
      workspace: store.workspace,
      accounts: store.accounts,
      organizations: organizations.records,
      contacts: store.contacts,
      opportunities: opportunityRecords,
      engagements: engagementRecords,
      prestations,
      activities: activityRecords,
      payments: store.payments,
      paymentAllocations: store.paymentAllocations,
      paymentRequests: store.paymentRequests,
      paymentRequestItems: store.paymentRequestItems,
      paymentRequestAllocations: store.paymentRequestAllocations,
      documents: store.documents,
      documentPaymentAllocations: store.documentPaymentAllocations,
      documentAdjustments: store.documentAdjustments,
      services: store.services,
      appointmentReminders: store.appointmentReminders,
      reminderSettings: store.reminderSettings,
      addAccount: store.addAccount,
      addOrganization: store.addOrganization,
      updateOrganization: store.updateOrganization,
      updateAccount,
      addContact: store.addContact,
      addOpportunity: store.addOpportunity,
      updateOpportunity: store.updateOpportunity,
      addEngagement: store.addEngagement,
      updateEngagement: store.updateEngagement,
      addPrestation,
      updatePrestation,
      addActivity: store.addActivity,
      toggleActivity: store.toggleActivity,
      addPayment: store.addPayment,
      updatePayment: store.updatePayment,
      updatePaymentWithDocumentAllocations: store.updatePaymentWithDocumentAllocations,
      addService: store.addService,
      updateService: store.updateService,
      toggleService: store.toggleService,
      updateProfile: store.updateProfile,
      updateWorkspace: store.updateWorkspace,
      resetDemo: store.resetDemo,
      accountRepository: accounts,
      organizationRepository: organizations,
      contactRepository: contacts,
      opportunityRepository: opportunities,
      engagementRepository: engagements,
      prestationRepository: prestationsRepository,
      activityRepository: activities,
      paymentRepository: payments,
      paymentRequestRepository: paymentRequests,
      voidPayment,
      documentRepository: documents,
      serviceRepository: services,
      reminderRepository: reminders,
    }
  }, [store, vertical])
}
