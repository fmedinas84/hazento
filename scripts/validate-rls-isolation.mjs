import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, QA_PASSWORD } = process.env
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !QA_PASSWORD) throw new Error('Faltan variables QA.')
const stamp = Date.now()
const makeClient = () => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })

async function provision(label) {
  const client = makeClient()
  const email = `hazento.qa.${label}.${stamp}@gmail.com`
  const auth = await client.auth.signUp({ email, password: QA_PASSWORD })
  if (auth.error || !auth.data.session) throw auth.error || new Error(`Sin sesión para ${label}`)
  const bootstrap = await client.rpc('bootstrap_user_workspace', { p_workspace_name: `QA ${label}`, p_vertical_type: label === 'a' ? 'health' : 'creative', p_first_name: 'QA', p_last_name: label.toUpperCase() })
  if (bootstrap.error) throw bootstrap.error
  const workspaceId = bootstrap.data
  const membership = await client.from('workspace_members').select('id, role').eq('workspace_id', workspaceId).single()
  if (membership.error || membership.data.role !== 'owner') throw membership.error || new Error('Membresía owner ausente')
  const person = await client.from('accounts').insert({ workspace_id: workspaceId, account_type:'person', display_name:`Persona ${label}`, email, status:'active' }).select().single()
  if (person.error) throw person.error
  return { client, userId: auth.data.user.id, workspaceId, membershipId: membership.data.id, personId: person.data.id }
}

const a = await provision('a')
const b = await provision('b')
const checks = []
const expectHidden = async (name, promise) => { const r = await promise; if (r.error) throw r.error; if ((r.data || []).length !== 0) throw new Error(`${name}: filtración de lectura`); checks.push(name) }
const expectRejected = async (name, promise) => { const r = await promise; if (!r.error) throw new Error(`${name}: escritura no fue rechazada`); checks.push(name) }
const expectNoRows = async (name, promise) => { const r = await promise; if (r.error) { checks.push(name); return } if ((r.data || []).length !== 0) throw new Error(`${name}: modificó una fila protegida`); checks.push(name) }

await expectHidden('A cannot read B by workspace', a.client.from('accounts').select('id').eq('workspace_id', b.workspaceId))
await expectHidden('A cannot read known B id', a.client.from('accounts').select('id').eq('id', b.personId))
await expectRejected('A cannot insert into B', a.client.from('accounts').insert({ workspace_id:b.workspaceId, account_type:'person', display_name:'Cross tenant', status:'active' }))
await expectNoRows('A cannot update B', a.client.from('accounts').update({ display_name:'Cross update' }).eq('id', b.personId).select('id'))
await expectNoRows('A cannot delete B', a.client.from('accounts').delete().eq('id', b.personId).select('id'))
await expectRejected('A cannot relate own opportunity to B person', a.client.from('opportunities').insert({ workspace_id:a.workspaceId, account_id:b.personId, name:'Cross relation', stage:'new', status:'open' }))
await expectNoRows('A cannot change membership role', a.client.from('workspace_members').update({ role:'admin' }).eq('id', a.membershipId).select('id'))
await expectRejected('A cannot become owner of B', a.client.from('workspace_members').insert({ workspace_id:b.workspaceId, user_id:a.userId, role:'owner' }))
await expectHidden('B cannot read A', b.client.from('accounts').select('id').eq('workspace_id', a.workspaceId))
await expectNoRows('B cannot update A', b.client.from('accounts').update({ display_name:'Cross update' }).eq('id', a.personId).select('id'))

console.log(JSON.stringify({ stage:'rls-isolation', users:2, workspaces:2, checks }))
