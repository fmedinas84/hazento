import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/billing.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
let row = { plan: 'plus', status: 'active', provider: 'manual' }
let failure = null
const client = {
  auth: { getUser: async () => ({ data: { user: { id: 'user' } }, error: null }) },
  from(table) {
    const query = {
      select() { return this }, eq() { return this }, order() { return this }, limit() { return this },
      single: async () => ({ data: { workspace_id: 'workspace' }, error: null }),
      maybeSingle: async () => ({ data: row, error: failure }),
    }
    assert.ok(['workspace_members', 'subscriptions'].includes(table))
    return query
  },
}
const exports = {}
new Function('require', 'exports', compiled)(name => {
  if (name === './lib/supabase') return { supabase: client }
  if (name === './persistence/dataSource') return { dataSource: 'supabase' }
  if (name === './productPlans') return { productPlans: { free: { price: 0 }, plus: { price: 4990 } } }
  throw new Error(name)
}, exports)
const repo = exports.billingRepository
assert.equal((await repo.getSubscription()).plan, 'plus')
assert.equal((await repo.getSubscription()).paymentMethod, 'Habilitación manual')
row = { plan: 'free', status: 'free', provider: null }
assert.equal((await repo.getSubscription()).plan, 'free')
row = null
assert.equal(await repo.getSubscription(), null)
failure = { message: 'Network error' }
await assert.rejects(repo.getSubscription())
console.log('Billing plan validation passed: manual Plus, Free, missing subscription and failed lookup without local billing session.')
