import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, Pencil, Plus, Search, X } from 'lucide-react'
import type { ActivityData, EngagementData, PrestationData, Vertical } from './data'
import { verticalLabels } from './data'
import { buildCalendarEvents, buildTimelineRows, parsePlanningDate, type CalendarEvent, type TimelineRow } from './planning'
import { resolvePrestationName } from './prestationName'
import { formatMoney, useRepositories } from './repositories'
import { durationOptions, formatDuration, serviceDurationMinutes } from './duration'
import { PaymentRequestCreateDialog, PaymentRequestDetailDialog } from './PaymentRequests'

type Labels = typeof verticalLabels[Vertical]
type CalendarView = 'Día' | 'Semana' | 'Mes'
type PlanningPage = 'account' | 'activities' | 'engagement' | 'prestations' | 'work'
type Navigate = (page: PlanningPage, query?: Record<string, string | number>) => void
type EventFilter = 'Todos' | 'Prestaciones' | 'Actividades'
const weekDays = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const hours = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00']
const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const cls = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(' ')
const timelineDayWidth = 40
const millisecondsPerDay = 86_400_000

type TimelineDay = {
  serial: number
  timestamp: number
  day: number
  weekday: string
  weekend: boolean
  monday: boolean
  today: boolean
}

type Milestone = TimelineRow['milestones'][number]

function timelineDaySerial(timestamp: number) {
  const date = new Date(timestamp)
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / millisecondsPerDay)
}

function timelineTimestamp(serial: number) {
  const utcDate = new Date(serial * millisecondsPerDay)
  return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate(), 12).getTime()
}

function buildTimelineDays(rows: TimelineRow[]): TimelineDay[] {
  if (!rows.length) return []
  const firstSerial = Math.min(...rows.map(row => Math.min(timelineDaySerial(row.start), ...row.milestones.map(item => timelineDaySerial(item.timestamp)))))
  const lastSerial = Math.max(...rows.map(row => Math.max(timelineDaySerial(row.end), ...row.milestones.map(item => timelineDaySerial(item.timestamp)))))
  const todaySerial = timelineDaySerial(Date.now())
  return Array.from({ length: lastSerial - firstSerial + 1 }, (_, index) => {
    const serial = firstSerial + index
    const timestamp = timelineTimestamp(serial)
    const date = new Date(timestamp)
    const weekdayIndex = date.getDay()
    return { serial, timestamp, day: date.getDate(), weekday: ['Do','Lu','Ma','Mi','Ju','Vi','Sá'][weekdayIndex], weekend: weekdayIndex === 0 || weekdayIndex === 6, monday: weekdayIndex === 1, today: serial === todaySerial }
  })
}

function groupMilestonesByDay(milestones: Milestone[]) {
  const groups = new Map<number, Milestone[]>()
  milestones.forEach(milestone => {
    const serial = timelineDaySerial(milestone.timestamp)
    groups.set(serial, [...(groups.get(serial) || []), milestone])
  })
  return [...groups.entries()].map(([serial, items]) => ({ serial, items }))
}

function milestoneState(items: Milestone[]) {
  if (items.every(item => item.prestation.status === 'Completada')) return 'completada'
  if (items.every(item => ['Cancelada', 'No asistió'].includes(item.prestation.status))) return 'cancelada'
  return 'programada'
}

function formatDate(timestamp: number, includeTime = false) {
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}), timeZone: 'America/Santiago' }).format(new Date(timestamp)).replace('.', '')
}

function formatDisplayDate(date: string, time: string) {
  const [, month, day] = date.split('-').map(Number)
  return `${day} ${monthNames[month - 1]} · ${time}`
}

function inputDate(value: string) {
  const timestamp = parsePlanningDate(value)
  if (!timestamp) return { date: '2026-08-18', time: '09:00' }
  const date = new Date(timestamp)
  return { date: `2026-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className={`badge badge-${String(children).toLowerCase().replaceAll(' ', '-')}`}>{children}</span>
}

function Dialog({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}><header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" aria-label="Cerrar" onClick={onClose}><X size={18}/></button></header>{children}</section></div>
}

function PrestationDialog({ record, labels, go, onClose }: { record: PrestationData; labels: Labels; go: Navigate; onClose: () => void }) {
  const repositories = useRepositories()
  const [editing, setEditing] = useState(false)
  const [requestingPayment, setRequestingPayment] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null)
  const scheduled = inputDate(record.date)
  const engagement = repositories.engagements.find(item => item.id === record.engagementId)
  const currentDuration = record.durationMinutes ?? serviceDurationMinutes(repositories.services.find(service => service.id === record.serviceId)?.duration)
  const paymentStatus = repositories.paymentRequestRepository.collectionStatusForPrestation(record.id)
  const paymentRequests = repositories.paymentRequestRepository.forPrestation(record.id)
  const activeRequests = paymentRequests.filter(request => request.status === 'Pendiente')
  const requestTotals = activeRequests.reduce((totals, request) => {
    const summary = repositories.paymentRequestRepository.summary(request.id)
    return { requested: totals.requested + request.amount, paid: totals.paid + (summary?.paid || 0), outstanding: totals.outstanding + (summary?.outstanding || 0) }
  }, { requested: 0, paid: 0, outstanding: 0 })
  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    const serviceId = Number(values.serviceId) || undefined
    repositories.updatePrestation(record.id, { name: resolvePrestationName(String(values.name || ''), serviceId, repositories.services, labels.prestation), serviceId, date: formatDisplayDate(String(values.date), String(values.time)), durationMinutes: Number(values.durationMinutes) || currentDuration, ...(labels.prestation === 'Contenido' ? { description: String(values.description || '').trim() } : {}), ...(labels.supportsFollowUp ? { followUpNote: String(values.followUpNote || '').trim() } : {}) })
    setEditing(false)
  }
  return <Dialog title={editing ? `Editar ${labels.prestation.toLowerCase()}` : record.name} subtitle={`${record.account} · ${record.date}`} onClose={onClose}>{editing ? <form onSubmit={save}><div className="form-grid single"><label><span>Nombre (opcional)</span><input name="name" autoFocus defaultValue={record.name} placeholder="Si lo dejas vacío, usaremos el tipo"/></label><label><span>Tipo ({labels.service.toLowerCase()})</span><select name="serviceId" defaultValue={record.serviceId || ''}><option value="">Sin tipo</option>{repositories.services.filter(service => service.active).map(service => <option value={service.id} key={service.id}>{service.name}</option>)}</select></label>{labels.prestation === 'Contenido' && <label className="form-span"><span>Descripción</span><textarea name="description" rows={4} defaultValue={record.description || ''}/></label>}{labels.supportsFollowUp && <label className="form-span"><span>Seguimiento</span><textarea name="followUpNote" rows={4} defaultValue={record.followUpNote || ''}/></label>}<label><span>Fecha</span><input name="date" type="date" required defaultValue={scheduled.date}/></label><div className="form-span form-inline-pair"><label><span>Hora</span><input name="time" type="time" required defaultValue={scheduled.time}/></label><label><span>Duración</span><select name="durationMinutes" defaultValue={currentDuration}>{durationOptions.map(minutes => <option value={minutes} key={minutes}>{formatDuration(minutes)}</option>)}</select></label></div></div><footer className="modal-actions"><button type="button" className="ghost-btn" onClick={() => setEditing(false)}>Cancelar</button><button className="primary-btn">Guardar cambios</button></footer></form> : <><div className="record-summary"><p><span>{labels.account}</span><button className="text-btn" onClick={() => go('account', { id: record.accountId })}>{record.account}</button></p>{engagement && <p><span>{labels.engagement}</span><button className="text-btn" onClick={() => go('engagement', { id: engagement.id })}>{engagement.name}</button></p>}<p><span>Tipo</span><b>{repositories.services.find(service => service.id === record.serviceId)?.name || 'Sin tipo'}</b></p><p><span>Duración</span><b>{formatDuration(currentDuration)}</b></p>{!labels.supportsFollowUp && <p><span>Estado</span><Badge>{record.status}</Badge></p>}<p><span>Monto</span><b>{record.amount}</b></p><p><span>Pago</span><Badge>{paymentStatus}</Badge></p></div>{activeRequests.length > 0 && <button type="button" className="prestation-description agenda-request-summary" onClick={() => setSelectedRequest(activeRequests[0].id)}><span className="section-kicker">Solicitud de pago</span><p>Solicitado {formatMoney(requestTotals.requested)} · Pagado {formatMoney(requestTotals.paid)} · Saldo {formatMoney(requestTotals.outstanding)}</p><Badge>{activeRequests[0].status}</Badge></button>}{labels.prestation === 'Contenido' && <section className="prestation-description"><span className="section-kicker">Descripción</span><p>{record.description || 'Sin descripción registrada'}</p></section>}{labels.supportsFollowUp && <section className="followup-detail"><span className="section-kicker">Seguimiento</span><p>{record.followUpNote || 'Sin seguimiento registrado'}</p></section>}<div className="status-actions"><button onClick={() => repositories.updatePrestation(record.id, { status: 'Completada' })}><Check size={16}/>Completar</button>{record.status !== 'Programada' && <button onClick={() => repositories.updatePrestation(record.id, { status: 'Programada' })}><Clock3 size={16}/>Volver a programada</button>}<button onClick={() => repositories.updatePrestation(record.id, { status: 'No asistió' })}>No asistió</button><button onClick={() => repositories.updatePrestation(record.id, { status: 'Cancelada' })}>Cancelar</button></div><footer className="modal-actions"><button className="secondary-btn" onClick={() => setEditing(true)}><Pencil size={15}/>Editar</button><button className="secondary-btn" onClick={() => setRequestingPayment(true)}><CircleDollarSign size={15}/>Generar solicitud de pago</button><button className="primary-btn" onClick={onClose}>Listo</button></footer></>}{requestingPayment && <PaymentRequestCreateDialog labels={labels} accountId={record.accountId} prestationId={record.id} onClose={() => setRequestingPayment(false)}/>} {selectedRequest && <PaymentRequestDetailDialog requestId={selectedRequest} onClose={() => setSelectedRequest(null)}/>}</Dialog>
}

function ActivityDialog({ record, labels, go, onClose }: { record: ActivityData; labels: Labels; go: Navigate; onClose: () => void }) {
  const repositories = useRepositories()
  const account = repositories.accounts.find(item => item.id === record.accountId)
  const prestation = repositories.prestations.find(item => item.id === record.prestationId)
  const timestamp = parsePlanningDate(record.scheduledAt ?? record.completedAt ?? record.createdAt ?? record.date)
  return <Dialog title={record.source === 'prestation_follow_up' ? 'Seguimiento' : record.title} subtitle={formatDate(timestamp, true)} onClose={onClose}><div className="record-summary"><p><span>{labels.account}</span>{account ? <button className="text-btn" onClick={() => go('account', { id: account.id })}>{account.name}</button> : <b>Sin cuenta</b>}</p>{prestation && <p><span>{labels.prestation}</span><button className="text-btn" onClick={() => go('prestations', { id: prestation.id })}>{prestation.name}</button></p>}<p><span>Tipo</span><b>{record.type}</b></p><p><span>Estado</span><Badge>{record.status}</Badge></p></div><section className="prestation-description"><span className="section-kicker">Detalle</span><p>{record.description || record.relation}</p></section><footer className="modal-actions"><button className="secondary-btn" onClick={() => go('activities', { id: record.id })}>Ver actividades</button><button className="primary-btn" onClick={onClose}>Listo</button></footer></Dialog>
}

function MonthCalendar({ events, anchor, labels, onOpen, openRequestIds }: { events: CalendarEvent[]; anchor: Date; labels: Labels; onOpen: (event: CalendarEvent) => void; openRequestIds: Set<number> }) {
  const year = anchor.getFullYear(); const month = anchor.getMonth(); const first = new Date(year, month, 1); const offset = (first.getDay() + 6) % 7; const start = new Date(year, month, 1 - offset)
  const cells = Array.from({ length: 42 }, (_, index) => new Date(year, start.getMonth(), start.getDate() + index))
  return <section className="month-calendar card" aria-label={`Vista mensual de ${labels.planningLabel.toLowerCase()}`}><header>{weekDays.map(day => <span key={day}>{day}</span>)}</header><div>{cells.map(cell => { const inMonth = cell.getMonth() === month; const dayEvents = events.filter(event => { const date = new Date(event.timestamp); return date.getFullYear() === cell.getFullYear() && date.getMonth() === cell.getMonth() && date.getDate() === cell.getDate() }); const today = year === 2026 && month === 7 && cell.getDate() === 18 && inMonth; return <article className={cls(!inMonth && 'outside', today && 'today')} key={cell.toISOString()}><time>{cell.getDate()}</time>{dayEvents.slice(0, 3).map(event => <button className={cls('planning-month-event', event.kind, event.source === 'prestation_follow_up' && 'follow-up')} onClick={() => onOpen(event)} title={`${event.title} · ${event.accountName}`} key={event.id}><b>{new Date(event.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })}</b>{event.kind === 'prestation' && openRequestIds.has(event.recordId) && <i className="calendar-payment-indicator" title="Solicitud de pago abierta"><CircleDollarSign size={12}/></i>}<span>{event.source === 'prestation_follow_up' ? 'Seguimiento' : event.title}</span><small>{event.accountName}</small></button>)}{dayEvents.length > 3 && <em>+{dayEvents.length - 3} más</em>}</article> })}</div></section>
}

function WeekCalendar({ events, dayOnly, onOpen, openRequestIds }: { events: CalendarEvent[]; dayOnly: boolean; onOpen: (event: CalendarEvent) => void; openRequestIds: Set<number> }) {
  const days = (dayOnly ? [18] : [17,18,19,20,21]).map((day, index) => ({ day, label: dayOnly ? 'Mar' : weekDays[index] }))
  return <div className={cls('calendar card', dayOnly && 'calendar-día')}><div className="calendar-head"><span/>{days.map(day => <span className={day.day === 18 ? 'today' : ''} key={day.day}>{day.label}<b>{day.day}</b></span>)}</div><div className="calendar-body"><div className="time-column">{hours.map(hour => <span key={hour}>{hour}</span>)}</div>{days.map(day => <div className="day-column" key={day.day}>{hours.map(hour => <i key={hour}/>)}{events.filter(event => { const date = new Date(event.timestamp); return date.getMonth() === 7 && date.getDate() === day.day && date.getHours() >= 8 && date.getHours() <= 21 }).map(event => { const date = new Date(event.timestamp); const top = ((date.getHours() * 60 + date.getMinutes() - 480) / 60) * 52; return <button className={cls('cal-event', event.kind === 'prestation' ? 'violet' : 'blue', event.source === 'prestation_follow_up' && 'note-event')} style={{ top, height: 50 }} onClick={() => onOpen(event)} key={event.id}><b>{String(date.getHours()).padStart(2,'0')}:{String(date.getMinutes()).padStart(2,'0')}</b>{event.kind === 'prestation' && openRequestIds.has(event.recordId) && <i className="calendar-payment-indicator" title="Solicitud de pago abierta"><CircleDollarSign size={12}/></i>}<span>{event.source === 'prestation_follow_up' ? 'Seguimiento' : event.title}</span><small>{event.accountName}</small></button> })}</div>)}</div></div>
}

function CalendarPanel({ labels, onCreate, onSelectPrestation, onSelectActivity }: { labels: Labels; onCreate: () => void; onSelectPrestation: (id: number) => void; onSelectActivity: (id: number) => void }) {
  const repositories = useRepositories()
  const [view, setView] = useState<CalendarView>('Semana')
  const [filter, setFilter] = useState<EventFilter>('Todos')
  const [offset, setOffset] = useState(0)
  const events = useMemo(() => buildCalendarEvents(repositories), [repositories])
  const openRequestIds = new Set(repositories.paymentRequests.filter(request => request.status === 'Pendiente' && request.originPrestationId).map(request => request.originPrestationId as number))
  const visible = events.filter(event => filter === 'Todos' || (filter === 'Prestaciones' ? event.kind === 'prestation' : event.kind === 'activity'))
  const anchor = new Date(2026, 7 + offset, 1)
  const title = view === 'Mes' ? new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(anchor) : view === 'Día' ? 'Martes 18 agosto 2026' : '17–21 agosto 2026'
  const open = (event: CalendarEvent) => event.kind === 'prestation' ? onSelectPrestation(event.recordId) : onSelectActivity(event.recordId)
  return <><div className="planning-toolbar card"><div className="calendar-nav"><button aria-label="Periodo anterior" className="icon-btn" onClick={() => setOffset(value => value - 1)}><ChevronLeft size={17}/></button><button aria-label="Periodo siguiente" className="icon-btn" onClick={() => setOffset(value => value + 1)}><ChevronRight size={17}/></button><button className="secondary-btn" onClick={() => setOffset(0)}>Hoy</button><h2>{title.charAt(0).toUpperCase() + title.slice(1)}</h2></div><div className="planning-controls"><div className="tabs compact">{(['Todos','Prestaciones','Actividades'] as EventFilter[]).map(option => <button className={filter === option ? 'active' : ''} onClick={() => setFilter(option)} key={option}>{option === 'Prestaciones' ? labels.prestations : option}</button>)}</div><div className="tabs compact">{(['Día','Semana','Mes'] as CalendarView[]).map(option => <button className={view === option ? 'active' : ''} onClick={() => { setView(option); setOffset(0) }} key={option}>{option}</button>)}</div></div></div>{view === 'Mes' ? <MonthCalendar events={visible} anchor={anchor} labels={labels} onOpen={open} openRequestIds={openRequestIds}/> : offset === 0 ? <WeekCalendar events={visible} dayOnly={view === 'Día'} onOpen={open} openRequestIds={openRequestIds}/> : <div className="planning-empty card"><CalendarDays size={23}/><h3>No tienes {labels.prestations.toLowerCase()} programadas para este período.</h3><button className="secondary-btn" onClick={onCreate}>{labels.createPrestation}</button></div>}<p className="planning-source-note">El calendario se deriva de {labels.prestations.toLowerCase()} y actividades. Los {labels.engagements.toLowerCase()} no se repiten como eventos.</p></>
}

function EngagementDatesDialog({ engagement, labels, onClose }: { engagement: EngagementData; labels: Labels; onClose: () => void }) {
  const repositories = useRepositories()
  const save = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); repositories.updateEngagement(engagement.id, { startDate: String(values.startDate || '') || undefined, endDate: String(values.endDate || '') || undefined }); onClose() }
  return <Dialog title={`Definir fechas del ${labels.engagement.toLowerCase()}`} subtitle={engagement.name} onClose={onClose}><form onSubmit={save}><div className="form-grid single"><label><span>Fecha de inicio</span><input name="startDate" type="date" defaultValue={engagement.startDate}/></label><label><span>Fecha de término</span><input name="endDate" type="date" defaultValue={engagement.endDate}/></label></div><footer className="modal-actions"><button type="button" className="ghost-btn" onClick={onClose}>Cancelar</button><button className="primary-btn">Guardar fechas</button></footer></form></Dialog>
}

function TimelinePanel({ labels, go, onSelectPrestation }: { labels: Labels; go: Navigate; onSelectPrestation: (id: number) => void }) {
  const repositories = useRepositories()
  const [status, setStatus] = useState('Todos')
  const [query, setQuery] = useState('')
  const [editingDates, setEditingDates] = useState<number | null>(null)
  const [milestoneGroup, setMilestoneGroup] = useState<Milestone[] | null>(null)
  const timelineRef = useRef<HTMLElement>(null)
  const rows = useMemo(() => buildTimelineRows(repositories), [repositories])
  const filtered = rows.dated.filter(row => (status === 'Todos' || (status === 'Activos' ? row.engagement.status === 'Activo' : row.engagement.status === 'Completado')) && `${row.engagement.name} ${row.account?.name || row.engagement.account}`.toLowerCase().includes(query.toLowerCase()))
  const days = buildTimelineDays(filtered)
  const firstSerial = days[0]?.serial || 0
  const timelineWidth = days.length * timelineDayWidth
  const offsetFor = (timestamp: number) => (timelineDaySerial(timestamp) - firstSerial) * timelineDayWidth
  const moveTimeline = (daysToMove: number) => timelineRef.current?.scrollBy({ left: daysToMove * timelineDayWidth, behavior: 'smooth' })
  const moveToToday = () => {
    const todayOffset = (timelineDaySerial(Date.now()) - firstSerial) * timelineDayWidth
    timelineRef.current?.scrollTo({ left: Math.max(0, todayOffset - 280), behavior: 'smooth' })
  }
  const editRecord = repositories.engagements.find(record => record.id === editingDates)
  return <>
    <div className="planning-toolbar card">
      <div className="tabs compact">{['Todos','Activos','Completados'].map(option => <button className={status === option ? 'active' : ''} onClick={() => setStatus(option)} key={option}>{option}</button>)}</div>
      <div className="timeline-toolbar-actions">
        <div className="timeline-navigation" aria-label="Navegar cronograma">
          <button onClick={() => moveTimeline(-7)} aria-label="Retroceder una semana" title="Semana anterior"><ChevronLeft size={16}/></button>
          <button onClick={moveToToday}>Hoy</button>
          <button onClick={() => moveTimeline(7)} aria-label="Avanzar una semana" title="Semana siguiente"><ChevronRight size={16}/></button>
        </div>
        <label className="inline-search planning-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Buscar ${labels.engagement.toLowerCase()} o ${labels.account.toLowerCase()}`}/></label>
      </div>
    </div>
    {filtered.length ? <section className="timeline-board card" ref={timelineRef} aria-label={`Cronograma de ${labels.engagements.toLowerCase()}`}>
      <div className="timeline-canvas" style={{ width: 245 + timelineWidth }}>
        <header className="timeline-day-header">
          <span className="timeline-sticky-cell">{labels.engagement}</span>
          <div className="timeline-days" style={{ width: timelineWidth }}>
            {days.map(day => <time className={cls('timeline-day', day.weekend && 'weekend', day.monday && 'week-start', day.today && 'today')} dateTime={new Date(day.timestamp).toISOString()} key={day.serial}><b>{day.day}</b><span>{day.weekday}</span></time>)}
          </div>
        </header>
        {filtered.map(row => {
          const milestoneGroups = groupMilestonesByDay(row.milestones)
          const barLeft = offsetFor(row.start)
          const barWidth = (timelineDaySerial(row.end) - timelineDaySerial(row.start) + 1) * timelineDayWidth
          return <article className="timeline-work-row" key={row.engagement.id}>
            <div className="timeline-work-label timeline-sticky-cell">
              <button onClick={() => go('engagement', { id: row.engagement.id })}><b>{row.engagement.name}</b><span>{labels.engagement} · {row.engagement.status}</span></button>
              <button className="timeline-account-link" onClick={() => row.engagement.accountId && go('account', { id: row.engagement.accountId })}>{row.account?.name || row.engagement.account}</button>
              <small>{formatDate(row.start)} → {formatDate(row.end)} · {row.progress}%</small>
              {row.milestones.some(item => item.outsideRange) ? <em><AlertTriangle size={12}/>Hito fuera del período</em> : null}
            </div>
            <div className="timeline-lane" style={{ width: timelineWidth }}>
              <div className="timeline-grid" aria-hidden="true">{days.map(day => <i className={cls(day.weekend && 'weekend', day.monday && 'week-start', day.today && 'today')} key={day.serial}/>)}</div>
              <button className="timeline-engagement-bar" style={{ left: barLeft, width: barWidth }} onClick={() => go('engagement', { id: row.engagement.id })} title={`${row.engagement.name}: ${formatDate(row.start)} a ${formatDate(row.end)}`} aria-label={`Abrir ${row.engagement.name}, ${formatDate(row.start)} a ${formatDate(row.end)}`}><span>{row.progress}%</span></button>
              {milestoneGroups.map(group => {
                const outsideRange = group.items.some(item => item.outsideRange)
                const tooltip = group.items.map(item => `${item.prestation.name} · ${formatDate(item.timestamp)} · ${item.prestation.status}${item.outsideRange ? ' · Fuera del período' : ''}`).join('\n')
                return <button className={cls('timeline-milestone', milestoneState(group.items), outsideRange && 'outside')} style={{ left: offsetFor(group.items[0].timestamp) + timelineDayWidth / 2 }} onClick={() => group.items.length === 1 ? onSelectPrestation(group.items[0].prestation.id) : setMilestoneGroup(group.items)} title={tooltip} aria-label={group.items.length === 1 ? tooltip : `${group.items.length} ${labels.prestations.toLowerCase()} el ${formatDate(group.items[0].timestamp)}`} key={group.serial}><span>{group.items.length > 1 ? group.items.length : '◆'}</span></button>
              })}
            </div>
          </article>
        })}
      </div>
    </section> : <div className="planning-empty card"><Clock3 size={23}/><h3>Todavía no tienes {labels.engagements.toLowerCase()} con fechas definidas.</h3><p>Agrega fecha de inicio y término para visualizarlos aquí.</p><button className="secondary-btn" onClick={() => go('work')}>Ver {labels.engagements.toLowerCase()}</button></div>}
    {rows.undated.length > 0 && <section className="undated-work card"><div><span className="section-kicker">Sin fechas definidas</span><h3>{rows.undated.length} {labels.engagements.toLowerCase()} fuera del cronograma</h3></div>{rows.undated.map(record => <button onClick={() => setEditingDates(record.id)} key={record.id}><span><b>{record.name}</b><small>{record.account}</small></span>Definir fechas <ChevronRight size={15}/></button>)}</section>}
    {milestoneGroup && <Dialog title={`${milestoneGroup.length} ${labels.prestations.toLowerCase()}`} subtitle={formatDate(milestoneGroup[0].timestamp)} onClose={() => setMilestoneGroup(null)}><div className="timeline-group-list">{milestoneGroup.map(item => <button onClick={() => { setMilestoneGroup(null); onSelectPrestation(item.prestation.id) }} key={item.prestation.id}><span><b>{item.prestation.name}</b><small>{item.prestation.status}</small></span><ChevronRight size={16}/></button>)}</div></Dialog>}
    {editRecord && <EngagementDatesDialog engagement={editRecord} labels={labels} onClose={() => setEditingDates(null)}/>}
  </>
}

export function AgendaView({ labels, go, onCreate }: { labels: Labels; go: Navigate; onCreate: () => void }) {
  const repositories = useRepositories()
  const requestedTimeline = new URLSearchParams(window.location.search).get('view') === 'timeline'
  const [mode, setMode] = useState<'calendar' | 'timeline'>(labels.timelineEnabled && requestedTimeline ? 'timeline' : 'calendar')
  const [selectedPrestation, setSelectedPrestation] = useState<number | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<number | null>(null)
  const prestation = repositories.prestations.find(record => record.id === selectedPrestation)
  const activity = repositories.activities.find(record => record.id === selectedActivity)
  return <><div className="page-header planning-header"><div><span className="section-kicker">Tu trabajo en el tiempo</span><h1>{labels.planningLabel}</h1><p>{mode === 'calendar' ? 'Qué tienes que hacer y cuándo.' : `Cómo avanzan tus ${labels.engagements.toLowerCase()} y sus ${labels.prestations.toLowerCase()}.`}</p></div><button className="primary-btn" onClick={onCreate}><Plus size={17}/>{labels.createPrestation}</button></div>{labels.timelineEnabled && <nav className="planning-mode-tabs" aria-label="Vistas de planificación"><button className={mode === 'calendar' ? 'active' : ''} onClick={() => setMode('calendar')}><CalendarDays size={17}/>Calendario</button><button className={mode === 'timeline' ? 'active' : ''} onClick={() => setMode('timeline')}><Clock3 size={17}/>Cronograma</button></nav>}{mode === 'calendar' ? <CalendarPanel labels={labels} onCreate={onCreate} onSelectPrestation={setSelectedPrestation} onSelectActivity={setSelectedActivity}/> : <TimelinePanel labels={labels} go={go} onSelectPrestation={setSelectedPrestation}/>} {prestation && <PrestationDialog record={prestation} labels={labels} go={go} onClose={() => setSelectedPrestation(null)}/>} {activity && <ActivityDialog record={activity} labels={labels} go={go} onClose={() => setSelectedActivity(null)}/>}</>
}
