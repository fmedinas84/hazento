import { useMemo, useState } from 'react'
import { Check, FileText, Link2, Plus, ReceiptText, X } from 'lucide-react'
import type { PaymentRequestItemData, Vertical } from './data'
import { verticalLabels } from './data'
import { formatMoney, parseMoney, useRepositories } from './repositories'

type Labels = typeof verticalLabels[Vertical]

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal modal-wide" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}><header><h2>{title}</h2><button className="icon-btn" aria-label="Cerrar" onClick={onClose}><X size={18}/></button></header>{children}</section></div>
}

export function PaymentRequestCreateDialog({ labels, accountId, prestationId, engagementId, onClose }: { labels: Labels; accountId: number; prestationId?: number; engagementId?: number; onClose: () => void }) {
  const repository = useRepositories()
  const account = repository.accounts.find(item => item.id === accountId)
  const prestation = repository.prestations.find(item => item.id === prestationId)
  const engagement = repository.engagements.find(item => item.id === engagementId)
  const contextualPrestations = engagementId ? repository.prestations.filter(item => item.engagementId === engagementId) : prestation ? [prestation] : []
  const [selected, setSelected] = useState<number[]>(prestationId ? [prestationId] : contextualPrestations.map(item => item.id))
  const suggested = selected.reduce((sum, id) => sum + parseMoney(repository.prestations.find(item => item.id === id)?.amount || '$0'), 0) || parseMoney(engagement?.amount || '$0')
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    const amount = parseMoney(String(values.amount || '$0'))
    const items: Array<Omit<PaymentRequestItemData, 'id' | 'paymentRequestId'>> = selected.map(id => { const item = repository.prestations.find(record => record.id === id)!; return { prestationId: id, description: item.name, amount: parseMoney(item.amount) } })
    if (!items.length && engagement) items.push({ engagementId: engagement.id, description: engagement.name, amount })
    repository.paymentRequestRepository.create({ workspaceId: account?.workspaceId || 1, accountId, originPrestationId: prestationId, originEngagementId: engagementId, amount, dueDate: String(values.dueDate || '') || undefined, note: String(values.note || '').trim() || undefined }, items)
    onClose()
  }
  return <Dialog title="Generar solicitud de pago" onClose={onClose}><form onSubmit={submit}><div className="request-context"><span>Persona</span><b>{account?.name}</b>{engagement && <small>{labels.engagement}: {engagement.name}</small>}{prestation && <small>{labels.prestation}: {prestation.name}</small>}</div>{contextualPrestations.length > 1 && <fieldset className="request-concepts"><legend>Conceptos incluidos</legend>{contextualPrestations.map(item => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => setSelected(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])}/><span><b>{item.name}</b><small>{item.date}</small></span><strong>{item.amount}</strong></label>)}</fieldset>}<div className="form-grid"><label><span>Monto solicitado *</span><input name="amount" required defaultValue={formatMoney(suggested)} inputMode="numeric"/></label><label><span>Vencimiento opcional</span><input name="dueDate" type="date"/></label><label className="form-span"><span>Nota opcional</span><textarea name="note" rows={3}/></label></div><footer className="modal-actions"><button type="button" className="ghost-btn" onClick={onClose}>Cancelar</button><button className="primary-btn">Generar solicitud</button></footer></form></Dialog>
}

export function PaymentRequestDetailDialog({ requestId, onClose }: { requestId: number; onClose: () => void }) {
  const repository = useRepositories()
  const request = repository.paymentRequests.find(item => item.id === requestId)
  const summary = repository.paymentRequestRepository.summary(requestId)
  const account = repository.accounts.find(item => item.id === request?.accountId)
  const items = repository.paymentRequestRepository.items.filter(item => item.paymentRequestId === requestId)
  const [settling, setSettling] = useState(false)
  const [kind, setKind] = useState<'total' | 'partial'>('total')
  const [difference, setDifference] = useState<'transfer' | 'waive'>('transfer')
  const [error, setError] = useState('')
  if (!request || !summary) return null
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    try { repository.paymentRequestRepository.settle(request.id, kind === 'total' ? summary.outstanding : parseMoney(String(values.amount)), String(values.method), kind === 'partial' ? difference : undefined, difference === 'waive' ? String(values.reason || '') : undefined); setSettling(false) } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos registrar el pago.') }
  }
  return <Dialog title={`Solicitud de pago #${request.id}`} onClose={onClose}><div className="request-detail-header"><div><span>{account?.name}</span><b>{formatMoney(request.amount)}</b><small>{request.status}</small></div><div className="request-summary"><p><span>Solicitado</span><b>{formatMoney(summary.requested)}</b></p><p><span>Pagado</span><b>{formatMoney(summary.paid)}</b></p><p><span>Condonado</span><b>{formatMoney(summary.waived)}</b></p><p><span>Saldo</span><b>{formatMoney(summary.outstanding)}</b></p></div></div><section className="request-items"><h3>Conceptos</h3>{items.map(item => <div key={item.id}><FileText size={15}/><span><b>{item.description}</b><small>{item.prestationId ? 'Unidad de trabajo' : 'Trabajo agrupado'}</small></span><strong>{formatMoney(item.amount)}</strong></div>)}</section>{request.parentRequestId && <p className="request-trace">Saldo originado desde la solicitud #{request.parentRequestId}</p>}{request.waiverReason && <p className="request-trace">Diferencia condonada: {request.waiverReason}</p>}<div className="future-request-actions"><button disabled title="Próximamente"><Link2 size={16}/>Generar link de pago <small>Próximamente</small></button><button disabled title="Próximamente"><ReceiptText size={16}/>Generar boleta <small>Próximamente</small></button></div>{request.status === 'Pendiente' && !settling && <div className="modal-actions"><button className="ghost-btn" onClick={() => repository.paymentRequestRepository.cancel(request.id)}>Cancelar solicitud</button><button className="primary-btn" onClick={() => setSettling(true)}><Check size={16}/>Marcar como pagada</button></div>}{settling && <form onSubmit={submit} className="settle-request"><div className="choice-inline"><button type="button" className={kind === 'total' ? 'active' : ''} onClick={() => setKind('total')}>Pago total</button><button type="button" className={kind === 'partial' ? 'active' : ''} onClick={() => setKind('partial')}>Pago parcial</button></div><div className="form-grid"><label><span>Método</span><select name="method"><option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option></select></label>{kind === 'partial' && <><label><span>Monto recibido *</span><input name="amount" required inputMode="numeric" placeholder={formatMoney(Math.max(1, summary.outstanding - 1))}/></label><label className="form-span"><span>Diferencia</span><select value={difference} onChange={event => setDifference(event.target.value as typeof difference)}><option value="transfer">Generar una nueva solicitud de pago</option><option value="waive">Condonar la diferencia</option></select></label>{difference === 'waive' && <label className="form-span"><span>Motivo *</span><textarea name="reason" required rows={2}/></label>}</>}</div>{error && <p className="form-error">{error}</p>}<footer className="modal-actions"><button type="button" className="ghost-btn" onClick={() => setSettling(false)}>Volver</button><button className="primary-btn">Registrar pago real</button></footer></form>}</Dialog>
}

export function PaymentRequestsList({ onOpen }: { onOpen: (id: number) => void }) {
  const repository = useRepositories()
  const rows = useMemo(() => repository.paymentRequests.map(request => ({ request, summary: repository.paymentRequestRepository.summary(request.id), account: repository.accounts.find(item => item.id === request.accountId) })), [repository])
  return rows.length ? <div className="table-card card"><table><thead><tr><th>Persona</th><th>Solicitud</th><th>Estado</th><th>Pagado</th><th>Saldo</th><th/></tr></thead><tbody>{rows.map(({ request, summary, account }) => <tr className="clickable-row" key={request.id} onClick={() => onOpen(request.id)}><td><b>{account?.name}</b></td><td>{formatMoney(request.amount)}</td><td><span className="badge">{request.status}</span></td><td>{formatMoney(summary?.paid || 0)}</td><td>{formatMoney(summary?.outstanding || 0)}</td><td><Plus size={15}/></td></tr>)}</tbody></table></div> : <div className="empty-state card"><h3>No hay solicitudes de pago</h3><p>Se crean explícitamente desde una atención, entregable, proyecto, tratamiento, partnership o plan.</p></div>
}
