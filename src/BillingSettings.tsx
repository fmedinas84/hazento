import { useCallback, useEffect, useState } from 'react'
import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react'
import { AlertCircle, CheckCircle2, CreditCard, LoaderCircle, Pause, Play, Sparkles, XCircle } from 'lucide-react'
import { billingRepository, type BillingStatus, type BillingSubscription } from './billing'
import { formatPlanPrice, productPlans } from './productPlans'

const freePlan: BillingSubscription = { plan: 'free', status: 'free', amount: 0, currency: 'CLP' }
const freeProductPlan = productPlans.free
const plusProductPlan = productPlans.plus
const statusLabels: Record<BillingStatus, string> = { free: 'Free', pending: 'Procesando', active: 'Activo', paused: 'Pausado', cancelled: 'Cancelado', payment_failed: 'Pago rechazado' }
const statusIcons: Record<BillingStatus, typeof CheckCircle2> = { free: Sparkles, pending: LoaderCircle, active: CheckCircle2, paused: Pause, cancelled: XCircle, payment_failed: AlertCircle }
const formatDate = (date?: string) => date ? new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date)) : 'Por confirmar'

export function BillingSettings() {
  const [subscription, setSubscription] = useState<BillingSubscription>(freePlan)
  const [publicKey, setPublicKey] = useState('')
  const [configurationMessage, setConfigurationMessage] = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const refreshSubscription = useCallback(async () => {
    try {
      const current = await billingRepository.getSubscription()
      setSubscription(current || freePlan)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'No pudimos recuperar tu suscripción.')
    }
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([billingRepository.getConfig(), billingRepository.getSubscription()])
      .then(([config, current]) => {
        if (!active) return
        if (config.configured && config.publicKey) {
          initMercadoPago(config.publicKey, { locale: 'es-CL' })
          setPublicKey(config.publicKey)
        } else setConfigurationMessage(config.message || 'Mercado Pago aún no está configurado en este entorno.')
        setSubscription(current || freePlan)
      })
      .catch(() => setConfigurationMessage('Inicia el proyecto con Vercel Dev y configura las variables de Mercado Pago para probar Checkout.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const updateSubscription = async (action: 'pause' | 'reactivate' | 'cancel') => {
    if (action === 'cancel' && !window.confirm('Cancelar detendrá las futuras renovaciones de Hazento Plus. ¿Quieres continuar?')) return
    setActionLoading(true); setError('')
    try {
      const updated = await billingRepository.updateSubscription(action)
      setSubscription(updated.status === 'cancelled' ? freePlan : updated)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No pudimos actualizar tu suscripción.')
    } finally { setActionLoading(false) }
  }

  const onBrickSubmit = async (formData: { token: string; payer: { email?: string } }) => {
    setActionLoading(true); setError('')
    try {
      const created = await billingRepository.createSubscription({ email: (formData.payer.email || email).trim().toLowerCase(), cardToken: formData.token })
      setSubscription(created); setShowCheckout(false)
      await refreshSubscription()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No pudimos activar Hazento Plus. Revisa tu medio de pago e inténtalo nuevamente.')
      throw submitError
    } finally { setActionLoading(false) }
  }

  const StatusIcon = statusIcons[subscription.status]
  const plusSelected = subscription.plan === 'plus' && subscription.status !== 'cancelled'

  return <div className="billing-settings">
    <div className="billing-settings-heading"><span className="section-kicker">Facturación</span><h2>Plan y suscripción</h2><p>Elige el plan que mejor acompaña tu negocio.</p></div>
    <section className="billing-current card" aria-labelledby="billing-current-title">
      <div className="billing-section-heading"><span className="billing-section-icon"><StatusIcon size={18} className={subscription.status === 'pending' ? 'spin' : ''}/></span><div><span>Plan actual</span><h3 id="billing-current-title">{plusSelected ? plusProductPlan.name.toUpperCase() : freeProductPlan.name.toUpperCase()}</h3><p>{plusSelected ? `${formatPlanPrice(plusProductPlan)} / mes` : `${formatPlanPrice(freeProductPlan)} / mes`}</p></div></div>
      {plusSelected && <div className="billing-current-details"><p><span>Estado</span><strong>{statusLabels[subscription.status]}</strong></p><p><span>Próximo cobro</span><strong>{formatDate(subscription.nextPaymentDate)}</strong></p><p><span>Método de pago</span><strong>{subscription.paymentMethod || 'Gestionado por Mercado Pago'}</strong></p></div>}
    </section>
    <div className="billing-plans" aria-label="Planes disponibles">
      <article className={`billing-plan ${!plusSelected ? 'selected' : ''}`}><div><span>{freeProductPlan.name.toUpperCase()}</span><strong>{formatPlanPrice(freeProductPlan)}</strong><small>CLP / mes</small></div><p>{freeProductPlan.description}</p><button className="secondary-btn" type="button" disabled={!plusSelected} onClick={() => plusSelected && updateSubscription('cancel')}>{!plusSelected ? 'Plan actual' : 'Volver a Free'}</button></article>
      <article className={`billing-plan billing-plan-plus ${plusSelected ? 'selected' : ''}`}><div><span>{plusProductPlan.name.toUpperCase()}</span><strong>{formatPlanPrice(plusProductPlan)}</strong><small>CLP / mes</small></div><p>{plusProductPlan.description}</p>{!plusSelected ? <button className="primary-btn" type="button" disabled={!publicKey || loading} onClick={() => { setError(''); setShowCheckout(true) }}>Cambiar a Plus</button> : <span className="billing-plan-active"><CheckCircle2 size={15}/> Plan seleccionado</span>}</article>
    </div>
    {configurationMessage && <div className="billing-notice"><AlertCircle size={17}/><div><strong>Facturación no configurada</strong><p>{configurationMessage}</p></div></div>}
    {error && <div className="billing-notice billing-error" role="alert"><AlertCircle size={17}/><div><strong>No pudimos completar la operación</strong><p>{error}</p></div></div>}
    {showCheckout && !plusSelected && <section className="billing-section billing-payment" aria-labelledby="billing-payment-title">
      <div className="billing-section-heading"><span className="billing-section-icon"><CreditCard size={18}/></span><div><h3 id="billing-payment-title">Autoriza Hazento Plus</h3><p>Hazento Plus · {formatPlanPrice(plusProductPlan)} al mes · Cobro mensual recurrente</p></div></div>
      <label className="billing-email"><span>Email del suscriptor</span><input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@email.cl"/></label>
      {email.trim() && publicKey ? <div className="checkout-brick-slot checkout-brick-live" data-payment-integration-slot="mercado-pago"><CardPayment locale="es-CL" initialization={{ amount: plusProductPlan.price, payer: { email: email.trim().toLowerCase() } }} customization={{ paymentMethods: { maxInstallments: 1, types: { included: ['credit_card'] } } }} onSubmit={onBrickSubmit} onError={() => setError('No pudimos cargar el formulario seguro de Mercado Pago.')}/></div> : <div className="checkout-brick-slot"><CreditCard size={24}/><strong>Ingresa tu email para continuar</strong><p>Los datos de tarjeta serán procesados directamente por Mercado Pago.</p></div>}
      <button className="text-btn" type="button" onClick={() => setShowCheckout(false)}>Cancelar</button>
    </section>}
    {plusSelected && <section className="billing-section billing-management" aria-labelledby="billing-management-title"><div className="billing-section-heading"><span className="billing-section-icon"><CreditCard size={18}/></span><div><h3 id="billing-management-title">Administrar suscripción</h3><p>Los cambios se confirman directamente con Mercado Pago.</p></div></div><div className="billing-management-actions">{subscription.status === 'active' && <button className="secondary-btn" disabled={actionLoading} onClick={() => updateSubscription('pause')}><Pause size={14}/> Pausar</button>}{subscription.status === 'paused' && <button className="secondary-btn" disabled={actionLoading} onClick={() => updateSubscription('reactivate')}><Play size={14}/> Reactivar</button>}<button className="ghost-btn billing-cancel" disabled={actionLoading} onClick={() => updateSubscription('cancel')}>Cancelar Plus</button></div></section>}
  </div>
}
