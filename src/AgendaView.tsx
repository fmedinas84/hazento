import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Pencil, Plus, Search, X } from 'lucide-react'
import type { ActivityData, EngagementData, PrestationData, Vertical } from './data'
import { verticalLabels } from './data'
import { buildCalendarEvents, buildTimelineRows, parsePlanningDate, timelineBounds, type CalendarEvent } from './planning'
import { useRepositories } from './repositories'

type Labels = typeof verticalLabels[Vertical]
type CalendarView = 'Día' | 'Semana' | 'Mes'
type PlanningPage = 'account' | 'activities' | 'engagement' | 'prestations' | 'work'
type Navigate = (page: PlanningPage, query?: Record<string, string | number>) => void
type EventFilter = 'Todos' | 'Prestaciones' | 'Actividades'
const weekDays = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const hours = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00']
const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const cls = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(' ')

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
  const scheduled = inputDate(record.date)
  const engagement = repositories.engagements.find(item => item.id === record.engagementId)
  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    repositories.updatePrestation(record.id, { name: String(values.name).trim(), description: String(values.description || '').trim(), serviceId: Number(values.serviceId) || undefined, date: formatDisplayDate(String(values.date), String(values.time)) })
    setEditing(false)
  }
  return <Dialog title={editing ? `Editar ${labels.prestation.toLowerCase()}` : record.name} subtitle={`${record.account} · ${record.date}`} onClose={onClose}>{editing ? <form onSubmit={save}><div className="form-grid single"><label><span>Nombre *</span><input name="name" required autoFocus defaultValue={record.name}/></label><label><span>Tipo ({labels.service.toLowerCase()})</span><select name="serviceId" defaultValue={record.serviceId || ''}><option value="">Sin tipo</option>{repositories.services.filter(service => service.active).map(service => <option value={service.id} key={service.id}>{service.name}</option>)}</select></label><label className="form-span"><span>Descripción</span><textarea name="description" rows={4} defaultValue={record.description || ''}/></label><label><span>Fecha</span><input name="date" type="date" required defaultValue={scheduled.date}/></label><label><span>Hora</span><input name="time" type="time" required defaultValue={scheduled.time}/></label></div><footer className="modal-actions"><button type="button" className="ghost-btn" onClick={() => setEditing(false)}>Cancelar</button><button className="primary-btn">Guardar cambios</button></footer></form> : <><div className="record-summary"><p><span>{labels.account}</span><button className="text-btn" onClick={() => go('account', { id: record.accountId })}>{record.account}</button></p>{engagement && <p><span>{labels.engagement}</span><button className="text-btn" onClick={() => go('engagement', { id: engagement.id })}>{engagement.name}</button></p>}<p><span>Tipo</span><b>{repositories.services.find(service => service.id === record.serviceId)?.name || 'Sin tipo'}</b></p><p><span>Estado</span><Badge>{record.status}</Badge></p><p><span>Monto</span><b>{record.amount}</b></p></div><section className="prestation-description"><span className="section-kicker">Descripción</span><p>{record.description || 'Sin descripción registrada'}</p></section><div className="status-actions"><button onClick={() => repositories.updatePrestation(record.id, { status: 'Completada' })}><Check size={16}/>Completar</button>{record.status !== 'Programada' && <button onClick={() => repositories.updatePrestation(record.id, { status: 'Programada' })}><Clock3 size={16}/>Volver a programada</button>}<button onClick={() => repositories.updatePrestation(record.id, { status: 'No asistió' })}>No asistió</button><button onClick={() => repositories.updatePrestation(record.id, { status: 'Cancelada' })}>Cancelar</button></div><footer className="modal-actions"><button className="secondary-btn" onClick={() => setEditing(true)}><Pencil size={15}/>Editar</button><button className="primary-btn" onClick={onClose}>Listo</button></footer></>}</Dialog>
}

function ActivityDialog({ record, labels, go, onClose }: { record: ActivityData; labels: Labels; go: Navigate; onClose: () => void }) {
  const repositories = useRepositories()
  const account = repositories.accounts.find(item => item.id === record.accountId)
  const prestation = repositories.prestations.find(item => item.id === record.prestationId)
  const timestamp = parsePlanningDate(record.scheduledAt ?? record.completedAt ?? record.createdAt ?? record.date)
  return <Dialog title={record.source === 'prestation_follow_up' ? 'Seguimiento' : record.title} subtitle={formatDate(timestamp, true)} onClose={onClose}><div className="record-summary"><p><span>{labels.account}</span>{account ? <button className="text-btn" onClick={() => go('account', { id: account.id })}>{account.name}</button> : <b>Sin cuenta</b>}</p>{prestation && <p><span>{labels.prestation}</span><button className="text-btn" onClick={() => go('prestations', { id: prestation.id })}>{prestation.name}</button></p>}<p><span>Tipo</span><b>{record.type}</b></p><p><span>Estado</span><Badge>{record.status}</Badge></p></div><section className="prestation-description"><span className="section-kicker">Detalle</span><p>{record.description || record.relation}</p></section><footer className="modal-actions"><button className="secondary-btn" onClick={() => go('activities', { id: record.id })}>Ver actividades</button><button className="primary-btn" onClick={onClose}>Listo</button></footer></Dialog>
}

function MonthCalendar({ events, anchor, labels, onOpen }: { events: CalendarEvent[]; anchor: Date; labels: Labels; onOpen: (event: CalendarEvent) => void }) {
  const year = anchor.getFullYear(); const month = anchor.getMonth(); const first = new Date(year, month, 1); const offset = (first.getDay() + 6) % 7; const start = new Date(year, month, 1 - offset)
  const cells = Array.from({ length: 42 }, (_, index) => new Date(year, start.getMonth(), start.getDate() + index))
  return <section className="month-calendar card" aria-label={`Vista mensual de ${labels.planningLabel.toLowerCase()}`}><header>{weekDays.map(day => <span key={day}>{day}</span>)}</header><div>{cells.map(cell => { const inMonth = cell.getMonth() === month; const dayEvents = events.filter(event => { const date = new Date(event.timestamp); return date.getFullYear() === cell.getFullYear() && date.getMonth() === cell.getMonth() && date.getDate() === cell.getDate() }); const today = year === 2026 && month === 7 && cell.getDate() === 18 && inMonth; return <article className={cls(!inMonth && 'outside', today && 'today')} key={cell.toISOString()}><time>{cell.getDate()}</time>{dayEvents.slice(0, 3).map(event => <button className={cls('planning-month-event', event.kind, event.source === 'prestation_follow_up' && 'follow-up')} onClick={() => onOpen(event)} title={`${event.title} · ${event.accountName}`} key={event.id}><b>{new Date(event.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })}</b><span>{event.source === 'prestation_follow_up' ? 'Seguimiento' : event.title}</span><small>{event.accountName}</small></button>)}{dayEvents.length > 3 && <em>+{dayEvents.length - 3} más</em>}</article> })}</div></section>
}

function WeekCalendar({ events, dayOnly, onOpen }: { events: CalendarEvent[]; dayOnly: boolean; onOpen: (event: CalendarEvent) => void }) {
  const days = (dayOnly ? [18] : [17,18,19,20,21]).map((day, index) => ({ day, label: dayOnly ? 'Mar' : weekDays[index] }))
  return <div className={cls('calendar card', dayOnly && 'calendar-día')}><div className="calendar-head"><span/>{days.map(day => <span className={day.day === 18 ? 'today' : ''} key={day.day}>{day.label}<b>{day.day}</b></span>)}</div><div className="calendar-body"><div className="time-column">{hours.map(hour => <span key={hour}>{hour}</span>)}</div>{days.map(day => <div className="day-column" key={day.day}>{hours.map(hour => <i key={hour}/>)}{events.filter(event => { const date = new Date(event.timestamp); return date.getMonth() === 7 && date.getDate() === day.day && date.getHours() >= 8 && date.getHours() <= 21 }).map(event => { const date = new Date(event.timestamp); const top = ((date.getHours() * 60 + date.getMinutes() - 480) / 60) * 52; return <button className={cls('cal-event', event.kind === 'prestation' ? 'violet' : 'blue', event.source === 'prestation_follow_up' && 'note-event')} style={{ top, height: 50 }} onClick={() => onOpen(event)} key={event.id}><b>{String(date.getHours()).padStart(2,'0')}:{String(date.getMinutes()).padStart(2,'0')}</b><span>{event.source === 'prestation_follow_up' ? 'Seguimiento' : event.title}</span><small>{event.accountName}</small></button> })}</div>)}</div></div>
}

function CalendarPanel({ labels, onCreate, onSelectPrestation, onSelectActivity }: { labels: Labels; onCreate: () => void; onSelectPrestation: (id: number) => void; onSelectActivity: (id: number) => void }) {
  const repositories = useRepositories()
  const [view, setView] = useState<CalendarView>('Semana')
  const [filter, setFilter] = useState<EventFilter>('Todos')
  const [offset, setOffset] = useState(0)
  const events = useMemo(() => buildCalendarEvents(repositories), [repositories])
  const visible = events.filter(event => filter === 'Todos' || (filter === 'Prestaciones' ? event.kind === 'prestation' : event.kind === 'activity'))
  const anchor = new Date(2026, 7 + offset, 1)
  const title = view === 'Mes' ? new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(anchor) : view === 'Día' ? 'Martes 18 agosto 2026' : '17–21 agosto 2026'
  const open = (event: CalendarEvent) => event.kind === 'prestation' ? onSelectPrestation(event.recordId) : onSelectActivity(event.recordId)
  return <><div className="planning-toolbar card"><div className="calendar-nav"><button aria-label="Periodo anterior" className="icon-btn" onClick={() => setOffset(value => value - 1)}><ChevronLeft size={17}/></button><button aria-label="Periodo siguiente" className="icon-btn" onClick={() => setOffset(value => value + 1)}><ChevronRight size={17}/></button><button className="secondary-btn" onClick={() => setOffset(0)}>Hoy</button><h2>{title.charAt(0).toUpperCase() + title.slice(1)}</h2></div><div className="planning-controls"><div className="tabs compact">{(['Todos','Prestaciones','Actividades'] as EventFilter[]).map(option => <button className={filter === option ? 'active' : ''} onClick={() => setFilter(option)} key={option}>{option === 'Prestaciones' ? labels.prestations : option}</button>)}</div><div className="tabs compact">{(['Día','Semana','Mes'] as CalendarView[]).map(option => <button className={view === option ? 'active' : ''} onClick={() => { setView(option); setOffset(0) }} key={option}>{option}</button>)}</div></div></div>{view === 'Mes' ? <MonthCalendar events={visible} anchor={anchor} labels={labels} onOpen={open}/> : offset === 0 ? <WeekCalendar events={visible} dayOnly={view === 'Día'} onOpen={open}/> : <div className="planning-empty card"><CalendarDays size={23}/><h3>No tienes {labels.prestations.toLowerCase()} programadas para este período.</h3><button className="secondary-btn" onClick={onCreate}>{labels.createPrestation}</button></div>}<p className="planning-source-note">El calendario se deriva de {labels.prestations.toLowerCase()} y actividades. Los {labels.engagements.toLowerCase()} no se repiten como eventos.</p></>
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
  const rows = useMemo(() => buildTimelineRows(repositories), [repositories])
  const filtered = rows.dated.filter(row => (status === 'Todos' || (status === 'Activos' ? row.engagement.status === 'Activo' : row.engagement.status === 'Completado')) && `${row.engagement.name} ${row.account?.name || row.engagement.account}`.toLowerCase().includes(query.toLowerCase()))
  const bounds = timelineBounds(filtered)
  const position = (timestamp: number) => `${Math.max(0, Math.min(100, (timestamp - bounds.start) / bounds.duration * 100))}%`
  const ticks = bounds.start ? Array.from({ length: 7 }, (_, index) => bounds.start + bounds.duration * index / 6) : []
  const editRecord = repositories.engagements.find(record => record.id === editingDates)
  return <><div className="planning-toolbar card"><div className="tabs compact">{['Todos','Activos','Completados'].map(option => <button className={status === option ? 'active' : ''} onClick={() => setStatus(option)} key={option}>{option}</button>)}</div><label className="inline-search planning-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Buscar ${labels.engagement.toLowerCase()} o ${labels.account.toLowerCase()}`}/></label></div>{filtered.length ? <section className="timeline-board card"><header><span>{labels.engagement}</span><div>{ticks.map(tick => <time style={{ left: position(tick) }} key={tick}>{formatDate(tick)}</time>)}</div></header>{filtered.map(row => <article className="timeline-work-row" key={row.engagement.id}><div className="timeline-work-label"><button onClick={() => go('engagement', { id: row.engagement.id })}><b>{row.engagement.name}</b><span>{labels.engagement} · {row.engagement.status}</span></button><button className="timeline-account-link" onClick={() => row.engagement.accountId && go('account', { id: row.engagement.accountId })}>{row.account?.name || row.engagement.account}</button><small>{formatDate(row.start)} → {formatDate(row.end)} · {row.progress}%</small>{row.milestones.some(item => item.outsideRange) && <em><AlertTriangle size={12}/>Hito fuera del período</em>}</div><div className="timeline-lane"><i className="timeline-guide"/><button className="timeline-engagement-bar" style={{ left: position(row.start), width: `max(30px, calc(${position(row.end)} - ${position(row.start)}))` }} onClick={() => go('engagement', { id: row.engagement.id })} title={`${row.engagement.name}: ${formatDate(row.start)} a ${formatDate(row.end)}`}><span>{row.progress}%</span></button>{row.milestones.map(({ prestation, timestamp, outsideRange }, index) => <button className={cls('timeline-milestone', prestation.status.toLowerCase().replaceAll(' ', '-'), outsideRange && 'outside')} style={{ left: position(timestamp), top: `${45 + index % 2 * 24}px` }} onClick={() => onSelectPrestation(prestation.id)} title={`${prestation.name} · ${formatDate(timestamp)}`} key={prestation.id}><i>◆</i><span>{prestation.name}</span></button>)}</div></article>)}</section> : <div className="planning-empty card"><Clock3 size={23}/><h3>Todavía no tienes {labels.engagements.toLowerCase()} con fechas definidas.</h3><p>Agrega fecha de inicio y término para visualizarlos aquí.</p><button className="secondary-btn" onClick={() => go('work')}>Ver {labels.engagements.toLowerCase()}</button></div>}{rows.undated.length > 0 && <section className="undated-work card"><div><span className="section-kicker">Sin fechas definidas</span><h3>{rows.undated.length} {labels.engagements.toLowerCase()} fuera del cronograma</h3></div>{rows.undated.map(record => <button onClick={() => setEditingDates(record.id)} key={record.id}><span><b>{record.name}</b><small>{record.account}</small></span>Definir fechas <ChevronRight size={15}/></button>)}</section>}{editRecord && <EngagementDatesDialog engagement={editRecord} labels={labels} onClose={() => setEditingDates(null)}/>}</>
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
