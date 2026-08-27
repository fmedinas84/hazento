import { createClient } from '@supabase/supabase-js'
import assert from 'node:assert/strict'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) throw new Error('Faltan variables públicas de Supabase staging.')
if (!url.includes('nsqwooyjcmsrlbldwcne')) throw new Error('La prueba solo puede ejecutarse contra el proyecto staging validado.')

const runId = Date.now().toString(36)
const password = `Hazento-${crypto.randomUUID()}!aA1`
const createQa = async label => {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const email = `hazento-qa-${label}-${runId}@example.com`
  const { data, error } = await client.auth.signUp({ email, password })
  assert.ifError(error)
  assert.ok(data.session, 'Staging debe tener confirmación de email deshabilitada para esta prueba.')
  const { data: workspaceId, error: bootstrapError } = await client.rpc('bootstrap_user_workspace', { p_workspace_name: `QA ${label} ${runId}`, p_vertical_type: 'creative', p_first_name: 'QA', p_last_name: label })
  assert.ifError(bootstrapError)
  assert.ok(workspaceId)
  return { client, email, workspaceId }
}

const insertOne = async (client, table, value) => {
  const { data, error } = await client.from(table).insert(value).select().single()
  assert.ifError(error)
  return data
}

const a = await createQa('a')
const b = await createQa('b')
assert.notEqual(a.workspaceId, b.workspaceId)

const organization = await insertOne(a.client, 'organizations', { workspace_id: a.workspaceId, name: `Acme QA ${runId}` })
const person = await insertOne(a.client, 'accounts', { workspace_id: a.workspaceId, account_type: 'person', status: 'active', display_name: `Cliente QA ${runId}`, email: `cliente-${runId}@example.com`, organization_id: organization.id })
const opportunity = await insertOne(a.client, 'opportunities', { workspace_id: a.workspaceId, account_id: person.id, name: `Oportunidad QA ${runId}`, stage: 'Nuevo', status: 'open', estimated_amount: 30000 })
const engagement = await insertOne(a.client, 'engagements', { workspace_id: a.workspaceId, account_id: person.id, opportunity_id: opportunity.id, engagement_type: 'project', name: `Proyecto QA ${runId}`, status: 'active', billing_type: 'one_off', agreed_amount: 30000 })
const prestation = await insertOne(a.client, 'prestations', { workspace_id: a.workspaceId, account_id: person.id, engagement_id: engagement.id, opportunity_id: opportunity.id, name: `Entregable QA ${runId}`, scheduled_start: '2026-08-26T20:00:00.000Z', status: 'pending', unit_price: 30000, quantity: 1, total_amount: 30000 })
await insertOne(a.client, 'activities', { workspace_id: a.workspaceId, account_id: person.id, prestation_id: prestation.id, activity_type: 'task', title: `Seguimiento QA ${runId}`, status: 'pending', scheduled_at: '2026-08-27T13:00:00.000Z' })
const { data: requestId, error: requestError } = await a.client.rpc('create_payment_request_with_items', { p_account_id: person.id, p_amount: 30000, p_origin_prestation_id: prestation.id, p_items: [{ prestation_id: prestation.id, engagement_id: null, description: 'Entregable QA', amount: 30000 }] })
assert.ifError(requestError); assert.ok(requestId)
const { data: request, error: requestReadError } = await a.client.from('payment_requests').select('*').eq('id', requestId).single()
assert.ifError(requestReadError)
const { data: settlement, error: settlementError } = await a.client.rpc('settle_payment_request', { p_request_id: request.id, p_received_amount: 20000, p_payment_method: 'Transferencia', p_difference_action: 'transfer' })
assert.ifError(settlementError)
assert.equal(settlement?.length, 1)

const { data: aRows, error: aReadError } = await a.client.from('accounts').select('id').eq('id', person.id)
assert.ifError(aReadError); assert.equal(aRows.length, 1)
const { data: leaked, error: bReadError } = await b.client.from('accounts').select('id').eq('id', person.id)
assert.ifError(bReadError); assert.equal(leaked.length, 0)
const { error: crossInsertError } = await b.client.from('accounts').insert({ workspace_id: a.workspaceId, account_type: 'person', status: 'active', display_name: 'Intruso QA' })
assert.ok(crossInsertError, 'RLS debe rechazar una escritura cruzada.')
const { error: duplicateError } = await a.client.from('accounts').insert({ workspace_id: a.workspaceId, account_type: 'person', status: 'active', display_name: 'Duplicado QA', email: ` CLIENTE-${runId}@EXAMPLE.COM ` })
assert.ok(duplicateError, 'La unicidad de email normalizado debe bloquear duplicados.')

const { data: persisted, error: persistedError } = await a.client.from('payment_requests').select('id,status,parent_request_id,amount').or(`id.eq.${request.id},parent_request_id.eq.${request.id}`)
assert.ifError(persistedError)
assert.equal(persisted.length, 2)
assert.ok(persisted.some(row => row.status === 'closed_transferred'))
assert.ok(persisted.some(row => row.status === 'pending' && Number(row.amount) === 10000))

console.log(JSON.stringify({ staging: true, users: 2, isolated: true, persisted: true, partialPayment: 20000, successorBalance: 10000 }))
