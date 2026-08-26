const collectionKinds: Record<string, string> = {
  accounts: 'person', organizations: 'organization', contacts: 'contact', opportunities: 'opportunity', engagements: 'engagement',
  prestations: 'prestation', activities: 'activity', payments: 'payment', paymentAllocations: 'payment-allocation',
  paymentRequests: 'payment-request', paymentRequestItems: 'payment-request-item', paymentRequestAllocations: 'payment-request-allocation',
  documents: 'document', documentPaymentAllocations: 'document-payment-allocation', documentAdjustments: 'document-adjustment',
  services: 'service', appointmentReminders: 'reminder',
}

const idKindByField: Record<string, string> = {
  workspaceId: 'workspace', accountId: 'person', personId: 'person', organizationId: 'organization', contactId: 'contact',
  opportunityId: 'opportunity', engagementId: 'engagement', prestationId: 'prestation', serviceId: 'service', activityId: 'activity',
  originEngagementId: 'engagement', originPrestationId: 'prestation', paymentId: 'payment', paymentRequestId: 'payment-request',
  parentRequestId: 'payment-request', documentId: 'document', providerSubscriptionId: 'subscription', subscriptionId: 'subscription', recordId: 'record',
}

export const stableDemoId = (kind: string, value: unknown) => {
  if (value === undefined || value === null || value === '') return value
  const text = String(value)
  return /^\d+$/.test(text) ? `${kind}-demo-${text.padStart(3, '0')}` : text
}

function migrateRecord(record: Record<string, unknown>, kind: string) {
  const result: Record<string, unknown> = { ...record, id: stableDemoId(kind, record.id) }
  Object.entries(idKindByField).forEach(([field, targetKind]) => {
    if (field in result) result[field] = stableDemoId(targetKind, result[field])
  })
  return result
}

/** Migrates numeric legacy IDs once while preserving every relationship. */
export function migrateLegacyIds<T extends object>(saved: T): T {
  const result = { ...saved } as Record<string, unknown>
  Object.entries(collectionKinds).forEach(([collection, kind]) => {
    const records = result[collection]
    if (Array.isArray(records)) result[collection] = records.map(record => migrateRecord(record as Record<string, unknown>, kind))
  })
  return result as T
}
