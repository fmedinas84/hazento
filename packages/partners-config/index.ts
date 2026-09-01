export const PARTNERS_COUNTRY = 'CL' as const

export const RESERVED_PARTNER_SLUGS = new Set([
  'admin', 'api', 'www', 'app', 'login', 'registro', 'signup', 'soporte',
  'support', 'ayuda', 'help', 'contacto', 'pricing', 'planes', 'hazento',
])

export function normalizePartnerSlug(value: string) {
  if (/(:\/\/|^www\.)/i.test(value.trim())) return ''
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80)
}

export function isValidPartnerSlug(value: string) {
  return value.length >= 3
    && value.length <= 80
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    && !RESERVED_PARTNER_SLUGS.has(value)
}

export function partnerPhotoPublicUrl(supabaseUrl: string, path: string) {
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/partner-photos/${path.split('/').map(encodeURIComponent).join('/')}`
}
