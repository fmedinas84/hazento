import { useState } from 'react'
import { FileText, Plus, ReceiptText, Trash2, X } from 'lucide-react'
import { formatMoney, parseMoney, useRepositories } from './repositories'

const statusTone = (status: string) => status === 'Pagada' ? 'badge-green' : status === 'Cerrada con ajuste' ? 'badge-blue' : status === 'Parcialmente pagada' ? 'badge-orange' : status === 'Anulada' ? 'badge-red' : ''

export function DocumentsPage() {
  const repository = useRepositories()
  const [selectedId, setSelectedId] = useState<number | null>(repository.documents[0]?.id || null)
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [error, setError] = useState('')
  const selected = repository.documents.find(item => item.id === selectedId)
  const summary = selected ? repository.documentRepository.summary(selected.id) : undefined
  const person = repository.accounts.find(item => item.id === selected?.accountId)
  const allocations = repository.documentPaymentAllocations.filter(item => item.documentId === selectedId)
  const adjustments = repository.documentAdjustments.filter(item => item.documentId === selectedId)

  const saveAdjustment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    const amount = parseMoney(String(values.amount || ''))
    if (!window.confirm(`Registrar ${String(values.type).toLowerCase()} por ${formatMoney(amount)}? Este monto no se contabilizará como dinero recibido.`)) return
    try {
      repository.documentRepository.addAdjustment({ documentId: selected.id, amount, type: String(values.type) as 'Descuento' | 'Saldo condonado', reason: String(values.reason || ''), date: String(values.date || ''), recordedBy: 'Francisca Medina' })
      setError(''); setShowAdjustment(false)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar el ajuste.') }
  }

  return <><div className="page-header"><div><span className="eyebrow">Cobranza</span><h1>Boletas</h1><p>Separa el estado tributario del estado de cobro y controla pagos parciales.</p></div></div>
    <div className="documents-layout"><section className="table-card card"><table><thead><tr><th>Boleta</th><th>Persona</th><th>Total</th><th>Pagado</th><th>Pendiente</th><th>Cobro</th><th>Tributario</th></tr></thead><tbody>{repository.documents.map(document => { const item=repository.documentRepository.summary(document.id); const account=repository.accounts.find(record=>record.id===document.accountId); return <tr key={document.id} onClick={()=>setSelectedId(document.id)}><td><b>{document.number || 'Borrador'}</b><small>{document.date}</small></td><td>{account?.name}</td><td>{formatMoney(document.totalAmount)}</td><td>{formatMoney(item?.paid || 0)}</td><td>{formatMoney(item?.outstanding || 0)}</td><td><span className={`badge ${statusTone(item?.status || '')}`}>{item?.status}</span></td><td><span className="badge">{document.taxStatus}</span></td></tr>})}</tbody></table></section>
    {selected && summary && <aside className="card document-detail"><header><div><span className="section-kicker">Ficha de boleta</span><h2>{selected.number || 'Boleta en borrador'}</h2><p>{person?.name} · {selected.date}</p></div><button className="icon-row-action" aria-label="Cerrar ficha" onClick={()=>setSelectedId(null)}><X size={16}/></button></header><div className="document-totals"><p><span>Total</span><b>{formatMoney(summary.total)}</b></p><p><span>Pagado</span><b className="green-text">{formatMoney(summary.paid)}</b></p><p><span>Ajustado</span><b>{formatMoney(summary.adjusted)}</b></p><p><span>Pendiente</span><b>{formatMoney(summary.outstanding)}</b></p></div><div className="document-status"><span className={`badge ${statusTone(summary.status)}`}>{summary.status}</span><span className="badge">{selected.taxStatus}</span></div>{selected.taxStatus === 'Emitida' && <p className="tax-warning">El monto tributario emitido se conserva. Cualquier corrección queda pendiente de anular esta boleta y emitir una nueva.</p>}<section><h3>Pagos asociados</h3>{allocations.length ? allocations.map(allocation=>{const payment=repository.payments.find(item=>item.id===allocation.paymentId);return <div className="document-related" key={allocation.id}><ReceiptText size={16}/><span><b>{payment?.date} · {payment?.method}</b><small>{formatMoney(allocation.amount)}</small></span><button aria-label="Eliminar asignación" onClick={()=>repository.documentRepository.deleteAllocation(allocation.id)}><Trash2 size={15}/></button></div>}) : <p className="form-empty">Sin pagos asignados.</p>}</section><section><h3>Ajustes</h3>{adjustments.map(adjustment=><div className="document-related" key={adjustment.id}><FileText size={16}/><span><b>{adjustment.type} · {formatMoney(adjustment.amount)}</b><small>{adjustment.reason} · {adjustment.recordedBy}{adjustment.taxCorrectionStatus==='Pendiente'?' · Corrección tributaria pendiente':''}</small></span></div>)}<button className="secondary-btn" onClick={()=>setShowAdjustment(true)}><Plus size={15}/>Registrar descuento o ajuste</button></section></aside>}</div>
    {showAdjustment && selected && <div className="modal-backdrop"><section className="modal"><header><div><h2>Registrar descuento o ajuste</h2><p>No se contabilizará como dinero recibido.</p></div><button className="icon-btn" onClick={()=>setShowAdjustment(false)}><X size={17}/></button></header><form onSubmit={saveAdjustment}><div className="form-grid"><label><span>Monto *</span><input name="amount" required inputMode="numeric" placeholder="$0"/></label><label><span>Tipo</span><select name="type"><option>Descuento</option><option>Saldo condonado</option></select></label><label><span>Fecha *</span><input name="date" required type="date" defaultValue="2026-08-22"/></label><label className="form-span"><span>Motivo *</span><input name="reason" required/></label></div>{error&&<p className="form-error full-label">{error}</p>}<footer className="modal-actions"><button type="button" className="ghost-btn" onClick={()=>setShowAdjustment(false)}>Cancelar</button><button className="primary-btn">Confirmar ajuste</button></footer></form></section></div>}
  </>
}
