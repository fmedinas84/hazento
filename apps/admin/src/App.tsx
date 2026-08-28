import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowLeft, Building2, CreditCard, LayoutDashboard, LogOut, RefreshCw, Search, Settings, ShieldCheck, Users } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { adminRequest, getUserDetail } from './lib/api'
import { hasSupabaseConfig, supabase } from './lib/supabase'
import type { AdminApi, AdminSession, DashboardData, SubscriptionSummary, SystemData, UserDetail, UserHealth, UserSummary } from '../shared/types'

type Page = 'dashboard' | 'users' | 'subscriptions' | 'system'
type AsyncState<T> = { status: 'loading' | 'error' | 'success'; data?: T; message?: string }

const verticalNames: Record<string, string> = { health: 'Salud', creative: 'Diseñador', creator: 'Influencer', sessions: 'Profesor', other: 'Otras actividades' }
const healthNames: Record<UserHealth, string> = { new: 'Nuevo', active: 'Activo', very_active: 'Muy activo', at_risk: 'En riesgo', inactive: 'Inactivo' }

function formatDate(value: string | null, withTime = false) {
  if (!value) return 'No disponible'
  return new Intl.DateTimeFormat('es-CL', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(value))
}

function variation(current: number, previous: number) {
  if (!previous) return current ? '+100%' : '0%'
  const value = Math.round(((current - previous) / previous) * 100)
  return `${value >= 0 ? '+' : ''}${value}%`
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
  const [state, setState] = useState<AsyncState<AdminApi[K]>>({ status: 'loading' })
  const load = useCallback(async () => {
    if (!enabled) return
    setState({ status: 'loading' })
    try { setState({ status: 'success', data: await adminRequest(resource) }) }
    catch (error) { setState({ status: 'error', message: error instanceof Error ? error.message : undefined }) }
  }, [resource, enabled])
  useEffect(() => { if (enabled) void load() }, [load, enabled])
  return { ...state, retry: load }
}

function KpiCard({ title, value, subtitle, tone }: { title: string; value: string | number; subtitle: string; tone?: 'dark' }) {
  return <article className={`kpi-card ${tone === 'dark' ? 'dark' : ''}`}><span>{title}</span><strong>{value}</strong><small>{subtitle}</small></article>
}

function DashboardPage() {
  const state = useResource('dashboard')
  if (state.status === 'loading') return <><div className="kpi-grid">{Array.from({ length: 6 }, (_, index) => <div className="kpi-card" key={index}><Skeleton lines={3} /></div>)}</div><div className="panel"><Skeleton lines={6} /></div></>
  if (state.status === 'error' || !state.data) return <ErrorState message={state.message} retry={state.retry} />
  const data = state.data as DashboardData
  const k = data.kpis
  return <>
    <div className="kpi-grid">
      <KpiCard title="Usuarios" value={k.usersTotal} subtitle={`${k.usersThisMonth} este mes · ${variation(k.usersThisMonth, k.usersPreviousComparable)} vs período anterior`} tone="dark" />
      <KpiCard title="Workspaces Plus" value={k.plusTotal} subtitle={`${k.plusPercentage}% del total · ${k.plusThisMonth} altas este mes`} />
      <KpiCard title="Atenciones" value={k.prestationsThisMonth} subtitle={`${variation(k.prestationsThisMonth, k.prestationsPreviousComparable)} vs mismos días anteriores`} />
      <KpiCard title="Clientes" value={k.clientsThisMonth} subtitle={`${variation(k.clientsThisMonth, k.clientsPreviousComparable)} vs mismos días anteriores`} />
      <KpiCard title="Activos · 7 días" value={k.active7} subtitle="Según actividad operacional" />
      <KpiCard title="Activos · 30 días" value={k.active30} subtitle="No incluye solo inicios de sesión" />
    </div>
    <div className="dashboard-grid">
      <section className="panel chart-panel"><div className="section-heading"><div><span className="eyebrow">CRECIMIENTO</span><h2>Evolución de usuarios</h2></div><span className="muted">Acumulado mensual</span></div>
        {data.evolution.length ? <ResponsiveContainer width="100%" height={300}><LineChart data={data.evolution} margin={{ top: 12, right: 16, left: -20, bottom: 4 }}><CartesianGrid strokeDasharray="4 4" vertical={false} /><XAxis dataKey="month" /><YAxis yAxisId="users" allowDecimals={false} /><YAxis yAxisId="plus" orientation="right" allowDecimals={false} /><Tooltip /><Legend /><Line yAxisId="users" type="monotone" dataKey="users" name="Usuarios" stroke="#1d2722" strokeWidth={3} /><Line yAxisId="plus" type="monotone" dataKey="plus" name="Plus" stroke="#8a6fcb" strokeWidth={3} /></LineChart></ResponsiveContainer> : <Empty text="Todavía no hay historia suficiente para el gráfico." />}
      </section>
      <section className="panel"><div className="section-heading"><div><span className="eyebrow">ACTIVACIÓN</span><h2>Funnel inicial</h2></div></div><div className="funnel">{data.funnel.map((item) => <div className="funnel-row" key={item.label}><div><strong>{item.label}</strong><span>{item.percentage}% del total</span></div><b>{item.value}</b><div className="progress"><i style={{ width: `${item.percentage}%` }} /></div></div>)}</div></section>
    </div>
  </>
}

function Filters({ query, setQuery, children }: { query: string; setQuery: (value: string) => void; children?: React.ReactNode }) {
  return <div className="filters"><label className="search"><Search size={18} aria-hidden="true" /><span className="sr-only">Buscar</span><input placeholder="Buscar por nombre o email…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>{children}</div>
}

function Empty({ text }: { text: string }) { return <div className="empty">{text}</div> }

function UserList({ onOpen }: { onOpen: (user: UserSummary) => void }) {
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
    return text.includes(query.trim().toLowerCase()) && (plan === 'all' || user.plan === plan) && (vertical === 'all' || user.vertical === vertical) && (health === 'all' || user.health === health) && matchesDate
  }), [state.data, query, plan, vertical, health, registered])
  if (state.status === 'loading') return <div className="panel"><Skeleton lines={8} /></div>
  if (state.status === 'error') return <ErrorState message={state.message} retry={state.retry} />
  return <><Filters query={query} setQuery={setQuery}><select aria-label="Filtrar por plan" value={plan} onChange={(e) => setPlan(e.target.value)}><option value="all">Todos los planes</option><option value="free">Free</option><option value="plus">Plus</option></select><select aria-label="Filtrar por vertical" value={vertical} onChange={(e) => setVertical(e.target.value)}><option value="all">Todas las profesiones</option>{Object.entries(verticalNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select aria-label="Filtrar por actividad" value={health} onChange={(e) => setHealth(e.target.value)}><option value="all">Toda actividad</option>{Object.entries(healthNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select aria-label="Filtrar por fecha de alta" value={registered} onChange={(e) => setRegistered(e.target.value)}><option value="all">Cualquier fecha</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="year">Este año</option></select></Filters>
    <div className="table-panel"><div className="table-scroll"><table><thead><tr><th>Usuario</th><th>Plan</th><th>Profesión</th><th>Clientes</th><th>Atenciones</th><th>Último login</th><th>Última actividad</th><th>Alta</th><th><span className="sr-only">Acción</span></th></tr></thead><tbody>{rows.map((user) => <tr key={`${user.userId}-${user.workspaceId}`}><td><strong>{user.name}</strong><small>{user.email}</small></td><td><Badge value={user.plan} /></td><td>{verticalNames[user.vertical] ?? user.vertical}</td><td>{user.clients}</td><td>{user.prestations}</td><td>{formatDate(user.lastSignInAt)}</td><td><Badge value={user.health} /> <small>{formatDate(user.lastActivityAt)}</small></td><td>{formatDate(user.registeredAt)}</td><td><button className="link-button" onClick={() => onOpen(user)}>Ver ficha</button></td></tr>)}</tbody></table></div>{!rows.length && <Empty text="No encontramos usuarios con estos filtros." />}
      <div className="mobile-cards">{rows.map((user) => <button className="mobile-user-card" onClick={() => onOpen(user)} key={`${user.userId}-${user.workspaceId}`}><div><strong>{user.name}</strong><span>{user.email}</span></div><div className="tag-row"><Badge value={user.plan} /><Badge value={user.health} /></div><dl><div><dt>Profesión</dt><dd>{verticalNames[user.vertical] ?? user.vertical}</dd></div><div><dt>Clientes</dt><dd>{user.clients}</dd></div><div><dt>Atenciones</dt><dd>{user.prestations}</dd></div><div><dt>Última actividad</dt><dd>{formatDate(user.lastActivityAt)}</dd></div></dl></button>)}</div>
    </div></>
}

function Badge({ value }: { value: string }) { return <span className={`badge badge-${value}`}>{healthNames[value as UserHealth] ?? value.toUpperCase()}</span> }

function UserDetailPanel({ user, close }: { user: UserSummary; close: () => void }) {
  const [state, setState] = useState<AsyncState<UserDetail>>({ status: 'loading' })
  const load = useCallback(async () => { setState({ status: 'loading' }); try { setState({ status: 'success', data: await getUserDetail(user.userId, user.workspaceId) }) } catch (error) { setState({ status: 'error', message: error instanceof Error ? error.message : undefined }) } }, [user])
  useEffect(() => { void load() }, [load])
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
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null)
  const title = nav.find((item) => item.id === page)?.label ?? 'Dashboard'
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark">H</div><div><strong>Hazento</strong><span>Administración</span></div></div><nav aria-label="Administración">{nav.map((item) => <button className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)} key={item.id}><item.icon size={20} /><span>{item.label}</span></button>)}</nav><div className="sidebar-user"><ShieldCheck size={18} /><div><strong>{session.role === 'super_admin' ? 'Super Admin' : 'Soporte'}</strong><span>{session.email}</span></div><button onClick={() => supabase?.auth.signOut()} aria-label="Cerrar sesión"><LogOut size={18} /></button></div></aside><main className="content"><header className="topbar"><div><span className="eyebrow">BACKOFFICE READ-ONLY</span><h1>{title}</h1></div><div className="readonly-pill"><ShieldCheck size={16} /> Solo lectura</div></header><div className="page-content">{page === 'dashboard' && <DashboardPage />}{page === 'users' && <UserList onOpen={setSelectedUser} />}{page === 'subscriptions' && <SubscriptionsPage />}{page === 'system' && <SystemPage />}</div></main>{selectedUser && <UserDetailPanel user={selectedUser} close={() => setSelectedUser(null)} />}</div>
}

export default function App() {
  const [authReady, setAuthReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const sessionState = useResource('session', hasSession)
  useEffect(() => {
    if (!supabase) { setAuthReady(true); return }
    void supabase.auth.getSession().then(({ data }) => { setHasSession(Boolean(data.session)); setAuthReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setHasSession(Boolean(session)))
    return () => data.subscription.unsubscribe()
  }, [])
  if (!authReady) return <main className="login-page"><div className="login-card"><Skeleton lines={5} /></div></main>
  if (!hasSession) return <Login />
  if (sessionState.status === 'loading') return <main className="login-page"><div className="login-card"><Skeleton lines={5} /></div></main>
  if (sessionState.status === 'error' || !sessionState.data) return <main className="login-page"><section className="login-card"><ShieldCheck size={42} /><h1>Acceso denegado</h1><p>{sessionState.message ?? 'Tu cuenta no está autorizada para usar este backoffice.'}</p><button className="secondary-button" onClick={() => supabase?.auth.signOut()}>Volver</button></section></main>
  return <AdminShell session={sessionState.data as AdminSession} />
}
