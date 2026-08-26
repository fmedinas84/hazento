import assert from 'node:assert/strict'
import { migrateLegacyIds } from '../src/demoIdMigration.ts'

const legacy = {
  accounts: [{ id: 1, workspaceId: 1, name: 'Persona legacy' }],
  organizations: [{ id: 1, workspaceId: 1, name: 'Empresa legacy' }],
  opportunities: [{ id: 2, accountId: 1 }],
  engagements: [{ id: 3, accountId: 1, opportunityId: 2 }],
  prestations: [{ id: 4, accountId: 1, engagementId: 3, serviceId: 5 }],
  activities: [{ id: 6, accountId: 1, prestationId: 4 }],
  services: [{ id: 5 }],
  payments: [{ id: 7, accountId: 1 }],
  paymentAllocations: [{ id: 8, paymentId: 7, prestationId: 4 }],
  paymentRequests: [{ id: 9, workspaceId: 1, accountId: 1, originPrestationId: 4 }],
  paymentRequestItems: [{ id: 10, paymentRequestId: 9, prestationId: 4 }],
  paymentRequestAllocations: [{ id: 11, paymentRequestId: 9, paymentId: 7 }],
  appointmentReminders: [{ id: 12, workspaceId: 1, accountId: 1, prestationId: 4 }],
}

const migrated = migrateLegacyIds(legacy)
const secondPass = migrateLegacyIds(migrated)

assert.equal(migrated.accounts[0].id, 'person-demo-001')
assert.equal(migrated.prestations[0].accountId, migrated.accounts[0].id)
assert.equal(migrated.prestations[0].engagementId, migrated.engagements[0].id)
assert.equal(migrated.paymentAllocations[0].paymentId, migrated.payments[0].id)
assert.equal(migrated.paymentAllocations[0].prestationId, migrated.prestations[0].id)
assert.equal(migrated.paymentRequestAllocations[0].paymentRequestId, migrated.paymentRequests[0].id)
assert.equal(migrated.appointmentReminders[0].prestationId, migrated.prestations[0].id)
assert.deepEqual(secondPass, migrated)
assert.equal(new Set(migrated.accounts.map(record => record.id)).size, migrated.accounts.length)

console.log('Demo ID migration: OK')
