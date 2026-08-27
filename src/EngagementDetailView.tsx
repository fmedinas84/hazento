import { useState } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Pencil, Plus, X } from 'lucide-react'
import type { Vertical } from './data'
import { verticalLabels } from './data'
import { parsePlanningDate } from './planning'
import { formatMoney, useRepositories } from './repositories'
import { completedWord } from './verticalText'
import { PaymentRequestCreateDialog, PaymentRequestDetailDialog } from './PaymentRequests'

type Labels = typeof verticalLabels[Vertical]
type Page = 'work' | 'account' | 'agenda' | 'prestations'
type Navigate = (page: Page, query?: Record<string, string>) => void
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Santiago' }).format(new Date(parsePlanningDate(value))).replace('.', '') : 'Sin definir'
function Badge({ children }: { children: React.ReactNode }) { return <span className={`badge badge-${String(children).toLowerCase().replaceAll(' ', '-')}`}>{children}</span> }
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}><header><h2>{title}</h2><button className="icon-btn" aria-label="Cerrar" onClick={onClose}><X size={18}/></button></header>{children}</section></div> }

export function EngagementDetailView({ labels, go, onCreate }: { labels: Labels; go: Navigate; onCreate: (type?: string, accountId?: string, engagementId?: string) => void }) {
  const repositories = useRepositories()
  const [editing, setEditing] = useState(false)
  const [requestingPayment, setRequestingPayment] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const id = new URLSearchParams(window.location.search).get('id') || repositories.engagements[0]?.id
  const engagement = repositories.engagements.find(record => record.id === id)
  if (!engagement) return <div className="planning-empty card"><Clock3 size={22}/><h3>Sin {labels.engagements.toLowerCase()}</h3><button className="secondary-btn" onClick={() => go('work')}>Volver</button></div>
  const related = repositories.prestations.filter(record => record.engagementId === engagement.id)
  const person = repositories.accounts.find(record => record.id === engagement.accountId)
  const organization = repositories.organizations.find(record => record.id === person?.organizationId)
  const completed = related.filter(record => record.status === 'Completada').length
  const progress = related.length ? Math.round(completed / related.length * 100) : 0
  const milestones = related.slice().sort((left, right) => parsePlanningDate(left.date) - parsePlanningDate(right.date))
  const requests = repositories.paymentRequestRepository.forEngagement(engagement.id)
  const totals = requests.reduce((result, request) => { const summary = repositories.paymentRequestRepository.summary(request.id); return { requested: result.requested + request.amount, paid: result.paid + (summary?.paid || 0), outstanding: result.outstanding + (summary?.outstanding || 0) } }, { requested: 0, paid: 0, outstanding: 0 })
  const save = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); await repositories.updateEngagement(engagement.id, { name: String(values.name || engagement.name).trim(), amount: String(values.amount || engagement.amount).trim(), status: String(values.status || engagement.status), startDate: String(values.startDate || '') || undefined, endDate: String(values.endDate || '') || undefined }); setEditing(false) }
  return <>
    <button className="back-btn" onClick={() => go('work')}><ChevronLeft size={17}/>Volver a {labels.engagements.toLowerCase()}</button>
    <section className="detail-hero card"><div><span className="section-kicker">{labels.engagement} · {engagement.status}</span><h1>{engagement.name}</h1><button className="account-name-link" onClick={() => engagement.accountId && go('account', { id: engagement.accountId })}>{engagement.account}</button>{organization && <small className="engagement-organization">{labels.organization}: {organization.name}{person?.role ? ` · ${person.role}` : ''}</small>}</div><div className="hero-actions"><button className="secondary-btn" onClick={() => setRequestingPayment(true)}>Generar solicitud de pago</button><button className="secondary-btn" onClick={() => setEditing(true)}><Pencil size={15}/>Editar {labels.engagement.toLowerCase()}</button><button className="primary-btn" onClick={() => onCreate(labels.createPrestation, engagement.accountId, engagement.id)}><Plus size={16}/>{labels.createPrestation}</button></div></section>
    {requests.length > 0 && <section className="payment-request-origin card"><div><span className="section-kicker">Solicitudes de pago</span><h3>{requests.length} {requests.length === 1 ? 'solicitud' : 'solicitudes'}</h3></div><p><span>Solicitado</span><b>{formatMoney(totals.requested)}</b></p><p><span>Pagado</span><b>{formatMoney(totals.paid)}</b></p><p><span>Saldo</span><b>{formatMoney(totals.outstanding)}</b></p><button className="secondary-btn" onClick={() => setSelectedRequest(requests[0].id)}>Ver detalle</button></section>}
    <section className="engagement-planning card"><div className="card-heading"><div><span className="section-kicker">Planificación</span><h2>{engagement.startDate || engagement.endDate ? `${formatDate(engagement.startDate)} → ${formatDate(engagement.endDate)}` : 'Sin período definido'}</h2></div>{labels.timelineEnabled && <button className="secondary-btn" onClick={() => go('agenda', { view: 'timeline', engagement: engagement.id })}><CalendarDays size={16}/>Ver en Cronograma</button>}</div><div className="engagement-progress"><span><b>{completed} de {related.length}</b> {labels.prestations.toLowerCase()} {completedWord(labels.prestation)}</span><strong>{progress}%</strong></div><div className="progress"><i style={{ width: `${progress}%` }}/></div><div className="engagement-milestones"><h3>Próximos hitos</h3>{milestones.length ? milestones.slice(0, 5).map(record => <button key={record.id} onClick={() => go('prestations', { id: record.id })}><span className={record.status === 'Completada' ? 'done' : ''}>{record.status === 'Completada' ? <Check size={13}/> : '◆'}</span><div><b>{record.name}</b><small>{record.date}</small></div><Badge>{record.status}</Badge><ChevronRight size={15}/></button>) : <p>Sin {labels.prestations.toLowerCase()} asociadas.</p>}</div></section>
    {requestingPayment && engagement.accountId && <PaymentRequestCreateDialog labels={labels} accountId={engagement.accountId} engagementId={engagement.id} onClose={() => setRequestingPayment(false)}/>}
    {selectedRequest && <PaymentRequestDetailDialog requestId={selectedRequest} onClose={() => setSelectedRequest(null)}/>}
    {editing && <Dialog title={`Editar ${labels.engagement.toLowerCase()}`} onClose={() => setEditing(false)}><form onSubmit={save}><div className="form-grid"><label className="form-span"><span>Nombre *</span><input name="name" required autoFocus defaultValue={engagement.name}/></label><label><span>Monto acordado</span><input name="amount" defaultValue={engagement.amount}/></label><label><span>Estado</span><select name="status" defaultValue={engagement.status}><option>Activo</option><option>Completado</option><option>Cancelado</option></select></label><label><span>Fecha de inicio</span><input name="startDate" type="date" defaultValue={engagement.startDate}/></label><label><span>Fecha de término</span><input name="endDate" type="date" defaultValue={engagement.endDate}/></label></div><footer className="modal-actions"><button type="button" className="ghost-btn" onClick={() => setEditing(false)}>Cancelar</button><button className="primary-btn">Guardar cambios</button></footer></form></Dialog>}
  </>
}
