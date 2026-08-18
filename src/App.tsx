import { useMemo, useState } from 'react'
import {
  Activity, Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleDollarSign, Clock3, CreditCard, Ellipsis, FileCheck2, Grid2X2,
  HeartPulse, LayoutDashboard, ListChecks, Menu, MoreHorizontal, Plus, Search, Settings,
  Sparkles, Target, UserRound, UsersRound, WalletCards, X, Zap,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { accounts, activities, agenda, engagements, opportunities, payments, prestations, services, Vertical, verticalLabels } from './data'

type Page = 'dashboard' | 'accounts' | 'account' | 'opportunities' | 'opportunity' | 'agenda' | 'work' | 'engagement' | 'prestations' | 'activities' | 'payments' | 'services' | 'settings'

const money = (value: string) => value
const trend = [
  { month: 'Mar', income: 2140, pending: 410 }, { month: 'Abr', income: 2680, pending: 520 },
  { month: 'May', income: 2520, pending: 360 }, { month: 'Jun', income: 3040, pending: 610 },
  { month: 'Jul', income: 2890, pending: 490 }, { month: 'Ago', income: 3420, pending: 420 },
]

const cls = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

function StatusBadge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const t = tone || String(children).toLowerCase()
  return <span className={cls('badge', `badge-${t.replaceAll(' ', '-')}`)}>{children}</span>
}

function PageHeader({ eyebrow, title, description, action, onAction }: { eyebrow?: string; title: string; description?: string; action?: string; onAction?: () => void }) {
  return <div className="page-header">
    <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action && <button className="primary-btn" onClick={onAction}><Plus size={17} />{action}</button>}
  </div>
}

function MetricCard({ label, value, meta, icon: Icon, tone = 'violet' }: { label: string; value: string; meta: string; icon: React.ElementType; tone?: string }) {
  return <article className="metric-card card">
    <div className={cls('metric-icon', tone)}><Icon size={19} /></div>
    <div className="metric-label">{label}</div>
    <div className="metric-value">{value}</div>
    <div className="metric-meta">{meta}</div>
  </article>
}

function EmptyState({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><div className="empty-icon"><Sparkles size={22} /></div><h3>{title}</h3><p>{body}</p><button className="secondary-btn" onClick={onAction}><Plus size={16} />{action}</button></div>
}

function Modal({ title, subtitle, onClose, children, wide }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className={cls('modal', wide && 'modal-wide')} onMouseDown={e => e.stopPropagation()}>
    <header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" onClick={onClose}><X size={19} /></button></header>{children}
  </section></div>
}

function CreateForm({ type, labels, onDone }: { type: string; labels: typeof verticalLabels[Vertical]; onDone: () => void }) {
  const lower = type.toLowerCase()
  const isPayment = lower.includes('pago')
  return <form onSubmit={e => { e.preventDefault(); onDone() }}>
    <div className="form-grid">
      <label><span>{labels.account} *</span><select required><option value="">Seleccionar {labels.account.toLowerCase()}</option>{accounts.map(a => <option key={a.id}>{a.name}</option>)}</select></label>
      {isPayment ? <>
        <label><span>Monto *</span><input placeholder="$0" required /></label>
        <label><span>Fecha</span><input type="date" defaultValue="2026-08-17" /></label>
        <label><span>Método</span><select><option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option></select></label>
      </> : <>
        <label><span>Nombre *</span><input placeholder={`Nombre de ${lower}`} required /></label>
        <label><span>Fecha</span><input type="date" defaultValue="2026-08-17" /></label>
        <label><span>Estado</span><select><option>Borrador</option><option>Programada</option><option>Activa</option></select></label>
      </>}
    </div>
    {isPayment && <div className="allocation-box"><div><strong>Asignar a prestaciones pendientes</strong><p>Elige cómo distribuir el pago.</p></div>{prestations.filter(p => p.payment !== 'Pagado').slice(0, 3).map((p, i) => <label className="allocation" key={i}><input type="checkbox" /> <span>{p.date}<b>{p.name}</b></span><strong>{p.amount}</strong></label>)}</div>}
    <label className="full-label"><span>Notas</span><textarea placeholder="Agrega contexto para encontrarlo fácilmente después" /></label>
    <footer className="modal-actions"><button type="button" className="ghost-btn" onClick={onDone}>Cancelar</button><button className="primary-btn">Guardar</button></footer>
  </form>
}

function Dashboard({ labels, go }: { labels: typeof verticalLabels[Vertical]; go: (p: Page) => void }) {
  return <>
    <PageHeader eyebrow="Lunes 17 de agosto" title="Buenos días, Francisca" description="Aquí tienes lo más importante para mover tu negocio hoy." action={`Nueva ${labels.prestation.toLowerCase()}`} onAction={() => go('agenda')} />
    <div className="metrics-grid">
      <MetricCard label="Ingresos del mes" value="$3.420.000" meta="↗ 12% vs. mes anterior" icon={WalletCards} tone="green" />
      <MetricCard label="Por cobrar" value="$420.000" meta={`8 ${labels.prestations.toLowerCase()} pendientes`} icon={Clock3} tone="orange" />
      <MetricCard label="Trabajo realizado" value="94" meta={`${labels.prestations.toLowerCase()} este mes`} icon={FileCheck2} tone="blue" />
      <MetricCard label="Oportunidades abiertas" value="$1.850.000" meta="7 oportunidades en curso" icon={Target} />
    </div>
    <div className="dashboard-grid">
      <section className="card schedule-card">
        <div className="card-heading"><div><span className="section-kicker">Tu día</span><h2>Agenda de hoy</h2></div><button className="text-btn" onClick={() => go('agenda')}>Ver agenda <ChevronRight size={16} /></button></div>
        <div className="agenda-list">{agenda.map((item, i) => <button className="agenda-row" key={i} onClick={() => go('prestations')}>
          <time>{item.time}</time><span className={cls('agenda-dot', item.tone)} /><div><strong>{item.name}</strong><span>{item.type}</span></div><StatusBadge tone={item.tone}>{item.status}</StatusBadge><b>{item.amount}</b><ChevronRight size={16} />
        </button>)}</div>
      </section>
      <section className="card attention-card">
        <div className="card-heading"><div><span className="section-kicker">Asistente operativo</span><h2>Necesitan tu atención</h2></div><Zap size={20} /></div>
        <button onClick={() => go('payments')}><span className="attention-icon orange"><CircleDollarSign size={18} /></span><div><b>8 pagos pendientes</b><span>$420.000 por cobrar</span></div><ChevronRight size={16} /></button>
        <button onClick={() => go('activities')}><span className="attention-icon red"><Clock3 size={18} /></span><div><b>5 actividades vencidas</b><span>2 son de alta prioridad</span></div><ChevronRight size={16} /></button>
        <button onClick={() => go('opportunities')}><span className="attention-icon violet"><Target size={18} /></span><div><b>3 oportunidades sin actividad</b><span>Hace más de 7 días</span></div><ChevronRight size={16} /></button>
        <button onClick={() => go('prestations')}><span className="attention-icon blue"><FileCheck2 size={18} /></span><div><b>4 {labels.prestations.toLowerCase()} por completar</b><span>Programadas para hoy</span></div><ChevronRight size={16} /></button>
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
        {[['MP','María Pérez','Pago registrado · $35.000','Hace 20 min','green'],['FN','Fundación Norte','Oportunidad pasó a Propuesta','Hace 2 h','violet'],['CD','Carolina Díaz',`${labels.prestation} marcada como realizada`,'Hace 3 h','orange'],['JS','Juan Soto','Nueva actividad programada','Ayer','blue']].map((r,i)=><div className="recent-row" key={i}><span className={cls('avatar-sm',r[4])}>{r[0]}</span><div><b>{r[1]}</b><span>{r[2]}</span></div><time>{r[3]}</time></div>)}
      </section>
    </div>
  </>
}

function AccountsPage({ labels, go, onCreate }: { labels: typeof verticalLabels[Vertical]; go: (p: Page) => void; onCreate: () => void }) {
  const [tab,setTab]=useState('Todos'); const [query,setQuery]=useState('')
  const rows=accounts.filter(a=>(tab==='Todos'||a.status===tab.slice(0,-1)||a.status===tab)&&a.name.toLowerCase().includes(query.toLowerCase()))
  return <><PageHeader title={labels.accounts} description={`Gestiona relaciones, actividad, trabajo y cobros de cada ${labels.account.toLowerCase()}.`} action={`Nuevo ${labels.account.toLowerCase()}`} onAction={onCreate}/>
    <div className="toolbar card"><div className="tabs">{['Todos','Prospectos','Activos','Inactivos'].map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}</div><div className="toolbar-actions"><label className="search-small"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Buscar ${labels.accounts.toLowerCase()}`}/></label><button className="secondary-btn"><ListChecks size={16}/>Filtros</button></div></div>
    <div className="table-card card"><table><thead><tr><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Última actividad</th><th>Próxima actividad</th><th>Ingresos</th><th>Pendiente</th><th></th></tr></thead><tbody>{rows.map(a=><tr key={a.id} onClick={()=>go('account')}><td><div className="person-cell"><span className="avatar" style={{background:a.color}}>{a.initials}</span><div><b>{a.name}</b><span>{a.email}</span></div></div></td><td>{a.type}</td><td><StatusBadge>{a.status}</StatusBadge></td><td>{a.last}</td><td>{a.next}</td><td className="number">{a.income}</td><td className={a.pending==='$0'?'muted':'pending-number'}>{a.pending}</td><td><MoreHorizontal size={17}/></td></tr>)}</tbody></table>{!rows.length&&<EmptyState title={`No encontramos ${labels.accounts.toLowerCase()}`} body="Prueba con otra búsqueda o crea el primer registro de esta vista." action={`Crear ${labels.account.toLowerCase()}`} onAction={onCreate}/>}</div>
  </>
}

function AccountDetail({ labels, go, onCreate }: { labels: typeof verticalLabels[Vertical]; go: (p: Page) => void; onCreate: (type?: string) => void }) {
  const [tab,setTab]=useState('Resumen'); const a=accounts[0]
  return <><button className="back-btn" onClick={()=>go('accounts')}><ChevronLeft size={17}/>Volver a {labels.accounts.toLowerCase()}</button>
    <section className="detail-hero card"><div className="detail-identity"><span className="avatar-xl" style={{background:a.color}}>{a.initials}</span><div><span className="section-kicker">{labels.account} activo</span><h1>{a.name}</h1><p>{a.rut} · {a.email} · {a.phone}</p></div></div><div className="hero-actions"><button className="secondary-btn" onClick={()=>onCreate('Registrar pago')}><CreditCard size={16}/>Registrar pago</button><button className="primary-btn" onClick={()=>onCreate(`Nueva ${labels.prestation.toLowerCase()}`)}><Plus size={16}/>Nueva {labels.prestation.toLowerCase()}</button><button className="icon-btn"><Ellipsis size={19}/></button></div></section>
    <div className="detail-tabs">{['Resumen','Trabajo','Oportunidades','Actividades','Pagos','Datos'].map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}</div>
    {tab==='Resumen'?<div className="account-layout"><main><div className="mini-metrics"><div><span>Ingreso histórico</span><b>$280.000</b></div><div><span>Pendiente</span><b className="orange-text">$35.000</b></div><div><span>{labels.prestations}</span><b>8</b></div><div><span>Oportunidades</span><b>1</b></div></div><section className="card timeline-card"><div className="card-heading"><h2>Historia con {a.name.split(' ')[0]}</h2><button className="text-btn">Agregar nota <Plus size={15}/></button></div>{[['17 Ago',`${labels.prestation} programada`,'Sesión individual · Hoy a las 09:00','$35.000'],['10 Ago','Pago recibido','Transferencia · Asociado a sesión','$35.000'],['10 Ago',`${labels.prestation} realizada`,'Sesión individual · Completada','$35.000'],['03 Ago','Pago recibido','Transferencia · 2 atenciones','$70.000']].map((x,i)=><div className="timeline-item" key={i}><time>{x[0]}</time><span className="timeline-dot"/><div><b>{x[1]}</b><span>{x[2]}</span></div><strong>{x[3]}</strong></div>)}</section></main><aside><section className="card next-card"><span className="section-kicker">Próximo compromiso</span><div className="date-box"><b>24</b><span>AGO</span></div><h3>Sesión individual</h3><p>09:00 · 60 minutos</p><button className="secondary-btn" onClick={()=>go('agenda')}>Ver en agenda</button></section><section className="card info-card"><h3>Datos de contacto</h3><p><span>Email</span>{a.email}</p><p><span>Teléfono</span>{a.phone}</p><p><span>RUT</span>{a.rut}</p><button className="text-btn">Editar datos</button></section></aside></div>:<section className="card placeholder-section"><EmptyState title={`${tab} de ${a.name}`} body={`Esta vista reúne toda la información de ${tab.toLowerCase()} relacionada con la cuenta.`} action={`Agregar ${tab.toLowerCase()}`} onAction={()=>onCreate(`Nueva ${labels.prestation.toLowerCase()}`)}/></section>}
  </>
}

function OpportunitiesPage({ go, onCreate }: { go:(p:Page)=>void; onCreate:()=>void }) {
  const stages=['Nuevo','Contactado','Propuesta','Negociación']
  return <><PageHeader title="Oportunidades" description="Haz seguimiento a cada posibilidad de trabajo hasta convertirla en una relación activa." action="Nueva oportunidad" onAction={onCreate}/><div className="pipeline-summary card"><div><span>Pipeline abierto</span><b>$1.575.000</b></div><div><span>Oportunidades</span><b>5</b></div><div><span>Tasa de conversión</span><b>38%</b></div><div><span>Cierre estimado este mes</span><b>$1.155.000</b></div></div><div className="kanban">{stages.map(stage=><section className="kanban-column" key={stage}><header><span><i className={`stage-dot ${stage.toLowerCase()}`}/>{stage}</span><b>{opportunities.filter(o=>o.stage===stage).length}</b></header>{opportunities.filter(o=>o.stage===stage).map(o=><button className="opportunity-card card" onClick={()=>go('opportunity')} key={o.id}><div><span>{o.account}</span><MoreHorizontal size={16}/></div><h3>{o.title}</h3><strong>{o.amount}</strong><footer><span><CalendarDays size={13}/>{o.close}</span><span>{o.last}</span></footer></button>)}<button className="add-card" onClick={onCreate}><Plus size={15}/>Agregar oportunidad</button></section>)}</div></>
}

function OpportunityDetail({ labels, go }: { labels: typeof verticalLabels[Vertical]; go:(p:Page)=>void }) {
  const [won,setWon]=useState(false)
  return <><button className="back-btn" onClick={()=>go('opportunities')}><ChevronLeft size={17}/>Volver al pipeline</button><section className="detail-hero card"><div><span className="section-kicker">Oportunidad · Negociación</span><h1>Convenio de derivación</h1><p>Centro Armonía</p></div><div className="opportunity-value"><b>$420.000</b><span>70% probabilidad</span></div></section><div className="opportunity-layout"><main><section className="card timeline-card"><div className="card-heading"><h2>Actividad de la oportunidad</h2><button className="secondary-btn"><Plus size={16}/>Agregar actividad</button></div>{[['17 Ago','Seguimiento pendiente','Recordatorio automático para contactar'],['12 Ago','Propuesta enviada','Plan mensual de derivación'],['08 Ago','Reunión realizada','Tomás Vidal · 45 minutos'],['04 Ago','Oportunidad creada','Origen: recomendación']].map((x,i)=><div className="timeline-item" key={i}><time>{x[0]}</time><span className="timeline-dot"/><div><b>{x[1]}</b><span>{x[2]}</span></div></div>)}</section></main><aside><section className="card detail-fields"><h3>Detalles</h3><p><span>Cuenta</span><b>Centro Armonía</b></p><p><span>Contacto</span><b>Tomás Vidal</b></p><p><span>Monto</span><b>$420.000</b></p><p><span>Etapa</span><StatusBadge tone="violet">Negociación</StatusBadge></p><p><span>Cierre estimado</span><b>05 Sep 2026</b></p></section><button className="win-btn" onClick={()=>setWon(true)}><Check size={18}/>Marcar como ganada</button></aside></div>{won&&<Modal title="¡Oportunidad ganada!" subtitle="¿Qué quieres crear con esta venta?" onClose={()=>setWon(false)}><div className="choice-list">{[labels.engagement,'Solo cerrar oportunidad'].map((x,i)=><button key={x} onClick={()=>{setWon(false); if(i===0)go('work')}}><span className="choice-icon">{i===0?<BriefcaseBusiness size={19}/>:<Check size={19}/>}</span><div><b>Crear {x.toLowerCase()}</b><span>{i===0?'Organiza el trabajo y sus próximas prestaciones.':'No crear trabajo asociado por ahora.'}</span></div><ChevronRight size={17}/></button>)}</div></Modal>}</>
}

function WorkPage({ labels, go, onCreate }: { labels: typeof verticalLabels[Vertical]; go:(p:Page)=>void; onCreate:()=>void }) {
  return <><PageHeader title="Trabajo" description={`Organiza tus ${labels.engagements.toLowerCase()} y revisa su avance, entregas y cobros.`} action={`Nuevo ${labels.engagement.toLowerCase()}`} onAction={onCreate}/><div className="tabs standalone"><button className="active">Activos <span>4</span></button><button>Todos</button><button>Completados</button></div><div className="engagement-grid">{engagements.map((e,i)=><button className="engagement-card card" onClick={()=>go('engagement')} key={i}><div className="engagement-top"><span className="work-icon"><BriefcaseBusiness size={19}/></span><StatusBadge>{e.status}</StatusBadge></div><span>{e.account}</span><h3>{i===0?`${labels.engagement} María Pérez`:e.name}</h3><p>{e.type} · {e.detail}</p><div className="progress-label"><span>Avance</span><b>{e.progress}%</b></div><div className="progress"><i style={{width:`${e.progress}%`}}/></div><footer><strong>{e.amount}</strong><ChevronRight size={17}/></footer></button>)}</div></>
}

function EngagementDetail({ labels, go }: { labels: typeof verticalLabels[Vertical]; go:(p:Page)=>void }) {
  return <><button className="back-btn" onClick={()=>go('work')}><ChevronLeft size={17}/>Volver a trabajo</button><section className="detail-hero card"><div><span className="section-kicker">{labels.engagement} · Activo</span><h1>{labels.engagement} María Pérez</h1><p>María Pérez · 03 Jun – 28 Ago 2026</p></div><div className="hero-actions"><button className="secondary-btn">Registrar pago</button><button className="primary-btn"><Plus size={16}/>Agregar {labels.prestation.toLowerCase()}</button></div></section><div className="engagement-detail"><main><section className="card checklist-card"><div className="card-heading"><div><span className="section-kicker">6 de 8 completadas</span><h2>{labels.prestations} del plan</h2></div><StatusBadge tone="green">75% avance</StatusBadge></div>{[1,2,3,4,5,6,7,8].map(n=><button key={n} className={n<=6?'done':''}><span className="check-circle">{n<=6&&<Check size={14}/>}</span><div><b>Sesión {n} · Sesión individual</b><span>{n<=6?`${3+n} Ago · Completada`:`${17+(n-7)*7} Ago · Programada`}</span></div><strong>$35.000</strong><StatusBadge tone={n<=5?'green':n===6?'orange':'violet'}>{n<=5?'Pagado':n===6?'Pendiente':'Programada'}</StatusBadge></button>)}</section></main><aside><section className="card mini-finance"><h3>Resumen financiero</h3><p><span>Monto acordado</span><b>$280.000</b></p><p><span>Cobrado</span><b className="green-text">$210.000</b></p><p><span>Pendiente</span><b className="orange-text">$70.000</b></p><div className="progress"><i style={{width:'75%'}}/></div></section><section className="card info-card"><h3>Detalles del plan</h3><p><span>Inicio</span>03 Jun 2026</p><p><span>Término</span>28 Ago 2026</p><p><span>Cobro</span>Por sesión</p><p><span>Frecuencia</span>Semanal</p></section></aside></div></>
}

function PrestationsPage({ labels, onCreate }: { labels: typeof verticalLabels[Vertical]; onCreate:()=>void }) {
  return <><PageHeader title={labels.prestations} description={`Todo el trabajo concreto realizado o programado para tus ${labels.accounts.toLowerCase()}.`} action={`Nueva ${labels.prestation.toLowerCase()}`} onAction={onCreate}/><FilterBar tabs={['Esta semana','Hoy','Este mes','Pendientes','Realizadas','Canceladas']}/><div className="table-card card"><table><thead><tr><th>Fecha</th><th>{labels.account}</th><th>{labels.prestation}</th><th>Origen</th><th>Estado</th><th>Monto</th><th>Pago</th><th></th></tr></thead><tbody>{prestations.map((p,i)=><tr key={i}><td><b>{p.date}</b></td><td>{p.account}</td><td>{p.name}</td><td>{p.origin}</td><td><StatusBadge>{p.status}</StatusBadge></td><td className="number">{p.amount}</td><td><StatusBadge>{p.payment}</StatusBadge></td><td><MoreHorizontal size={17}/></td></tr>)}</tbody></table></div></>
}

function FilterBar({ tabs }: { tabs:string[] }) { const [active,setActive]=useState(tabs[0]); return <div className="toolbar card"><div className="tabs">{tabs.map(t=><button className={active===t?'active':''} onClick={()=>setActive(t)} key={t}>{t}</button>)}</div><div className="toolbar-actions"><button className="secondary-btn"><ListChecks size={16}/>Filtros</button><button className="secondary-btn"><Search size={16}/></button></div></div> }

function AgendaPage({ labels, onCreate }: { labels: typeof verticalLabels[Vertical]; onCreate:()=>void }) {
  const days=['Lun 17','Mar 18','Mié 19','Jue 20','Vie 21']; const hours=['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00']
  return <><PageHeader title="Agenda" description={`Revisa tus ${labels.prestations.toLowerCase()}, reuniones, tareas e hitos en un solo lugar.`} action="Nuevo" onAction={onCreate}/><div className="calendar-toolbar card"><div><button className="icon-btn"><ChevronLeft size={17}/></button><button className="icon-btn"><ChevronRight size={17}/></button><button className="secondary-btn">Hoy</button><h2>17–21 agosto 2026</h2></div><div className="tabs"><button>Día</button><button className="active">Semana</button><button>Mes</button></div></div><div className="calendar card"><div className="calendar-head"><span/><span className="today">Lun<b>17</b></span>{days.slice(1).map(d=><span key={d}>{d.split(' ')[0]}<b>{d.split(' ')[1]}</b></span>)}</div><div className="calendar-body"><div className="time-column">{hours.map(h=><span key={h}>{h}</span>)}</div>{days.map((d,di)=><div className="day-column" key={d}>{hours.map(h=><i key={h}/>) }{di===0&&<><button className="cal-event violet" style={{top:52,height:78}}><b>09:00</b><span>María Pérez</span><small>Sesión individual</small></button><button className="cal-event orange" style={{top:132,height:100}}><b>10:30</b><span>Carolina Díaz</span><small>Evaluación inicial</small></button><button className="cal-event blue" style={{top:258,height:52}}><b>12:00</b><span>Llamada Daniela</span></button><button className="cal-event violet" style={{top:442,height:78}}><b>15:00</b><span>Pedro González</span><small>Sesión individual</small></button></>}</div>)}</div></div></>
}

function ActivitiesPage({ labels, onCreate }: { labels: typeof verticalLabels[Vertical]; onCreate:()=>void }) { return <><PageHeader title="Actividades" description="Mantén al día seguimientos, tareas, llamadas y reuniones vinculadas a tu trabajo." action="Nueva actividad" onAction={onCreate}/><FilterBar tabs={['Pendientes','Hoy','Próximas','Completadas']}/><div className="activity-layout"><section className="card activity-list">{activities.map((a,i)=><div className="activity-row" key={i}><button className="todo-circle"><Check size={14}/></button><span className="activity-type"><Activity size={16}/></span><div><b>{a.title}</b><span>{a.relation}</span></div><time>{a.date}</time><StatusBadge>{a.status}</StatusBadge><MoreHorizontal size={17}/></div>)}</section><aside className="card activity-help"><span className="attention-icon violet"><Zap size={20}/></span><h3>Tu foco de hoy</h3><p>Completa 3 actividades para dejar al día a tus {labels.accounts.toLowerCase()} prioritarios.</p><div className="progress"><i style={{width:'40%'}}/></div><small>2 de 5 completadas</small></aside></div></> }

function PaymentsPage({ labels, onCreate }: { labels: typeof verticalLabels[Vertical]; onCreate:()=>void }) { return <><PageHeader title="Pagos" description={`Registra cobros y asígnalos a las ${labels.prestations.toLowerCase()} correspondientes.`} action="Registrar pago" onAction={onCreate}/><div className="metrics-grid three"><MetricCard label="Cobrado este mes" value="$3.420.000" meta="↗ 12% vs. mes anterior" icon={WalletCards} tone="green"/><MetricCard label="Pendiente" value="$420.000" meta="8 prestaciones con saldo" icon={Clock3} tone="orange"/><MetricCard label="Pagos registrados" value="87" meta="Durante agosto" icon={CreditCard} tone="blue"/></div><FilterBar tabs={['Todos','Pagados','Pendientes','Cancelados']}/><div className="table-card card"><table><thead><tr><th>Fecha</th><th>{labels.account}</th><th>Monto</th><th>Método</th><th>Estado</th><th>Asignación</th><th></th></tr></thead><tbody>{payments.map((p,i)=><tr key={i}><td>{p.date}</td><td><b>{p.account}</b></td><td className="number">{p.amount}</td><td>{p.method}</td><td><StatusBadge>{p.status}</StatusBadge></td><td>{p.allocations}</td><td><MoreHorizontal size={17}/></td></tr>)}</tbody></table></div></> }

function ServicesPage({ labels, onCreate }: { labels: typeof verticalLabels[Vertical]; onCreate:()=>void }) { return <><PageHeader title={labels.services} description={`Configura precios y duraciones sugeridas para crear ${labels.prestations.toLowerCase()} más rápido.`} action={`Crear ${labels.service.toLowerCase()}`} onAction={onCreate}/><div className="service-grid">{services.map((s,i)=><article className="service-card card" key={i}><div><span className="service-icon"><HeartPulse size={20}/></span><button className="icon-btn"><MoreHorizontal size={17}/></button></div><h3>{s.name}</h3><p>{s.description}</p><footer><span><Clock3 size={15}/>{s.duration}</span><b>{s.price}</b></footer></article>)}</div></> }

function SettingsPage({ vertical, setVertical }: { vertical:Vertical; setVertical:(v:Vertical)=>void }) { return <><PageHeader title="Configuración" description="Personaliza tu negocio, preferencias y la forma en que Hazento trabaja contigo."/><div className="settings-layout"><aside className="settings-nav card">{['Perfil','Negocio','Servicios','Preferencias'].map((x,i)=><button className={i===1?'active':''} key={x}>{x}</button>)}</aside><main className="card settings-card"><div><span className="section-kicker">Workspace</span><h2>Datos del negocio</h2><p>Esta información define la experiencia y las etiquetas de Hazento.</p></div><div className="form-grid"><label><span>Nombre del negocio</span><input defaultValue="Consulta Demo"/></label><label><span>País</span><select><option>Chile</option></select></label><label><span>Moneda</span><select><option>Peso chileno (CLP)</option></select></label><label><span>Zona horaria</span><select><option>America/Santiago</option></select></label></div><div className="vertical-setting"><h3>Tipo de profesional</h3><p>Cambia temporalmente la vertical para validar cómo se adapta la experiencia.</p><div>{([['health','Salud','Pacientes, tratamientos y atenciones'],['creative','Profesional creativo','Clientes, proyectos y entregables'],['creator','Creador de contenido','Marcas, partnerships y contenidos']] as const).map(v=><button className={vertical===v[0]?'active':''} onClick={()=>setVertical(v[0])} key={v[0]}><span>{v[0]==='health'?<HeartPulse/>:v[0]==='creative'?<BriefcaseBusiness/>:<Sparkles/>}</span><div><b>{v[1]}</b><small>{v[2]}</small></div>{vertical===v[0]&&<Check size={18}/>}</button>)}</div></div><footer><button className="primary-btn">Guardar cambios</button></footer></main></div></> }

function App() {
  const [page,setPage]=useState<Page>('dashboard'); const [vertical,setVertical]=useState<Vertical>('health'); const [collapsed,setCollapsed]=useState(false); const [createOpen,setCreateOpen]=useState(false); const [createType,setCreateType]=useState('Nueva atención'); const [createMenu,setCreateMenu]=useState(false); const [searchOpen,setSearchOpen]=useState(false); const [toast,setToast]=useState('')
  const labels=verticalLabels[vertical]
  const createOptions: Array<[string, React.ElementType]> = [[`Nuevo ${labels.account.toLowerCase()}`,UserRound],['Nueva oportunidad',Target],[`Nueva ${labels.prestation.toLowerCase()}`,CalendarDays],['Nueva actividad',ListChecks],['Registrar pago',CreditCard]]
  const searchResults: Array<[string, string, React.ElementType]> = [[labels.account,'María Pérez',UserRound],['Oportunidad','Evaluación y plan inicial',Target],[labels.engagement,'Tratamiento María Pérez',BriefcaseBusiness],[labels.prestation,'Sesión individual · 17 Ago',CalendarDays]]
  const nav=[
    ['dashboard','Inicio',LayoutDashboard],['accounts',labels.accounts,UsersRound],['opportunities','Oportunidades',Target],['agenda','Agenda',CalendarDays],['work','Trabajo',BriefcaseBusiness],['prestations',labels.prestations,FileCheck2],['activities','Actividades',ListChecks],['payments','Pagos',CreditCard],['services',labels.services,Grid2X2],['settings','Configuración',Settings],
  ] as const
  const title = useMemo(()=>nav.find(n=>n[0]===page)?.[1] || 'Hazento',[page,labels])
  const go=(p:Page)=>{setPage(p); window.scrollTo(0,0)}
  const openCreate=(type?:string)=>{setCreateType(type||`Nueva ${labels.prestation.toLowerCase()}`);setCreateOpen(true);setCreateMenu(false)}
  const done=()=>{setCreateOpen(false);setToast('Guardado correctamente');setTimeout(()=>setToast(''),2600)}
  return <div className={cls('app-shell',collapsed&&'sidebar-collapsed')}>
    <aside className="sidebar"><div className="brand"><span className="brand-mark">H</span>{!collapsed&&<b>Hazento</b>}<button onClick={()=>setCollapsed(!collapsed)}><Menu size={18}/></button></div><nav>{nav.map(([id,label,Icon])=><button title={label} className={page===id||(id==='accounts'&&page==='account')||(id==='opportunities'&&page==='opportunity')||(id==='work'&&page==='engagement')?'active':''} onClick={()=>go(id)} key={id}><Icon size={19}/>{!collapsed&&<span>{label}</span>}{!collapsed&&page===id&&<i/>}</button>)}</nav>{!collapsed&&<div className="sidebar-assistant"><span><Zap size={16}/>Hazento te ayuda</span><p>Tienes <b>5 pendientes</b> que necesitan atención hoy.</p><button onClick={()=>go('dashboard')}>Revisar ahora</button></div>}<button className="profile-mini"><span>FM</span>{!collapsed&&<div><b>Francisca Medina</b><small>Consulta Demo</small></div>}{!collapsed&&<ChevronDown size={15}/>}</button></aside>
    <div className="app-main"><header className="topbar"><button className="mobile-menu" onClick={()=>setCollapsed(!collapsed)}><Menu size={20}/></button><button className="global-search" onClick={()=>setSearchOpen(true)}><Search size={18}/><span>Buscar en Hazento...</span><kbd>⌘ K</kbd></button><div className="top-actions"><div className="workspace-name"><span className="workspace-dot">CD</span><div><small>Workspace</small><b>Consulta Demo</b></div><ChevronDown size={15}/></div><button className="icon-btn"><Bell size={18}/><i className="notification-dot"/></button><div className="create-wrap"><button className="primary-btn" onClick={()=>setCreateMenu(!createMenu)}><Plus size={18}/>Crear<ChevronDown size={14}/></button>{createMenu&&<div className="create-menu">{createOptions.map(([x,Icon])=><button onClick={()=>openCreate(x)} key={x}><Icon size={17}/>{x}</button>)}</div>}</div></div></header><main className="content" aria-label={String(title)}>
      {page==='dashboard'&&<Dashboard labels={labels} go={go}/>} {page==='accounts'&&<AccountsPage labels={labels} go={go} onCreate={()=>openCreate(`Nuevo ${labels.account.toLowerCase()}`)}/>} {page==='account'&&<AccountDetail labels={labels} go={go} onCreate={openCreate}/>} {page==='opportunities'&&<OpportunitiesPage go={go} onCreate={()=>openCreate('Nueva oportunidad')}/>} {page==='opportunity'&&<OpportunityDetail labels={labels} go={go}/>} {page==='agenda'&&<AgendaPage labels={labels} onCreate={()=>openCreate(`Nueva ${labels.prestation.toLowerCase()}`)}/>} {page==='work'&&<WorkPage labels={labels} go={go} onCreate={()=>openCreate(`Nuevo ${labels.engagement.toLowerCase()}`)}/>} {page==='engagement'&&<EngagementDetail labels={labels} go={go}/>} {page==='prestations'&&<PrestationsPage labels={labels} onCreate={()=>openCreate(`Nueva ${labels.prestation.toLowerCase()}`)}/>} {page==='activities'&&<ActivitiesPage labels={labels} onCreate={()=>openCreate('Nueva actividad')}/>} {page==='payments'&&<PaymentsPage labels={labels} onCreate={()=>openCreate('Registrar pago')}/>} {page==='services'&&<ServicesPage labels={labels} onCreate={()=>openCreate(`Crear ${labels.service.toLowerCase()}`)}/>} {page==='settings'&&<SettingsPage vertical={vertical} setVertical={setVertical}/>} 
    </main></div>
    {createOpen&&<Modal title={createType} subtitle="Completa los datos principales. Podrás agregar más detalle después." onClose={()=>setCreateOpen(false)} wide={createType==='Registrar pago'}><CreateForm type={createType} labels={labels} onDone={done}/></Modal>}
    {searchOpen&&<Modal title="Buscar en Hazento" onClose={()=>setSearchOpen(false)}><label className="palette-search"><Search size={20}/><input autoFocus placeholder="Busca cuentas, oportunidades o trabajo..."/></label><div className="search-results"><span>Resultados sugeridos</span>{searchResults.map(([kind,name,Icon])=><button onClick={()=>{setSearchOpen(false);go(kind===labels.account?'account':kind==='Oportunidad'?'opportunity':kind===labels.engagement?'engagement':'prestations')}} key={name}><span className="result-icon"><Icon size={17}/></span><div><b>{name}</b><small>{kind}</small></div><ChevronRight size={16}/></button>)}</div></Modal>}
    {toast&&<div className="toast"><span><Check size={15}/></span>{toast}</div>}
  </div>
}

export default App
