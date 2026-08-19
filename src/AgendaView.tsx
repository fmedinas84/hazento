import { useState } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Pencil, Plus, X } from 'lucide-react'
import type { PrestationData, Vertical } from './data'
import { verticalLabels } from './data'
import { useRepositories } from './repositories'

type Labels = typeof verticalLabels[Vertical]
type View = 'Día' | 'Semana' | 'Mes' | 'Gantt'
const monthIndexes: Record<string, number> = { Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5, Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11 }
const monthLabels = Object.keys(monthIndexes)
const weekDays = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const hours = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00']
const cls = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(' ')

function parseDisplayDate(value: string) {
  const match = value.match(/^(\d{1,2}) ([A-ZÁÉÍÓÚ][a-záéíóú]{2}) · (\d{2}):(\d{2})$/)
  if (!match || monthIndexes[match[2]] === undefined) return undefined
  return { day: Number(match[1]), month: monthIndexes[match[2]], hour: Number(match[3]), minute: Number(match[4]) }
}

function formatDisplayDate(date: string, time: string) {
  const [, month, day] = date.split('-').map(Number)
  return `${day} ${monthLabels[month - 1]} · ${time}`
}

function dateInputValue(value: string) {
  const parsed = parseDisplayDate(value)
  if (!parsed) return { date: '2026-08-18', time: '09:00' }
  return { date: `2026-${String(parsed.month + 1).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`, time: `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}` }
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className={`badge badge-${String(children).toLowerCase().replaceAll(' ', '-')}`}>{children}</span>
}

function MonthGrid({ records, month, year, labels, onOpen }: { records: PrestationData[]; month: number; year: number; labels: Labels; onOpen: (id: number) => void }) {
  const firstDay = new Date(year, month, 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const start = new Date(year, month, 1 - mondayOffset)
  const cells = Array.from({ length: 42 }, (_, index) => new Date(year, start.getMonth(), start.getDate() + index))
  return <section className="month-calendar card" aria-label={`Vista mensual de ${labels.prestations.toLowerCase()}`}>
    <header>{weekDays.map(day => <span key={day}>{day}</span>)}</header>
    <div>{cells.map(cell => {
      const inMonth = cell.getMonth() === month
      const events = records.filter(record => { const parsed = parseDisplayDate(record.date); return parsed?.day === cell.getDate() && parsed.month === cell.getMonth() && year === 2026 })
      const today = year === 2026 && month === 7 && cell.getDate() === 18 && inMonth
      return <article className={cls(!inMonth && 'outside', today && 'today')} key={cell.toISOString()}><time>{cell.getDate()}</time>{events.slice(0, 3).map(record => <button onClick={() => onOpen(record.id)} title={`${record.name} · ${record.account}`} key={record.id}><b>{record.date.split(' · ')[1]}</b><span>{record.name}</span><small>{record.account}</small></button>)}{events.length > 3 && <em>+{events.length - 3} más</em>}</article>
    })}</div>
  </section>
}

function PrestationDialog({ record, labels, onClose }: { record: PrestationData; labels: Labels; onClose: () => void }) {
  const repositories = useRepositories()
  const [editing, setEditing] = useState(false)
  const scheduled = dateInputValue(record.date)
  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    repositories.updatePrestation(record.id, { name: String(values.name).trim(), description: String(values.description || '').trim(), serviceId: Number(values.serviceId) || undefined, date: formatDisplayDate(String(values.date), String(values.time)) })
    setEditing(false)
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label={record.name} onMouseDown={event => event.stopPropagation()}><header><div><h2>{editing ? `Editar ${labels.prestation.toLowerCase()}` : record.name}</h2><p>{record.account} · {record.date}</p></div><button className="icon-btn" aria-label="Cerrar" onClick={onClose}><X size={18}/></button></header>{editing ? <form onSubmit={save}><div className="form-grid single"><label><span>Nombre *</span><input name="name" required autoFocus defaultValue={record.name}/></label><label><span>Tipo ({labels.service.toLowerCase()})</span><select name="serviceId" defaultValue={record.serviceId || ''}><option value="">Sin tipo</option>{repositories.services.filter(service => service.active).map(service => <option value={service.id} key={service.id}>{service.name}</option>)}</select></label><label className="form-span"><span>Descripción</span><textarea name="description" rows={4} defaultValue={record.description || ''}/></label><label><span>Fecha</span><input name="date" type="date" required defaultValue={scheduled.date}/></label><label><span>Hora</span><input name="time" type="time" required defaultValue={scheduled.time}/></label></div><footer className="modal-actions"><button type="button" className="ghost-btn" onClick={() => setEditing(false)}>Cancelar</button><button className="primary-btn">Guardar cambios</button></footer></form> : <><div className="record-summary"><p><span>Tipo</span><b>{repositories.services.find(service => service.id === record.serviceId)?.name || 'Sin tipo'}</b></p><p><span>Estado</span><Badge>{record.status}</Badge></p><p><span>Monto</span><b>{record.amount}</b></p><p><span>Pago</span><Badge>{record.payment}</Badge></p></div><section className="prestation-description"><span className="section-kicker">Descripción</span><p>{record.description || 'Sin descripción registrada'}</p></section><div className="status-actions"><button onClick={() => repositories.updatePrestation(record.id, { status: 'Completada' })}><Check size={16}/>Completar</button>{record.status !== 'Programada' && <button onClick={() => repositories.updatePrestation(record.id, { status: 'Programada' })}><Clock3 size={16}/>Volver a programada</button>}<button onClick={() => repositories.updatePrestation(record.id, { status: 'No asistió' })}>No asistió</button><button onClick={() => repositories.updatePrestation(record.id, { status: 'Cancelada' })}>Cancelar</button></div><footer className="modal-actions"><button className="secondary-btn" onClick={() => setEditing(true)}><Pencil size={15}/>Editar {labels.prestation.toLowerCase()}</button><button className="primary-btn" onClick={onClose}>Listo</button></footer></>}</section></div>
}

export function AgendaView({ labels, onCreate }: { labels: Labels; onCreate: () => void }) {
  const repositories = useRepositories()
  const [view, setView] = useState<View>(labels.defaultAgendaView)
  const [offset, setOffset] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected = repositories.prestations.find(record => record.id === selectedId)
  const anchor = new Date(2026, 7 + offset, 1)
  const monthTitle = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(anchor)
  const title = view === 'Mes' ? monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1) : view === 'Día' ? 'Martes 18 agosto 2026' : view === 'Gantt' ? '17–23 agosto 2026' : '17–21 agosto 2026'
  const weekRecords = repositories.prestations.flatMap(record => { const parsed = parseDisplayDate(record.date); if (!parsed || parsed.month !== 7 || parsed.day < 17 || parsed.day > 23) return []; return [{ record, parsed, dayIndex: parsed.day - 17 }] })
  const visibleDays = view === 'Día' ? [{ label: 'Mar', day: 18 }] : weekDays.slice(0, 5).map((label, index) => ({ label, day: index + 17 }))
  return <>
    <div className="page-header"><div><h1>Agenda</h1><p>Toda {labels.prestation.toLowerCase()} programada aparece aquí automáticamente.</p></div><button className="primary-btn" onClick={onCreate}><Plus size={17}/>Nuevo</button></div>
    <div className="calendar-toolbar card"><div><button aria-label="Periodo anterior" className="icon-btn" onClick={() => setOffset(value => value - 1)}><ChevronLeft size={17}/></button><button aria-label="Periodo siguiente" className="icon-btn" onClick={() => setOffset(value => value + 1)}><ChevronRight size={17}/></button><button className="secondary-btn" onClick={() => setOffset(0)}>Hoy</button><h2>{title}</h2></div><div className="tabs">{(['Día','Semana','Mes','Gantt'] as View[]).map(option => <button className={view === option ? 'active' : ''} onClick={() => { setView(option); setOffset(0) }} key={option}>{option}</button>)}</div></div>
    {view === 'Mes' && <MonthGrid records={repositories.prestations} month={anchor.getMonth()} year={anchor.getFullYear()} labels={labels} onOpen={setSelectedId}/>} 
    {view === 'Gantt' && offset === 0 && <div className="gantt card"><div className="gantt-grid gantt-header"><span>{labels.prestations}</span>{weekDays.map((day, index) => <span className={index === 1 ? 'today' : ''} key={day}>{day}<b>{index + 17}</b></span>)}</div><div className="gantt-body">{weekRecords.map(({ record, dayIndex }) => <div className="gantt-grid gantt-row" key={record.id}><button className="gantt-label" onClick={() => setSelectedId(record.id)}><b>{record.name}</b><span>{record.account} · {record.status}</span></button>{weekDays.map((day, index) => <div className={cls('gantt-cell', index === 1 && 'today')} key={day}>{index === dayIndex && <button className="gantt-task" onClick={() => setSelectedId(record.id)}><span>{record.date.split(' · ')[1]}</span></button>}</div>)}</div>)}</div></div>}
    {(view === 'Día' || view === 'Semana') && offset === 0 && <div className={cls('calendar card', view === 'Día' && 'calendar-día')}><div className="calendar-head"><span/>{visibleDays.map(day => <span className={day.day === 18 ? 'today' : ''} key={day.day}>{day.label}<b>{day.day}</b></span>)}</div><div className="calendar-body"><div className="time-column">{hours.map(hour => <span key={hour}>{hour}</span>)}</div>{visibleDays.map(day => <div className="day-column" key={day.day}>{hours.map(hour => <i key={hour}/>)}{weekRecords.filter(item => item.parsed.day === day.day && item.parsed.hour >= 8 && item.parsed.hour <= 21).map(({ record, parsed }) => <button className="cal-event violet" style={{ top: ((parsed.hour * 60 + parsed.minute - 480) / 60) * 52, height: 52 }} onClick={() => setSelectedId(record.id)} key={record.id}><b>{record.date.split(' · ')[1]}</b><span>{record.account}</span><small>{record.name}</small></button>)}</div>)}</div></div>}
    {view !== 'Mes' && offset !== 0 && <div className="empty-state"><span className="empty-icon"><CalendarDays size={20}/></span><h3>Sin compromisos en este periodo</h3><p>Vuelve a hoy para revisar los datos de demostración.</p><button className="secondary-btn" onClick={() => setOffset(0)}>Volver a hoy</button></div>}
    {selected && <PrestationDialog record={selected} labels={labels} onClose={() => setSelectedId(null)}/>} 
  </>
}
