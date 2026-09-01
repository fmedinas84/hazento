import type { Tables, TablesInsert } from './types/database.types'
import { supabase } from './lib/supabase'
import { isValidPartnerSlug, normalizePartnerSlug, PARTNERS_COUNTRY, partnerPhotoPublicUrl } from '../packages/partners-config'

export { isValidPartnerSlug, normalizePartnerSlug }

export const PARTNER_PHOTO_MAX_KB = 200
const PARTNER_PHOTO_MAX_BYTES = PARTNER_PHOTO_MAX_KB * 1024

type PartnerPageRow = Tables<'partner_pages'>
export type PartnerPageStatus = 'draft' | 'published'

export type PartnerPage = {
  id: string
  workspaceId: string
  countryCode: string
  slug: string
  status: PartnerPageStatus
  publicName: string
  specialty: string
  bio: string
  photoPath: string | null
  whatsapp: string
  publicWhatsapp: boolean
  email: string
  publicEmail: boolean
  schedulingEnabled: boolean
}

export type PartnerPageDraft = Omit<PartnerPage, 'id' | 'workspaceId' | 'countryCode'>

const commercialBaseUrl = (import.meta.env.VITE_PARTNERS_COMMERCIAL_URL as string | undefined) || 'https://partners.hazento.cl'
const runtimeBaseUrl = (import.meta.env.VITE_PARTNERS_PUBLIC_URL as string | undefined) || commercialBaseUrl
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || ''

export function buildPartnerUrl(slug: string, kind: 'runtime' | 'commercial' = 'runtime') {
  const base = kind === 'runtime' ? runtimeBaseUrl : commercialBaseUrl
  return `${base.replace(/\/$/, '')}/${encodeURIComponent(slug)}`
}

export function partnerPhotoUrl(path: string | null) {
  return path && supabaseUrl ? partnerPhotoPublicUrl(supabaseUrl, path) : null
}

function requireClient() {
  if (!supabase) throw new Error('La conexión con Hazento no está disponible.')
  return supabase
}

async function resolveWorkspaceId() {
  const client = requireClient()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError || !userData.user) throw new Error('Tu sesión expiró. Vuelve a ingresar.')
  const { data, error } = await client.from('workspace_members').select('workspace_id').eq('user_id', userData.user.id).order('created_at').limit(1).maybeSingle()
  if (error || !data) throw new Error('No pudimos encontrar tu espacio de trabajo.')
  return data.workspace_id
}

function fromRow(row: PartnerPageRow): PartnerPage {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    countryCode: row.country_code,
    slug: row.slug,
    status: row.status as PartnerPageStatus,
    publicName: row.public_name,
    specialty: row.specialty,
    bio: row.bio,
    photoPath: row.photo_path,
    whatsapp: row.whatsapp || '',
    publicWhatsapp: row.public_whatsapp,
    email: row.email || '',
    publicEmail: row.public_email,
    schedulingEnabled: row.scheduling_enabled,
  }
}

function friendlyError(error: { code?: string; message?: string }) {
  if (error.code === '23505') return new Error('Esta dirección ya está siendo utilizada. Elige otra para continuar.')
  if (error.code === '23514') return new Error('Completa la información pública antes de publicar.')
  return new Error('No pudimos guardar tu landing. Revisa los datos e inténtalo nuevamente.')
}

export const partnerLandingRepository = {
  async get(): Promise<PartnerPage | null> {
    const client = requireClient()
    const workspaceId = await resolveWorkspaceId()
    const { data, error } = await client.from('partner_pages').select('*').eq('workspace_id', workspaceId).maybeSingle()
    if (error) throw new Error('No pudimos cargar tu landing.')
    return data ? fromRow(data) : null
  },

  async isSlugAvailable(slug: string): Promise<boolean> {
    if (!isValidPartnerSlug(slug)) return false
    const client = requireClient()
    const workspaceId = await resolveWorkspaceId()
    const { data, error } = await client.rpc('is_partner_slug_available', { p_country_code: PARTNERS_COUNTRY, p_slug: slug, p_workspace_id: workspaceId })
    if (error) throw new Error('No pudimos comprobar la dirección.')
    return data
  },

  async save(draft: PartnerPageDraft): Promise<PartnerPage> {
    const client = requireClient()
    const workspaceId = await resolveWorkspaceId()
    const payload: TablesInsert<'partner_pages'> = {
      workspace_id: workspaceId,
      country_code: PARTNERS_COUNTRY,
      slug: draft.slug,
      status: draft.status,
      public_name: draft.publicName.trim(),
      specialty: draft.specialty.trim(),
      bio: draft.bio.trim(),
      photo_path: draft.photoPath,
      whatsapp: draft.whatsapp.trim() || null,
      public_whatsapp: draft.publicWhatsapp,
      email: draft.email.trim() || null,
      public_email: draft.publicEmail,
      scheduling_enabled: draft.schedulingEnabled,
    }
    const { data, error } = await client.from('partner_pages').upsert(payload, { onConflict: 'workspace_id' }).select().single()
    if (error) throw friendlyError(error)
    return fromRow(data)
  },

  async uploadPhoto(file: File): Promise<string> {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) throw new Error('Usa una imagen JPG, PNG o WebP.')
    if (file.size > PARTNER_PHOTO_MAX_BYTES) {
      throw new Error(`La foto no puede superar ${PARTNER_PHOTO_MAX_KB} KB.`)
    }
    const client = requireClient()
    const workspaceId = await resolveWorkspaceId()
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${workspaceId}/${crypto.randomUUID()}.${extension}`
    const { error } = await client.storage.from('partner-photos').upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) throw new Error('No pudimos subir la foto. Inténtalo nuevamente.')
    return path
  },

  async removePhoto(path: string) {
    const client = requireClient()
    const { error } = await client.storage.from('partner-photos').remove([path])
    if (error) throw new Error('No pudimos eliminar la foto.')
  },
}
