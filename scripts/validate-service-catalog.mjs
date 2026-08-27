import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) throw new Error('Faltan variables públicas de Supabase staging.')
if (!url.includes('nsqwooyjcmsrlbldwcne')) throw new Error('Esta prueba solo puede ejecutarse contra staging.')

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const runId = Date.now().toString(36)
const { data: signup, error: signupError } = await client.auth.signUp({
  email: `hazento-services-${runId}@example.com`,
  password: `Hazento-${crypto.randomUUID()}!aA1`,
})
assert.ifError(signupError)
assert.ok(signup.session)

const bootstrap = () => client.rpc('bootstrap_user_workspace', {
  p_workspace_name: `Servicios QA ${runId}`,
  p_vertical_type: 'health',
  p_first_name: 'Servicios',
  p_last_name: 'QA',
})
const { data: workspaceId, error: bootstrapError } = await bootstrap()
assert.ifError(bootstrapError)
assert.ok(workspaceId)

const { data: initial, error: initialError } = await client.from('services').select('id,name,active').eq('workspace_id', workspaceId).order('name')
assert.ifError(initialError)
assert.equal(initial.length, 4)
assert.ok(initial.some(service => service.name === 'Sesión individual'))

const target = initial[0]
const { error: toggleError } = await client.from('services').update({ active: false }).eq('workspace_id', workspaceId).eq('id', target.id).select().single()
assert.ifError(toggleError)

const { error: secondBootstrapError } = await bootstrap()
assert.ifError(secondBootstrapError)
const { data: after, error: afterError } = await client.from('services').select('id,active').eq('workspace_id', workspaceId)
assert.ifError(afterError)
assert.equal(after.length, 4)
assert.equal(after.find(service => service.id === target.id)?.active, false)

console.log(JSON.stringify({ staging: true, workspaceId, services: after.length, togglePersisted: true, bootstrapIdempotent: true }))
