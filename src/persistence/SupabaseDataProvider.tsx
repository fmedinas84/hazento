import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AccountData, ActivityData, EngagementData, OpportunityData, OrganizationData, PaymentData, PaymentRequestData, PaymentRequestItemData, PrestationData } from '../data'
import { DataStoreContext, type DataState, type DataStore } from '../store'
import type { AppointmentReminder, ReminderSettings, ReminderSyncContext } from '../reminders'
import { defaultReminderSettings } from '../reminders'
import type { Database } from '../types/database.types'

type Tables = Database['public']['Tables']
type AccountRow = Tables['accounts']['Row']
type OrganizationRow = Tables['organizations']['Row']
type ServiceRow = Tables['services']['Row']
type OpportunityRow = Tables['opportunities']['Row']
type EngagementRow = Tables['engagements']['Row']
type PrestationRow = Tables['prestations']['Row']
type ActivityRow = Tables['activities']['Row']
type PaymentRow = Tables['payments']['Row']
type AllocationRow = Tables['payment_allocations']['Row']
type PaymentRequestRow = Tables['payment_requests']['Row']
type PaymentRequestItemRow = Tables['payment_request_items']['Row']
type ReminderRow = Tables['appointment_reminders']['Row']

const emptyState: DataState = {
  profile: { firstName: '', lastName: '', email: '', phone: '' },
  workspace: { name: '', address: '', country: 'Chile', currency: 'CLP', timezone: 'America/Santiago' },
  accounts: [], organizations: [], contacts: [], opportunities: [], engagements: [], prestations: [], activities: [],
  payments: [], paymentAllocations: [], paymentRequests: [], paymentRequestItems: [], paymentRequestAllocations: [],
  documents: [], documentPaymentAllocations: [], documentAdjustments: [], services: [], appointmentReminders: [],
  reminderSettings: defaultReminderSettings,
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
const money = (value: number | null) => `$${Math.round(Number(value || 0)).toLocaleString('es-CL')}`
const formatDate = (value?: string | null, withTime = false) => {
  if (!value) return '—'
  const date = new Date(value.length === 10 ? `${value}T12:00:00-04:00` : value)
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', timeZone: 'America/Santiago' }
  if (withTime) Object.assign(options, { hour: '2-digit', minute: '2-digit', hour12: false })
  return new Intl.DateTimeFormat('es-CL', options).format(date).replace('.', '').replace(',', ' ·')
}
const parseMoney = (value: string) => Number(value.replace(/[^0-9-]/g, '')) || 0
const scheduledIso = (value?: string) => {
  if (!value) return undefined
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value
  const match = value.match(/^(\d{1,2})\s+(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)(?:\s*·\s*(\d{2}):(\d{2}))?$/)
  if (!match) return undefined
  const month = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].indexOf(match[2]) + 1
  return `2026-${String(month).padStart(2,'0')}-${match[1].padStart(2,'0')}T${match[3] || '12'}:${match[4] || '00'}:00-04:00`
}
const optional = <T,>(value: T | null) => value ?? undefined
const friendlyError = (cause: unknown) => {
  const message = cause instanceof Error ? cause.message : String(cause)
  if (message.includes('accounts_workspace_normalized_email_key') || message.includes('duplicate key')) return 'Ya existe una persona con este email.'
  if (message.includes('row-level security')) return 'No tienes permiso para realizar esta acción en este espacio de trabajo.'
  return 'No pudimos guardar los cambios. Revisa tu conexión e inténtalo nuevamente.'
}
const accountStatusFromDb: Record<string, string> = { active: 'Activo', prospect: 'Prospecto', inactive: 'Inactivo' }
const accountStatusToDb: Record<string, 'active'|'prospect'|'inactive'> = { Activo: 'active', Prospecto: 'prospect', Inactivo: 'inactive' }
const opportunityStatusFromDb: Record<string, OpportunityData['status']> = { open: 'Abierta', won: 'Ganada', lost: 'Perdida' }
const opportunityStatusToDb: Record<string, 'open'|'won'|'lost'> = { Abierta: 'open', Ganada: 'won', Perdida: 'lost' }
const engagementStatusFromDb: Record<string, string> = { draft: 'Borrador', active: 'Activo', completed: 'Completado', cancelled: 'Cancelado' }
const engagementStatusToDb: Record<string, 'draft'|'active'|'completed'|'cancelled'> = { Borrador: 'draft', Activo: 'active', Completado: 'completed', Cancelado: 'cancelled' }
const engagementTypeFromDb: Record<string, string> = { treatment: 'Tratamiento', project: 'Proyecto', partnership: 'Partnership', plan: 'Plan' }
const engagementTypeToDb: Record<string, 'treatment'|'project'|'partnership'|'plan'> = { Tratamiento: 'treatment', Proyecto: 'project', Partnership: 'partnership', Plan: 'plan' }
const requestStatusFromDb: Record<string, PaymentRequestData['status']> = { pending: 'Pendiente', paid: 'Pagada', closed_transferred: 'Cerrada con saldo trasladado', closed_waived: 'Cerrada con diferencia condonada', cancelled: 'Cancelada' }
const prestationStatusFromDb: Record<string,string> = { draft:'Borrador',pending:'Pendiente',scheduled:'Programada',in_progress:'En proceso',approved:'Aprobado',published:'Publicado',completed:'Completada',cancelled:'Cancelada',no_show:'No asistió' }
const prestationStatusToDb: Record<string,string> = { Borrador:'draft',Pendiente:'pending',Programada:'scheduled','En proceso':'in_progress',Aprobado:'approved',Programado:'scheduled',Publicado:'published',Completada:'completed',Completado:'completed',Cancelada:'cancelled',Cancelado:'cancelled','No asistió':'no_show' }
const activityStatusFromDb: Record<string,string> = { pending:'Pendiente',completed:'Completada',cancelled:'Cancelada' }
const activityStatusToDb: Record<string,string> = { Pendiente:'pending',Vencida:'pending',Completada:'completed',Cancelada:'cancelled' }
const activityTypeToDb: Record<string,string> = { Tarea:'task',Llamada:'call',Reunión:'meeting',Email:'email',WhatsApp:'whatsapp',Nota:'note',Hito:'milestone' }

type AuthMode = 'login'|'signup'|'forgot'|'update'

function AuthPanel({ recoveryMode, onReady, onRecoveryComplete }: { recoveryMode: boolean; onReady: (user: User) => void; onRecoveryComplete: () => void }) {
  const [mode, setMode] = useState<AuthMode>(recoveryMode ? 'update' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => { if (recoveryMode) setMode('update') }, [recoveryMode])
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!supabase || busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        if (resetError) throw resetError
        setNotice('Te enviamos un enlace para crear una nueva contraseña. Revisa tu correo.')
        return
      }
      if (mode === 'update') {
        if (password !== passwordConfirmation) { setError('Las contraseñas no coinciden.'); return }
        const { data, error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
        setNotice('Tu contraseña fue actualizada correctamente.')
        onRecoveryComplete()
        if (data.user) onReady(data.user)
        return
      }
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      if (result.error) throw result.error
      if (result.data.session?.user) onReady(result.data.session.user)
      else if (mode === 'signup') setNotice('Cuenta creada. Revisa tu correo para confirmar tu email antes de ingresar.')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : ''
      setError(message.includes('Invalid login') ? 'Email o contraseña incorrectos.' : 'No pudimos completar esta acción. Inténtalo nuevamente.')
    } finally { setBusy(false) }
  }
  const title = mode === 'login' ? 'Inicia sesión' : mode === 'signup' ? 'Crea tu cuenta' : mode === 'forgot' ? 'Recupera tu contraseña' : 'Crea una nueva contraseña'
  const submitLabel = mode === 'login' ? 'Ingresar' : mode === 'signup' ? 'Crear cuenta' : mode === 'forgot' ? 'Enviar enlace' : 'Actualizar contraseña'
  return <main className="auth-shell"><form className="card auth-card" onSubmit={submit}><span className="section-kicker">HAZENTO</span><h1>{title}</h1><p>{mode === 'forgot' ? 'Te enviaremos un enlace seguro para continuar.' : mode === 'update' ? 'Elige una contraseña de al menos 8 caracteres.' : 'Accede a tu espacio de trabajo seguro.'}</p>{mode !== 'update' && <label><span>Email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/></label>}{mode !== 'forgot' && <label><span>{mode === 'update' ? 'Nueva contraseña' : 'Contraseña'}</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/></label>}{mode === 'update' && <label><span>Confirmar nueva contraseña</span><input type="password" value={passwordConfirmation} onChange={e => setPasswordConfirmation(e.target.value)} required minLength={8} autoComplete="new-password"/></label>}{error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-notice" role="status">{notice}</p>}<button className="primary-btn" disabled={busy}>{busy ? 'Procesando...' : submitLabel}</button>{mode === 'login' && <><button className="text-btn" type="button" onClick={() => { setMode('forgot'); setError(''); setNotice('') }}>Olvidé mi contraseña</button><button className="text-btn" type="button" onClick={() => { setMode('signup'); setError(''); setNotice('') }}>Crear una cuenta</button></>}{(mode === 'signup' || mode === 'forgot') && <button className="text-btn" type="button" onClick={() => { setMode('login'); setError(''); setNotice('') }}>Volver a iniciar sesión</button>}</form></main>
}

function mapAccount(row: AccountRow): AccountData {
  return { id: row.id, workspaceId: row.workspace_id, initials: initials(row.display_name), name: row.display_name, displayName: row.display_name, firstName: optional(row.first_name), lastName: optional(row.last_name), organizationId: optional(row.organization_id), role: optional(row.role), type: 'Persona', status: accountStatusFromDb[row.status] || row.status, last: formatDate(row.updated_at), next: '—', income: '$0', pending: '$0', email: optional(row.email), phone: row.phone || '', rut: row.tax_id || '', legalName: optional(row.legal_name), address: optional(row.address_line), city: optional(row.city), commune: optional(row.commune), notes: optional(row.notes), color: '#e6efeb', createdAt: row.created_at, updatedAt: row.updated_at, archivedAt: optional(row.archived_at) }
}
function mapOrganization(row: OrganizationRow): OrganizationData { return { id: row.id, workspaceId: row.workspace_id, name: row.name, legalName: optional(row.legal_name), taxId: optional(row.tax_id), email: optional(row.email), phone: optional(row.phone), website: optional(row.website), businessActivity: optional(row.business_activity), address: optional(row.address), commune: optional(row.commune), city: optional(row.city), region: optional(row.region), notes: optional(row.notes), createdAt: row.created_at, updatedAt: row.updated_at, archivedAt: optional(row.archived_at) } }
function mapOpportunity(row: OpportunityRow, accounts: AccountData[]): OpportunityData { const account = accounts.find(item => item.id === row.account_id)?.name || 'Persona'; return { id: row.id, accountId: row.account_id, account, contact: account, title: row.name, amount: money(row.estimated_amount), close: formatDate(row.expected_close_date), last: formatDate(row.updated_at), stage: row.stage, status: opportunityStatusFromDb[row.status], createdAt: row.created_at, updatedAt: row.updated_at } }
function mapEngagement(row: EngagementRow, accounts: AccountData[]): EngagementData { return { id: row.id, accountId: row.account_id, opportunityId: optional(row.opportunity_id), name: row.name, account: accounts.find(item => item.id === row.account_id)?.name || 'Persona', type: engagementTypeFromDb[row.engagement_type] || row.engagement_type, progress: 0, detail: '', amount: money(row.agreed_amount), status: engagementStatusFromDb[row.status] || row.status, startDate: optional(row.start_date), endDate: optional(row.end_date), createdAt: row.created_at, updatedAt: row.updated_at } }
function mapPrestation(row: PrestationRow, accounts: AccountData[]): PrestationData { return { id: row.id, accountId: row.account_id, engagementId: optional(row.engagement_id), opportunityId: optional(row.opportunity_id), serviceId: optional(row.service_id), date: formatDate(row.scheduled_start, true), account: accounts.find(item => item.id === row.account_id)?.name || 'Persona', name: row.name, description: optional(row.description), durationMinutes: row.scheduled_start && row.scheduled_end ? Math.round((Date.parse(row.scheduled_end)-Date.parse(row.scheduled_start))/60000) : undefined, origin: row.engagement_id ? 'Engagement' : 'Directa', status: prestationStatusFromDb[row.status] || row.status, amount: money(row.total_amount), payment: 'Pendiente', followUpNote: optional(row.follow_up_note), createdAt: row.created_at } }
function mapActivity(row: ActivityRow, accounts: AccountData[]): ActivityData { const account = accounts.find(item => item.id === row.account_id)?.name || 'Persona'; return { id: row.id, title: row.title, relation: account, date: formatDate(row.scheduled_at || row.created_at, true), type: row.activity_type, activityType: row.activity_type, status: activityStatusFromDb[row.status] || row.status, description: optional(row.description), accountId: row.account_id, prestationId: optional(row.prestation_id), engagementId: optional(row.engagement_id), opportunityId: optional(row.opportunity_id), source: row.source === 'prestation_follow_up' ? 'prestation_follow_up' : undefined, scheduledAt: optional(row.scheduled_at), createdAt: row.created_at, updatedAt: row.updated_at, completedAt: optional(row.completed_at) } }
function mapPayment(row: PaymentRow, accounts: AccountData[]): PaymentData { return { id: row.id, accountId: row.account_id, date: formatDate(row.payment_date || row.created_at), account: accounts.find(item => item.id === row.account_id)?.name || 'Persona', amount: money(row.amount), method: row.payment_method || 'Otro', status: row.status === 'voided' ? 'Anulado' : 'Pagado', allocations: 'Solicitud de pago', createdAt: row.created_at, voidedAt: optional(row.voided_at), voidedBy: optional(row.voided_by), voidReason: optional(row.void_reason) } }
function mapRequest(row: PaymentRequestRow): PaymentRequestData { return { id: row.id, workspaceId: row.workspace_id, accountId: row.account_id, parentRequestId: optional(row.parent_request_id), originPrestationId: optional(row.origin_prestation_id), originEngagementId: optional(row.origin_engagement_id), originOpportunityId: optional(row.origin_opportunity_id), status: requestStatusFromDb[row.status] || 'Pendiente', amount: Number(row.amount), dueDate: optional(row.due_date), note: optional(row.notes), waivedAmount: Number(row.waived_amount), waiverReason: optional(row.waiver_reason), createdAt: row.created_at, updatedAt: row.updated_at } }

export function SupabaseDataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User|null>(null)
  const [state, setState] = useState<DataState>(emptyState)
  const [workspaceId, setWorkspaceId] = useState<string|null>(null)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [status, setStatus] = useState<'loading'|'ready'|'error'>('loading')
  const [error, setError] = useState<string|null>(null)

  const load = useCallback(async (activeUser: User) => {
    if (!supabase) { setStatus('error'); setError('Supabase staging no está configurado.'); return }
    setStatus('loading'); setError(null)
    try {
      const { data: boot, error: bootError } = await supabase.rpc('bootstrap_user_workspace', { p_workspace_name: 'Mi negocio', p_vertical_type: 'health', p_first_name: '', p_last_name: '' })
      if (bootError) throw bootError
      const resolvedWorkspaceId = boot
      const [profileResult, workspaceResult, accountsResult, organizationsResult, servicesResult, opportunitiesResult, engagementsResult, prestationsResult, activitiesResult, requestsResult, requestItemsResult, paymentsResult, allocationsResult, remindersResult, subscriptionResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', activeUser.id).single(),
        supabase.from('workspaces').select('*').eq('id', resolvedWorkspaceId).single(),
        supabase.from('accounts').select('*').eq('workspace_id', resolvedWorkspaceId), supabase.from('organizations').select('*').eq('workspace_id', resolvedWorkspaceId), supabase.from('services').select('*').eq('workspace_id', resolvedWorkspaceId),
        supabase.from('opportunities').select('*').eq('workspace_id', resolvedWorkspaceId), supabase.from('engagements').select('*').eq('workspace_id', resolvedWorkspaceId), supabase.from('prestations').select('*').eq('workspace_id', resolvedWorkspaceId), supabase.from('activities').select('*').eq('workspace_id', resolvedWorkspaceId),
        supabase.from('payment_requests').select('*').eq('workspace_id', resolvedWorkspaceId), supabase.from('payment_request_items').select('*').eq('workspace_id', resolvedWorkspaceId), supabase.from('payments').select('*').eq('workspace_id', resolvedWorkspaceId), supabase.from('payment_allocations').select('*').eq('workspace_id', resolvedWorkspaceId), supabase.from('appointment_reminders').select('*').eq('workspace_id', resolvedWorkspaceId), supabase.from('subscriptions').select('plan,status').eq('workspace_id',resolvedWorkspaceId).maybeSingle(),
      ])
      const failed = [profileResult,workspaceResult,accountsResult,organizationsResult,servicesResult,opportunitiesResult,engagementsResult,prestationsResult,activitiesResult,requestsResult,requestItemsResult,paymentsResult,allocationsResult,remindersResult,subscriptionResult].find(result => result.error)
      if (failed?.error) throw failed.error
      const accounts = (accountsResult.data || []).map(mapAccount)
      const paymentAllocations = (allocationsResult.data || []).filter(row => row.prestation_id).map(row => ({ id: row.id, paymentId: row.payment_id, prestationId: row.prestation_id!, amount: Number(row.amount) }))
      const requestAllocations = (allocationsResult.data || []).filter(row => row.payment_request_id).map(row => ({ id: row.id, paymentId: row.payment_id, paymentRequestId: row.payment_request_id!, amount: Number(row.amount) }))
      const workspace = workspaceResult.data!
      const profile = profileResult.data!
      setWorkspaceId(resolvedWorkspaceId)
      setState({ ...emptyState,
        profile: { firstName: profile.first_name || activeUser.email?.split('@')[0] || '', lastName: profile.last_name || '', email: activeUser.email || '', phone: profile.phone || '' },
        workspace: { name: workspace.name, address: workspace.address_line || '', country: workspace.country_code === 'CL' ? 'Chile' : workspace.country_code, currency: workspace.currency_code, timezone: workspace.timezone, vertical: workspace.vertical_type as DataState['workspace']['vertical'] },
        reminderSettings: { emailEnabled: workspace.reminder_email_enabled, primaryLeadHours: workspace.reminder_primary_hours, secondaryEnabled: workspace.reminder_secondary_enabled, secondaryLeadHours: workspace.reminder_secondary_hours, entitlementMode: subscriptionResult.data?.plan === 'plus' && subscriptionResult.data.status === 'active' ? 'demo_plus' : 'free' },
        accounts, organizations: (organizationsResult.data || []).map(mapOrganization),
        services: (servicesResult.data || []).map((row: ServiceRow) => ({ id: row.id, name: row.name, description: row.description || '', duration: row.default_duration_minutes ? `${row.default_duration_minutes} min` : '—', price: money(row.default_price), active: row.active })),
        opportunities: (opportunitiesResult.data || []).map(row => mapOpportunity(row, accounts)), engagements: (engagementsResult.data || []).map(row => mapEngagement(row, accounts)), prestations: (prestationsResult.data || []).map(row => mapPrestation(row, accounts)), activities: (activitiesResult.data || []).map(row => mapActivity(row, accounts)),
        paymentRequests: (requestsResult.data || []).map(mapRequest), paymentRequestItems: (requestItemsResult.data || []).map((row: PaymentRequestItemRow) => ({ id: row.id, paymentRequestId: row.payment_request_id, prestationId: optional(row.prestation_id), engagementId: optional(row.engagement_id), description: row.description, amount: Number(row.amount) })),
        payments: (paymentsResult.data || []).map(row => mapPayment(row, accounts)), paymentAllocations, paymentRequestAllocations: requestAllocations,
        appointmentReminders: (remindersResult.data || []).map((row: ReminderRow): AppointmentReminder => ({ id: row.id, workspaceId: row.workspace_id, prestationId: row.prestation_id, accountId: row.account_id, recipientEmail: row.recipient_email, scheduledFor: row.scheduled_for, status: row.status as AppointmentReminder['status'], slot: row.slot as AppointmentReminder['slot'], leadHours: row.lead_hours, provider: row.provider as AppointmentReminder['provider'], sentAt: optional(row.sent_at), providerMessageId: optional(row.provider_message_id), errorMessage: optional(row.error_message), createdAt: row.created_at, updatedAt: row.updated_at })),
      })
      setStatus('ready')
    } catch (cause) { setError(friendlyError(cause)); setStatus('error') }
  }, [])

  useEffect(() => { if (!supabase) { setStatus('error'); setError('Supabase no está configurado.'); return }; supabase.auth.getSession().then(({data}) => { setUser(data.session?.user || null); if (data.session?.user) void load(data.session.user); else setStatus('ready') }); const { data } = supabase.auth.onAuthStateChange((event, session) => { if (event === 'PASSWORD_RECOVERY') { setPasswordRecovery(true); setUser(session?.user || null); setStatus('ready'); return } setUser(session?.user || null); if (session?.user) queueMicrotask(() => void load(session.user)); else { setState(emptyState); setWorkspaceId(null); setStatus('ready') } }); return () => data.subscription.unsubscribe() }, [load])

  const requireContext = () => { if (!supabase || !workspaceId) throw new Error('No existe un workspace activo.'); return { client: supabase, workspaceId } }
  const refresh = async () => { if (user) await load(user) }
  const mutate = async <T,>(operation: () => PromiseLike<{ data: T | null; error: { message: string } | null }>, after?: (data: T) => void) => { const result = await operation(); if (result.error || result.data == null) throw new Error(result.error?.message || 'No se recibieron datos.'); after?.(result.data); return result.data }

  const value = useMemo<DataStore>(() => ({ ...state, repositoryStatus: status, repositoryError: error, retryRepository: () => { if (user) void load(user) },
    async updateProfile(changes) { const { client }=requireContext(); await mutate(() => client.from('profiles').update({ first_name: changes.firstName, last_name: changes.lastName, phone: changes.phone }).eq('id', user!.id).select().single()); await refresh() },
    async updateWorkspace(changes) { const {client,workspaceId}=requireContext(); await mutate(() => client.from('workspaces').update({ name: changes.name, address_line: changes.address, country_code: changes.country === 'Chile' ? 'CL' : changes.country, currency_code: changes.currency, timezone: changes.timezone, vertical_type: changes.vertical }).eq('id',workspaceId).select().single()); await refresh() },
    async addAccount(record) { const {client,workspaceId}=requireContext(); const row=await mutate(() => client.from('accounts').insert({workspace_id:workspaceId,account_type:'person',status:accountStatusToDb[record.status]||'prospect',display_name:record.name,first_name:record.firstName||null,last_name:record.lastName||null,email:record.email?.trim().toLowerCase()||null,phone:record.phone||null,tax_id:record.rut||null,organization_id:record.organizationId||null,role:record.role||null}).select().single()); const created=mapAccount(row); await refresh(); return created },
    async updateAccount(id, changes) { const {client,workspaceId}=requireContext(); await mutate(() => client.from('accounts').update({display_name:changes.name||changes.displayName,first_name:changes.firstName,last_name:changes.lastName,email:changes.email?.trim().toLowerCase(),phone:changes.phone,tax_id:changes.rut,organization_id:changes.organizationId===undefined?undefined:changes.organizationId||null,role:changes.role,status:changes.status?accountStatusToDb[changes.status]:undefined,notes:changes.notes,archived_at:changes.archivedAt}).eq('workspace_id',workspaceId).eq('id',id).select().single()); await refresh() },
    async addOrganization(record) { const {client,workspaceId}=requireContext(); const row=await mutate(() => client.from('organizations').insert({workspace_id:workspaceId,name:record.name,legal_name:record.legalName||null,tax_id:record.taxId||null,email:record.email||null,phone:record.phone||null,website:record.website||null,business_activity:record.businessActivity||null,address:record.address||null,commune:record.commune||null,city:record.city||null,region:record.region||null,notes:record.notes||null}).select().single()); const created=mapOrganization(row); await refresh(); return created },
    async updateOrganization(id,changes){const{client,workspaceId}=requireContext();await mutate(()=>client.from('organizations').update({name:changes.name,legal_name:changes.legalName,tax_id:changes.taxId,email:changes.email,phone:changes.phone,website:changes.website,business_activity:changes.businessActivity,address:changes.address,commune:changes.commune,city:changes.city,region:changes.region,notes:changes.notes,archived_at:changes.archivedAt}).eq('workspace_id',workspaceId).eq('id',id).select().single());await refresh()},
    async archiveOrganization(id){const{client,workspaceId}=requireContext();await mutate(()=>client.from('organizations').update({archived_at:new Date().toISOString()}).eq('workspace_id',workspaceId).eq('id',id).select().single());await refresh()},
    async addContact(){throw new Error('Los contactos legacy no se crean en el modelo People First.')},
    async addOpportunity(record){const{client,workspaceId}=requireContext();const row=await mutate(()=>client.from('opportunities').insert({workspace_id:workspaceId,account_id:record.accountId!,name:record.title,stage:record.stage,status:opportunityStatusToDb[record.status||'Abierta']||'open',estimated_amount:parseMoney(record.amount),expected_close_date:null}).select().single());const created=mapOpportunity(row,state.accounts);await refresh();return created},
    async updateOpportunity(id,changes){const{client,workspaceId}=requireContext();await mutate(()=>client.from('opportunities').update({account_id:changes.accountId,name:changes.title,stage:changes.stage,status:changes.status?opportunityStatusToDb[changes.status]:undefined,estimated_amount:changes.amount?parseMoney(changes.amount):undefined,won_at:changes.status==='Ganada'?new Date().toISOString():undefined,lost_at:changes.status==='Perdida'?new Date().toISOString():undefined}).eq('workspace_id',workspaceId).eq('id',id).select().single());await refresh()},
    async addEngagement(record){const{client,workspaceId}=requireContext();const row=await mutate(()=>client.from('engagements').insert({workspace_id:workspaceId,account_id:record.accountId!,opportunity_id:record.opportunityId||null,engagement_type:engagementTypeToDb[record.type]||'project',name:record.name,status:engagementStatusToDb[record.status]||'active',billing_type:'one_off',agreed_amount:parseMoney(record.amount),start_date:record.startDate||null,end_date:record.endDate||null}).select().single());const created=mapEngagement(row,state.accounts);await refresh();return created},
    async updateEngagement(id,changes){const{client,workspaceId}=requireContext();await mutate(()=>client.from('engagements').update({account_id:changes.accountId,opportunity_id:changes.opportunityId,engagement_type:changes.type?engagementTypeToDb[changes.type]:undefined,name:changes.name,status:changes.status?engagementStatusToDb[changes.status]:undefined,agreed_amount:changes.amount?parseMoney(changes.amount):undefined,start_date:changes.startDate,end_date:changes.endDate}).eq('workspace_id',workspaceId).eq('id',id).select().single());await refresh()},
    async addPrestation(record){const{client,workspaceId}=requireContext();const start=scheduledIso(record.date)||new Date().toISOString();const end=record.durationMinutes?new Date(Date.parse(start)+record.durationMinutes*60000).toISOString():null;const row=await mutate(()=>client.from('prestations').insert({workspace_id:workspaceId,account_id:record.accountId,engagement_id:record.engagementId||null,opportunity_id:record.opportunityId||null,service_id:record.serviceId||null,name:record.name,description:record.description||null,scheduled_start:start,scheduled_end:end,status:prestationStatusToDb[record.status]||record.status,unit_price:parseMoney(record.amount),quantity:1,total_amount:parseMoney(record.amount),follow_up_note:record.followUpNote||null}).select().single());const created=mapPrestation(row,state.accounts);await refresh();return created},
    async updatePrestation(id,changes){const{client,workspaceId}=requireContext();const start=scheduledIso(changes.date);const end=start&&changes.durationMinutes?new Date(Date.parse(start)+changes.durationMinutes*60000).toISOString():undefined;await mutate(()=>client.from('prestations').update({account_id:changes.accountId,engagement_id:changes.engagementId,opportunity_id:changes.opportunityId,service_id:changes.serviceId,name:changes.name,description:changes.description,scheduled_start:start,scheduled_end:end,status:changes.status?(prestationStatusToDb[changes.status]||changes.status):undefined,unit_price:changes.amount?parseMoney(changes.amount):undefined,total_amount:changes.amount?parseMoney(changes.amount):undefined,follow_up_note:changes.followUpNote}).eq('workspace_id',workspaceId).eq('id',id).select().single());await refresh()},
    async updateReminderSettings(changes){const{client,workspaceId}=requireContext();await mutate(()=>client.from('workspaces').update({reminder_email_enabled:changes.emailEnabled,reminder_primary_hours:changes.primaryLeadHours,reminder_secondary_enabled:changes.secondaryEnabled,reminder_secondary_hours:changes.secondaryLeadHours}).eq('id',workspaceId).select().single());await refresh()}, async cancelAppointmentReminders(){throw new Error('Los recordatorios se cancelan desde el backend al cambiar la cita.')}, async markReminderSent(){throw new Error('El estado de entrega solo puede cambiarlo el backend.')},async markReminderFailed(){throw new Error('El estado de entrega solo puede cambiarlo el backend.')},
    async addActivity(record){const{client,workspaceId}=requireContext();const row=await mutate(()=>client.from('activities').insert({workspace_id:workspaceId,account_id:record.accountId!,prestation_id:record.prestationId||null,engagement_id:record.engagementId||null,opportunity_id:record.opportunityId||null,activity_type:activityTypeToDb[record.type]||record.activityType||'task',title:record.title,description:record.description||null,status:activityStatusToDb[record.status]||'pending',source:record.source||null,scheduled_at:record.scheduledAt||null,completed_at:record.completedAt||null}).select().single());const created=mapActivity(row,state.accounts);await refresh();return created},
    async toggleActivity(id){const current=state.activities.find(item=>item.id===id);if(!current)return;const{client,workspaceId}=requireContext();const completed=current.status==='Completada';await mutate(()=>client.from('activities').update({status:completed?'pending':'completed',completed_at:completed?null:new Date().toISOString()}).eq('workspace_id',workspaceId).eq('id',id).select().single());await refresh()},
    async addPayment(){throw new Error('Los pagos reales se registran desde una solicitud de pago.')},
    async addPaymentRequest(record,items){const{client}=requireContext();const{data:id,error}=await client.rpc('create_payment_request_with_items',{p_account_id:record.accountId,p_amount:record.amount,p_due_date:record.dueDate,p_notes:record.note,p_origin_prestation_id:record.originPrestationId,p_origin_engagement_id:record.originEngagementId,p_origin_opportunity_id:record.originOpportunityId,p_items:items.map(item=>({prestation_id:item.prestationId||null,engagement_id:item.engagementId||null,description:item.description,amount:item.amount}))});if(error||!id)throw new Error(error?.message||'No se creó la solicitud.');await refresh();const created=state.paymentRequests.find(item=>item.id===id)??{...record,id,status:'Pendiente' as const,waivedAmount:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};return created},
    async settlePaymentRequest(id,receivedAmount,method,differenceAction,waiverReason){const{client}=requireContext();const{error}=await client.rpc('settle_payment_request',{p_request_id:id,p_received_amount:receivedAmount,p_payment_method:method,p_difference_action:differenceAction,p_waiver_reason:waiverReason});if(error)throw new Error(error.message);await refresh()},
    async cancelPaymentRequest(id){const{client,workspaceId}=requireContext();await mutate(()=>client.from('payment_requests').update({status:'cancelled'}).eq('workspace_id',workspaceId).eq('id',id).select().single());await refresh()},
    async voidPayment(id,reason){const{client}=requireContext();const{error}=await client.rpc('void_received_payment',{p_payment_id:id,p_reason:reason});if(error)throw new Error(error.message);await refresh()},async updatePayment(){throw new Error('Los pagos recibidos son inmutables.')},async updatePaymentWithDocumentAllocations(){throw new Error('Las asignaciones tributarias no están habilitadas.')},async saveDocumentAllocation(){throw new Error('Las asignaciones tributarias no están habilitadas.')},async deleteDocumentAllocation(){throw new Error('Las asignaciones tributarias no están habilitadas.')},async addDocumentAdjustment(){throw new Error('Los ajustes tributarios no están habilitados.')},
    async addService(record){const{client,workspaceId}=requireContext();const row=await mutate<ServiceRow>(()=>client.from('services').insert({workspace_id:workspaceId,name:record.name,description:record.description,default_duration_minutes:parseInt(record.duration)||null,default_price:parseMoney(record.price),active:record.active}).select().single());const created={id:row.id,name:row.name,description:row.description||'',duration:row.default_duration_minutes?`${row.default_duration_minutes} min`:'—',price:money(row.default_price),active:row.active};await refresh();return created},
    async updateService(id,changes){const{client,workspaceId}=requireContext();await mutate(()=>client.from('services').update({name:changes.name,description:changes.description,default_duration_minutes:changes.duration?parseInt(changes.duration):undefined,default_price:changes.price?parseMoney(changes.price):undefined,active:changes.active}).eq('workspace_id',workspaceId).eq('id',id).select().single());await refresh()},async toggleService(id){const current=state.services.find(item=>item.id===id);if(!current)return;const{client,workspaceId}=requireContext();await mutate(()=>client.from('services').update({active:!current.active}).eq('workspace_id',workspaceId).eq('id',id).select().single());await refresh()},async resetDemo(){throw new Error('Restaurar datos demo no está disponible en modo Supabase.')},
  }), [state,status,error,user,workspaceId,load])

  if (!user || passwordRecovery) return <AuthPanel recoveryMode={passwordRecovery} onReady={setUser} onRecoveryComplete={() => setPasswordRecovery(false)}/>
  if (status === 'loading') return <main className="repository-state"><div className="card"><h2>Cargando tu espacio de trabajo...</h2><p>Estamos recuperando tus datos de forma segura.</p></div></main>
  if (status === 'error') return <main className="repository-state"><div className="card"><h2>No pudimos cargar Hazento</h2><p>{error}</p><button className="primary-btn" onClick={() => void load(user)}>Reintentar</button><button className="secondary-btn" onClick={() => void supabase?.auth.signOut()}>Cerrar sesión</button></div></main>
  return <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>
}
