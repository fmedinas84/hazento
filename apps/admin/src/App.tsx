import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, LayoutDashboard, LogOut, RefreshCw, Search, Settings, ShieldCheck, Users } from 'lucide-react'
import { adminRequest, getUserDetail } from './lib/api'
import { hasSupabaseConfig, supabase } from './lib/supabase'
import { ADMIN_STALE_TIME_MS, clearAdminResourceCache, useCachedAdminResource } from './lib/resource-cache'
import type { AdminApi, AdminSession, DashboardData, SubscriptionSummary, SystemData, UserDetail, UserHealth, UserSummary } from '../shared/types'

type Page = 'dashboard' | 'users' | 'subscriptions' | 'system'

const verticalNames: Record<string, string> = { health: 'Salud', creative: 'Diseñador', creator: 'Influencer', sessions: 'Profesor', other: 'Otras actividades' }
const healthNames: Record<UserHealth, string> = { new: 'Nuevo', active: 'Activo', very_active: 'Muy activo', at_risk: 'En riesgo', inactive: 'Inactivo' }

function formatDate(value: string | null, withTime = false) {
  if (!value) return 'No disponible'
  return new Intl.DateTimeFormat('es-CL', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(value))
}

function comparison(current: number, previous: number, previousMonth: string, previousPeriod: string) {
  if (!previous) return current ? `${current} este mes · 0 en ${previousPeriod}` : `Sin registros este mes ni en ${previousPeriod}`
  const value = Math.round(((current - previous) / previous) * 100)
  return `${value >= 0 ? '+' : ''}${value}% vs mismos días de ${previousMonth}`
}

function Skeleton({ lines = 4 }: { lines?: number }) {
  return <div className="skeleton-stack" aria-hidden="true">{Array.from({ length: lines }, (_, index) => <div className="skeleton" key={index} />)}</div>
}

function ErrorState({ message, retry }: { message?: string; retry: () => void }) {
  return <div className="state-card"><strong>No pudimos cargar esta información.</strong><p>{message ?? 'Revisa tu conexión e inténtalo nuevamente.'}</p><button className="secondary-button" onClick={retry}><RefreshCw size={17} /> Reintentar</button></div>
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return setError('El entorno administrativo no está configurado.')
    setSaving(true); setError('')
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (result.error) setError('No pudimos iniciar sesión. Revisa tus credenciales.')
    setSaving(false)
  }
  return <main className="login-page"><section className="login-card">
    <div className="brand-mark">H</div><span className="eyebrow">HAZENTO ADMIN</span><h1>Acceso administrativo</h1>
    <p>Herramienta interna de monitoreo. Solo usuarios autorizados.</p>
    {!hasSupabaseConfig && <div className="inline-error">Faltan variables públicas de Supabase.</div>}
    <form onSubmit={submit}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label><label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>{error && <div className="inline-error" role="alert">{error}</div>}<button className="primary-button" disabled={saving || !hasSupabaseConfig}>{saving ? 'Ingresando…' : 'Ingresar'}</button></form>
  </section></main>
}

function useResource<K extends keyof AdminApi>(resource: K, enabled = true) {
  const loader = useCallback((signal: AbortSignal) => adminRequest(resource, signal), [resource])
  return useCachedAdminResource(resource, loader, ADMIN_STALE_TIME_MS[resource], enabled)
}

function BackgroundRefresh({ refreshing, message, retry }: { refreshing: boolean; message?: string; retry: () => void }) {
  if (message) return <div className="inline-error" role="status">No pudimos actualizar los datos. <button className="link-button" onClick={retry}>Reintentar</button></div>
  return refreshing ? <span className="sr-only" role="status">Actualizando información</span> : null
}

function KpiCard({ title, value, subtitle, meta }: { title: string; value: string | number; subtitle: string; meta?: string }) {
  return <article className="kpi-card"><span>{title}</span><strong>{value}</strong><small>{subtitle}</small>{meta && <em>{meta}</em>}</article>
}

function funnelRateLabel(data: DashboardData['funnel'], index: number) {
  const item = data[index]
  if (index === 0) return item.value ? '100%' : 'Sin usuarios registrados'
  const previous = data[index - 1]
  if (!previous.value) return 'Sin base de comparación'
  if (index === 1) return `${item.stepConversion}% de registrados`
  if (index === 2) return `${item.stepConversion}% de quienes crearon cliente`
  return `${item.stepConversion}% de quienes crearon una atención`
}

function DashboardPage({ navigate }: { navigate: (page: Page, filter?: AttentionFilter) => void }) {
  const state = useResource('dashboard')
  if (state.status === 'loading') return <><div className="kpi-grid dashboard-kpis">{Array.from({ length: 4 }, (_, index) => <div className="kpi-card" key={index}><Skeleton lines={3} /></div>)}</div><div className="dashboard-grid"><div className="panel"><Skeleton lines={6} /></div><div className="panel"><Skeleton lines={6} /></div></div></>
  if (state.status === 'error' || !state.data) return <ErrorState message={state.message} retry={state.retry} />
  const data = state.data as DashboardData
  const k = data.kpis
  const maximumUsers = Math.max(1, ...data.evolution.map((item) => item.users))
  const activePercentage = k.usersTotal ? Math.round((k.active30 / k.usersTotal) * 100) : 0
  const issues = data.attention.filter((item) => item.count > 0)
  return <div className="dashboard-stack"><BackgroundRefresh refreshing={state.refreshing} message={state.message} retry={state.retry} />
    <div className="kpi-grid dashboard-kpis">
      <KpiCard title="Usuarios totales" value={k.usersTotal} subtitle={`${k.usersThisMonth} nuevos este mes`} meta={comparison(k.usersThisMonth, k.usersPreviousComparable, data.period.previousMonth, data.period.previous)} />
      <KpiCard title="Workspaces Plus" value={k.plusTotal} subtitle={`${k.plusPercentage}% de ${k.workspacesTotal} workspaces`} meta={`${k.plusThisMonth} altas Plus este mes`} />
      <KpiCard title="Usuarios activos · 30 días" value={`${k.active30} / ${k.usersTotal}`} subtitle={`${activePercentage}% de usuarios`} meta={`${k.active7} activos en los últimos 7 días`} />
      <KpiCard title="Atenciones · este mes" value={k.prestationsThisMonth} subtitle={comparison(k.prestationsThisMonth, k.prestationsPreviousComparable, data.period.previousMonth, data.period.previous)} meta={`Período actual: ${data.period.current}`} />
    </div>
    <section className="secondary-metric" aria-label="Adopción de clientes"><div><span>Clientes creados este mes</span><strong>{k.clientsThisMonth}</strong></div><p>{comparison(k.clientsThisMonth, k.clientsPreviousComparable, data.period.previousMonth, data.period.previous)}</p></section>
    <div className="dashboard-grid">
      <section className="panel chart-panel"><div className="section-heading"><div><span className="eyebrow">CRECIMIENTO</span><h2>Nuevos usuarios por mes</h2></div><span className="muted">Últimos 6 meses</span></div>
        <div className="bar-chart" role="img" aria-label="Nuevos usuarios registrados por mes">{data.evolution.map((item) => <div className="bar-column" key={item.month} title={`${item.label}: ${item.users} usuarios`}><span>{item.users}</span><div className="bar-track"><i style={{ height: `${Math.max(item.users ? 10 : 2, (item.users / maximumUsers) * 100)}%` }} /></div><small>{item.label}</small></div>)}</div>
      </section>
      <section className="panel"><div className="section-heading"><div><span className="eyebrow">ACTIVACIÓN</span><h2>Activación de usuarios</h2></div></div><div className="funnel">{data.funnel.map((item, index) => <div className="funnel-step" key={item.label}><div className="funnel-row"><div><strong>{item.label}</strong><span>{funnelRateLabel(data.funnel, index)}</span></div><b>{item.value}</b><div className="progress" aria-label={`${item.percentage}% del total de usuarios registrados`}><i style={{ width: `${item.percentage}%` }} /></div></div></div>)}</div></section>
    </div>
    <div className="dashboard-grid operational-grid">
      <section className="panel"><div className="section-heading"><div><span className="eyebrow">SEÑALES</span><h2>Requieren atención</h2></div></div>{issues.length ? <div className="attention-list">{issues.map((item) => <button key={item.key} onClick={() => navigate(item.target, item.target === 'users' ? item.key as AttentionFilter : undefined)}><strong>{item.count}</strong><span>{item.label}</span><ArrowRight size={17} aria-hidden="true" /></button>)}</div> : <div className="positive-state"><CheckCircle2 size={22} /><div><strong>Sin alertas operacionales</strong><span>No detectamos situaciones que requieran revisión.</span></div></div>}</section>
      <section className="panel recent-panel"><div className="section-heading"><div><span className="eyebrow">ALTAS</span><h2>Usuarios recientes</h2></div><button className="text-action" onClick={() => navigate('users')}>Ver todos <ArrowRight size={15} /></button></div>{data.recentUsers.length ? <><div className="recent-table"><div className="recent-head"><span>Usuario</span><span>Plan</span><span>Alta</span><span>Última actividad</span><span>Uso</span></div>{data.recentUsers.map((user) => <div className="recent-row" key={user.userId}><span><strong>{user.name}</strong><small>{user.email}</small></span><Badge value={user.plan} /><span>{formatDate(user.registeredAt)}</span><span>{formatDate(user.lastActivityAt)}</span><span>{user.clients ? `${user.clients} ${user.clients === 1 ? 'cliente' : 'clientes'}` : 'Sin actividad'}</span></div>)}</div><div className="recent-cards">{data.recentUsers.map((user) => <article key={user.userId}><div><strong>{user.name}</strong><span>{user.email}</span></div><Badge value={user.plan} /><dl><div><dt>Alta</dt><dd>{formatDate(user.registeredAt)}</dd></div><div><dt>Actividad</dt><dd>{formatDate(user.lastActivityAt)}</dd></div><div><dt>Uso</dt><dd>{user.clients ? `${user.clients} ${user.clients === 1 ? 'cliente' : 'clientes'}` : 'Sin actividad'}</dd></div></dl></article>)}</div></> : <Empty text="Todavía no hay usuarios registrados." />}</section>
    </div>
  </div>
}

type AttentionFilter = 'no_clients' | 'inactive'

function Filters({ query, setQuery, children }: { query: string; setQuery: (value: string) => void; children?: React.ReactNode }) {
  return <div className="filters"><label className="search"><Search size={18} aria-hidden="true" /><span className="sr-only">Buscar</span><input placeholder="Buscar por nombre o email…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>{children}</div>
}

function Empty({ text }: { text: string }) { return <div className="empty">{text}</div> }

function UserList({ onOpen, attentionFilter }: { onOpen: (user: UserSummary) => void; attentionFilter: AttentionFilter | null }) {
  const state = useResource('users')
  const [query, setQuery] = useState('')
  const [plan, setPlan] = useState('all')
  const [vertical, setVertical] = useState('all')
  const [health, setHealth] = useState('all')
  const [registered, setRegistered] = useState('all')
  const rows = useMemo(() => (state.data ?? []).filter((user) => {
    const text = `${user.name} ${user.email}`.toLowerCase()
    const age = Math.floor((Date.now() - new Date(user.registeredAt).getTime()) / 86_400_000)
    const matchesDate = registered === 'all' || (registered === '30' && age <= 30) || (registered === '90' && age <= 90) || (registered === 'year' && new Date(user.registeredAt).getFullYear() === new Date().getFullYear())
    const activityBaseline = user.lastActivityAt ?? user.registeredAt
    const inactiveDays = Math.floor((Date.now() - new Date(activityBaseline).getTime()) / 86_400_000)
    const matchesAttention = attentionFilter === null || (attentionFilter === 'no_clients' ? user.clients === 0 : inactiveDays > 30)
    return text.includes(query.trim().toLowerCase()) && (plan === 'all' || user.plan === plan) && (vertical === 'all' || user.vertical === vertical) && (health === 'all' || user.health === health) && matchesDate && matchesAttention
  }), [state.data, query, plan, vertical, health, registered, attentionFilter])
  if (state.status === 'loading') return <div className="panel"><Skeleton lines={8} /></div>
  if (state.status === 'error') return <ErrorState message={state.message} retry={state.retry} />
  return <><Filters query={query} setQuery={setQuery}><select aria-label="Filtrar por plan" value={plan} onChange={(e) => setPlan(e.target.value)}><option value="all">Todos los planes</option><option value="free">Free</option><option value="plus">Plus</option></select><select aria-label="Filtrar por vertical" value={vertical} onChange={(e) => setVertical(e.target.value)}><option value="all">Todas las profesiones</option>{Object.entries(verticalNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select aria-label="Filtrar por actividad" value={health} onChange={(e) => setHealth(e.target.value)}><option value="all">Toda actividad</option>{Object.entries(healthNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select aria-label="Filtrar por fecha de alta" value={registered} onChange={(e) => setRegistered(e.target.value)}><option value="all">Cualquier fecha</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="year">Este año</option></select></Filters>
    <div className="table-panel"><div className="table-scroll"><table><thead><tr><th>Usuario</th><th>Plan</th><th>Profesión</th><th>Clientes</th><th>Atenciones</th><th>Último login</th><th>Última actividad</th><th>Alta</th><th><span className="sr-only">Acción</span></th></tr></thead><tbody>{rows.map((user) => <tr key={`${user.userId}-${user.workspaceId}`}><td><strong>{user.name}</strong><small>{user.email}</small></td><td><Badge value={user.plan} /></td><td>{verticalNames[user.vertical] ?? user.vertical}</td><td>{user.clients}</td><td>{user.prestations}</td><td>{formatDate(user.lastSignInAt)}</td><td><Badge value={user.health} /> <small>{formatDate(user.lastActivityAt)}</small></td><td>{formatDate(user.registeredAt)}</td><td><button className="link-button" onClick={() => onOpen(user)}>Ver ficha</button></td></tr>)}</tbody></table></div>{!rows.length && <Empty text="No encontramos usuarios con estos filtros." />}
      <div className="mobile-cards">{rows.map((user) => <button className="mobile-user-card" onClick={() => onOpen(user)} key={`${user.userId}-${user.workspaceId}`}><div><strong>{user.name}</strong><span>{user.email}</span></div><div className="tag-row"><Badge value={user.plan} /><Badge value={user.health} /></div><dl><div><dt>Profesión</dt><dd>{verticalNames[user.vertical] ?? user.vertical}</dd></div><div><dt>Clientes</dt><dd>{user.clients}</dd></div><div><dt>Atenciones</dt><dd>{user.prestations}</dd></div><div><dt>Última actividad</dt><dd>{formatDate(user.lastActivityAt)}</dd></div></dl></button>)}</div>
    </div></>
}

function Badge({ value }: { value: string }) { return <span className={`badge badge-${value}`}>{healthNames[value as UserHealth] ?? value.toUpperCase()}</span> }

function UserDetailPanel({ user, close }: { user: UserSummary; close: () => void }) {
  const loader = useCallback((signal: AbortSignal) => getUserDetail(user.userId, user.workspaceId, signal), [user.userId, user.workspaceId])
  const state = useCachedAdminResource(`user-detail:${user.userId}:${user.workspaceId}`, loader, ADMIN_STALE_TIME_MS.userDetail)
  const load = state.retry
  return <div className="drawer-backdrop" role="presentation" onMouseDown={(e) => { if (e.currentTarget === e.target) close() }}><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="user-detail-title"><button className="icon-button" onClick={close} aria-label="Cerrar ficha"><ArrowLeft /></button>{state.status === 'loading' && <Skeleton lines={10} />}{state.status === 'error' && <ErrorState message={state.message} retry={load} />}{state.data && <><span className="eyebrow">FICHA ADMINISTRATIVA</span><h2 id="user-detail-title">{state.data.name}</h2><p className="muted">{state.data.email}</p><div className="detail-grid"><Detail title="Cuenta" values={[['Estado', healthNames[state.data.health]], ['Alta', formatDate(state.data.registeredAt)], ['Último login', formatDate(state.data.lastSignInAt, true)], ['Última actividad', formatDate(state.data.lastActivityAt, true)]]} /><Detail title="Workspace" values={[['Nombre', state.data.workspaceName], ['Profesión', verticalNames[state.data.vertical] ?? state.data.vertical], ['Creado', formatDate(state.data.workspaceCreatedAt)]]} /><Detail title="Suscripción" values={[['Plan', state.data.subscription.plan.toUpperCase()], ['Estado', state.data.subscription.status], ['Inicio', formatDate(state.data.subscription.startedAt)], ['Próxima renovación', formatDate(state.data.subscription.nextPaymentAt)], ['Proveedor', state.data.subscription.provider ?? 'No asociado']]} /><Detail title="Uso" values={[['Clientes', String(state.data.clients)], ['Atenciones', String(state.data.prestations)], ['Oportunidades', String(state.data.opportunities)], ['Solicitudes', String(state.data.paymentRequests)], ['Pagos', String(state.data.payments)]]} /></div><section className="detail-card"><h3>Activación</h3><div className="milestones">{Object.entries({ 'Creó cuenta': state.data.milestones.accountCreatedAt, 'Primer cliente': state.data.milestones.firstClientAt, 'Primera atención': state.data.milestones.firstPrestationAt, 'Primer pago': state.data.milestones.firstPaymentAt }).map(([label, value]) => <div key={label}><i className={value ? 'done' : ''} /><span>{label}<small>{value ? formatDate(value) : 'Pendiente'}</small></span></div>)}</div></section></>}</aside></div>
}

function Detail({ title, values }: { title: string; values: Array<[string, string]> }) { return <section className="detail-card"><h3>{title}</h3><dl>{values.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section> }

function SubscriptionsPage() {
  const state = useResource('subscriptions')
  if (state.status === 'loading') return <div className="panel"><Skeleton lines={8} /></div>
  if (state.status === 'error' || !state.data) return <ErrorState message={state.message} retry={state.retry} />
  const rows = state.data as SubscriptionSummary[]
  return <div className="table-panel"><div className="table-scroll"><table><thead><tr><th>Workspace</th><th>Propietario</th><th>Plan</th><th>Estado</th><th>Fecha alta</th><th>Proveedor</th><th>Próxima renovación</th><th>Actualizado</th></tr></thead><tbody>{rows.map((row) => <tr key={row.workspaceId}><td><strong>{row.workspaceName}</strong></td><td>{row.ownerName}<small>{row.ownerEmail}</small></td><td><Badge value={row.plan} /></td><td>{row.status}</td><td>{formatDate(row.createdAt)}</td><td>{row.provider ?? '—'}</td><td>{formatDate(row.nextPaymentAt)}</td><td>{formatDate(row.updatedAt)}</td></tr>)}</tbody></table></div><div className="mobile-cards">{rows.map((row) => <article className="mobile-user-card" key={row.workspaceId}><div><strong>{row.workspaceName}</strong><span>{row.ownerName} · {row.ownerEmail}</span></div><div className="tag-row"><Badge value={row.plan} /><Badge value={row.status} /></div><dl><div><dt>Proveedor</dt><dd>{row.provider ?? '—'}</dd></div><div><dt>Próxima renovación</dt><dd>{formatDate(row.nextPaymentAt)}</dd></div></dl></article>)}</div>{!rows.length && <Empty text="Todavía no hay workspaces registrados." />}</div>
}

function SystemPage() {
  const state = useResource('system')
  if (state.status === 'loading') return <div className="kpi-grid"><Skeleton lines={8} /></div>
  if (state.status === 'error' || !state.data) return <ErrorState message={state.message} retry={state.retry} />
  const data = state.data as SystemData
  return <div className="system-grid"><section className="panel"><span className="eyebrow">MONITOREO</span><h2>Estado disponible</h2><Detail title="Facturación" values={[['Suscripciones con pago fallido', String(data.failedSubscriptions)]]} /><Detail title="Recordatorios" values={[['Emails fallidos registrados', String(data.failedReminders)]]} /></section><section className="panel"><span className="eyebrow">PLATAFORMA</span><h2>Información técnica</h2><Detail title="Build" values={[['Versión', data.build ?? 'No disponible']]} /><Detail title="Fuentes no disponibles" values={[['Webhooks fallidos', data.webhooksAvailable ? 'Disponible' : 'No disponible'], ['Entrega de emails', data.emailDeliveryAvailable ? 'Disponible' : 'No disponible']]} /><p className="muted">Hazento todavía no persiste logs globales de webhooks o entrega de emails. No se muestran estimaciones inventadas.</p></section></div>
}

const nav = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users' as const, label: 'Usuarios', icon: Users },
  { id: 'subscriptions' as const, label: 'Suscripciones', icon: CreditCard },
  { id: 'system' as const, label: 'Sistema', icon: Settings },
]

function AdminShell({ session }: { session: AdminSession }) {
  const [page, setPage] = useState<Page>('dashboard')
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null)
  const title = nav.find((item) => item.id === page)?.label ?? 'Dashboard'
  const navigate = (target: Page, filter: AttentionFilter | null = null) => { setAttentionFilter(filter); setPage(target) }
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark">H</div><div><strong>Hazento</strong><span>Administración</span></div></div><nav aria-label="Administración">{nav.map((item) => <button className={page === item.id ? 'active' : ''} onClick={() => navigate(item.id)} key={item.id}><item.icon size={20} /><span>{item.label}</span></button>)}</nav><div className="sidebar-user"><ShieldCheck size={18} /><div><strong>{session.role === 'super_admin' ? 'Super Admin' : 'Soporte'}</strong><span>{session.email}</span></div><button onClick={() => supabase?.auth.signOut()} aria-label="Cerrar sesión"><LogOut size={18} /></button></div></aside><main className="content"><header className="topbar"><h1>{title}</h1><div className="readonly-pill"><ShieldCheck size={16} /> Solo lectura</div></header><div className="page-content">{page === 'dashboard' && <DashboardPage navigate={navigate} />}{page === 'users' && <UserList onOpen={setSelectedUser} attentionFilter={attentionFilter} />}{page === 'subscriptions' && <SubscriptionsPage />}{page === 'system' && <SystemPage />}</div></main>{selectedUser && <UserDetailPanel user={selectedUser} close={() => setSelectedUser(null)} />}</div>
}

export default function App() {
  const [authReady, setAuthReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const sessionState = useResource('session', hasSession)
  const returnToLogin = async () => {
    clearAdminResourceCache()
    try {
      await supabase?.auth.signOut({ scope: 'local' })
    } finally {
      setHasSession(false)
    }
  }
  useEffect(() => {
    if (!supabase) { setAuthReady(true); return }
    void supabase.auth.getSession().then(({ data }) => { setHasSession(Boolean(data.session)); setAuthReady(true) })
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') clearAdminResourceCache()
      setHasSession(Boolean(session))
    })
    return () => data.subscription.unsubscribe()
  }, [])
  if (!authReady) return <main className="login-page"><div className="login-card"><Skeleton lines={5} /></div></main>
  if (!hasSession) return <Login />
  if (sessionState.status === 'loading') return <main className="login-page"><div className="login-card"><Skeleton lines={5} /></div></main>
  if (sessionState.status === 'error' || !sessionState.data) return <main className="login-page"><section className="login-card"><ShieldCheck size={42} /><h1>Acceso denegado</h1><p>{sessionState.message ?? 'Tu cuenta no está autorizada para usar este backoffice.'}</p><button className="secondary-button" onClick={() => void returnToLogin()}>Volver</button></section></main>
  return <AdminShell session={sessionState.data as AdminSession} />
}
