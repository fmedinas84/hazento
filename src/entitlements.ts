export type HazentoFeature = 'email_reminders' | 'partner_scheduling'
export type EntitlementMode = 'demo_plus' | 'free' | 'plus'

export type EntitlementContext = {
  mode: EntitlementMode
}

export function canUseFeature(feature: HazentoFeature, context: EntitlementContext) {
  if (feature !== 'email_reminders' && feature !== 'partner_scheduling') return false
  return context.mode === 'demo_plus' || context.mode === 'plus'
}

export function entitlementLabel(mode: EntitlementMode) {
  if (mode === 'demo_plus') return 'PLUS · habilitado en demo'
  return mode === 'plus' ? 'PLUS' : 'FREE'
}
