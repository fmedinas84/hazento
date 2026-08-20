import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Plus } from 'lucide-react'
import type { Vertical } from './data'
import { verticalLabels } from './data'
import { parsePlanningDate } from './planning'
import { useRepositories } from './repositories'

type Labels = typeof verticalLabels[Vertical]
type Page = 'work' | 'account' | 'agenda' | 'prestations'
type Navigate = (page: Page, query?: Record<string, string | number>) => void

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Santiago' }).format(new Date(parsePlanningDate(value))).replace('.', '') : 'Sin definir'

function Badge({ children }: { children: React.ReactNode }) {
  return <span className={`badge badge-${String(children).toLowerCase().replaceAll(' ', '-')}`}>{children}</span>
}

export function EngagementDetailView({ labels, go, onCreate }: { labels: Labels; go: Navigate; onCreate: (type?: string, accountId?: number, engagementId?: number) => void }) {
  const repositories = useRepositories()
  const id = Number(new URLSearchParams(window.location.search).get('id')) || repositories.engagements[0]?.id
  const engagement = repositories.engagements.find(record => record.id === id)
  if (!engagement) return <div className="planning-empty card"><Clock3 size={22}/><h3>Sin {labels.engagements.toLowerCase()}</h3><button className="secondary-btn" onClick={() => go('work')}>Volver</button></div>
  const related = repositories.prestations.filter(record => record.engagementId === engagement.id)
  const person = repositories.accounts.find(record => record.id === engagement.accountId)
  const organization = repositories.organizations.find(record => record.id === person?.organizationId)
  const completed = related.filter(record => record.status === 'Completada').length
  const progress = related.length ? Math.round(completed / related.length * 100) : 0
  const milestones = related.slice().sort((left, right) => parsePlanningDate(left.date) - parsePlanningDate(right.date))
  return <><button className="back-btn" onClick={() => go('work')}><ChevronLeft size={17}/>Volver a {labels.engagements.toLowerCase()}</button><section className="detail-hero card"><div><span className="section-kicker">{labels.engagement} · {engagement.status}</span><h1>{engagement.name}</h1><button className="account-name-link" onClick={() => engagement.accountId && go('account', { id: engagement.accountId })}>{engagement.account}</button>{organization && <small className="engagement-organization">{labels.organization}: {organization.name}{person?.role ? ` · ${person.role}` : ''}</small>}</div><div className="hero-actions"><button className="primary-btn" onClick={() => onCreate(labels.createPrestation, engagement.accountId, engagement.id)}><Plus size={16}/>{labels.createPrestation}</button></div></section><section className="engagement-planning card"><div className="card-heading"><div><span className="section-kicker">Planificación</span><h2>{engagement.startDate || engagement.endDate ? `${formatDate(engagement.startDate)} → ${formatDate(engagement.endDate)}` : 'Sin período definido'}</h2></div>{labels.timelineEnabled && <button className="secondary-btn" onClick={() => go('agenda', { view: 'timeline', engagement: engagement.id })}><CalendarDays size={16}/>Ver en Cronograma</button>}</div><div className="engagement-progress"><span><b>{completed} de {related.length}</b> {labels.prestations.toLowerCase()} completadas</span><strong>{progress}%</strong></div><div className="progress"><i style={{ width: `${progress}%` }}/></div><div className="engagement-milestones"><h3>Próximos hitos</h3>{milestones.length ? milestones.slice(0, 5).map(record => <button key={record.id} onClick={() => go('prestations', { id: record.id })}><span className={record.status === 'Completada' ? 'done' : ''}>{record.status === 'Completada' ? <Check size={13}/> : '◆'}</span><div><b>{record.name}</b><small>{record.date}</small></div><Badge>{record.status}</Badge><ChevronRight size={15}/></button>) : <p>Sin {labels.prestations.toLowerCase()} asociadas.</p>}</div></section></>
}
