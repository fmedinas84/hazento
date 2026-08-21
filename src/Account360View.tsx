import { useEffect, useMemo, useState } from 'react'
import {
  Activity, Archive, BriefcaseBusiness, Building2, CalendarDays, Check, ChevronLeft, ChevronRight,
  CircleDollarSign, Clock3, CreditCard, Ellipsis, FileCheck2, Mail, MapPin, Pencil,
  Phone, Plus, Target,
} from 'lucide-react'
import type { Vertical } from './data'
import { verticalLabels } from './data'
import {
  DEMO_NOW, formatAccountEventDate, getAccountTimeline, getNextAccountEvent,
  type AccountTimelineEvent,
} from './account360'
import { formatMoney, useRepositories } from './repositories'
import { OrganizationSelector } from './OrganizationSelector'
import { verticalizeEngagementDetail } from './verticalText'

type Labels = typeof verticalLabels[Vertical]
type AccountPage = 'accounts' | 'account' | 'agenda' | 'work' | 'engagement' | 'prestations' | 'opportunities' | 'opportunity' | 'activities' | 'payments'
type Navigate = (page: AccountPage, query?: Record<string, string | number>) => void
type CreateAction = (type?: string, accountId?: number) => void
type Tab = 'Resumen' | 'Prestaciones' | 'Oportunidades' | 'Actividades' | 'Pagos' | 'Datos'

const cls = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')
const badgeTone = (value: string) => value.toLowerCase().replaceAll(' ', '-')
const initialsFor = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()

function Badge({ children }: { children: React.ReactNode }) {
  return <span className={cls('badge', `badge-${badgeTone(String(children))}`)}>{children}</span>
}

function BlankState({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return <div className="account360-empty"><span><Plus size={18}/></span><h3>{title}</h3><p>{body}</p><button className="secondary-btn" onClick={onAction}>{action}</button></div>
}

const eventIcons = {
  prestation: FileCheck2,
  activity: Activity,
  payment: CreditCard,
  opportunity: Target,
  engagement: BriefcaseBusiness,
}

function TimelineRow({ event, labels, onOpen }: { event: AccountTimelineEvent; labels: Labels; onOpen: () => void }) {
  const Icon = eventIcons[event.type]
  const title = event.type === 'prestation' ? `${labels.prestation} · ${event.title}`
    : event.type === 'engagement' ? `${labels.engagement} · ${event.title}` : event.title
  return <button className="account360-timeline-row" onClick={onOpen}>
    <time>{formatAccountEventDate(event.timestamp)}</time>
    <span className={cls('account360-event-icon', event.type)}><Icon size={16}/></span>
    <span className="account360-event-copy"><b>{title}</b><small>{event.detail}</small></span>
    <span className="account360-event-meta">{event.status && <Badge>{event.status}</Badge>}{event.amount && <strong>{event.amount}</strong>}<ChevronRight size={15}/></span>
  </button>
}

export function Account360View({ labels, go, onCreate }: { labels: Labels; go: Navigate; onCreate: CreateAction }) {
  const repository = useRepositories()
  const requestedId = Number(new URLSearchParams(window.location.search).get('id'))
  const account = repository.accounts.find(record => record.id === requestedId) || repository.accounts[0]
  const [tab, setTab] = useState<Tab>('Resumen')
  const [editing, setEditing] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [organizationId, setOrganizationId] = useState<number | undefined>(account?.organizationId)

  const accountId = account?.id || 0
  const prestations = repository.accountRepository.getPrestations(accountId)
  const payments = repository.accountRepository.getPayments(accountId)
  const opportunities = repository.opportunities.filter(record => record.accountId === accountId)
  const engagements = repository.engagements.filter(record => record.accountId === accountId)
  const activities = repository.activities.filter(record => record.accountId === accountId)
  const organization = repository.organizations.find(record => record.id === account?.organizationId)
  const worked = repository.accountRepository.getWorkedAmount(accountId)
  const collected = repository.accountRepository.getAllocatedAmount(accountId)
  const outstanding = repository.accountRepository.getOutstandingAmount(accountId)
  const timeline = useMemo(() => getAccountTimeline(repository, accountId), [repository, accountId])
  const nextEvent = useMemo(() => getNextAccountEvent(repository, accountId), [repository, accountId])
  const pendingActivities = activities.filter(record => record.status === 'Pendiente')
  const overdueActivities = pendingActivities.filter(record => {
    const timestamp = Date.parse(record.scheduledAt || '')
    return timestamp > 0 && timestamp < DEMO_NOW
  })
  const nextAction = [...pendingActivities].sort((left, right) => Date.parse(left.scheduledAt || '') - Date.parse(right.scheduledAt || ''))[0]
  const activeEngagements = engagements.filter(record => record.status === 'Activo')
  const futurePrestations = prestations.filter(record => record.status === 'Programada').slice().sort((left, right) => left.date.localeCompare(right.date))
  const openOpportunities = opportunities.filter(record => !['Ganada', 'Perdida'].includes(record.stage))
  const staleOpportunities = openOpportunities.filter(record => /(?:7|8|9|1\d|2\d|3\d) días/i.test(record.last))
  useEffect(() => setOrganizationId(account?.organizationId), [account?.id, account?.organizationId])

  if (!account) return <BlankState title={`No hay ${labels.accounts.toLowerCase()}`} body="Crea la primera cuenta para comenzar a gestionar su relación." action={labels.createAccount} onAction={() => onCreate(labels.createAccount)}/>

  const openTimelineEvent = (event: AccountTimelineEvent) => {
    if (event.type === 'prestation') go('prestations', { id: event.recordId })
    if (event.type === 'engagement') go('engagement', { id: event.recordId })
    if (event.type === 'opportunity') go('opportunity', { id: event.recordId })
    if (event.type === 'activity') setTab('Actividades')
    if (event.type === 'payment') setTab('Pagos')
  }
  const create = (type: string) => onCreate(type, account.id)
  const archive = () => {
    if (window.confirm(`¿Archivar a ${account.name}? Su historial se conservará.`)) {
      repository.accountRepository.archive(account.id)
      go('accounts')
    }
  }
  const saveAccount = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Object.fromEntries(new FormData(event.currentTarget).entries())
    repository.accountRepository.update(account.id, {
      name: String(value.name || '').trim(), initials: initialsFor(String(value.name || '')),
      displayName: String(value.name || '').trim(), type: 'Persona', status: String(value.status), rut: String(value.rut || ''),
      organizationId, role: String(value.role || '').trim() || undefined, email: String(value.email || '').trim().toLowerCase(),
      phone: String(value.phone || ''), address: String(value.address || ''), city: String(value.city || ''),
      commune: String(value.commune || ''), notes: String(value.notes || ''),
    })
    setEditing(false)
  }
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'Resumen', label: 'Resumen' },
    { id: 'Prestaciones', label: `${labels.engagements} / ${labels.prestations}` },
    { id: 'Oportunidades', label: 'Oportunidades' }, { id: 'Actividades', label: 'Actividades' },
    { id: 'Pagos', label: 'Pagos' }, { id: 'Datos', label: 'Datos' },
  ]

  return <div className="account360">
    <button className="back-btn" onClick={() => go('accounts')}><ChevronLeft size={17}/>Volver a {labels.accounts.toLowerCase()}</button>
    <section className="account360-hero card">
      <div className="account360-identity"><span className="avatar-xl" style={{ background: account.color }}>{account.initials}</span><div><span className="section-kicker">{labels.account} {account.status.toLowerCase()}</span><h1>{account.name}</h1><div className="account360-contact"><span>{account.rut || 'Sin RUT'}</span><span><Mail size={13}/>{account.email || 'Sin email'}</span><span><Phone size={13}/>{account.phone || 'Sin teléfono'}</span></div>{organization && <button className="account360-org-inline" onClick={() => go('accounts', { organization: organization.id })}><Building2 size={14}/><b>{organization.name}</b>{account.role && <span>· {account.role}</span>}</button>}</div></div>
      <div className="account360-actions">
        <button className="secondary-btn" onClick={() => create(labels.createPrestation)}><FileCheck2 size={16}/>{labels.createPrestation}</button>
        <button className="secondary-btn" onClick={() => create('Nueva oportunidad')}><Target size={16}/>Nueva oportunidad</button>
        <button className="secondary-btn" onClick={() => create('Nueva actividad')}><Activity size={16}/>Nueva actividad</button>
        <button className="primary-btn" onClick={() => create('Registrar pago')}><CreditCard size={16}/>Registrar pago</button>
        <div className="account360-more"><button className="icon-btn" aria-label="Más acciones" onClick={() => setShowMore(value => !value)}><Ellipsis size={19}/></button>{showMore && <div><button onClick={() => { setTab('Datos'); setEditing(true); setShowMore(false) }}><Pencil size={15}/>Editar</button><button onClick={archive}><Archive size={15}/>Archivar</button></div>}</div>
      </div>
    </section>

    <section className="account360-metrics">
      <article className="card"><span>Total trabajado</span><b>{formatMoney(worked)}</b><small>{prestations.filter(record => record.status !== 'Cancelada').length} {labels.prestations.toLowerCase()}</small></article>
      <article className="card"><span>Cobrado</span><b>{formatMoney(collected)}</b><small>Asignado a {labels.prestations.toLowerCase()}</small></article>
      <article className={cls('card', outstanding > 0 && 'attention')}><span>Pendiente</span><b>{outstanding ? formatMoney(outstanding) : 'Al día'}</b><small>{outstanding ? 'Saldo por cobrar' : 'Sin saldos pendientes'}</small></article>
      <article className="card"><span>{nextEvent?.type === 'prestation' ? `Próxima ${labels.prestation.toLowerCase()}` : 'Próximo compromiso'}</span><b className="account360-next-value">{nextEvent?.title || 'Sin agenda'}</b><small>{nextEvent ? formatAccountEventDate(nextEvent.timestamp) : 'Crea una actividad o agenda'}</small></article>
    </section>

    <nav className="account360-tabs" aria-label="Secciones de cuenta">{tabs.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>

    {tab === 'Resumen' && <div className="account360-layout">
      <main>
        <section className="card account360-timeline"><div className="card-heading"><div><span className="section-kicker">Historial completo</span><h2>Actividad con {account.name.split(' ')[0]}</h2></div><button className="text-btn" onClick={() => create('Nueva actividad')}>Agregar actividad <Plus size={15}/></button></div>
          {timeline.length ? timeline.slice(0, 12).map(event => <TimelineRow event={event} labels={labels} onOpen={() => openTimelineEvent(event)} key={event.id}/>) : <BlankState title="Aún no hay historial" body="Las actividades, prestaciones, pagos y oportunidades aparecerán aquí." action="Crear actividad" onAction={() => create('Nueva actividad')}/>}</section>
        <section className="card account360-active"><div className="card-heading"><div><span className="section-kicker">En curso</span><h2>{labels.engagements} activos</h2></div><button className="text-btn" onClick={() => setTab('Prestaciones')}>Ver todo <ChevronRight size={15}/></button></div>
          {activeEngagements.length ? activeEngagements.map(record => <button key={record.id} onClick={() => go('engagement', { id: record.id })}><span><b>{record.name}</b><small>{verticalizeEngagementDetail(record.detail, labels.prestations)}</small></span><span className="progress-track"><i style={{ width: `${record.progress}%` }}/></span><strong>{record.progress}%</strong><ChevronRight size={15}/></button>) : <BlankState title={`Sin ${labels.engagements.toLowerCase()} activos`} body={`Agrupa aquí las próximas ${labels.prestations.toLowerCase()} acordadas.`} action={labels.createEngagement} onAction={() => create(labels.createEngagement)}/>}</section>
      </main>
      <aside>
        <section className="card account360-organization"><span className="section-kicker">{labels.organizationRelationship}</span>{organization ? <><div><Building2 size={19}/><span><b>{organization.name}</b><small>{account.role || 'Sin cargo registrado'}</small></span></div><button className="text-btn" onClick={() => go('accounts', { organization: organization.id })}>Ver {labels.organization.toLowerCase()} <ChevronRight size={15}/></button></> : <><h3>No asociada</h3><p>Esta persona trabaja de forma independiente o aún no tiene una {labels.organization.toLowerCase()} vinculada.</p><button className="secondary-btn" onClick={() => { setTab('Datos'); setEditing(true) }}>Asociar {labels.organization.toLowerCase()}</button></>}</section>
        {(outstanding > 0 || overdueActivities.length > 0 || staleOpportunities.length > 0 || nextEvent) && <section className="card account360-attention"><span className="section-kicker">Necesita tu atención</span>{outstanding > 0 && <button onClick={() => setTab('Pagos')}><CircleDollarSign size={17}/><span><b>{formatMoney(outstanding)} pendiente de pago</b><small>Revisar prestaciones y asignaciones</small></span><ChevronRight size={15}/></button>}{overdueActivities.length > 0 && <button onClick={() => setTab('Actividades')}><Clock3 size={17}/><span><b>{overdueActivities.length} {overdueActivities.length === 1 ? 'actividad vencida' : 'actividades vencidas'}</b><small>Requieren seguimiento</small></span><ChevronRight size={15}/></button>}{staleOpportunities.length > 0 && <button onClick={() => setTab('Oportunidades')}><Target size={17}/><span><b>{staleOpportunities.length} oportunidad sin actividad</b><small>Hace 7 días o más</small></span><ChevronRight size={15}/></button>}{nextEvent && <button onClick={() => go('agenda', { account: account.id })}><CalendarDays size={17}/><span><b>{nextEvent.title}</b><small>{formatAccountEventDate(nextEvent.timestamp)}</small></span><ChevronRight size={15}/></button>}</section>}
        <section className="card account360-next-action"><span className="section-kicker">Próxima acción</span>{nextAction ? <><h3>{nextAction.title}</h3><p>{nextAction.scheduledAt ? formatAccountEventDate(Date.parse(nextAction.scheduledAt)) : nextAction.date}</p><div><button className="primary-btn" onClick={() => repository.activityRepository.toggle(nextAction.id)}><Check size={15}/>Marcar completada</button><button className="secondary-btn" onClick={() => setTab('Actividades')}>Editar</button></div></> : <><h3>No hay próxima acción programada</h3><p>Crea una tarea para no perder el seguimiento.</p><button className="secondary-btn" onClick={() => create('Nueva actividad')}><Plus size={15}/>Crear actividad</button></>}</section>
        {futurePrestations.length > 0 && <section className="card account360-upcoming"><div className="card-heading"><h3>Próximas {labels.prestations.toLowerCase()}</h3></div>{futurePrestations.slice(0, 3).map(record => <button key={record.id} onClick={() => go('prestations', { id: record.id })}><CalendarDays size={16}/><span><b>{record.name}</b><small>{record.date}</small></span><ChevronRight size={14}/></button>)}</section>}
      </aside>
    </div>}

    {tab === 'Prestaciones' && <div className="account360-stack">
      <section className="card account360-section"><div className="card-heading"><div><span className="section-kicker">Relación activa</span><h2>{labels.engagements}</h2></div><button className="secondary-btn" onClick={() => create(labels.createEngagement)}><Plus size={15}/>{labels.createEngagement}</button></div>{engagements.length ? engagements.map(record => <button className="account360-record" key={record.id} onClick={() => go('engagement', { id: record.id })}><BriefcaseBusiness size={17}/><span><b>{record.name}</b><small>{verticalizeEngagementDetail(record.detail, labels.prestations)} · {record.status}</small></span><strong>{record.amount}</strong><ChevronRight size={15}/></button>) : <BlankState title={`No hay ${labels.engagements.toLowerCase()}`} body={`Crea un ${labels.engagement.toLowerCase()} para agrupar el trabajo acordado.`} action={labels.createEngagement} onAction={() => create(labels.createEngagement)}/>}</section>
      <section className="card account360-section"><div className="card-heading"><div><span className="section-kicker">Unidades de trabajo</span><h2>{labels.prestations}</h2></div><button className="secondary-btn" onClick={() => create(labels.createPrestation)}><Plus size={15}/>{labels.createPrestation}</button></div>{prestations.length ? <div className="account360-table"><table><thead><tr><th>Fecha</th><th>{labels.prestation}</th><th>{labels.engagement}</th><th>Estado</th><th>Monto</th><th>Pago</th><th/></tr></thead><tbody>{prestations.map(record => { const engagement = engagements.find(item => item.id === record.engagementId); return <tr key={record.id} onClick={() => go('prestations', { id: record.id })}><td>{record.date}</td><td><b>{record.name}</b></td><td>{engagement?.name || 'Directa'}</td><td><Badge>{record.status}</Badge></td><td>{record.amount}</td><td><Badge>{record.payment}</Badge></td><td><ChevronRight size={15}/></td></tr> })}</tbody></table></div> : <BlankState title={`Todavía no hay ${labels.prestations.toLowerCase()}`} body={`Registra la primera ${labels.prestation.toLowerCase()} para comenzar el historial.`} action={labels.createPrestation} onAction={() => create(labels.createPrestation)}/>}</section>
    </div>}

    {tab === 'Oportunidades' && <section className="card account360-section"><div className="card-heading"><div><span className="section-kicker">Pipeline</span><h2>Oportunidades</h2></div><button className="secondary-btn" onClick={() => create('Nueva oportunidad')}><Plus size={15}/>Nueva oportunidad</button></div>{opportunities.length ? opportunities.sort((left, right) => Number(['Ganada', 'Perdida'].includes(left.stage)) - Number(['Ganada', 'Perdida'].includes(right.stage))).map(record => <button className="account360-record" key={record.id} onClick={() => go('opportunity', { id: record.id })}><Target size={17}/><span><b>{record.title}</b><small>{record.stage} · Cierre {record.close} · Última actividad {record.last}</small></span><strong>{record.amount}</strong><ChevronRight size={15}/></button>) : <BlankState title="No hay oportunidades" body={`Registra una posibilidad comercial con este ${labels.account.toLowerCase()}.`} action="Nueva oportunidad" onAction={() => create('Nueva oportunidad')}/>}</section>}

    {tab === 'Actividades' && <section className="card account360-section"><div className="card-heading"><div><span className="section-kicker">Seguimiento</span><h2>Actividades</h2></div><button className="secondary-btn" onClick={() => create('Nueva actividad')}><Plus size={15}/>Nueva actividad</button></div>{activities.length ? <>{['Pendiente', 'Completada'].map(status => <div className="account360-group" key={status}><h3>{status === 'Pendiente' ? 'Pendientes' : 'Completadas'}</h3>{activities.filter(record => record.status === status).map(record => <div className="account360-activity" key={record.id}><button className={cls('todo-circle', status === 'Completada' && 'done')} aria-label={`Marcar ${record.title}`} onClick={() => repository.activityRepository.toggle(record.id)}>{status === 'Completada' && <Check size={13}/>}</button><span><b>{record.title}</b><small>{record.type} · {record.date}{record.description ? ` · ${record.description}` : ''}</small></span>{record.prestationId && <button className="text-btn" onClick={() => go('prestations', { id: record.prestationId! })}>Abrir {labels.prestation.toLowerCase()}</button>}</div>)}</div>)}</> : <BlankState title="No hay actividades" body="Crea una próxima acción para mantener el seguimiento." action="Nueva actividad" onAction={() => create('Nueva actividad')}/>}</section>}

    {tab === 'Pagos' && <div className="account360-stack"><section className="account360-payment-summary"><article className="card"><span>Total trabajado</span><b>{formatMoney(worked)}</b></article><article className="card"><span>Cobrado</span><b>{formatMoney(collected)}</b></article><article className="card"><span>Pendiente</span><b>{outstanding ? formatMoney(outstanding) : 'Al día'}</b></article></section><section className="card account360-section"><div className="card-heading"><div><span className="section-kicker">Cobros</span><h2>Historial de pagos</h2></div><button className="primary-btn" onClick={() => create('Registrar pago')}><Plus size={15}/>Registrar pago</button></div>{payments.length ? payments.map(payment => { const allocations = repository.paymentAllocations.filter(item => item.paymentId === payment.id); return <div className="account360-record static" key={payment.id}><CreditCard size={17}/><span><b>{payment.date} · {payment.method}</b><small>{allocations.length ? allocations.map(item => prestations.find(record => record.id === item.prestationId)?.name).filter(Boolean).join(', ') : 'Sin prestaciones asignadas'}</small></span><strong>{payment.amount}</strong><Badge>{payment.status}</Badge></div> }) : <BlankState title="No hay pagos registrados" body={`Registra un pago y asígnalo a las ${labels.prestations.toLowerCase()} pendientes.`} action="Registrar pago" onAction={() => create('Registrar pago')}/>}</section></div>}

    {tab === 'Datos' && <div className="account360-layout account360-data"><main><section className="card account360-section"><div className="card-heading"><div><span className="section-kicker">Información de la persona</span><h2>Datos de {account.name}</h2></div>{!editing && <button className="secondary-btn" onClick={() => setEditing(true)}><Pencil size={15}/>Editar</button>}</div>{editing ? <form className="account360-form" onSubmit={saveAccount}><label><span>Nombre *</span><input name="name" required defaultValue={account.name}/></label><label><span>Estado</span><select name="status" defaultValue={account.status}><option>Prospecto</option><option>Activo</option><option>Inactivo</option></select></label><label><span>RUT</span><input name="rut" defaultValue={account.rut}/></label><label><span>Email</span><input name="email" type="email" defaultValue={account.email}/></label><label><span>Teléfono</span><input name="phone" defaultValue={account.phone}/></label><OrganizationSelector organizations={repository.organizations} labels={labels} selectedId={organizationId} onSelect={record => setOrganizationId(record?.id)} onCreate={repository.organizationRepository.create}/><label><span>Cargo / Rol</span><input name="role" defaultValue={account.role} disabled={!organizationId}/></label><label><span>Dirección</span><input name="address" defaultValue={account.address}/></label><label><span>Ciudad</span><input name="city" defaultValue={account.city}/></label><label><span>Comuna</span><input name="commune" defaultValue={account.commune}/></label><label className="wide"><span>Notas</span><textarea name="notes" rows={4} defaultValue={account.notes}/></label><footer><button type="button" className="ghost-btn" onClick={() => { setEditing(false); setOrganizationId(account.organizationId) }}>Cancelar</button><button className="primary-btn">Guardar cambios</button></footer></form> : <div className="account360-data-grid"><p><span>Relación</span><b>Persona</b></p><p><span>Estado</span><Badge>{account.status}</Badge></p><p><span>{labels.organizationRelationship}</span><b>{organization?.name || 'No asociada'}</b></p><p><span>Cargo / Rol</span><b>{account.role || '—'}</b></p><p><span>RUT</span><b>{account.rut || '—'}</b></p><p><span>Email</span><b>{account.email || '—'}</b></p><p><span>Teléfono</span><b>{account.phone || '—'}</b></p><p><span>Dirección</span><b>{[account.address, account.commune, account.city].filter(Boolean).join(', ') || '—'}</b></p>{account.notes && <p className="wide"><span>Notas</span><b>{account.notes}</b></p>}</div>}</section></main><aside><section className="card account360-section account360-organization-detail"><Building2 size={20}/><div><span className="section-kicker">{labels.organizationRelationship}</span><h2>{organization?.name || 'No asociada'}</h2><p>{account.role || (organization ? 'Sin cargo registrado' : `Asocia una ${labels.organization.toLowerCase()} desde la edición de esta persona.`)}</p></div>{organization && <button className="secondary-btn" onClick={() => go('accounts', { organization: organization.id })}>Ver {labels.organization.toLowerCase()}</button>}</section><section className="card account360-location"><MapPin size={18}/><div><span>Ubicación</span><b>{[account.address, account.commune, account.city].filter(Boolean).join(', ') || 'Sin dirección registrada'}</b></div></section></aside></div>}
  </div>
}
