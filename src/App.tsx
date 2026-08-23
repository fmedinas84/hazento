import { useEffect, useMemo, useState } from 'react'
import {
  Activity, Bell, BriefcaseBusiness, Building2, CalendarDays, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleDollarSign, Clock3, CreditCard, Ellipsis, FileCheck2, FileText, Grid2X2,
  HeartPulse, LayoutDashboard, ListChecks, Menu, MoreHorizontal, Pencil, Plus, Search, Settings,
  Sparkles, Target, UserRound, UsersRound, WalletCards, X, Zap,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Vertical, verticalLabels, verticalOptions } from './data'
import { AccountEmailSelector } from './AccountEmailSelector'
import { Account360View } from './Account360View'
import { AgendaView as FunctionalAgendaView } from './AgendaView'
import { EngagementDetailView as FunctionalEngagementDetail } from './EngagementDetailView'
import { OrganizationSelector } from './OrganizationSelector'
import { PeopleAccountsPage } from './PeopleAccountsPage'
import { findAccountByEmail, normalizeEmail } from './accountEmail'
import { formatMoney, parseMoney, useRepositories } from './repositories'
import { resolvePrestationName } from './prestationName'
import { durationOptions, formatDuration, serviceDurationMinutes } from './duration'
import { completedWord, verticalizeEngagementDetail } from './verticalText'
import { BillingSettings } from './BillingSettings'
import { PaymentReceivedDetailDialog, PaymentRequestCreateDialog, PaymentRequestDetailDialog, PaymentRequestsList } from './PaymentRequests'

type Page = 'dashboard' | 'accounts' | 'account' | 'opportunities' | 'opportunity' | 'agenda' | 'work' | 'engagement' | 'prestations' | 'activities' | 'payments' | 'services' | 'settings'
type Navigate = (page: Page, query?: Record<string, string | number>) => void
type Labels = typeof verticalLabels[Vertical]
const newAccountLabel = (labels: Labels) => labels.createAccount
const newEngagementLabel = (labels: Labels) => labels.createEngagement
const newPrestationLabel = (labels: Labels) => labels.createPrestation
const verticalIcons: Record<Vertical, React.ElementType> = {
  health: HeartPulse,
  creative: BriefcaseBusiness,
  creator: Sparkles,
  sessions: CalendarDays,
  other: Grid2X2,
}

const money = (value: string) => value
const formatScheduledDate = (isoDate: string, time: string) => {
  const [, month, day] = isoDate.split('-').map(Number)
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${day} ${months[month - 1] || 'Ago'} · ${time}`
}

const parseScheduledDate = (value: string) => {
  const match = value.match(/^(\d{1,2}) ([A-ZÁÉÍÓÚ][a-záéíóú]{2}) · (\d{2}):(\d{2})$/)
  const months: Record<string, string> = { Ene: '01', Feb: '02', Mar: '03', Abr: '04', May: '05', Jun: '06', Jul: '07', Ago: '08', Sep: '09', Oct: '10', Nov: '11', Dic: '12' }
  return match && months[match[2]] ? { date: `2026-${months[match[2]]}-${match[1].padStart(2, '0')}`, time: `${match[3]}:${match[4]}` } : { date: '2026-08-17', time: '09:00' }
}

const parseBusinessDate = (value: string, year: number) => {
  const match = value.match(/^(\d{1,2}) ([A-ZÁÉÍÓÚ][a-záéíóú]{2})/)
  const months: Record<string, number> = { Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5, Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11 }
  return match && months[match[2]] !== undefined ? new Date(year, months[match[2]], Number(match[1])) : undefined
}

const isDateBetween = (date: Date | undefined, start: Date, end: Date) => Boolean(date && date >= start && date <= end)

const calendarPositionFromTimestamp = (value: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', { day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santiago' }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(item => item.type === type)?.value || 0)
  const minute = part('hour') * 60 + part('minute')
  return { dayIndex: part('day') - 17, minute, top: ((minute - 480) / 60) * 52 }
}
const trend = [
  { month: 'Mar', income: 2140, pending: 410 }, { month: 'Abr', income: 2680, pending: 520 },
  { month: 'May', income: 2520, pending: 360 }, { month: 'Jun', income: 3040, pending: 610 },
  { month: 'Jul', income: 2890, pending: 490 }, { month: 'Ago', income: 3420, pending: 420 },
]

const cls = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

const pagePaths: Record<Page, string> = {
  dashboard: '/', accounts: '/cuentas', account: '/cuentas/detalle', opportunities: '/oportunidades',
  opportunity: '/oportunidades/detalle', agenda: '/agenda', work: '/trabajo', engagement: '/trabajo/detalle',
  prestations: '/prestaciones', activities: '/actividades', payments: '/pagos', services: '/servicios', settings: '/configuracion',
}

function pageFromLocation(): Page {
  const entry = Object.entries(pagePaths).find(([, path]) => path === window.location.pathname)
  return (entry?.[0] as Page | undefined) || 'dashboard'
}

function useAppRoute() {
  const [page, setPage] = useState<Page>(pageFromLocation)
  useEffect(() => {
    const onPopState = () => setPage(pageFromLocation())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  const go = (next: Page, query?: Record<string, string | number>) => {
    const search = query ? `?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)])).toString()}` : ''
    window.history.pushState({}, '', `${pagePaths[next]}${search}`)
    setPage(next)
    window.scrollTo(0, 0)
  }
  return { page, go }
}

function StatusBadge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const t = tone || String(children).toLowerCase()
  return <span className={cls('badge', `badge-${t.replaceAll(' ', '-')}`)}>{children}</span>
}

function PageHeader({ eyebrow, title, description, action, onAction, className }: { eyebrow?: string; title: string; description?: string; action?: string; onAction?: () => void; className?: string }) {
  return <div className={cls('page-header', className)}>
    <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action && <button className="primary-btn" onClick={onAction}><Plus size={17} />{action}</button>}
  </div>
}

function MetricCard({ label, value, meta, icon: Icon, tone = 'violet', metaTone }: { label: string; value: string; meta: string; icon: React.ElementType; tone?: string; metaTone?: 'positive' | 'negative' }) {
  return <article className="metric-card card">
    <div className={cls('metric-icon', tone)}><Icon size={19} /></div>
    <div className="metric-label">{label}</div>
    <div className="metric-value">{value}</div>
    <div className={cls('metric-meta', metaTone && `metric-meta-${metaTone}`)}>{meta}</div>
  </article>
}

function EmptyState({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><div className="empty-icon"><Sparkles size={22} /></div><h3>{title}</h3><p>{body}</p><button className="secondary-btn" onClick={onAction}><Plus size={16} />{action}</button></div>
}

function Modal({ title, subtitle, onClose, children, wide }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className={cls('modal', wide && 'modal-wide')} role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}>
    <header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" aria-label="Cerrar" onClick={onClose}><X size={19} /></button></header>{children}
  </section></div>
}

type EditablePrestation = {
  id: number
  accountId: number
  serviceId?: number
  name: string
  description?: string
  durationMinutes?: number
  account: string
  date: string
  status: string
  amount: string
  payment: string
  followUpNote?: string
}

function PrestationDetailModal({ record, labels, onClose }: { record: EditablePrestation; labels: Labels; onClose: () => void }) {
  const repositories = useRepositories()
  const [editing, setEditing] = useState(false)
  const [requestingPayment, setRequestingPayment] = useState(false)
  const scheduled = parseScheduledDate(record.date)
  const currentDuration = record.durationMinutes ?? serviceDurationMinutes(repositories.services.find(service => service.id === record.serviceId)?.duration)
  const paymentRequests = repositories.paymentRequestRepository.forPrestation(record.id)
  const paymentStatus = repositories.paymentRequestRepository.collectionStatusForPrestation(record.id)
  const requestTotals = paymentRequests.reduce((totals, request) => { const summary = repositories.paymentRequestRepository.summary(request.id); return { requested: totals.requested + request.amount, paid: totals.paid + (summary?.paid || 0), outstanding: totals.outstanding + (summary?.outstanding || 0) } }, { requested: 0, paid: 0, outstanding: 0 })

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    const serviceId = Number(values.serviceId) || undefined
    repositories.updatePrestation(record.id, {
      name: resolvePrestationName(String(values.name || ''), serviceId, repositories.services, labels.prestation),
      description: String(values.description || '').trim(),
      durationMinutes: Number(values.durationMinutes) || currentDuration,
      serviceId,
      date: formatScheduledDate(String(values.date), String(values.time)),
      ...(labels.supportsFollowUp ? { followUpNote: String(values.followUpNote || '').trim() } : {}),
    })
    setEditing(false)
  }

  return <Modal title={editing ? `Editar ${labels.prestation.toLowerCase()}` : record.name} subtitle={`${record.account} · ${record.date}`} onClose={onClose}>
    {editing ? <form onSubmit={save}>
      <div className="form-grid single">
        <label><span>Nombre (opcional)</span><input name="name" autoFocus defaultValue={record.name} placeholder="Si lo dejas vacío, usaremos el tipo"/></label>
        <label><span>Tipo ({labels.service.toLowerCase()})</span><select name="serviceId" defaultValue={record.serviceId || ''}><option value="">Sin tipo</option>{repositories.services.filter(service => service.active).map(service => <option value={service.id} key={service.id}>{service.name}</option>)}</select></label>
        <label><span>Fecha *</span><input name="date" type="date" required defaultValue={scheduled.date}/></label>
        <div className="form-span form-inline-pair"><label><span>Hora *</span><input name="time" type="time" required defaultValue={scheduled.time}/></label><label><span>Duración</span><select name="durationMinutes" defaultValue={currentDuration}>{durationOptions.map(minutes => <option value={minutes} key={minutes}>{formatDuration(minutes)}</option>)}</select></label></div>
        {labels.prestation === 'Contenido' && <label className="form-span"><span>Descripción</span><textarea name="description" rows={4} defaultValue={record.description || ''} placeholder="Describe brevemente este contenido."/></label>}
        {labels.supportsFollowUp && <label className="form-span"><span>Seguimiento</span><textarea name="followUpNote" rows={4} defaultValue={record.followUpNote || ''} placeholder="Registra una nota operativa breve sobre esta atención."/></label>}
      </div>
      <footer className="modal-actions"><button type="button" className="ghost-btn" onClick={() => setEditing(false)}>Cancelar</button><button className="primary-btn">Guardar cambios</button></footer>
    </form> : <>
      <div className="record-summary"><p><span>Tipo</span><b>{repositories.services.find(service => service.id === record.serviceId)?.name || 'Sin tipo'}</b></p><p><span>Duración</span><b>{formatDuration(currentDuration)}</b></p>{!labels.supportsFollowUp && <p><span>Estado</span><StatusBadge>{record.status}</StatusBadge></p>}<p><span>Monto</span><b>{record.amount}</b></p><p><span>Pago</span><StatusBadge>{paymentStatus}</StatusBadge></p></div>
      {labels.prestation === 'Contenido' && <section className="prestation-description"><span className="section-kicker">Descripción</span><p>{record.description || 'Sin descripción registrada'}</p></section>}
      {labels.supportsFollowUp && <section className="followup-detail"><span className="section-kicker">Seguimiento</span><p>{record.followUpNote || 'Sin seguimiento registrado'}</p></section>}
      {paymentRequests.length > 0 && <section className="prestation-description"><span className="section-kicker">Solicitud de pago</span><p>Solicitado {formatMoney(requestTotals.requested)} · Pagado {formatMoney(requestTotals.paid)} · Saldo {formatMoney(requestTotals.outstanding)}</p><StatusBadge>{paymentRequests[0].status}</StatusBadge></section>}
      <div className="status-actions"><button onClick={() => repositories.updatePrestation(record.id, { status: 'Completada' })}><Check size={16}/>Completar</button>{record.status !== 'Programada' && <button onClick={() => repositories.updatePrestation(record.id, { status: 'Programada' })}><Clock3 size={16}/>Volver a programada</button>}<button onClick={() => repositories.updatePrestation(record.id, { status: 'No asistió' })}>No asistió</button><button onClick={() => repositories.updatePrestation(record.id, { status: 'Cancelada' })}>Cancelar</button></div>
      <footer className="modal-actions"><button className="secondary-btn" onClick={() => setEditing(true)}><Pencil size={15}/>Editar {labels.prestation.toLowerCase()}</button><button className="secondary-btn" onClick={() => setRequestingPayment(true)}><CircleDollarSign size={15}/>Generar solicitud de pago</button><button className="primary-btn" onClick={onClose}>Listo</button></footer>
    </>}
    {requestingPayment && <PaymentRequestCreateDialog labels={labels} accountId={record.accountId} prestationId={record.id} onClose={() => setRequestingPayment(false)}/>}
  </Modal>
}

function CreateForm({ type, labels, onDone, initialAccountId, initialEngagementId }: { type: string; labels: typeof verticalLabels[Vertical]; onDone: () => void; initialAccountId?: number; initialEngagementId?: number }) {
  const store = useRepositories()
  const lower = type.toLowerCase()
  const mode = lower.includes('pago') ? 'payment' : lower.includes('oportunidad') ? 'opportunity' : lower.includes(labels.account.toLowerCase()) ? 'account' : lower.includes(labels.engagement.toLowerCase()) ? 'engagement' : lower.includes(labels.prestation.toLowerCase()) ? 'prestation' : lower.includes('actividad') ? 'activity' : 'service'
  const emailFirstMode = ['opportunity', 'engagement', 'prestation', 'activity'].includes(mode)
  const hasInheritedContext = mode === 'prestation' && Boolean(initialAccountId && initialEngagementId)
  const [contextLocked, setContextLocked] = useState(hasInheritedContext)
  const [accountId, setAccountId] = useState<number | null>(initialAccountId || (mode === 'payment' ? store.accounts[0]?.id || null : null))
  const [serviceId, setServiceId] = useState(store.services[0]?.id || 0)
  const [organizationId, setOrganizationId] = useState<number | undefined>()
  const [accountError, setAccountError] = useState('')
  const [duplicateAccountId, setDuplicateAccountId] = useState<number | null>(null)
  const selectedService = store.services.find(service => service.id === serviceId)
  const prestationNameLabel = `Nombre ${['Atención', 'Clase'].includes(labels.prestation) ? 'de la' : 'del'} ${labels.prestation.toLowerCase()}`
  const suggestedDuration = serviceDurationMinutes(selectedService?.duration)
  const selectedAccount = store.accounts.find(account => account.id === accountId)
  const selectedOrganization = store.organizations.find(organization => organization.id === selectedAccount?.organizationId)
  const inheritedEngagement = store.engagements.find(engagement => engagement.id === initialEngagementId)
  const accountName = selectedAccount?.name || ''
  const accountOpportunities = selectedAccount ? store.opportunities.filter(opportunity => opportunity.accountId === selectedAccount.id || (!opportunity.accountId && opportunity.account === selectedAccount.name)) : []
  const accountEngagements = selectedAccount ? store.engagements.filter(engagement => engagement.accountId === selectedAccount.id || (!engagement.accountId && engagement.account === selectedAccount.name)) : []
  const accountPrestations = selectedAccount ? store.prestations.filter(prestation => prestation.accountId === selectedAccount.id) : []
  const duplicateAccount = store.accounts.find(account => account.id === duplicateAccountId)

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    const firstName = String(values.firstName || '').trim()
    const lastName = String(values.lastName || '').trim()
    const name = mode === 'account' ? [firstName, lastName].filter(Boolean).join(' ') : String(values.name || '').trim()
    if (mode === 'account') {
      const email = normalizeEmail(String(values.email || ''))
      const existing = findAccountByEmail(store.accounts, email)
      if (existing) { setDuplicateAccountId(existing.id); return }
      store.accountRepository.create({ workspaceId: 1, firstName, lastName, displayName: name, organizationId, role: String(values.role || '').trim() || undefined, name, type: 'Persona', status: 'Prospecto', last: 'Ahora', next: '—', income: '$0', pending: '$0', email, phone: String(values.phone || ''), rut: String(values.rut || '') })
    } else if (mode === 'opportunity') {
      if (!selectedAccount) { setAccountError(`Selecciona ${labels.account.toLowerCase()} por email.`); return }
      store.addOpportunity({ accountId: selectedAccount.id, account: selectedAccount.name, title: name, amount: String(values.amount || '$0'), close: '30 Ago', contact: selectedAccount.name, last: 'Ahora', stage: String(values.stage || 'Nuevo') })
    } else if (mode === 'engagement') {
      if (!selectedAccount) { setAccountError(`Selecciona ${labels.account.toLowerCase()} por email.`); return }
      store.addEngagement({ accountId: selectedAccount.id, opportunityId: Number(values.opportunityId) || undefined, name, account: selectedAccount.name, type: labels.engagement, progress: 0, detail: `0 ${labels.prestations.toLowerCase()}`, amount: String(values.amount || '$0'), status: 'Activo', startDate: labels.timelineEnabled ? String(values.startDate || '') || undefined : undefined, endDate: labels.timelineEnabled ? String(values.endDate || '') || undefined : undefined })
    } else if (mode === 'prestation') {
      if (!selectedAccount) { setAccountError(`Selecciona ${labels.account.toLowerCase()} por email.`); return }
      const engagementId = Number(values.engagementId) || undefined
      const prestationServiceId = Number(values.serviceId) || undefined
      const prestationName = resolvePrestationName(name, prestationServiceId, store.services, labels.prestation)
      store.addPrestation({ accountId: selectedAccount.id, engagementId, serviceId: prestationServiceId, date: formatScheduledDate(String(values.date || '2026-08-17'), String(values.time || '09:00')), account: selectedAccount.name, name: prestationName, description: String(values.description || '').trim(), durationMinutes: Number(values.durationMinutes) || suggestedDuration, origin: engagementId ? labels.engagement : 'Directa', status: String(values.status || 'Programada'), amount: String(values.amount || selectedService?.price || '$0'), payment: 'Pendiente', followUpNote: labels.supportsFollowUp ? String(values.followUpNote || '').trim() : undefined })
    } else if (mode === 'activity') {
      if (!selectedAccount) { setAccountError(`Selecciona ${labels.account.toLowerCase()} por email.`); return }
      const activityDate = String(values.date || '2026-08-18'); const activityTime = String(values.time || '09:00')
      store.addActivity({ title: name, relation: `${selectedAccount.name} · ${String(values.activityType || 'Tarea')}`, date: formatScheduledDate(activityDate, activityTime), type: String(values.activityType || 'Tarea'), status: 'Pendiente', accountId: selectedAccount.id, opportunityId: Number(values.opportunityId) || undefined, engagementId: Number(values.engagementId) || undefined, prestationId: Number(values.prestationId) || undefined, scheduledAt: `${activityDate}T${activityTime}:00-04:00` })
    } else {
      store.addService({ name, description: String(values.description || ''), duration: `${String(values.duration || '60')} min`, price: String(values.amount || '$0'), active: true })
    }
    onDone()
  }

  return <form onSubmit={submit}>
    <div className="form-grid">
      {emailFirstMode && !contextLocked && <AccountEmailSelector accounts={store.accounts} labels={labels} selectedAccountId={accountId} onSelect={account => { setAccountId(account?.id || null); setAccountError('') }} onCreate={store.accountRepository.create} organizations={store.organizations} onCreateOrganization={store.organizationRepository.create}/>}
      {accountError && <p className="form-error form-span">{accountError}</p>}
      {emailFirstMode && selectedAccount && <div className={cls('selected-person-context form-span', contextLocked && 'inherited-context')}><span><small>{labels.account}</small><b>{selectedAccount.name}</b><small>{selectedOrganization?.name || 'Independiente'}{selectedAccount.role ? ` · ${selectedAccount.role}` : ''}</small>{contextLocked && inheritedEngagement && <small>{labels.engagement}: {inheritedEngagement.name}</small>}</span>{contextLocked && <button type="button" className="text-btn" onClick={() => setContextLocked(false)}>Cambiar contexto</button>}</div>}
      {mode === 'payment' && <label><span>{labels.account} *</span><select required value={accountId || ''} onChange={event => setAccountId(Number(event.target.value))}>{store.accounts.map(account => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label>}
      {mode === 'account' && <><label className="form-span"><span>Email *</span><input name="email" type="email" required autoFocus autoComplete="email" onChange={() => setDuplicateAccountId(null)} /></label><label><span>Nombre *</span><input name="firstName" required autoComplete="given-name" placeholder="Nombre" /></label><label><span>Apellido</span><input name="lastName" autoComplete="family-name" placeholder="Apellido" /></label><label><span>Teléfono</span><input name="phone" autoComplete="tel" /></label><label><span>RUT</span><input name="rut" /></label><div className="form-span"><OrganizationSelector organizations={store.organizations} labels={labels} selectedId={organizationId} onSelect={organization => setOrganizationId(organization?.id)} onCreate={store.organizationRepository.create}/></div><label className="form-span"><span>Cargo / Rol</span><input name="role" placeholder="Cargo o rol (opcional)" disabled={!organizationId}/></label>{duplicateAccount && <div className="duplicate-account form-span"><b>Ya existe {labels.account.toLowerCase()} con este email.</b><span>{duplicateAccount.name}<small>{duplicateAccount.email}</small></span><button type="button" className="secondary-btn" onClick={onDone}>Usar este {labels.account.toLowerCase()}</button></div>}</>}
      {mode === 'opportunity' && <><label><span>Oportunidad *</span><input name="name" required placeholder="Ej. Plan de 8 sesiones" /></label><label><span>Monto estimado</span><input name="amount" placeholder="$0" /></label><label><span>Cierre estimado</span><input name="date" type="date" defaultValue="2026-08-30" /></label><label><span>Etapa</span><select name="stage"><option>Nuevo</option><option>Contactado</option><option>Propuesta</option><option>Negociación</option></select></label></>}
      {mode === 'engagement' && <><label><span>Nombre *</span><input name="name" required placeholder={`Nombre del ${labels.engagement.toLowerCase()}`} /></label><label><span>Oportunidad de origen</span><select name="opportunityId" disabled={!selectedAccount}><option value="">Venta directa</option>{accountOpportunities.map(opportunity => <option value={opportunity.id} key={opportunity.id}>{opportunity.title}</option>)}</select></label><label><span>Monto acordado</span><input name="amount" placeholder="$0" /></label><label><span>Modalidad</span><select name="billing"><option>Puntual</option><option>Recurrente</option></select></label>{labels.timelineEnabled && <><label><span>Fecha de inicio</span><input name="startDate" type="date" /></label><label><span>Fecha de término</span><input name="endDate" type="date" /></label></>}</>}
      {mode === 'prestation' && <><label className="form-span"><span>{prestationNameLabel} (opcional)</span><input name="name" placeholder={`Si lo dejas vacío, usaremos ${selectedService?.name || `el ${labels.service.toLowerCase()}`}`} /></label><label><span>Tipo ({labels.service.toLowerCase()})</span><select name="serviceId" value={serviceId} onChange={event => setServiceId(Number(event.target.value))}>{store.services.filter(service => service.active).map(service => <option value={service.id} key={service.id}>{service.name}</option>)}</select></label>{contextLocked ? <input type="hidden" name="engagementId" value={initialEngagementId}/> : <label><span>{labels.engagement} opcional</span><select name="engagementId" defaultValue={initialEngagementId || ''} disabled={!selectedAccount}><option value="">Directa</option>{accountEngagements.map(engagement => <option value={engagement.id} key={engagement.id}>{engagement.name}</option>)}</select></label>}{labels.prestation === 'Contenido' && <label className="form-span"><span>Descripción</span><textarea name="description" rows={3} placeholder="Alcance o detalle breve del contenido."/></label>}<label className="form-span"><span>Fecha</span><input name="date" type="date" defaultValue="2026-08-17" /></label><div className="form-span form-inline-pair"><label><span>Hora</span><input name="time" type="time" defaultValue="09:00" /></label><label><span>Duración</span><select key={`${serviceId}-${suggestedDuration}`} name="durationMinutes" defaultValue={suggestedDuration}>{durationOptions.map(minutes => <option value={minutes} key={minutes}>{formatDuration(minutes)}</option>)}</select></label></div>{!labels.supportsFollowUp && <label><span>Estado</span><select name="status" defaultValue="Programada"><option>Programada</option><option>Completada</option><option>Cancelada</option><option>No asistió</option></select></label>}<label><span>Monto</span><input key={serviceId} name="amount" defaultValue={selectedService?.price || '$0'} /></label>{labels.supportsFollowUp && <label className="form-span"><span>Seguimiento</span><textarea name="followUpNote" rows={4} placeholder="Se mantiene frecuencia semanal..."/></label>}</>}
      {mode === 'activity' && <><label><span>Título *</span><input name="name" required placeholder="Qué necesitas hacer" /></label><label><span>Tipo</span><select name="activityType">{['Tarea','Llamada','Reunión','Email','WhatsApp','Nota','Hito'].map(item => <option key={item}>{item}</option>)}</select></label><label><span>Oportunidad opcional</span><select name="opportunityId" disabled={!selectedAccount}><option value="">Sin oportunidad</option>{accountOpportunities.map(opportunity => <option value={opportunity.id} key={opportunity.id}>{opportunity.title}</option>)}</select></label><label><span>{labels.engagement} opcional</span><select name="engagementId" disabled={!selectedAccount}><option value="">Sin {labels.engagement.toLowerCase()}</option>{accountEngagements.map(engagement => <option value={engagement.id} key={engagement.id}>{engagement.name}</option>)}</select></label><label><span>{labels.prestation} opcional</span><select name="prestationId" disabled={!selectedAccount}><option value="">Sin {labels.prestation.toLowerCase()}</option>{accountPrestations.map(prestation => <option value={prestation.id} key={prestation.id}>{prestation.date} · {prestation.name}</option>)}</select></label><label><span>Fecha</span><input name="date" type="date" defaultValue="2026-08-17" /></label><label><span>Hora</span><input name="time" type="time" defaultValue="09:00" /></label></>}
      {mode === 'payment' && <><label><span>Monto *</span><input name="amount" placeholder="$0" required autoFocus /></label><label><span>Fecha</span><input name="date" type="date" defaultValue="2026-08-17" /></label><label><span>Método</span><select name="method"><option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option></select></label><label><span>Estado</span><select name="status"><option>Pagado</option><option>Pendiente</option></select></label></>}
      {mode === 'service' && <><label><span>Nombre *</span><input name="name" required autoFocus placeholder={labels.service} /></label><label><span>Precio sugerido</span><input name="amount" required placeholder="$0" /></label><label><span>Duración (min)</span><input name="duration" type="number" defaultValue="60" /></label><label><span>Descripción</span><input name="description" /></label></>}
    </div>
    <footer className="modal-actions"><button type="button" className="ghost-btn" onClick={onDone}>Cancelar</button><button className="primary-btn">Guardar</button></footer>
  </form>
}

function Dashboard({ labels, go, onCreatePrestation }: { labels: typeof verticalLabels[Vertical]; go: Navigate; onCreatePrestation: () => void }) {
  const repositories = useRepositories()
  const { activities, prestations, payments } = repositories
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
  const previousPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), previousMonthLastDay), 23, 59, 59, 999)
  const paymentDate = (payment: typeof payments[number]) => payment.createdAt ? new Date(payment.createdAt) : parseBusinessDate(payment.date, now.getFullYear())
  const revenueForPeriod = (start: Date, end: Date) => payments.filter(payment => payment.status === 'Pagado' && isDateBetween(paymentDate(payment), start, end)).reduce((sum, payment) => sum + parseMoney(payment.amount), 0)
  const pendingActivities = activities.filter(activity => activity.status === 'Pendiente' || activity.status === 'Vencida').length
  const pendingRequests = repositories.paymentRequests.filter(request => request.status === 'Pendiente')
  const pendingPayments = pendingRequests.length
  const pendingAmount = pendingRequests.reduce((sum, request) => sum + (repositories.paymentRequestRepository.summary(request.id)?.outstanding || 0), 0)
  const paidAmount = revenueForPeriod(currentPeriodStart, now)
  const previousPaidAmount = revenueForPeriod(previousPeriodStart, previousPeriodEnd)
  const revenueVariation = previousPaidAmount > 0 ? ((paidAmount - previousPaidAmount) / previousPaidAmount) * 100 : paidAmount > 0 ? 100 : 0
  const previousMonthName = new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(previousPeriodStart)
  const revenueTrend = `${revenueVariation > 0 ? '+' : ''}${revenueVariation.toLocaleString('es-CL', { maximumFractionDigits: 1 })}% vs el 1–${now.getDate()} de ${previousMonthName}`
  const completedPrestations = prestations.filter(prestation => prestation.status === 'Completada')
  const averageTicket = completedPrestations.length ? completedPrestations.reduce((sum, prestation) => sum + parseMoney(prestation.amount), 0) / completedPrestations.length : 0
  const scheduledRemaining = prestations.filter(prestation => prestation.status === 'Programada' && isDateBetween(parseBusinessDate(prestation.date, now.getFullYear()), todayStart, monthEnd))
  const today = scheduledRemaining.filter(prestation => parseBusinessDate(prestation.date, now.getFullYear())?.getTime() === todayStart.getTime()).sort((a, b) => a.date.localeCompare(b.date))
  const projectedAmount = scheduledRemaining.length * averageTicket
  return <>
    <PageHeader eyebrow="Lunes 17 de agosto" title="Buenos días, Francisca" description="Aquí tienes lo más importante para mover tu negocio hoy." />
    <div className="metrics-grid">
      <button className="dashboard-create-card" onClick={onCreatePrestation}><span className="dashboard-create-icon"><Plus size={20}/></span><strong>{labels.createPrestation}</strong><ChevronRight size={18}/></button>
      <MetricCard label="Ingresos registrados" value={formatMoney(paidAmount)} meta={revenueTrend} metaTone={revenueVariation >= 0 ? 'positive' : 'negative'} icon={WalletCards} tone="green" />
      <MetricCard label="Por cobrar" value={formatMoney(pendingAmount)} meta={`${pendingPayments} solicitudes pendientes`} icon={Clock3} tone="orange" />
      <MetricCard label={`${labels.prestations} programadas`} value={String(scheduledRemaining.length)} meta={`${formatMoney(projectedAmount)} proyectados`} icon={FileCheck2} tone="blue" />
    </div>
    <div className="dashboard-grid">
      <section className="card schedule-card">
        <div className="card-heading"><div><span className="section-kicker">Tu agenda</span><h2>Agenda de hoy</h2><p className="schedule-summary">Hoy tienes {today.length} {today.length === 1 ? labels.prestation.toLowerCase() : labels.prestations.toLowerCase()}</p></div><button className="text-btn" onClick={() => go('agenda')}>Ver agenda <ChevronRight size={16} /></button></div>
        <div className="agenda-list">{today.map(item => <button className="agenda-row" key={item.id} onClick={() => go('prestations', { id: item.id })}>
          <time>{item.date.split(' · ')[1]}</time><span className="agenda-dot violet" /><div><strong>{item.account}</strong><span>{item.name}</span></div><StatusBadge>{item.status}</StatusBadge><b>{item.amount}</b><ChevronRight size={16} />
        </button>)}</div>
      </section>
      <section className="card attention-card">
        <div className="card-heading"><div><span className="section-kicker">Asistente operativo</span><h2>Necesitan tu atención</h2></div><Zap size={20} /></div>
        <button onClick={() => go('payments', { status: 'Pendientes' })}><span className="attention-icon orange"><CircleDollarSign size={18} /></span><div><b>{pendingPayments} solicitudes pendientes</b><span>{formatMoney(pendingAmount)} por cobrar</span></div><ChevronRight size={16} /></button>
        <button onClick={() => go('activities', { status: 'Vencidas' })}><span className="attention-icon red"><Clock3 size={18} /></span><div><b>{pendingActivities} actividades pendientes</b><span>Prioriza las vencidas primero</span></div><ChevronRight size={16} /></button>
        <button onClick={() => go('opportunities', { attention: 'stale' })}><span className="attention-icon violet"><Target size={18} /></span><div><b>3 oportunidades sin actividad</b><span>Hace más de 7 días</span></div><ChevronRight size={16} /></button>
        <button onClick={() => go('prestations', { status: 'Pendientes' })}><span className="attention-icon blue"><FileCheck2 size={18} /></span><div><b>{prestations.filter(item => item.status === 'Programada').length} {labels.prestations.toLowerCase()} por completar</b><span>Programadas para hoy</span></div><ChevronRight size={16} /></button>
      </section>
      <section className="card chart-card">
        <div className="card-heading"><div><span className="section-kicker">Últimos 6 meses</span><h2>Ingresos y cobros pendientes</h2></div><button className="period-btn">Este año <ChevronDown size={14} /></button></div>
        <div className="chart-legend"><span><i className="legend-dot income" />Ingresos</span><span><i className="legend-dot pending" />Pendiente</span></div>
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs><linearGradient id="income" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6254e7" stopOpacity={.2}/><stop offset="95%" stopColor="#6254e7" stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#e8ebe7" strokeDasharray="3 5"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill:'#8a918d',fontSize:12 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill:'#8a918d',fontSize:12 }} tickFormatter={v => `$${v/1000}M`}/><Tooltip formatter={(v) => [`$${Number(v).toLocaleString('es-CL')}.000`, '']} />
          <Area type="monotone" dataKey="income" stroke="#6254e7" strokeWidth={2.5} fill="url(#income)"/><Area type="monotone" dataKey="pending" stroke="#e8a84c" strokeWidth={2} fill="transparent" strokeDasharray="5 4"/>
        </AreaChart></ResponsiveContainer></div>
      </section>
      <section className="card recent-card"><div className="card-heading"><div><span className="section-kicker">Últimos movimientos</span><h2>Actividad reciente</h2></div><MoreHorizontal size={19} /></div>
        {[['MP','María Pérez','Pago registrado · $35.000','Hace 20 min','green'],['PG','Pedro González','Oportunidad pasó a Propuesta','Hace 2 h','violet'],['CD','Carolina Díaz',`${labels.prestation} marcada como realizada`,'Hace 3 h','orange'],['JS','Juan Soto','Nueva actividad programada','Ayer','blue']].map((r,i)=><div className="recent-row" key={i}><span className={cls('avatar-sm',r[4])}>{r[0]}</span><div><b>{r[1]}</b><span>{r[2]}</span></div><time>{r[3]}</time></div>)}
      </section>
    </div>
  </>
}

function OpportunitiesPage({ labels, go, onCreate }: { labels: Labels; go:Navigate; onCreate:()=>void }) {
  const { opportunities, updateOpportunity } = useRepositories()
  const stages=['Nuevo','Contactado','Propuesta','Negociación']
  return <><PageHeader className="mobile-labeled-action" title="Oportunidades" description={`Haz seguimiento a cada posibilidad hasta convertirla en un ${labels.engagement.toLowerCase()} activo.`} action="Crear oportunidad" onAction={onCreate}/><div className="pipeline-summary card"><div><span>Pipeline abierto</span><b>$1.575.000</b></div><div><span>Oportunidades</span><b>{opportunities.length}</b></div><div><span>Tasa de conversión</span><b>38%</b></div><div><span>Requieren seguimiento</span><b>{opportunities.filter(item=>item.last.includes('7 días')).length}</b></div></div><div className="kanban">{stages.map(stage=><section className="kanban-column" onDragOver={event=>event.preventDefault()} onDrop={event=>updateOpportunity(Number(event.dataTransfer.getData('opportunityId')),{stage})} key={stage}><header><span><i className={`stage-dot ${stage.toLowerCase()}`}/>{stage}</span><b>{opportunities.filter(o=>o.stage===stage).length}</b></header>{opportunities.filter(o=>o.stage===stage).map(o=><article draggable onDragStart={event=>event.dataTransfer.setData('opportunityId',String(o.id))} className={cls('opportunity-card card',o.last.includes('7 días')&&'needs-attention')} onClick={()=>go('opportunity',{id:o.id})} key={o.id}><div><span>{o.account}</span><select aria-label={`Etapa de ${o.title}`} value={o.stage} onClick={event=>event.stopPropagation()} onChange={event=>updateOpportunity(o.id,{stage:event.target.value})}>{stages.map(item=><option key={item}>{item}</option>)}</select></div><h3>{o.title}</h3><strong>{o.amount}</strong><footer><span><CalendarDays size={13}/>{o.close}</span><span>{o.last}</span></footer></article>)}<button className="add-card" onClick={onCreate}><Plus size={15}/>Agregar oportunidad</button></section>)}</div></>
}

function OpportunityDetail({ labels, go, onCreate }: { labels: typeof verticalLabels[Vertical]; go:Navigate; onCreate:(type?:string)=>void }) {
  const store=useRepositories(); const [won,setWon]=useState(false); const [lost,setLost]=useState(false)
  const id=Number(new URLSearchParams(window.location.search).get('id'))||store.opportunities[0]?.id
  const opportunity=store.opportunities.find(item=>item.id===id)||store.opportunities[0]
  if(!opportunity)return <EmptyState title="Sin oportunidades" body="Crea una oportunidad para comenzar el seguimiento." action="Nueva oportunidad" onAction={()=>onCreate('Nueva oportunidad')}/>
  const win=(create:boolean)=>{store.updateOpportunity(opportunity.id,{stage:'Ganada',last:'Ahora'});if(create){store.addEngagement({accountId:opportunity.accountId,opportunityId:opportunity.id,name:opportunity.title,account:opportunity.account,type:labels.engagement,progress:0,detail:`0 ${labels.prestations.toLowerCase()}`,amount:opportunity.amount,status:'Activo'});go('work')}else{setWon(false);go('opportunities')}}
  return <><button className="back-btn" onClick={()=>go('opportunities')}><ChevronLeft size={17}/>Volver al pipeline</button><section className="detail-hero card"><div><span className="section-kicker">Oportunidad · {opportunity.stage}</span><h1>{opportunity.title}</h1><p>{opportunity.account}</p></div><div className="opportunity-value"><b>{opportunity.amount}</b><span>70% probabilidad</span></div></section><div className="opportunity-layout"><main><section className="card timeline-card"><div className="card-heading"><h2>Actividad de la oportunidad</h2><button className="secondary-btn" onClick={()=>onCreate('Nueva actividad')}><Plus size={16}/>Agregar actividad</button></div>{[['17 Ago','Seguimiento pendiente','Recordatorio para contactar'],['12 Ago','Propuesta enviada',opportunity.title],['08 Ago','Reunión realizada',`${opportunity.contact} · 45 minutos`],['04 Ago','Oportunidad creada','Origen: recomendación']].map((x,i)=><div className="timeline-item" key={i}><time>{x[0]}</time><span className="timeline-dot"/><div><b>{x[1]}</b><span>{x[2]}</span></div></div>)}</section></main><aside><section className="card detail-fields"><h3>Detalles</h3><p><span>Cuenta</span><b>{opportunity.account}</b></p><p><span>Contacto</span><b>{opportunity.contact}</b></p><p><span>Monto</span><b>{opportunity.amount}</b></p><p><span>Etapa</span><select value={opportunity.stage} onChange={event=>store.updateOpportunity(opportunity.id,{stage:event.target.value})}>{['Nuevo','Contactado','Propuesta','Negociación'].map(item=><option key={item}>{item}</option>)}</select></p><p><span>Cierre estimado</span><b>{opportunity.close}</b></p></section><button className="win-btn" onClick={()=>setWon(true)}><Check size={18}/>Marcar como ganada</button><button className="lost-btn" onClick={()=>setLost(true)}>Marcar como perdida</button></aside></div>{won&&<Modal title="¡Oportunidad ganada!" subtitle="Elige explícitamente qué debe ocurrir con esta venta." onClose={()=>setWon(false)}><div className="choice-list"><button onClick={()=>win(true)}><span className="choice-icon"><BriefcaseBusiness size={19}/></span><div><b>Crear {labels.engagement.toLowerCase()}</b><span>Organiza el {labels.engagement.toLowerCase()} y sus próximas {labels.prestations.toLowerCase()}.</span></div><ChevronRight size={17}/></button><button onClick={()=>win(false)}><span className="choice-icon"><Check size={19}/></span><div><b>Solo cerrar oportunidad</b><span>No crear {labels.engagement.toLowerCase()} asociado por ahora.</span></div><ChevronRight size={17}/></button></div></Modal>}{lost&&<Modal title="Marcar oportunidad como perdida" subtitle="El motivo ayuda a aprender sin agregar burocracia." onClose={()=>setLost(false)}><form onSubmit={event=>{event.preventDefault();store.updateOpportunity(opportunity.id,{stage:'Perdida',last:`Perdida · ${String(new FormData(event.currentTarget).get('reason'))}`});setLost(false);go('opportunities')}}><div className="form-grid single"><label><span>Motivo *</span><select name="reason" required><option>Precio</option><option>Sin respuesta</option><option>Eligió otra alternativa</option><option>Prioridad postergada</option><option>Otro</option></select></label></div><footer className="modal-actions"><button type="button" className="ghost-btn" onClick={()=>setLost(false)}>Cancelar</button><button className="primary-btn">Confirmar pérdida</button></footer></form></Modal>}</>
}

function WorkPage({ labels, go, onCreate }: { labels: typeof verticalLabels[Vertical]; go:Navigate; onCreate:()=>void }) {
  const {engagements}=useRepositories(); const query=new URLSearchParams(window.location.search); const [active,setActive]=useState(query.get('status')||'Activos')
  const visible=engagements.filter(item=>active==='Todos'||(active==='Activos'?item.status==='Activo':item.status==='Completado'))
  return <><PageHeader title={labels.engagements} description={labels.engagementDescription} action={newEngagementLabel(labels)} onAction={onCreate}/><div className="tabs standalone">{['Activos','Todos','Completados'].map(tab=><button className={active===tab?'active':''} onClick={()=>setActive(tab)} key={tab}>{tab}{tab==='Activos'&&<span>{engagements.filter(item=>item.status==='Activo').length}</span>}</button>)}</div>{visible.length?<div className="engagement-grid">{visible.map(e=><button className="engagement-card card" onClick={()=>go('engagement',{id:e.id})} key={e.id}><div className="engagement-top"><span className="work-icon"><BriefcaseBusiness size={19}/></span><StatusBadge>{e.status}</StatusBadge></div><span>{e.account}</span><h3>{e.name}</h3><p>{labels.engagement} · {verticalizeEngagementDetail(e.detail, labels.prestations)}</p><div className="progress-label"><span>Avance</span><b>{e.progress}%</b></div><div className="progress"><i style={{width:`${e.progress}%`}}/></div><footer><strong>{e.amount}</strong><ChevronRight size={17}/></footer></button>)}</div>:<EmptyState title={`No hay ${labels.engagements.toLowerCase()} en esta vista`} body={`Cambia el filtro o crea el primer ${labels.engagement.toLowerCase()}.`} action={newEngagementLabel(labels)} onAction={onCreate}/>}</>
}

function EngagementDetail({ labels, go, onCreate }: { labels: typeof verticalLabels[Vertical]; go:Navigate; onCreate:(type?:string)=>void }) {
  const store=useRepositories(); const id=Number(new URLSearchParams(window.location.search).get('id'))||store.engagements[0]?.id; const engagement=store.engagements.find(item=>item.id===id)||store.engagements[0]
  if(!engagement)return <EmptyState title={`Sin ${labels.engagements.toLowerCase()}`} body={`Crea un ${labels.engagement.toLowerCase()} para agrupar sus ${labels.prestations.toLowerCase()}.`} action={newEngagementLabel(labels)} onAction={()=>onCreate(newEngagementLabel(labels))}/>
  const related=store.prestations.filter(item=>item.engagementId===engagement.id||(!item.engagementId&&item.accountId===engagement.accountId)); const complete=related.filter(item=>item.status==='Completada').length; const progress=related.length?Math.round(complete/related.length*100):engagement.progress
  return <><button className="back-btn" onClick={()=>go('work')}><ChevronLeft size={17}/>Volver a {labels.engagements.toLowerCase()}</button><section className="detail-hero card"><div><span className="section-kicker">{labels.engagement} · {engagement.status}</span><h1>{engagement.name}</h1><p>{engagement.account} · {labels.engagement}</p></div><div className="hero-actions"><button className="secondary-btn" onClick={()=>onCreate('Registrar pago')}>Registrar pago</button><button className="primary-btn" onClick={()=>onCreate(newPrestationLabel(labels))}><Plus size={16}/>Agregar {labels.prestation.toLowerCase()}</button></div></section><div className="engagement-detail"><main><section className="card checklist-card"><div className="card-heading"><div><span className="section-kicker">{complete} de {related.length} {completedWord(labels.prestation)}</span><h2>{labels.prestations} asociadas</h2></div><StatusBadge tone="green">{progress}% avance</StatusBadge></div>{related.length?related.map(item=><button key={item.id} className={item.status==='Completada'?'done':''} onClick={()=>go('prestations',{id:item.id})}><span className="check-circle">{item.status==='Completada'&&<Check size={14}/>}</span><div><b>{item.name}</b><span>{item.date} · {item.status}</span></div><strong>{item.amount}</strong><StatusBadge>{item.payment}</StatusBadge></button>):<EmptyState title={`Sin ${labels.prestations.toLowerCase()}`} body={`Agrega la primera ${labels.prestation.toLowerCase()} para comenzar a operar este ${labels.engagement.toLowerCase()}.`} action={`Agregar ${labels.prestation.toLowerCase()}`} onAction={()=>onCreate(newPrestationLabel(labels))}/>}</section></main><aside><section className="card mini-finance"><h3>Resumen</h3><p><span>Monto acordado</span><b>{engagement.amount}</b></p><p><span>Avance</span><b className="green-text">{progress}%</b></p><div className="progress"><i style={{width:`${progress}%`}}/></div></section><section className="card info-card"><h3>Estado del {labels.engagement.toLowerCase()}</h3><label><span>Estado</span><select value={engagement.status} onChange={event=>store.updateEngagement(engagement.id,{status:event.target.value})}><option>Activo</option><option>Completado</option><option>Cancelado</option></select></label><p><span>Origen</span>Oportunidad o venta directa</p><p><span>Modalidad</span>Puntual</p></section></aside></div></>
}

function PrestationsPage({ labels, onCreate }: { labels: typeof verticalLabels[Vertical]; onCreate:()=>void }) {
  const store=useRepositories(); const params=new URLSearchParams(window.location.search); const [active,setActive]=useState('Todas'); const [selected,setSelected]=useState<number|null>(Number(params.get('id'))||null); const [search,setSearch]=useState('')
  const filters = labels.supportsFollowUp ? ['Todas','Hoy'] : ['Todas','Hoy','Pendientes','Realizadas','Canceladas']
  const visible=store.prestations.filter(item=>{const matches=(`${item.account} ${item.name}`).toLowerCase().includes(search.toLowerCase());if(!matches)return false;if(active==='Pendientes')return store.paymentRequestRepository.collectionStatusForPrestation(item.id)!=='Pagado';if(active==='Realizadas')return item.status==='Completada';if(active==='Canceladas')return ['Cancelada','No asistió'].includes(item.status);if(active==='Hoy')return item.date.startsWith('17 Ago');return true}); const current=store.prestations.find(item=>item.id===selected)
  return <><PageHeader title={labels.prestations} description={`Revisa todas las ${labels.prestations.toLowerCase()} realizadas o programadas para tus ${labels.accounts.toLowerCase()}.`} action={newPrestationLabel(labels)} onAction={onCreate}/><div className="toolbar card"><div className="tabs">{filters.map(tab=><button className={active===tab?'active':''} onClick={()=>setActive(tab)} key={tab}>{tab}</button>)}</div><label className="inline-search"><Search size={16}/><input aria-label={`Buscar ${labels.prestations.toLowerCase()}`} value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar..."/></label></div>{visible.length?<div className="table-card card"><table><thead><tr><th>Fecha</th><th>{labels.account}</th><th>{labels.prestation}</th><th>Origen</th>{!labels.supportsFollowUp&&<th>Estado</th>}<th>Monto</th><th>Pago</th><th></th></tr></thead><tbody>{visible.map(p=><tr className="clickable-row" onClick={()=>setSelected(p.id)} key={p.id}><td><b>{p.date}</b></td><td>{p.account}</td><td>{p.name}</td><td>{p.origin}</td>{!labels.supportsFollowUp&&<td><StatusBadge>{p.status}</StatusBadge></td>}<td className="number">{p.amount}</td><td><StatusBadge>{store.paymentRequestRepository.collectionStatusForPrestation(p.id)}</StatusBadge></td><td><ChevronRight size={17}/></td></tr>)}</tbody></table></div>:<EmptyState title={`No hay ${labels.prestations.toLowerCase()} en esta vista`} body="Prueba otro filtro o registra una nueva unidad de servicio." action={newPrestationLabel(labels)} onAction={onCreate}/>} {current&&<PrestationDetailModal record={current} labels={labels} onClose={()=>setSelected(null)}/>}</>
}

function FilterBar({ tabs }: { tabs:string[] }) { const [active,setActive]=useState(tabs[0]); return <div className="toolbar card"><div className="tabs">{tabs.map(t=><button className={active===t?'active':''} onClick={()=>setActive(t)} key={t}>{t}</button>)}</div><div className="toolbar-actions"><button className="secondary-btn"><ListChecks size={16}/>Filtros</button><button className="secondary-btn"><Search size={16}/></button></div></div> }

function AgendaPage({ labels, onCreate }: { labels: typeof verticalLabels[Vertical]; onCreate:()=>void }) {
  const store=useRepositories(); const days=['Lun 17','Mar 18','Mié 19','Jue 20','Vie 21']; const hours=['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00']; const [view,setView]=useState('Semana'); const [offset,setOffset]=useState(0); const [selected,setSelected]=useState<number|null>(null); const current=store.prestations.find(item=>item.id===selected); const range=offset===0?'17–21 agosto 2026':offset<0?'10–14 agosto 2026':'24–28 agosto 2026'
  return <><PageHeader title="Agenda" description={`Revisa tus ${labels.prestations.toLowerCase()}, reuniones, tareas e hitos en un solo lugar.`} action="Nuevo" onAction={onCreate}/><div className="calendar-toolbar card"><div><button aria-label="Periodo anterior" className="icon-btn" onClick={()=>setOffset(value=>value-1)}><ChevronLeft size={17}/></button><button aria-label="Periodo siguiente" className="icon-btn" onClick={()=>setOffset(value=>value+1)}><ChevronRight size={17}/></button><button className="secondary-btn" onClick={()=>setOffset(0)}>Hoy</button><h2>{view==='Mes'?'Agosto 2026':view==='Día'?'Lunes 17 agosto 2026':range}</h2></div><div className="tabs">{['Día','Semana','Mes'].map(item=><button className={view===item?'active':''} onClick={()=>setView(item)} key={item}>{item}</button>)}</div></div>{offset===0?<div className={cls('calendar card',`calendar-${view.toLowerCase()}`)}><div className="calendar-head"><span/><span className="today">Lun<b>17</b></span>{view!=='Día'&&days.slice(1).map(d=><span key={d}>{d.split(' ')[0]}<b>{d.split(' ')[1]}</b></span>)}</div><div className="calendar-body"><div className="time-column">{hours.map(h=><span key={h}>{h}</span>)}</div>{days.slice(0,view==='Día'?1:5).map((d,di)=><div className="day-column" key={d}>{hours.map(h=><i key={h}/>) }{di===0&&<><button className="cal-event violet" style={{top:52,height:78}} onClick={()=>setSelected(1)}><b>09:00</b><span>María Pérez</span><small>Sesión individual</small></button><button className="cal-event orange" style={{top:132,height:100}} onClick={()=>setSelected(2)}><b>10:30</b><span>Carolina Díaz</span><small>Evaluación inicial</small></button><button className="cal-event blue" style={{top:258,height:52}} onClick={()=>onCreate()}><b>12:00</b><span>Llamada Daniela</span></button><button className="cal-event violet" style={{top:442,height:78}} onClick={()=>setSelected(3)}><b>15:00</b><span>Pedro González</span><small>Sesión individual</small></button></>}</div>)}</div></div>:<EmptyState title="Sin compromisos en este periodo" body="Vuelve a hoy o crea una prestación o actividad para este periodo." action="Volver a hoy" onAction={()=>setOffset(0)}/>} {current&&<Modal title={current.name} subtitle={`${current.account} · ${current.date}`} onClose={()=>setSelected(null)}><div className="record-summary"><p><span>Estado</span><StatusBadge>{current.status}</StatusBadge></p><p><span>Monto</span><b>{current.amount}</b></p><p><span>Pago</span><StatusBadge>{current.payment}</StatusBadge></p></div><div className="status-actions"><button onClick={()=>store.updatePrestation(current.id,{status:'Completada'})}><Check size={16}/>Marcar realizada</button><button onClick={()=>store.updatePrestation(current.id,{status:'No asistió'})}>No asistió</button><button onClick={()=>store.updatePrestation(current.id,{status:'Cancelada'})}>Cancelar</button></div></Modal>}</>
}

type AgendaView = 'Día' | 'Semana' | 'Mes' | 'Gantt'

function RepositoryAgendaPage({ labels, onCreate }: { labels: Labels; onCreate: () => void }) {
  const repositories = useRepositories()
  const days = [{ label: 'Lun', day: 17 }, { label: 'Mar', day: 18 }, { label: 'Mié', day: 19 }, { label: 'Jue', day: 20 }, { label: 'Vie', day: 21 }, { label: 'Sáb', day: 22 }, { label: 'Dom', day: 23 }]
  const hours = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00']
  const views: AgendaView[] = ['Día','Semana','Mes','Gantt']
  const [view, setView] = useState<AgendaView>(labels.defaultAgendaView)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<number | null>(null)
  const current = repositories.prestations.find(item => item.id === selected)
  const currentActivity = repositories.activities.find(item => item.id === selectedActivity)
  const currentActivityPrestation = repositories.prestations.find(item => item.id === currentActivity?.prestationId)
  const currentActivityAccount = repositories.accounts.find(item => item.id === currentActivity?.accountId)
  const scheduledItems = repositories.prestations.flatMap(item => {
    const match = item.date.match(/^(\d{1,2}) Ago · (\d{2}):(\d{2})$/)
    if (!match) return []
    const dayIndex = Number(match[1]) - 17
    if (dayIndex < 0 || dayIndex > 6) return []
    const minute = Number(match[2]) * 60 + Number(match[3])
    const service = repositories.services.find(candidate => candidate.name === item.name)
    const duration = Number(service?.duration.match(/\d+/)?.[0] || 60)
    return [{ item, dayIndex, minute, top: ((minute - 480) / 60) * 52, height: Math.max(48, duration / 60 * 52) }]
  })
  const followUpEvents = (labels.supportsFollowUp ? repositories.activities : []).filter(activity => activity.source === 'prestation_follow_up').flatMap(activity => {
    const calendarDate = activity.scheduledAt ?? activity.completedAt ?? activity.createdAt
    if (!calendarDate) return []
    const position = calendarPositionFromTimestamp(calendarDate)
    return position.dayIndex >= 0 && position.dayIndex <= 6 ? [{ activity, ...position }] : []
  })
  const calendarEvents = scheduledItems.filter(event => event.dayIndex < 5 && event.minute >= 480 && event.minute <= 1320)
  const calendarFollowUps = followUpEvents.filter(event => event.dayIndex < 5 && event.minute >= 480 && event.minute <= 1320)
  const periodTitle = view === 'Mes' ? 'Agosto 2026' : view === 'Día' ? 'Lunes 17 agosto 2026' : view === 'Gantt' ? '17–23 agosto 2026' : '17–21 agosto 2026'

  return <>
    <PageHeader title="Agenda" description={`Toda ${labels.prestation.toLowerCase()} programada aparece aquí automáticamente.`} action="Nuevo" onAction={onCreate}/>
    <div className="calendar-toolbar card"><div><button aria-label="Periodo anterior" className="icon-btn" onClick={() => setOffset(value => value - 1)}><ChevronLeft size={17}/></button><button aria-label="Periodo siguiente" className="icon-btn" onClick={() => setOffset(value => value + 1)}><ChevronRight size={17}/></button><button className="secondary-btn" onClick={() => setOffset(0)}>Hoy</button><h2>{periodTitle}</h2></div><div className="tabs">{views.map(item => <button className={view === item ? 'active' : ''} onClick={() => setView(item)} key={item}>{item}</button>)}</div></div>
    {offset === 0 && view === 'Gantt' && (scheduledItems.length ? <div className="gantt card"><div className="gantt-grid gantt-header"><span>{labels.prestations}</span>{days.map(day => <span className={day.day === 18 ? 'today' : ''} key={day.day}>{day.label}<b>{day.day}</b></span>)}</div><div className="gantt-body">{scheduledItems.map(({ item, dayIndex }) => <div className="gantt-grid gantt-row" key={item.id}><button className="gantt-label" onClick={() => setSelected(item.id)}><b>{item.name}</b><span>{item.account} · {item.status}</span></button>{days.map((day, index) => <div className={cls('gantt-cell', day.day === 18 && 'today')} key={day.day}>{index === dayIndex && <button className="gantt-task" onClick={() => setSelected(item.id)} aria-label={`Editar ${item.name}, ${item.date}`}><span>{item.date.split(' · ')[1]}</span></button>}</div>)}</div>)}</div></div> : <EmptyState title={`Sin ${labels.prestations.toLowerCase()} esta semana`} body="Crea un registro con fecha para visualizarlo en la planificación." action={newPrestationLabel(labels)} onAction={onCreate}/>) }
    {offset === 0 && view !== 'Gantt' && <div className={cls('calendar card', `calendar-${view.toLowerCase()}`)}><div className="calendar-head"><span/><span className="today">Lun<b>17</b></span>{view !== 'Día' && days.slice(1, 5).map(day => <span key={day.day}>{day.label}<b>{day.day}</b></span>)}</div><div className="calendar-body"><div className="time-column">{hours.map(hour => <span key={hour}>{hour}</span>)}</div>{days.slice(0, view === 'Día' ? 1 : 5).map((day, dayIndex) => <div className="day-column" key={day.day}>{hours.map(hour => <i key={hour}/>)}{calendarEvents.filter(event => event.dayIndex === dayIndex).map(({ item, top, height }) => <button className="cal-event violet" style={{ top, height }} onClick={() => setSelected(item.id)} key={`prestation-${item.id}`}><b>{item.date.split(' · ')[1]}</b><span>{item.account}</span><small>{item.name}</small></button>)}{calendarFollowUps.filter(event => event.dayIndex === dayIndex).map(({ activity, top }) => <button className="cal-event note-event" style={{ top, height: 48 }} onClick={() => setSelectedActivity(activity.id)} key={`activity-${activity.id}`}><b><FileText size={11}/>{activity.date.split(' · ')[1]}</b><span>Seguimiento</span><small>{repositories.accounts.find(account => account.id === activity.accountId)?.name}</small></button>)}</div>)}</div></div>}
    {offset !== 0 && <EmptyState title="Sin compromisos en este periodo" body="Vuelve a hoy o crea una prestación para este periodo." action="Volver a hoy" onAction={() => setOffset(0)}/>}
    {current && <PrestationDetailModal record={current} labels={labels} onClose={() => setSelected(null)}/>}
    {currentActivity && <Modal title="Seguimiento" subtitle={`${currentActivityAccount?.name || labels.account} · ${currentActivity.date}`} onClose={() => setSelectedActivity(null)}><div className="followup-activity-detail"><p><span>{labels.account}</span><b>{currentActivityAccount?.name || '—'}</b></p><p><span>Fecha de registro</span><b>{currentActivity.date}</b></p><p><span>{labels.prestation} relacionada</span><button className="text-btn" onClick={() => { setSelectedActivity(null); if (currentActivityPrestation) setSelected(currentActivityPrestation.id) }}>{currentActivityPrestation?.name || '—'}</button></p><div><span>Seguimiento</span><blockquote>{currentActivity.description}</blockquote></div></div><footer className="modal-actions"><button className="primary-btn" onClick={() => setSelectedActivity(null)}>Listo</button></footer></Modal>}
  </>
}

function ActivitiesPage({ labels, go, onCreate }: { labels: Labels; go: Navigate; onCreate:()=>void }) {
  const store = useRepositories()
  const requested = new URLSearchParams(window.location.search).get('status')
  const [active, setActive] = useState(requested || 'Pendientes')
  const visible = store.activities.filter(item => active === 'Todas' || (active === 'Pendientes' ? item.status === 'Pendiente' : active === 'Hoy' ? item.date.startsWith('Hoy') : active === 'Próximas' ? item.date.startsWith('Mañana') : active === 'Vencidas' ? item.status === 'Vencida' : item.status === 'Completada'))
  const completed = store.activities.filter(item => item.status === 'Completada').length
  return <>
    <PageHeader title="Actividades" description="Mantén al día seguimientos, tareas, llamadas y reuniones vinculadas a tu operación." action="Nueva actividad" onAction={onCreate}/>
    <div className="tabs standalone">{['Pendientes','Hoy','Próximas','Vencidas','Completadas'].map(tab => <button className={active === tab ? 'active' : ''} onClick={() => setActive(tab)} key={tab}>{tab}</button>)}</div>
    <div className="activity-layout"><section className="card activity-list">{visible.length ? visible.map(activity => {
      const relatedPrestation = store.prestations.find(prestation => prestation.id === activity.prestationId)
      const relatedAccount = store.accounts.find(account => account.id === activity.accountId)
      const relation = relatedPrestation ? `${relatedAccount?.name || labels.account} · ${relatedPrestation.name}` : activity.relation
      return <div className="activity-row" key={activity.id}>
        {activity.source === 'prestation_follow_up' ? <span className="todo-circle done"><FileText size={12}/></span> : <button aria-label={activity.status === 'Completada' ? 'Reabrir actividad' : 'Completar actividad'} className={cls('todo-circle', activity.status === 'Completada' && 'done')} onClick={() => store.toggleActivity(activity.id)}><Check size={14}/></button>}
        <span className="activity-type">{activity.source === 'prestation_follow_up' ? <FileText size={16}/> : <Activity size={16}/>}</span>
        <div><b>{activity.title}</b><span>{relation}</span>{activity.description && <p>{activity.description}</p>}{relatedPrestation && <button className="text-btn" onClick={() => go('prestations', { id: relatedPrestation.id })}>Abrir {labels.prestation.toLowerCase()}</button>}</div>
        <time>{activity.date}</time><StatusBadge>{activity.status}</StatusBadge>
      </div>
    }) : <EmptyState title="Nada pendiente aquí" body="Tu seguimiento está al día. Puedes crear una actividad si necesitas recordar el próximo paso." action="Nueva actividad" onAction={onCreate}/>}</section><aside className="card activity-help"><span className="attention-icon violet"><Zap size={20}/></span><h3>Tu foco de hoy</h3><p>Completa las actividades importantes para dejar al día a tus {labels.accounts.toLowerCase()} prioritarios.</p><div className="progress"><i style={{width:`${Math.round(completed/Math.max(store.activities.length,1)*100)}%`}}/></div><small>{completed} de {store.activities.length} completadas</small></aside></div>
  </>
}

function RepositoryPaymentsPage({ labels }: { labels: Labels }) {
  const repositories = useRepositories()
  const [selectedPayment,setSelectedPayment]=useState<number|null>(null)
  const [selectedRequest,setSelectedRequest]=useState<number|null>(null)
  const requested = new URLSearchParams(window.location.search).get('status')
  const [active, setActive] = useState(requested === 'Pendientes' ? 'Solicitudes' : 'Pagos recibidos')
  const pending = repositories.paymentRequests.filter(item => item.status === 'Pendiente')
  const totalPending = pending.reduce((sum, item) => sum + (repositories.paymentRequestRepository.summary(item.id)?.outstanding || 0), 0)
  const now = new Date()
  const totalPaid = repositories.payments.filter(payment => { const paidAt = payment.createdAt ? new Date(payment.createdAt) : parseBusinessDate(payment.date, now.getFullYear()); return payment.status === 'Pagado' && paidAt?.getMonth() === now.getMonth() && paidAt?.getFullYear() === now.getFullYear() }).reduce((sum, payment) => sum + parseMoney(payment.amount), 0)
  return <>
    <PageHeader title="Pagos" description="Consulta solicitudes y dinero efectivamente recibido desde cada trabajo."/>
    <div className="metrics-grid two"><MetricCard label="Solicitudes pendientes" value={formatMoney(totalPending)} meta={`${pending.length} solicitudes activas`} icon={Clock3} tone="orange"/><MetricCard label="Pagado este mes" value={formatMoney(totalPaid)} meta="Excluye condonaciones y pagos anulados" icon={WalletCards} tone="green"/></div>
    <div className="tabs standalone">{['Solicitudes','Pagos recibidos'].map(tab => <button className={active === tab ? 'active' : ''} onClick={() => setActive(tab)} key={tab}>{tab}{tab === 'Solicitudes' && <span>{pending.length}</span>}</button>)}</div>
    {active === 'Solicitudes' ? <PaymentRequestsList onOpen={setSelectedRequest}/> : <div className="table-card card"><table><thead><tr><th>Fecha</th><th>{labels.account}</th><th>Monto recibido</th><th>Método</th><th>Estado</th><th>Origen</th><th/></tr></thead><tbody>{repositories.payments.map(payment => <tr className="clickable-row" key={payment.id} onClick={()=>setSelectedPayment(payment.id)}><td>{payment.date}</td><td><b>{payment.account}</b></td><td className="number">{payment.amount}</td><td>{payment.method}</td><td><StatusBadge>{payment.status}</StatusBadge></td><td>{payment.allocations}</td><td><ChevronRight size={15}/></td></tr>)}</tbody></table></div>}
    {selectedPayment&&<PaymentReceivedDetailDialog paymentId={selectedPayment} onClose={()=>setSelectedPayment(null)}/>}
    {selectedRequest&&<PaymentRequestDetailDialog requestId={selectedRequest} onClose={()=>setSelectedRequest(null)}/>}</>
}

function PaymentsPage({ labels, onCreate }: { labels: typeof verticalLabels[Vertical]; onCreate:()=>void }) { const store=useRepositories();const requested=new URLSearchParams(window.location.search).get('status');const [active,setActive]=useState(requested==='Pendientes'?'Pendientes':'Registrados');const pending=store.prestations.filter(item=>item.payment!=='Pagado');const totalPending=pending.reduce((sum,item)=>sum+Number(item.amount.replace(/\D/g,'')),0);return <><PageHeader title="Pagos" description={`Responde quién te debe y asigna cada cobro a sus ${labels.prestations.toLowerCase()} pendientes.`} action="Registrar pago" onAction={onCreate}/><div className="metrics-grid three"><MetricCard label="Cobrado este mes" value="$3.420.000" meta="↗ 12% vs. mes anterior" icon={WalletCards} tone="green"/><MetricCard label="Por cobrar" value={`$${totalPending.toLocaleString('es-CL')}`} meta={`${pending.length} ${labels.prestations.toLowerCase()} con saldo`} icon={Clock3} tone="orange"/><MetricCard label="Pagos registrados" value={String(store.payments.length)} meta="Historial disponible" icon={CreditCard} tone="blue"/></div><div className="tabs standalone">{['Registrados','Pendientes'].map(tab=><button className={active===tab?'active':''} onClick={()=>setActive(tab)} key={tab}>{tab}{tab==='Pendientes'&&<span>{pending.length}</span>}</button>)}</div><div className="table-card card"><table><thead><tr><th>Fecha</th><th>{labels.account}</th><th>Monto</th><th>{active==='Pendientes'?labels.prestation:'Método'}</th><th>Estado</th><th>{active==='Pendientes'?'Origen':'Asignación'}</th></tr></thead><tbody>{active==='Pendientes'?pending.map(p=><tr key={p.id}><td>{p.date}</td><td><b>{p.account}</b></td><td className="number">{p.amount}</td><td>{p.name}</td><td><StatusBadge>{p.payment}</StatusBadge></td><td>{p.origin}</td></tr>):store.payments.map(p=><tr key={p.id}><td>{p.date}</td><td><b>{p.account}</b></td><td className="number">{p.amount}</td><td>{p.method}</td><td><StatusBadge>{p.status}</StatusBadge></td><td>{p.allocations}</td></tr>)}</tbody></table></div></> }

function RepositoryServicesPage({ labels, onCreate }: { labels: Labels; onCreate: () => void }) {
  const repositories = useRepositories()
  const [editing, setEditing] = useState<number | null>(null)
  const current = repositories.services.find(service => service.id === editing)
  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!current) return
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    repositories.updateService(current.id, { name: String(values.name), description: String(values.description), duration: `${String(values.duration)} min`, price: formatMoney(parseMoney(String(values.price))) })
    setEditing(null)
  }
  return <>
    <PageHeader title={labels.services} description={`Configura precios y duraciones sugeridas para crear ${labels.prestations.toLowerCase()} más rápido.`} action={`Crear ${labels.service.toLowerCase()}`} onAction={onCreate}/>
    <div className="service-grid">{repositories.services.map(service => <article className={cls('service-card card', !service.active && 'disabled-card')} key={service.id}><div><span className="service-icon"><HeartPulse size={20}/></span><StatusBadge>{service.active ? 'Activo' : 'Inactivo'}</StatusBadge></div><h3>{service.name}</h3><p>{service.description}</p><footer><span><Clock3 size={15}/>{service.duration}</span><b>{service.price}</b></footer><div className="service-card-actions"><button className="service-action" onClick={() => setEditing(service.id)}>Editar</button><button className="service-action" onClick={() => repositories.toggleService(service.id)}>{service.active ? 'Desactivar' : 'Activar'}</button></div></article>)}</div>
    {current && <Modal title={`Editar ${labels.service.toLowerCase()}`} onClose={() => setEditing(null)}><form onSubmit={save}><div className="form-grid"><label><span>Nombre *</span><input name="name" required defaultValue={current.name}/></label><label><span>Precio sugerido</span><input name="price" required defaultValue={current.price}/></label><label><span>Duración (min)</span><input name="duration" type="number" defaultValue={current.duration.match(/\d+/)?.[0] || 60}/></label><label><span>Descripción</span><input name="description" defaultValue={current.description}/></label></div><footer className="modal-actions"><button type="button" className="ghost-btn" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-btn">Guardar cambios</button></footer></form></Modal>}
  </>
}

function ServicesPage({ labels, onCreate }: { labels: typeof verticalLabels[Vertical]; onCreate:()=>void }) { const store=useRepositories();return <><PageHeader title={labels.services} description={`Configura precios y duraciones sugeridas para crear ${labels.prestations.toLowerCase()} más rápido.`} action={`Crear ${labels.service.toLowerCase()}`} onAction={onCreate}/><div className="service-grid">{store.services.map(s=><article className={cls('service-card card',!s.active&&'disabled-card')} key={s.id}><div><span className="service-icon"><HeartPulse size={20}/></span><StatusBadge>{s.active?'Activo':'Inactivo'}</StatusBadge></div><h3>{s.name}</h3><p>{s.description}</p><footer><span><Clock3 size={15}/>{s.duration}</span><b>{s.price}</b></footer><button className="service-action" onClick={()=>store.toggleService(s.id)}>{s.active?'Desactivar':'Activar'}</button></article>)}</div></> }

function RepositorySettingsPage({ vertical, setVertical, notify }: { vertical: Vertical; setVertical: (value: Vertical) => void; notify: (message: string) => void }) {
  const repositories = useRepositories()
  const [tab, setTab] = useState('Negocio')
  return <>
    <PageHeader title="Configuración" description="Personaliza tu negocio y valida la experiencia de cada profesión sin migrar datos."/>
    <div className="settings-layout"><aside className="settings-nav card">{['Perfil','Negocio','Servicios','Preferencias','Facturación'].map(item => <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}</aside><main className="card settings-card">
      {tab === 'Facturación' ? <BillingSettings/> : tab === 'Negocio' ? <><div><span className="section-kicker">Workspace demo</span><h2>Datos del negocio</h2><p>La profesión cambia labels, navegación y acciones. Los objetos y datos internos permanecen intactos.</p></div><div className="form-grid"><label><span>Nombre del negocio</span><input defaultValue="Consulta Demo"/></label><label><span>País</span><select defaultValue="Chile"><option>Chile</option></select></label><label><span>Moneda</span><select defaultValue="CLP"><option value="CLP">Peso chileno (CLP)</option></select></label><label><span>Zona horaria</span><select defaultValue="America/Santiago"><option>America/Santiago</option></select></label></div><div className="vertical-setting"><h3>Tipo de profesional</h3><p>Selector temporal para validar la verticalización durante esta etapa.</p><div>{verticalOptions.map(option => { const Icon = verticalIcons[option.value]; return <button className={vertical === option.value ? 'active' : ''} onClick={() => setVertical(option.value)} key={option.value}><span><Icon/></span><div><b>{option.profession}</b><small>{option.professionDescription}</small></div>{vertical === option.value && <Check size={18}/>}</button> })}</div></div></> : <><div><span className="section-kicker">{tab}</span><h2>{tab === 'Perfil' ? 'Tu información' : tab === 'Servicios' ? 'Catálogo de servicios' : 'Preferencias de uso'}</h2><p>{tab === 'Perfil' ? 'Datos locales visibles en este workspace demo.' : tab === 'Servicios' ? 'Los precios y duraciones tienen una única fuente.' : 'Ajustes de la experiencia de producto.'}</p></div>{tab === 'Perfil' && <div className="form-grid"><label><span>Nombre</span><input defaultValue="Francisca"/></label><label><span>Apellido</span><input defaultValue="Medina"/></label><label><span>Teléfono</span><input defaultValue="+56 9 1234 5678"/></label></div>}{tab === 'Servicios' && <EmptyState title="Catálogo centralizado" body="Administra el catálogo desde la pantalla Servicios para evitar configuraciones duplicadas." action="Volver al negocio" onAction={() => setTab('Negocio')}/>} {tab === 'Preferencias' && <div className="setting-options"><label><input type="checkbox" defaultChecked/> Mostrar pendientes prioritarios al iniciar</label><label><input type="checkbox" defaultChecked/> Confirmar antes de archivar</label><button className="secondary-btn" onClick={() => { if (window.confirm('¿Restaurar todos los datos de demostración?')) { repositories.resetDemo(); notify('Datos demo restaurados') } }}>Restaurar datos demo</button></div>}</>}
      {tab !== 'Facturación' && <footer><button className="primary-btn" onClick={() => notify('Configuración guardada')}>Guardar cambios</button></footer>}
    </main></div>
  </>
}

function SettingsPage({ vertical, setVertical, notify }: { vertical:Vertical; setVertical:(v:Vertical)=>void; notify:(message:string)=>void }) { const [tab,setTab]=useState('Negocio');const store=useRepositories();return <><PageHeader title="Configuración" description="Personaliza tu negocio, preferencias y la forma en que Hazento trabaja contigo."/><div className="settings-layout"><aside className="settings-nav card">{['Perfil','Negocio','Servicios','Preferencias','Facturación'].map(x=><button className={tab===x?'active':''} onClick={()=>setTab(x)} key={x}>{x}</button>)}</aside><main className="card settings-card">{tab==='Facturación'?<BillingSettings/>:tab==='Negocio'?<><div><span className="section-kicker">Workspace</span><h2>Datos del negocio</h2><p>La vertical adapta el lenguaje, las acciones rápidas y las prioridades sin tocar los datos.</p></div><div className="form-grid"><label><span>Nombre del negocio</span><input defaultValue="Consulta Demo"/></label><label><span>País</span><select><option>Chile</option></select></label><label><span>Moneda</span><select><option>Peso chileno (CLP)</option></select></label><label><span>Zona horaria</span><select><option>America/Santiago</option></select></label></div><div className="vertical-setting"><h3>Tipo de profesional</h3><p>Cambia temporalmente la vertical para validar la experiencia.</p><div>{([['health','Salud','Pacientes, tratamientos y atenciones'],['creative','Profesional creativo','Clientes, proyectos y entregables'],['creator','Creador de contenido','Contactos, empresas, partnerships y contenidos']] as const).map(v=><button className={vertical===v[0]?'active':''} onClick={()=>setVertical(v[0])} key={v[0]}><span>{v[0]==='health'?<HeartPulse/>:v[0]==='creative'?<BriefcaseBusiness/>:<Sparkles/>}</span><div><b>{v[1]}</b><small>{v[2]}</small></div>{vertical===v[0]&&<Check size={18}/>}</button>)}</div></div></>:<><div><span className="section-kicker">{tab}</span><h2>{tab==='Perfil'?'Tu información':tab==='Servicios'?'Catálogo de servicios':'Preferencias de uso'}</h2><p>{tab==='Perfil'?'Datos visibles dentro de tu workspace.':tab==='Servicios'?'Administra el catálogo desde su pantalla dedicada.':'Configura una experiencia simple y enfocada.'}</p></div>{tab==='Perfil'&&<div className="form-grid"><label><span>Nombre</span><input defaultValue="Francisca"/></label><label><span>Apellido</span><input defaultValue="Medina"/></label><label><span>Teléfono</span><input defaultValue="+56 9 1234 5678"/></label></div>}{tab==='Servicios'&&<EmptyState title="Catálogo centralizado" body="Los precios y duraciones se administran en Tipos de atención para evitar configuraciones duplicadas." action="Entendido" onAction={()=>setTab('Negocio')}/>} {tab==='Preferencias'&&<div className="setting-options"><label><input type="checkbox" defaultChecked/> Mostrar pendientes prioritarios al iniciar</label><label><input type="checkbox" defaultChecked/> Confirmar antes de archivar</label><button className="secondary-btn" onClick={()=>{if(window.confirm('¿Restaurar todos los datos de demostración?')){store.resetDemo();notify('Datos demo restaurados')}}}>Restaurar datos demo</button></div>}</>}{tab!=='Facturación'&&<footer><button className="primary-btn" onClick={()=>notify('Configuración guardada')}>Guardar cambios</button></footer>}</main></div></> }

function App() {
  const {page,go}=useAppRoute(); const store=useRepositories(); const [vertical,setVerticalState]=useState<Vertical>(()=>(localStorage.getItem('hazento-vertical') as Vertical)||'health'); const [collapsed,setCollapsed]=useState(false); const [mobileOpen,setMobileOpen]=useState(false); const [createOpen,setCreateOpen]=useState(false); const [createType,setCreateType]=useState('Nueva atención'); const [createAccountId,setCreateAccountId]=useState<number|undefined>(); const [createEngagementId,setCreateEngagementId]=useState<number|undefined>(); const [createMenu,setCreateMenu]=useState(false); const [searchOpen,setSearchOpen]=useState(false); const [searchQuery,setSearchQuery]=useState(''); const [toast,setToast]=useState('')
  const labels=verticalLabels[vertical]
  const setVertical=(value:Vertical)=>{setVerticalState(value);localStorage.setItem('hazento-vertical',value)}
  const createOptions: Array<[string, React.ElementType]> = [[newAccountLabel(labels),UserRound],['Nueva oportunidad',Target],[newEngagementLabel(labels),BriefcaseBusiness],[newPrestationLabel(labels),CalendarDays],['Nueva actividad',ListChecks]]
  const normalized=searchQuery.trim().toLowerCase(); const searchResults=normalized?[
    ...store.accounts.filter(item=>`${item.name} ${item.email || ''} ${store.organizations.find(organization=>organization.id===item.organizationId)?.name || ''} ${item.role || ''}`.toLowerCase().includes(normalized)).map(item=>{const organization=store.organizations.find(record=>record.id===item.organizationId);return {kind:labels.account,name:item.name,context:organization ? `${organization.name}${item.role ? ` · ${item.role}` : ''}` : 'Independiente',Icon:UserRound,page:'account' as Page,query:{id:item.id}}}),
    ...store.organizations.filter(item=>item.name.toLowerCase().includes(normalized)).map(item=>({kind:labels.organization,name:item.name,context:`${store.accounts.filter(person=>person.organizationId===item.id).length} personas`,Icon:Building2,page:'accounts' as Page,query:{organization:item.id}})),
    ...store.opportunities.filter(item=>(item.title+' '+item.account).toLowerCase().includes(normalized)).map(item=>({kind:'Oportunidad',name:item.title,context:item.account,Icon:Target,page:'opportunity' as Page,query:{id:item.id}})),
    ...store.engagements.filter(item=>(item.name+' '+item.account).toLowerCase().includes(normalized)).map(item=>({kind:labels.engagement,name:item.name,context:item.account,Icon:BriefcaseBusiness,page:'engagement' as Page,query:{id:item.id}})),
    ...store.prestations.filter(item=>(item.name+' '+item.account).toLowerCase().includes(normalized)).map(item=>({kind:labels.prestation,name:item.name,context:item.account,Icon:CalendarDays,page:'prestations' as Page,query:{id:item.id}})),
  ].slice(0,8):[]
  const nav=[
    ['dashboard','Inicio',LayoutDashboard],['accounts',labels.accounts,UsersRound],['opportunities','Oportunidades',Target],['agenda',labels.planningLabel,CalendarDays],['work',labels.engagements,BriefcaseBusiness],['prestations',labels.navigationPrestation,FileCheck2],['activities','Actividades',ListChecks],['payments','Pagos',CreditCard],['services',labels.services,Grid2X2],['settings','Configuración',Settings],
  ] as const
  const title = useMemo(()=>nav.find(n=>n[0]===page)?.[1] || 'Hazento',[page,labels])
  const openCreate=(type?:string,accountId?:number,engagementId?:number)=>{setCreateType(type||newPrestationLabel(labels));setCreateAccountId(accountId);setCreateEngagementId(engagementId);setCreateOpen(true);setCreateMenu(false)}
  const openDashboardPrestation=()=>{go('agenda');openCreate(newPrestationLabel(labels))}
  const notify=(message:string)=>{setToast(message);setTimeout(()=>setToast(''),2600)}; const done=()=>{setCreateOpen(false);notify('Guardado correctamente')}
  useEffect(()=>{const handle=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setSearchOpen(true)}if(event.key==='Escape'){setSearchOpen(false);setCreateOpen(false);setCreateMenu(false);setMobileOpen(false)}};window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle)},[])
  return <div className={cls('app-shell',collapsed&&'sidebar-collapsed',mobileOpen&&'mobile-sidebar-open')}>
    <aside className="sidebar" id="primary-navigation"><div className="brand"><span className="brand-mark">H</span>{!collapsed&&<b>Hazento</b>}<button className="desktop-sidebar-toggle" aria-label={collapsed?'Expandir navegación':'Colapsar navegación'} onClick={()=>setCollapsed(!collapsed)}><Menu size={18}/></button><button className="sidebar-mobile-close" aria-label="Cerrar navegación" onClick={()=>setMobileOpen(false)}><X size={20}/></button></div><nav>{nav.map(([id,label,Icon])=><button title={label} className={page===id||(id==='accounts'&&page==='account')||(id==='opportunities'&&page==='opportunity')||(id==='work'&&page==='engagement')?'active':''} onClick={()=>{go(id);setMobileOpen(false)}} key={id}><Icon size={19}/>{!collapsed&&<span>{label}</span>}{!collapsed&&page===id&&<i/>}</button>)}</nav>{!collapsed&&<div className="sidebar-assistant"><span><Zap size={16}/>Hazento te ayuda</span><p>Tienes <b>5 pendientes</b> que necesitan atención hoy.</p><button onClick={()=>{go('dashboard');setMobileOpen(false)}}>Revisar ahora</button></div>}<button className="profile-mini" onClick={()=>{go('settings');setMobileOpen(false)}}><span>FM</span>{!collapsed&&<div><b>Francisca Medina</b><small>Consulta Demo</small></div>}{!collapsed&&<ChevronDown size={15}/>}</button></aside>
    {mobileOpen&&<button className="sidebar-overlay" aria-label="Cerrar navegación" onClick={()=>setMobileOpen(false)}/>}
    <div className="app-main"><header className="topbar"><button aria-label="Abrir navegación" aria-expanded={mobileOpen} aria-controls="primary-navigation" className="mobile-menu" onClick={()=>{setCollapsed(false);setMobileOpen(true)}}><Menu size={20}/></button><button className="global-search" onClick={()=>setSearchOpen(true)}><Search size={18}/><span>Buscar en Hazento...</span><kbd>⌘ K</kbd></button><div className="top-actions"><button className="workspace-name" onClick={()=>go('settings')}><span className="workspace-dot">CD</span><div><small>Workspace</small><b>Consulta Demo</b></div><ChevronDown size={15}/></button><button aria-label="Ver actividades vencidas" className="icon-btn" onClick={()=>go('activities',{status:'Vencidas'})}><Bell size={18}/><i className="notification-dot"/></button><div className="create-wrap"><button className="primary-btn" onClick={()=>setCreateMenu(!createMenu)}><Plus size={18}/>Crear<ChevronDown size={14}/></button>{createMenu&&<div className="create-menu">{createOptions.map(([x,Icon])=><button onClick={()=>openCreate(x)} key={x}><Icon size={17}/>{x}</button>)}</div>}</div></div></header><main className="content" aria-label={String(title)}>
      {page==='dashboard'&&<Dashboard labels={labels} go={go} onCreatePrestation={openDashboardPrestation}/>}
      {page==='accounts'&&<PeopleAccountsPage labels={labels} go={go} onCreate={()=>openCreate(newAccountLabel(labels))}/>}
      {page==='account'&&<Account360View labels={labels} go={go} onCreate={openCreate}/>}
      {page==='opportunities'&&<OpportunitiesPage labels={labels} go={go} onCreate={()=>openCreate('Nueva oportunidad')}/>}
      {page==='opportunity'&&<OpportunityDetail labels={labels} go={go} onCreate={openCreate}/>}
      {page==='agenda'&&<FunctionalAgendaView labels={labels} go={go} onCreate={()=>openCreate(newPrestationLabel(labels))}/>}
      {page==='work'&&<WorkPage labels={labels} go={go} onCreate={()=>openCreate(newEngagementLabel(labels))}/>}
      {page==='engagement'&&<FunctionalEngagementDetail labels={labels} go={go} onCreate={openCreate}/>}
      {page==='prestations'&&<PrestationsPage labels={labels} onCreate={()=>openCreate(newPrestationLabel(labels))}/>}
      {page==='activities'&&<ActivitiesPage labels={labels} go={go} onCreate={()=>openCreate('Nueva actividad')}/>}
      {page==='payments'&&<RepositoryPaymentsPage labels={labels}/>}
      {page==='services'&&<RepositoryServicesPage labels={labels} onCreate={()=>openCreate(`Crear ${labels.service.toLowerCase()}`)}/>}
      {page==='settings'&&<RepositorySettingsPage vertical={vertical} setVertical={setVertical} notify={notify}/>}
    </main></div>
    {createOpen&&<Modal title={createType} subtitle="Completa los datos principales. Podrás agregar más detalle después." onClose={()=>setCreateOpen(false)} wide={createType==='Registrar pago'}><CreateForm type={createType} labels={labels} initialAccountId={createAccountId} initialEngagementId={createEngagementId} onDone={done}/></Modal>}
    {searchOpen&&<Modal title="Buscar en Hazento" onClose={()=>{setSearchOpen(false);setSearchQuery('')}}><label className="palette-search"><Search size={20}/><input autoFocus value={searchQuery} onChange={event=>setSearchQuery(event.target.value)} placeholder={`Busca personas, ${labels.organizations.toLowerCase()}, oportunidades o ${labels.engagements.toLowerCase()}...`}/></label><div className="search-results"><span>{normalized?'Resultados':'Escribe para buscar en todo Hazento'}</span>{searchResults.map(({kind,name,context,Icon,page:target,query})=><button onClick={()=>{setSearchOpen(false);setSearchQuery('');go(target,query)}} key={`${kind}-${name}`}><span className="result-icon"><Icon size={17}/></span><div><b>{name}</b><small>{kind} · {context}</small></div><ChevronRight size={16}/></button>)}{normalized&&!searchResults.length&&<p className="no-results">No encontramos resultados para “{searchQuery}”.</p>}</div></Modal>}
    {toast&&<div className="toast"><span><Check size={15}/></span>{toast}</div>}
  </div>
}

export default App
