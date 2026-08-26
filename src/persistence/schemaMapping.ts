/**
 * Explicit naming bridge. Components keep product concepts while persistence
 * adapters translate to stable PostgreSQL tables and snake_case columns.
 */
export const persistenceSchema = {
  person: 'accounts',
  organization: 'organizations',
  opportunity: 'opportunities',
  engagement: 'engagements',
  prestation: 'prestations',
  activity: 'activities',
  paymentRequest: 'payment_requests',
  payment: 'payments',
  paymentAllocation: 'payment_allocations',
  subscription: 'subscriptions',
  appointmentReminder: 'appointment_reminders',
} as const

export type PersistenceEntity = keyof typeof persistenceSchema
