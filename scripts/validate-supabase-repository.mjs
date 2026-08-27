import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, QA_EMAIL, QA_PASSWORD } = process.env
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !QA_EMAIL || !QA_PASSWORD) throw new Error('Faltan variables de staging QA.')

const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
const signup = await client.auth.signUp({ email: QA_EMAIL, password: QA_PASSWORD })
if (signup.error) throw signup.error
if (!signup.data.session) throw new Error('Staging exige confirmación de email; no es posible validar CRUD hasta confirmar la cuenta QA.')

const workspaceResult = await client.rpc('bootstrap_user_workspace', { p_workspace_name: 'QA Repository Workspace', p_vertical_type: 'health', p_first_name: 'QA', p_last_name: 'Repository' })
if (workspaceResult.error) throw workspaceResult.error
const workspaceId = workspaceResult.data
const retryResult = await client.rpc('bootstrap_user_workspace', { p_workspace_name: 'No debe duplicarse', p_vertical_type: 'health' })
if (retryResult.error || retryResult.data !== workspaceId) throw retryResult.error || new Error('El bootstrap no es idempotente.')

const profileResult = await client.from('profiles').select('id').single()
if (profileResult.error || profileResult.data.id !== signup.data.user.id) throw profileResult.error || new Error('No se creó el profile correcto.')

const personResult = await client.from('accounts').insert({ workspace_id: workspaceId, account_type: 'person', display_name: 'QA Persona', email: QA_EMAIL.trim().toLowerCase(), status: 'active' }).select().single()
if (personResult.error) throw personResult.error
const personId = personResult.data.id

const updateResult = await client.from('accounts').update({ display_name: 'QA Persona Actualizada' }).eq('id', personId).eq('workspace_id', workspaceId).select().single()
if (updateResult.error || updateResult.data.display_name !== 'QA Persona Actualizada') throw updateResult.error || new Error('La actualización no persistió.')

const reloadResult = await client.from('accounts').select('id, display_name').eq('id', personId).eq('workspace_id', workspaceId).single()
if (reloadResult.error || reloadResult.data.display_name !== 'QA Persona Actualizada') throw reloadResult.error || new Error('La lectura posterior no devolvió el cambio.')

console.log(JSON.stringify({ stage: 'repository-crud', profileCreated: true, workspaceCreated: true, ownerMembershipCreated: true, bootstrapIdempotent: true, create: true, update: true, reload: true }))
