import { CreditCard, Sparkles } from 'lucide-react'

export function BillingSettings() {
  return (
    <div className="billing-settings">
      <div className="billing-settings-heading">
        <span className="section-kicker">Facturación</span>
        <h2>Suscripción y pagos</h2>
        <p>Revisa tu plan y prepara el método de pago de tu suscripción.</p>
      </div>

      <section className="billing-section" aria-labelledby="billing-plan-title">
        <div className="billing-section-heading">
          <span className="billing-section-icon"><Sparkles size={18} /></span>
          <div>
            <span>Plan actual</span>
            <h3 id="billing-plan-title">Hazento Free</h3>
            <p>Administra tu suscripción y método de pago.</p>
          </div>
        </div>
        <button className="secondary-btn" type="button" disabled>Administrar plan</button>
      </section>

      <section className="billing-section billing-payment" aria-labelledby="billing-payment-title">
        <div className="billing-section-heading">
          <span className="billing-section-icon"><CreditCard size={18} /></span>
          <div>
            <h3 id="billing-payment-title">Método de pago</h3>
            <p>Configura el medio de pago que utilizarás para tu suscripción a Hazento.</p>
          </div>
        </div>
        <div className="checkout-brick-slot" data-payment-integration-slot="mercado-pago">
          <CreditCard size={24} aria-hidden="true" />
          <strong>Método de pago aún no configurado</strong>
          <p>La integración con Mercado Pago estará disponible próximamente.</p>
        </div>
      </section>
    </div>
  )
}
