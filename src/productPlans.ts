export type ProductPlanId = 'free' | 'plus'

export type ProductPlan = {
  id: ProductPlanId
  name: string
  price: number
  currency: 'CLP'
  interval: 'month'
  description: string
  features: string[]
  recommended?: boolean
}

export const productPlans: Record<ProductPlanId, ProductPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'CLP',
    interval: 'month',
    description: 'Para comenzar a organizar lo esencial.',
    features: [
      'Personas y organizaciones en un solo lugar',
      'Agenda, proyectos y oportunidades',
      'Solicitudes de pago y registro de cobros',
    ],
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    price: 4990,
    currency: 'CLP',
    interval: 'month',
    description: 'Para profesionales que quieren gestionar y cobrar desde Hazento.',
    features: [
      'Todo lo incluido en Free',
      'Recordatorios automáticos por email para citas',
      'Suscripción mensual, sin cobros manuales repetidos',
    ],
    recommended: true,
  },
}

export const formatPlanPrice = (plan: ProductPlan) => `$${plan.price.toLocaleString('es-CL')}`
