import { useMemo, useState } from 'react'
import { Ban, Check, FileText, Link2, Plus, ReceiptText, X } from 'lucide-react'
import type { PaymentRequestItemData, Vertical } from './data'
import { verticalLabels } from './data'
import { formatMoney, parseMoney, useRepositories } from './repositories'

type Labels = typeof verticalLabels[Vertical]

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal modal-wide" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}><header><h2>{title}</h2><button className="icon-btn" aria-label="Cerrar" onClick={onClose}><X size={18}/></button></header>{children}</section></div>
}

export function PaymentRequestCreateDialog({ labels, accountId, prestationId, engagementId, onClose }: { labels: Labels; accountId: string; prestationId?: string; engagementId?: string; onClose: () => void }) {
  const repository = useRepositories()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const account = repository.accounts.find(item => item.id === accountId)
  const prestation = repository.prestations.find(item => item.id === prestationId)
  const engagement = repository.engagements.find(item => item.id === engagementId)
  const suggested = parseMoney(prestation?.amount || engagement?.amount || '$0')
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    const amount = parseMoney(String(values.amount || '$0'))
    const items: Array<Omit<PaymentRequestItemData, 'id' | 'paymentRequestId'>> = prestation
      ? [{ prestationId: prestation.id, description: prestation.name, amount }]
      : engagement ? [{ engagementId: engagement.id, description: engagement.name, amount }] : []
    setSaving(true); setError('')
    try { await repository.paymentRequestRepository.create({ workspaceId: account?.workspaceId || 'workspace-demo-001', accountId, originPrestationId: prestationId, originEngagementId: engagementId, amount, dueDate: String(values.dueDate || '') || undefined, note: String(values.note || '').trim() || undefined }, items); onClose() }
    catch { setError('No pudimos generar la solicitud. Revisa los datos e inténtalo nuevamente.') }
    finally { setSaving(false) }
  }
  return <Dialog title="Generar solicitud de pago" onClose={onClose}><form onSubmit={submit}><div className="request-context"><span>Persona</span><b>{account?.name}</b>{engagement && <small>{labels.engagement}: {engagement.name}</small>}{prestation && <small>{labels.prestation}: {prestation.name}</small>}</div><div className="form-grid"><label><span>Monto solicitado *</span><input name="amount" required defaultValue={formatMoney(suggested)} inputMode="numeric"/></label><label><span>Vencimiento opcional</span><input name="dueDate" type="date"/></label><label className="form-span"><span>Nota opcional</span><textarea name="note" rows={3}/></label></div>{error && <p className="form-error">{error}</p>}<footer className="modal-actions"><button type="button" className="ghost-btn" disabled={saving} onClick={onClose}>Cancelar</button><button className="primary-btn" disabled={saving}>{saving ? 'Guardando...' : 'Generar solicitud'}</button></footer></form></Dialog>
}

export function PaymentReceivedDetailDialog({ paymentId, onClose }: { paymentId: string; onClose: () => void }) {
  const repository = useRepositories()
  const payment = repository.payments.find(item => item.id === paymentId)
  const [voiding, setVoiding] = useState(false)
  const [error, setError] = useState('')
  if (!payment) return null
  const submitVoid = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const reason = String(new FormData(event.currentTarget).get('reason') || '')
    try { await repository.voidPayment(payment.id, reason); setVoiding(false) } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos anular el pago.') }
  }
  return <Dialog title={`Pago recibido #${payment.id}`} onClose={onClose}><div className="request-detail-header"><div><span>{payment.account}</span><b>{payment.amount}</b><small>{payment.status}</small></div><div className="request-summary payment-summary"><p><span>Fecha</span><b>{payment.date}</b></p><p><span>Método</span><b>{payment.method}</b></p></div></div>{payment.status === 'Anulado' && <div className="request-trace"><b>Pago anulado</b><br/>{payment.voidReason}<br/><small>{payment.voidedAt ? new Date(payment.voidedAt).toLocaleString('es-CL') : ''} · {payment.voidedBy}</small></div>}<div className="future-request-actions"><button disabled title="Próximamente"><ReceiptText size={16}/>Generar boleta <small>Próximamente</small></button></div>{payment.status === 'Pagado' && !voiding && <div className="modal-actions"><button className="danger-btn" onClick={() => setVoiding(true)}><Ban size={16}/>Anular pago</button><button className="primary-btn" onClick={onClose}>Listo</button></div>}{payment.status === 'Anulado' && <footer className="modal-actions"><button className="primary-btn" onClick={onClose}>Listo</button></footer>}{voiding && <form onSubmit={submitVoid} className="settle-request"><p>El pago seguirá visible, pero dejará de contabilizarse y se restaurará el saldo de la solicitud.</p><label><span>Motivo de anulación *</span><textarea name="reason" required rows={3} autoFocus/></label>{error && <p className="form-error">{error}</p>}<footer className="modal-actions"><button type="button" className="ghost-btn" onClick={() => setVoiding(false)}>Volver</button><button className="danger-btn">Confirmar anulación</button></footer></form>}</Dialog>
}

export function PaymentRequestDetailDialog({ requestId, onClose }: { requestId: string; onClose: () => void }) {
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
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    try { await repository.paymentRequestRepository.settle(request.id, kind === 'total' ? summary.outstanding : parseMoney(String(values.amount)), String(values.method), kind === 'partial' ? difference : undefined, difference === 'waive' ? String(values.reason || '') : undefined); setSettling(false) } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos registrar el pago.') }
  }
  return <Dialog title={`Solicitud de pago #${request.id}`} onClose={onClose}><div className="request-detail-header"><div><span>{account?.name}</span><b>{formatMoney(request.amount)}</b><small>{request.status}</small>{request.status === 'Pendiente' && !settling && <button className="request-cancel" onClick={async () => { if (window.confirm('¿Seguro que deseas eliminar la solicitud?')) await repository.paymentRequestRepository.cancel(request.id) }}>Eliminar solicitud</button>}</div><div className={`request-summary${summary.waived > 0 ? ' has-waiver' : ''}`}><p><span>Solicitado</span><b>{formatMoney(summary.requested)}</b></p><p><span>Pagado</span><b>{formatMoney(summary.paid)}</b></p>{summary.waived > 0 && <p><span>Condonado</span><b>{formatMoney(summary.waived)}</b></p>}{summary.transferredAmount > 0 && <p><span>Trasladado</span><b>{formatMoney(summary.transferredAmount)}</b></p>}<p><span>Saldo exigible</span><b>{formatMoney(summary.collectibleOutstanding)}</b></p></div></div><section className="request-items"><h3>Conceptos</h3>{items.map(item => <div key={item.id}><FileText size={15}/><span><b>{item.description}</b><small>{item.prestationId ? 'Unidad de trabajo' : 'Trabajo agrupado'}</small></span><strong>{formatMoney(item.amount)}</strong></div>)}</section>{request.parentRequestId && <p className="request-trace">Saldo originado desde la solicitud #{request.parentRequestId}</p>}{summary.transferredAmount > 0 && <p className="request-trace"><b>{formatMoney(summary.transferredAmount)} trasladados</b><br/>El saldo exigible continúa únicamente en la nueva solicitud relacionada.</p>}{request.waiverReason && <p className="request-trace">Diferencia condonada: {request.waiverReason}</p>}<div className="future-request-actions"><button disabled title="Próximamente"><Link2 size={16}/>Generar link de pago <small>Próximamente</small></button><button disabled title="Próximamente"><ReceiptText size={16}/>Generar boleta <small>Próximamente</small></button></div>{request.status === 'Pendiente' && !settling && <div className="modal-actions"><button className="primary-btn" onClick={() => setSettling(true)}><Check size={16}/>Marcar como pagada</button></div>}{settling && <form onSubmit={submit} className="settle-request"><div className="choice-inline"><button type="button" className={kind === 'total' ? 'active' : ''} onClick={() => setKind('total')}>Pago total</button><button type="button" className={kind === 'partial' ? 'active' : ''} onClick={() => setKind('partial')}>Pago parcial</button></div><div className="form-grid"><label><span>Método</span><select name="method"><option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option></select></label>{kind === 'partial' && <><label><span>Monto recibido *</span><input name="amount" required inputMode="numeric" placeholder={formatMoney(Math.max(1, summary.outstanding - 1))}/></label><label className="form-span"><span>Diferencia</span><select value={difference} onChange={event => setDifference(event.target.value as typeof difference)}><option value="transfer">Generar una nueva solicitud de pago</option><option value="waive">Condonar la diferencia</option></select></label>{difference === 'waive' && <label className="form-span"><span>Motivo *</span><textarea name="reason" required rows={2}/></label>}</>}</div>{error && <p className="form-error">{error}</p>}<footer className="modal-actions"><button type="button" className="ghost-btn" onClick={() => setSettling(false)}>Volver</button><button className="primary-btn">Registrar pago real</button></footer></form>}</Dialog>
}

export function PaymentRequestsList({ onOpen }: { onOpen: (id: string) => void }) {
  const repository = useRepositories()
  const rows = useMemo(() => repository.paymentRequests.map(request => ({ request, summary: repository.paymentRequestRepository.summary(request.id), account: repository.accounts.find(item => item.id === request.accountId) })), [repository])
  return rows.length ? <div className="table-card card"><table><thead><tr><th>Persona</th><th>Solicitud</th><th>Estado</th><th>Pagado</th><th>Saldo exigible</th><th/></tr></thead><tbody>{rows.map(({ request, summary, account }) => <tr key={request.id}><td><button className="table-link" onClick={() => onOpen(request.id)}>{account?.name}</button></td><td>{formatMoney(request.amount)}</td><td><span className="badge">{request.status}</span>{summary?.transferredAmount ? <small className="table-note">{formatMoney(summary.transferredAmount)} trasladados</small> : null}</td><td>{formatMoney(summary?.paid || 0)}</td><td>{formatMoney(summary?.collectibleOutstanding || 0)}</td><td><button className="icon-row-action" aria-label={`Abrir solicitud ${request.id}`} onClick={() => onOpen(request.id)}><Plus size={15}/></button></td></tr>)}</tbody></table></div> : <div className="empty-state card"><h3>No hay solicitudes de pago</h3><p>Se crean explícitamente desde una atención, entregable, proyecto, tratamiento, partnership o plan.</p></div>
}
