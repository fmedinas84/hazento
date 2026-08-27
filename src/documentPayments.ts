import type { DocumentAdjustmentData, DocumentData, DocumentPaymentAllocationData, PaymentData } from './data'

const parseMoney = (value: string) => Number(value.replace(/[^0-9-]/g, '')) || 0

export type CollectionStatus = 'Impaga' | 'Parcialmente pagada' | 'Pagada' | 'Cerrada con ajuste' | 'Anulada'

export function isConfirmedPayment(payment: PaymentData) {
  return payment.status === 'Pagado'
}

export function documentSummary(document: DocumentData, payments: PaymentData[], allocations: DocumentPaymentAllocationData[], adjustments: DocumentAdjustmentData[]) {
  const paid = allocations
    .filter(allocation => allocation.documentId === document.id && payments.some(payment => payment.id === allocation.paymentId && isConfirmedPayment(payment)))
    .reduce((sum, allocation) => sum + allocation.amount, 0)
  const adjusted = adjustments.filter(adjustment => adjustment.documentId === document.id).reduce((sum, adjustment) => sum + adjustment.amount, 0)
  const outstanding = Math.max(0, document.totalAmount - paid - adjusted)
  let status: CollectionStatus = 'Impaga'
  if (document.taxStatus === 'Anulada') status = 'Anulada'
  else if (outstanding === 0 && adjusted > 0) status = 'Cerrada con ajuste'
  else if (outstanding === 0) status = 'Pagada'
  else if (paid > 0) status = 'Parcialmente pagada'
  return { total: document.totalAmount, paid, adjusted, outstanding, status }
}

export function paymentAvailable(payment: PaymentData, allocations: DocumentPaymentAllocationData[], exceptAllocationId?: string) {
  const allocated = allocations
    .filter(allocation => allocation.paymentId === payment.id && allocation.id !== exceptAllocationId)
    .reduce((sum, allocation) => sum + allocation.amount, 0)
  return Math.max(0, parseMoney(payment.amount) - allocated)
}

export function validateAllocation(args: {
  payment: PaymentData
  document: DocumentData
  amount: number
  payments: PaymentData[]
  allocations: DocumentPaymentAllocationData[]
  adjustments: DocumentAdjustmentData[]
  exceptAllocationId?: string
}) {
  const { payment, document, amount, payments, allocations, adjustments, exceptAllocationId } = args
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('El monto asignado debe ser mayor que cero.')
  if (!isConfirmedPayment(payment)) throw new Error('Solo se pueden asignar pagos confirmados.')
  if (payment.accountId !== document.accountId) throw new Error('El pago y la boleta deben pertenecer a la misma persona.')
  if (allocations.some(item => item.id !== exceptAllocationId && item.paymentId === payment.id && item.documentId === document.id)) throw new Error('Este pago ya está asignado a la boleta.')
  if (amount > paymentAvailable(payment, allocations, exceptAllocationId)) throw new Error('La asignación supera el saldo disponible del pago.')
  const summary = documentSummary(document, payments, allocations.filter(item => item.id !== exceptAllocationId), adjustments)
  if (amount > summary.outstanding) throw new Error('La asignación supera el saldo pendiente de la boleta.')
}

export function validateAdjustment(document: DocumentData, amount: number, payments: PaymentData[], allocations: DocumentPaymentAllocationData[], adjustments: DocumentAdjustmentData[], exceptAdjustmentId?: string) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('El ajuste debe ser mayor que cero.')
  const summary = documentSummary(document, payments, allocations, adjustments.filter(item => item.id !== exceptAdjustmentId))
  if (amount > summary.outstanding) throw new Error('El ajuste supera el saldo pendiente de la boleta.')
}
