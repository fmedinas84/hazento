import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const context = React.createContext(null)
const listeners = new Map()
global.window = {
  location: { pathname: '/', search: '' },
  history: { replaceState(_, __, path) { window.location.pathname = path.split('?')[0] } },
  addEventListener(name, callback) { listeners.set(name, callback) },
  removeEventListener(name) { listeners.delete(name) },
}
let authCallback, store, landingProps, calls = 0, inserts = 0, pending = null, fail = false
const person = id => ({ id, display_name: `Persona ${id}`, workspace_id: 'workspace', status: 'prospect', updated_at: '2026-09-01T12:00:00Z' })
const people = [person('one'), person('two')]
const client = {
  auth: {
    getSession: async () => ({ data: { session: { user } }, error: null }),
    onAuthStateChange(callback) { authCallback = callback; return { data: { subscription: { unsubscribe() {} } } } },
  },
  async rpc() { calls++; if (pending) await pending; return { data: fail ? null : 'workspace', error: fail ? { message: 'unavailable' } : null } },
  from(table) {
    let inserting = false
    return {
      select() { return this }, eq() { return this }, single() { return this }, maybeSingle() { return this },
      insert() { inserts++; inserting = true; return this },
      then(resolve, reject) {
        const data = table === 'profiles' ? { first_name: 'QA' }
          : table === 'workspaces' ? { name: 'QA workspace', country_code: 'CL', currency_code: 'CLP', timezone: 'America/Santiago' }
          : table === 'subscriptions' ? { plan: 'plus', status: 'active' }
          : table === 'accounts' ? inserting ? person('new') : people : []
        return Promise.resolve({ data, error: null }).then(resolve, reject)
      },
    }
  },
}
const source = process.argv.includes('--baseline')
  ? execFileSync('git', ['show', 'origin/main:src/persistence/SupabaseDataProvider.tsx'], { encoding: 'utf8' })
  : fs.readFileSync(new URL('../src/persistence/SupabaseDataProvider.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const exports = {}
new Function('require', 'exports', compiled)(name => {
  if (name === '../lib/supabase') return { supabase: client }
  if (name === '../store') return { DataStoreContext: context }
  if (name === '../reminders') return { defaultReminderSettings: {} }
  if (name === '../countries') return { enabledCountryCode: () => 'CL', isCountryCode: () => true }
  if (name === '../public/PublicLanding') return { PublicLanding: props => { landingProps = props; return React.createElement('div', null, 'Landing') } }
  return require(name)
}, exports)
function Probe() { store = React.useContext(context); return React.createElement('button', { disabled: store.repositoryStatus !== 'ready' }, store.accounts.length) }
let tree
const user = { id: 'user-a', email: 'qa@example.invalid', user_metadata: {} }
const emit = (event, current = user) => act(async () => authCallback(event, current ? { user: current } : null))
const navigate = path => act(async () => { window.location.pathname = path; listeners.get('popstate')() })
await act(async () => { tree = TestRenderer.create(React.createElement(exports.SupabaseDataProvider, null, React.createElement(Probe))) })
await emit('INITIAL_SESSION')
assert.equal(calls, 0, 'Public landing must not query CRM')
let release
pending = new Promise(resolve => { release = resolve })
await navigate('/app')
assert.equal(calls, 1)
assert.equal(store.repositoryStatus, 'loading')
assert.equal(tree.root.findByType('button').props.disabled, true)
await assert.rejects(store.addAccount({ name: 'QA' }))
assert.equal(inserts, 0, 'No mutation before workspace is ready')
await act(async () => { pending = null; release() })
assert.equal(store.repositoryStatus, 'ready')
assert.equal(store.accounts.length, 2)
await emit('TOKEN_REFRESHED', { ...user })
await emit('SIGNED_IN', { ...user })
assert.equal(calls, 1, 'Same-user events must not clear or reload data')
await navigate('/')
await navigate('/clientes')
assert.equal(calls, 1, 'Internal navigation retains loaded workspace')
await act(async () => { await store.addAccount({ name: 'QA' }) })
assert.equal(inserts, 1)
assert.equal(store.repositoryStatus, 'ready')

// A late response must never restore data after sign-out or for another user.
pending = new Promise(resolve => { release = resolve })
await act(async () => { store.retryRepository() })
await emit('SIGNED_OUT', null)
await act(async () => { pending = null; release() })
assert.ok(!landingProps.user)
assert.equal(tree.root.findAllByType('button').length, 0)
await navigate('/app')
fail = true
await emit('SIGNED_IN', { ...user, id: 'user-b' })
assert.equal(store.repositoryStatus, 'error')
assert.equal(store.accounts.length, 0)
const failedCalls = calls
await emit('TOKEN_REFRESHED', { ...user, id: 'user-b' })
assert.equal(calls, failedCalls, 'Failure needs explicit retry, no loop')
fail = false
await act(async () => { await store.retryRepository() })
assert.equal(store.repositoryStatus, 'ready')
assert.equal(store.accounts.length, 2)
await act(async () => { tree.unmount() })

// Direct authenticated reload and successful login callback also initialize once.
for (const direct of [true, false]) {
  window.location.pathname = direct ? '/clientes' : '/login'
  await act(async () => { tree = TestRenderer.create(React.createElement(exports.SupabaseDataProvider, null, React.createElement(Probe))) })
  const before = calls
  if (direct) await emit('INITIAL_SESSION')
  else await act(async () => { landingProps.onAuthenticated(user) })
  assert.equal(calls, before + 1)
  assert.equal(store.repositoryStatus, 'ready')
  assert.equal(store.accounts.length, 2)
  if (direct) assert.equal(window.location.pathname, '/clientes', 'Session restore must not redirect to login')
  await act(async () => { tree.unmount() })
}
console.log('Workspace session tests passed: landing entry, direct reload, login, mutation guard, creation, refresh, sign-out, failure/retry and account change.')
