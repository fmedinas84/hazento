import { createClient, type User } from '@supabase/supabase-js'
import type {
  AdminApi,
  AdminRole,
  DashboardData,
  SubscriptionSummary,
  SystemData,
  UserDetail,
  UserHealth,
  UserSummary,
} from '../shared/types.js'

type Request = { method?: string; headers: { authorization?: string }; query: Record<string, string | string[] | undefined> }
type Response = {
  status: (code: number) => Response
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

type ProfileRow = { id: string; first_name: string | null; last_name: string | null; created_at: string }
type WorkspaceRow = { id: string; name: string; vertical_type: string; created_at: string; updated_at: string }
type MemberRow = { user_id: string; workspace_id: string; role: string; created_at: string }
type SubscriptionRow = {
  workspace_id: string
  plan: string
  status: string
  provider: string | null
  current_period_start: string | null
  next_payment_date: string | null
  created_at: string
  updated_at: string
}
type EntityRow = { id: string; workspace_id: string; created_at: string; updated_at?: string | null; status?: string | null }
type AuthUserRow = { id: string; email?: string; created_at: string; last_sign_in_at?: string }

function createServiceClient(url: string, key: string) {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

type ServiceClient = ReturnType<typeof createServiceClient>
type Authorization = { error: 401 | 403 } | { client: ServiceClient; user: User; role: AdminRole }

const STATUS_THRESHOLDS = {
  newDays: 14,
  veryActiveDays: 3,
  veryActiveEvents: 10,
  activeDays: 14,
  riskDays: 45,
} as const

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing server environment: ${name}`)
  return value
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function daysAgo(value: string | null, now: Date): number | null {
  if (!value) return null
  return Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000)
}

function deriveHealth(registeredAt: string, lastActivityAt: string | null, recentEvents: number, now: Date): UserHealth {
  const accountAge = daysAgo(registeredAt, now) ?? 0
  const inactivity = daysAgo(lastActivityAt, now)
  if (accountAge <= STATUS_THRESHOLDS.newDays && recentEvents <= 2) return 'new'
  if (inactivity !== null && inactivity <= STATUS_THRESHOLDS.veryActiveDays && recentEvents >= STATUS_THRESHOLDS.veryActiveEvents) return 'very_active'
  if (inactivity !== null && inactivity <= STATUS_THRESHOLDS.activeDays) return 'active'
  if (inactivity !== null && inactivity <= STATUS_THRESHOLDS.riskDays) return 'at_risk'
  return 'inactive'
}

function maxDate(values: Array<string | null | undefined>): string | null {
  const valid = values.filter((value): value is string => Boolean(value))
  return valid.length ? valid.reduce((latest, value) => (value > latest ? value : latest)) : null
}

function fullName(profile: ProfileRow | undefined): string {
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
  return name || 'Sin nombre'
}

function isPlus(subscription: SubscriptionRow | undefined): boolean {
  return subscription?.plan === 'plus' && ['active', 'paused'].includes(subscription.status)
}

const BUSINESS_TIME_ZONE = 'America/Santiago'

function zonedParts(date: Date) {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]))
  return { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute, second: values.second }
}

function zonedDate(year: number, month: number, day: number, endOfDay = false): Date {
  const hour = endOfDay ? 23 : 0
  const minute = endOfDay ? 59 : 0
  const second = endOfDay ? 59 : 0
  const millisecond = endOfDay ? 999 : 0
  const guess = Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
  const shown = zonedParts(new Date(guess))
  const shownAsUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, shown.second, millisecond)
  return new Date(guess - (shownAsUtc - guess))
}

function comparablePeriods(now: Date) {
  const local = zonedParts(now)
  const previousMonthDate = new Date(Date.UTC(local.year, local.month - 2, 1))
  const previousYear = previousMonthDate.getUTCFullYear()
  const previousMonth = previousMonthDate.getUTCMonth() + 1
  const currentStart = zonedDate(local.year, local.month, 1)
  const previousStart = zonedDate(previousYear, previousMonth, 1)
  const previousLastDay = new Date(Date.UTC(local.year, local.month - 1, 0)).getUTCDate()
  const comparableDay = Math.min(local.day, previousLastDay)
  const previousEnd = zonedDate(previousYear, previousMonth, comparableDay, true)
  const monthFormatter = new Intl.DateTimeFormat('es-CL', { timeZone: BUSINESS_TIME_ZONE, month: 'long' })
  return {
    currentStart,
    previousStart,
    previousEnd,
    currentLabel: `1–${local.day} ${monthFormatter.format(now)}`,
    previousLabel: `1–${comparableDay} ${monthFormatter.format(previousStart)}`,
    previousMonth: monthFormatter.format(previousStart),
  }
}

function within(value: string, start: Date, end: Date): boolean {
  const time = new Date(value).getTime()
  return time >= start.getTime() && time <= end.getTime()
}

function monthKey(value: string): string {
  const parts = zonedParts(new Date(value))
  return `${parts.year}-${String(parts.month).padStart(2, '0')}`
}

async function loadAllRows(client: ServiceClient, table: string, columns: string): Promise<EntityRow[]> {
  const rows: EntityRow[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client.from(table).select(columns).range(from, from + pageSize - 1)
    if (error) throw error
    const page = (data ?? []) as unknown as EntityRow[]
    rows.push(...page)
    if (page.length < pageSize) break
  }
  return rows
}

async function listAuthUsers(client: ServiceClient): Promise<AuthUserRow[]> {
  const users: AuthUserRow[] = []
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    users.push(...data.users.map((user) => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    })))
    if (data.users.length < 1000) break
  }
  return users
}

async function loadAdminDataset(client: ServiceClient) {
  const [profilesResult, workspacesResult, membersResult, subscriptionsResult, failedRemindersResult, authUsers, accounts, prestations, opportunities, engagements, activities, paymentRequests, payments] = await Promise.all([
    client.from('profiles').select('id,first_name,last_name,created_at'),
    client.from('workspaces').select('id,name,vertical_type,created_at,updated_at'),
    client.from('workspace_members').select('user_id,workspace_id,role,created_at'),
    client.from('subscriptions').select('workspace_id,plan,status,provider,current_period_start,next_payment_date,created_at,updated_at'),
    client.from('appointment_reminders').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    listAuthUsers(client),
    loadAllRows(client, 'accounts', 'id,workspace_id,created_at,updated_at,status'),
    loadAllRows(client, 'prestations', 'id,workspace_id,created_at,updated_at,status'),
    loadAllRows(client, 'opportunities', 'id,workspace_id,created_at,updated_at,status'),
    loadAllRows(client, 'engagements', 'id,workspace_id,created_at,updated_at,status'),
    loadAllRows(client, 'activities', 'id,workspace_id,created_at,updated_at,status'),
    loadAllRows(client, 'payment_requests', 'id,workspace_id,created_at,updated_at,status'),
    loadAllRows(client, 'payments', 'id,workspace_id,created_at,updated_at,status'),
  ])
  for (const result of [profilesResult, workspacesResult, membersResult, subscriptionsResult, failedRemindersResult]) {
    if (result.error) throw result.error
  }
  return {
    profiles: (profilesResult.data ?? []) as ProfileRow[],
    workspaces: (workspacesResult.data ?? []) as WorkspaceRow[],
    members: (membersResult.data ?? []) as MemberRow[],
    subscriptions: (subscriptionsResult.data ?? []) as SubscriptionRow[],
    failedReminders: failedRemindersResult.count ?? 0,
    authUsers,
    accounts,
    prestations,
    opportunities,
    engagements,
    activities,
    paymentRequests,
    payments,
  }
}

function collapseUsers(users: UserSummary[], now: Date): UserSummary[] {
  const grouped = new Map<string, UserSummary>()
  for (const user of users) {
    const current = grouped.get(user.userId)
    if (!current) {
      grouped.set(user.userId, { ...user })
      continue
    }
    const lastActivityAt = maxDate([current.lastActivityAt, user.lastActivityAt])
    const registeredAt = current.registeredAt < user.registeredAt ? current.registeredAt : user.registeredAt
    const combinedEvents = current.clients + user.clients + current.prestations + user.prestations + current.opportunities + user.opportunities + current.payments + user.payments
    grouped.set(user.userId, {
      ...current,
      plan: current.plan === 'plus' || user.plan === 'plus' ? 'plus' : 'free',
      clients: current.clients + user.clients,
      prestations: current.prestations + user.prestations,
      opportunities: current.opportunities + user.opportunities,
      paymentRequests: current.paymentRequests + user.paymentRequests,
      payments: current.payments + user.payments,
      lastSignInAt: maxDate([current.lastSignInAt, user.lastSignInAt]),
      lastActivityAt,
      registeredAt,
      health: deriveHealth(registeredAt, lastActivityAt, combinedEvents, now),
    })
  }
  return [...grouped.values()]
}

function recentMonthKeys(now: Date, count: number): Array<{ key: string; label: string }> {
  const local = zonedParts(now)
  const formatter = new Intl.DateTimeFormat('es-CL', { month: 'short', timeZone: BUSINESS_TIME_ZONE })
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(local.year, local.month - count + index, 15, 12))
    return { key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`, label: formatter.format(date).replace('.', '') }
  })
}

function entitiesForWorkspace(rows: EntityRow[], workspaceId: string) {
  return rows.filter((row) => row.workspace_id === workspaceId)
}

function buildUsers(dataset: Awaited<ReturnType<typeof loadAdminDataset>>, now = new Date()): UserSummary[] {
  const cutoff30 = new Date(now.getTime() - 30 * 86_400_000)
  return dataset.members.map((member) => {
    const authUser = dataset.authUsers.find((item) => item.id === member.user_id)
    const profile = dataset.profiles.find((item) => item.id === member.user_id)
    const workspace = dataset.workspaces.find((item) => item.id === member.workspace_id)
    const subscription = dataset.subscriptions.find((item) => item.workspace_id === member.workspace_id)
    const workspaceSets = [dataset.accounts, dataset.prestations, dataset.opportunities, dataset.engagements, dataset.activities, dataset.paymentRequests, dataset.payments]
      .map((rows) => entitiesForWorkspace(rows, member.workspace_id))
    const activityDates = workspaceSets.flat().flatMap((item) => [item.created_at, item.updated_at])
    const recentEvents = activityDates.filter((value) => value && new Date(value).getTime() >= cutoff30.getTime()).length
    const lastActivityAt = maxDate(activityDates)
    const registeredAt = authUser?.created_at ?? profile?.created_at ?? member.created_at
    return {
      userId: member.user_id,
      workspaceId: member.workspace_id,
      name: fullName(profile),
      email: authUser?.email ?? 'Email no disponible',
      plan: isPlus(subscription) ? 'plus' : 'free',
      subscriptionStatus: subscription?.status ?? 'free',
      vertical: workspace?.vertical_type ?? 'unknown',
      clients: workspaceSets[0].length,
      prestations: workspaceSets[1].length,
      opportunities: workspaceSets[2].length,
      paymentRequests: workspaceSets[5].length,
      payments: workspaceSets[6].filter((payment) => payment.status !== 'voided').length,
      lastSignInAt: authUser?.last_sign_in_at ?? null,
      lastActivityAt,
      registeredAt,
      workspaceCreatedAt: workspace?.created_at ?? member.created_at,
      health: deriveHealth(registeredAt, lastActivityAt, recentEvents, now),
    }
  })
}

function buildDashboard(dataset: Awaited<ReturnType<typeof loadAdminDataset>>, users: UserSummary[], now = new Date()): DashboardData {
  const { currentStart, previousStart, previousEnd, currentLabel, previousLabel, previousMonth } = comparablePeriods(now)
  const uniqueUsers = collapseUsers(users, now)
  const current = (value: string) => within(value, currentStart, now)
  const previous = (value: string) => within(value, previousStart, previousEnd)
  const active7 = uniqueUsers.filter((user) => (daysAgo(user.lastActivityAt, now) ?? Infinity) <= 7).length
  const active30 = uniqueUsers.filter((user) => (daysAgo(user.lastActivityAt, now) ?? Infinity) <= 30).length
  const plusWorkspaces = new Set(dataset.subscriptions.filter(isPlus).map((subscription) => subscription.workspace_id))
  const evolution = recentMonthKeys(now, 6).map(({ key, label }) => ({ month: key, label, users: uniqueUsers.filter((user) => monthKey(user.registeredAt) === key).length }))
  const registered = uniqueUsers.length
  const funnelValues: Array<[string, number]> = [
    ['Registrados', registered],
    ['Crearon un cliente', uniqueUsers.filter((user) => user.clients > 0).length],
    ['Crearon una atención', uniqueUsers.filter((user) => user.prestations > 0).length],
    ['Registraron un pago', uniqueUsers.filter((user) => user.payments > 0).length],
  ]
  const funnel = funnelValues.map(([label, value], index) => ({
    label,
    value,
    percentage: registered ? Math.round((value / registered) * 100) : 0,
    stepConversion: index === 0 ? null : funnelValues[index - 1][1] ? Math.round((value / funnelValues[index - 1][1]) * 100) : 0,
  }))
  const plusSubscriptions = dataset.subscriptions.filter(isPlus)
  const attention: DashboardData['attention'] = [
    { key: 'no_clients', label: 'Sin primer cliente', count: uniqueUsers.filter((user) => user.clients === 0).length, target: 'users' },
    { key: 'inactive', label: 'Sin actividad por más de 30 días', count: uniqueUsers.filter((user) => (daysAgo(user.lastActivityAt ?? user.registeredAt, now) ?? 0) > 30).length, target: 'users' },
    { key: 'payment_failed', label: 'Suscripción con pago fallido', count: dataset.subscriptions.filter((subscription) => subscription.status === 'payment_failed').length, target: 'subscriptions' },
    { key: 'reminder_failed', label: 'Recordatorios fallidos', count: dataset.failedReminders, target: 'system' },
  ]
  return {
    generatedAt: now.toISOString(),
    period: { current: currentLabel, previous: previousLabel, previousMonth },
    kpis: {
      usersTotal: uniqueUsers.length,
      usersThisMonth: uniqueUsers.filter((user) => current(user.registeredAt)).length,
      usersPreviousComparable: uniqueUsers.filter((user) => previous(user.registeredAt)).length,
      plusTotal: plusWorkspaces.size,
      plusThisMonth: plusSubscriptions.filter((item) => current(item.current_period_start ?? item.created_at)).length,
      plusPreviousComparable: plusSubscriptions.filter((item) => previous(item.current_period_start ?? item.created_at)).length,
      plusPercentage: dataset.workspaces.length ? Math.round((plusWorkspaces.size / dataset.workspaces.length) * 100) : 0,
      workspacesTotal: dataset.workspaces.length,
      prestationsThisMonth: dataset.prestations.filter((item) => current(item.created_at)).length,
      prestationsPreviousComparable: dataset.prestations.filter((item) => previous(item.created_at)).length,
      clientsThisMonth: dataset.accounts.filter((item) => current(item.created_at)).length,
      clientsPreviousComparable: dataset.accounts.filter((item) => previous(item.created_at)).length,
      active7,
      active30,
    },
    evolution,
    funnel,
    attention,
    recentUsers: [...uniqueUsers].sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)).slice(0, 5),
  }
}

function buildSubscriptions(dataset: Awaited<ReturnType<typeof loadAdminDataset>>, users: UserSummary[]): SubscriptionSummary[] {
  return dataset.workspaces.map((workspace) => {
    const ownerId = dataset.members.find((member) => member.workspace_id === workspace.id && member.role === 'owner')?.user_id
    const user = users.find((item) => item.workspaceId === workspace.id && item.userId === ownerId)
    const subscription = dataset.subscriptions.find((item) => item.workspace_id === workspace.id)
    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      ownerName: user?.name ?? 'Sin propietario visible',
      ownerEmail: user?.email ?? 'Email no disponible',
      plan: subscription && isPlus(subscription) ? 'plus' : 'free',
      status: subscription?.status ?? 'free',
      createdAt: subscription?.created_at ?? workspace.created_at,
      provider: subscription?.provider ?? null,
      nextPaymentAt: subscription?.next_payment_date ?? null,
      updatedAt: subscription?.updated_at ?? workspace.updated_at,
    }
  })
}

function buildUserDetail(dataset: Awaited<ReturnType<typeof loadAdminDataset>>, user: UserSummary): UserDetail {
  const workspace = dataset.workspaces.find((item) => item.id === user.workspaceId)
  const subscription = dataset.subscriptions.find((item) => item.workspace_id === user.workspaceId)
  const first = (rows: EntityRow[]) => entitiesForWorkspace(rows, user.workspaceId).map((row) => row.created_at).sort()[0] ?? null
  return {
    ...user,
    workspaceName: workspace?.name ?? 'Workspace sin nombre',
    subscription: {
      plan: user.plan,
      status: subscription?.status ?? 'free',
      startedAt: subscription?.current_period_start ?? null,
      nextPaymentAt: subscription?.next_payment_date ?? null,
      provider: subscription?.provider ?? null,
      updatedAt: subscription?.updated_at ?? null,
    },
    milestones: {
      accountCreatedAt: user.registeredAt,
      firstClientAt: first(dataset.accounts),
      firstPrestationAt: first(dataset.prestations),
      firstPaymentAt: first(dataset.payments.filter((payment) => payment.status !== 'voided')),
    },
  }
}

async function authorize(req: Request): Promise<Authorization> {
  const url = requiredEnv('SUPABASE_URL')
  const secret = process.env.SUPABASE_SECRET_KEY ?? requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  const client = createServiceClient(url, secret)
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
  if (!token) return { error: 401 as const }
  const { data: identity, error } = await client.auth.getUser(token)
  if (error || !identity.user) return { error: 401 as const }
  const { data: admin, error: adminError } = await client.from('admin_users').select('role').eq('user_id', identity.user.id).maybeSingle()
  if (adminError) throw adminError
  if (!admin) return { error: 403 as const }
  return { client, user: identity.user, role: admin.role as AdminRole }
}

async function audit(client: ServiceClient, adminUserId: string, action: string, targetType?: string, targetId?: string) {
  const { error } = await client.from('admin_audit_log').insert({
    admin_user_id: adminUserId,
    action,
    target_type: targetType ?? null,
    target_id: targetId ?? null,
    metadata: {},
  })
  if (error) console.error('Admin audit write failed', { action, code: error.code })
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (req.method !== 'GET') return res.status(405).json({ message: 'Método no permitido.' })
  try {
    const authorization = await authorize(req)
    if ('error' in authorization) {
      return res.status(authorization.error).json({ message: authorization.error === 401 ? 'Sesión inválida o vencida.' : 'No tienes acceso al backoffice.' })
    }
    const resource = single(req.query.resource) ?? 'session'
    if (resource === 'session') {
      await audit(authorization.client, authorization.user.id, 'admin_login')
      const data: AdminApi['session'] = { userId: authorization.user.id, email: authorization.user.email ?? '', role: authorization.role }
      return res.status(200).json({ data })
    }
    const dataset = await loadAdminDataset(authorization.client)
    const users = buildUsers(dataset)
    if (resource === 'dashboard') return res.status(200).json({ data: buildDashboard(dataset, users) })
    if (resource === 'users') return res.status(200).json({ data: users })
    if (resource === 'subscriptions') return res.status(200).json({ data: buildSubscriptions(dataset, users) })
    if (resource === 'system') {
      const data: SystemData = {
        build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
        failedSubscriptions: dataset.subscriptions.filter((item) => item.status === 'payment_failed').length,
        failedReminders: dataset.activities.filter(() => false).length,
        webhooksAvailable: false,
        emailDeliveryAvailable: false,
      }
      data.failedReminders = dataset.failedReminders
      return res.status(200).json({ data })
    }
    if (resource === 'user') {
      const userId = single(req.query.userId)
      const workspaceId = single(req.query.workspaceId)
      const user = users.find((item) => item.userId === userId && item.workspaceId === workspaceId)
      if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' })
      await audit(authorization.client, authorization.user.id, 'user_viewed', 'workspace', workspaceId)
      return res.status(200).json({ data: buildUserDetail(dataset, user) })
    }
    return res.status(404).json({ message: 'Recurso no encontrado.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown admin error'
    console.error('Admin endpoint failed', { message })
    return res.status(500).json({ message: 'No pudimos cargar la información administrativa. Inténtalo nuevamente.' })
  }
}
