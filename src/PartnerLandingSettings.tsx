import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, ExternalLink, Globe2, ImagePlus, LockKeyhole, Trash2 } from 'lucide-react'
import { canUseFeature, type EntitlementMode } from './entitlements'
import {
  buildPartnerUrl,
  isValidPartnerSlug,
  normalizePartnerSlug,
  partnerLandingRepository,
  partnerPhotoUrl,
  type PartnerPage,
  type PartnerPageDraft,
} from './partnerLanding'

type Props = {
  profile: { firstName: string; lastName: string; email: string; phone: string }
  entitlementMode: EntitlementMode
  onUpgrade: () => void
  notify: (message: string) => void
}

const emptyDraft = (profile: Props['profile']): PartnerPageDraft => ({
  slug: normalizePartnerSlug(`${profile.firstName}-${profile.lastName}`),
  status: 'draft',
  publicName: `${profile.firstName} ${profile.lastName}`.trim(),
  specialty: '',
  bio: '',
  photoPath: null,
  whatsapp: profile.phone,
  publicWhatsapp: false,
  email: profile.email,
  publicEmail: false,
  schedulingEnabled: false,
})

function toDraft(page: PartnerPage): PartnerPageDraft {
  const { id: _id, workspaceId: _workspaceId, countryCode: _countryCode, ...draft } = page
  return draft
}

export function PartnerLandingSettings({ profile, entitlementMode, onUpgrade, notify }: Props) {
  const [page, setPage] = useState<PartnerPage | null>(null)
  const [draft, setDraft] = useState<PartnerPageDraft>(() => emptyDraft(profile))
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [uploading, setUploading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const previousSlug = useRef('')
  const isPlus = canUseFeature('partner_scheduling', { mode: entitlementMode })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const stored = await partnerLandingRepository.get()
      setPage(stored)
      if (stored) {
        setDraft(toDraft(stored))
        previousSlug.current = stored.slug
        setStarted(true)
        setSlugStatus('available')
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos cargar tu landing.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    if (!previewOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPreviewOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [previewOpen])

  useEffect(() => {
    if (!started) return
    if (!isValidPartnerSlug(draft.slug)) { setSlugStatus('invalid'); return }
    if (draft.slug === previousSlug.current) { setSlugStatus('available'); return }
    setSlugStatus('checking')
    const timer = window.setTimeout(async () => {
      try { setSlugStatus(await partnerLandingRepository.isSlugAvailable(draft.slug) ? 'available' : 'taken') }
      catch { setSlugStatus('idle') }
    }, 450)
    return () => window.clearTimeout(timer)
  }, [draft.slug, started])

  const photoUrl = useMemo(() => partnerPhotoUrl(draft.photoPath), [draft.photoPath])
  const hasContact = (draft.publicWhatsapp && Boolean(draft.whatsapp.trim())) || (draft.publicEmail && Boolean(draft.email.trim()))
  const canPublish = slugStatus === 'available' && Boolean(draft.publicName.trim() && draft.specialty.trim() && draft.bio.trim() && draft.photoPath && hasContact)

  const change = <K extends keyof PartnerPageDraft>(key: K, value: PartnerPageDraft[K]) => setDraft(current => ({ ...current, [key]: value }))

  const save = async (status: PartnerPageDraft['status'] = draft.status) => {
    if (previousSlug.current && previousSlug.current !== draft.slug && !window.confirm('El enlace anterior dejará de funcionar. ¿Quieres guardar la nueva dirección?')) return
    if (status === 'published' && !canPublish) { setError('Completa la foto, presentación, contacto y dirección disponible antes de publicar.'); return }
    setSaving(true)
    setError('')
    try {
      const replacedPhoto = page?.photoPath && page.photoPath !== draft.photoPath ? page.photoPath : null
      const saved = await partnerLandingRepository.save({ ...draft, status, schedulingEnabled: isPlus && draft.schedulingEnabled })
      setPage(saved)
      setDraft(toDraft(saved))
      previousSlug.current = saved.slug
      setSlugStatus('available')
      if (replacedPhoto) void partnerLandingRepository.removePhoto(replacedPhoto).catch(() => undefined)
      notify(status === 'published' ? 'Landing publicada' : status === 'draft' && page?.status === 'published' ? 'Landing despublicada' : 'Borrador guardado')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos guardar tu landing.')
    } finally { setSaving(false) }
  }

  const upload = async (file: File | undefined) => {
    if (!file) return
    setUploading(true); setError('')
    try {
      const oldPath = draft.photoPath
      const newPath = await partnerLandingRepository.uploadPhoto(file)
      change('photoPath', newPath)
      if (oldPath && oldPath !== page?.photoPath) await partnerLandingRepository.removePhoto(oldPath)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos subir la foto.') }
    finally { setUploading(false) }
  }

  const removePhoto = async () => {
    if (!draft.photoPath) return
    setUploading(true)
    try {
      if (draft.photoPath !== page?.photoPath) await partnerLandingRepository.removePhoto(draft.photoPath)
      change('photoPath', null)
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos eliminar la foto.') }
    finally { setUploading(false) }
  }

  if (loading) return <div className="partner-settings-loading" aria-busy="true"><div/><div/><div/></div>
  if (error && !started) return <div className="partner-settings-error" role="alert"><h2>No pudimos cargar tu landing</h2><p>{error}</p><button className="secondary-btn" onClick={() => void load()}>Reintentar</button></div>
  if (!started) return <div className="partner-settings-intro"><span className="partner-status draft">No publicada</span><Globe2 size={32}/><h2>Tu landing pública</h2><p>Crea una página simple para presentar tus servicios y compartirla con tus clientes.</p><button className="primary-btn" onClick={() => setStarted(true)}>Crear mi landing</button></div>

  return <div className="partner-settings">
    <header className="partner-settings-header"><div><span className={`partner-status ${draft.status}`}>{draft.status === 'published' ? 'Publicada' : 'Borrador'}</span><h2>Tu landing pública</h2><p>Crea una página simple para presentar tus servicios y compartirla con tus clientes.</p></div>{page?.status === 'published' && <a className="secondary-btn" href={buildPartnerUrl(page.slug)} target="_blank" rel="noreferrer">Ver landing <ExternalLink size={16}/></a>}</header>
    {error && <p className="form-error" role="alert">{error}</p>}

    <section className="partner-editor-section"><div><span className="section-kicker">Dirección</span><h3>Elige la dirección de tu página</h3></div><label className="partner-slug-field"><span className="partner-slug-prefix">partners.hazento.cl/</span><input aria-describedby="slug-help" value={draft.slug} onChange={event => change('slug', normalizePartnerSlug(event.target.value))} maxLength={80}/></label><small id="slug-help" className={`slug-feedback ${slugStatus}`}>{slugStatus === 'checking' ? 'Comprobando disponibilidad…' : slugStatus === 'available' ? '✓ Esta dirección está disponible' : slugStatus === 'taken' ? 'Esta dirección ya está siendo utilizada. Elige otra para continuar.' : slugStatus === 'invalid' ? 'Usa al menos 3 caracteres: letras, números y guiones.' : 'La disponibilidad se confirmará antes de publicar.'}</small></section>

    <section className="partner-editor-section"><div><span className="section-kicker">Presentación</span><h3>Así te verán tus clientes</h3></div><div className="partner-photo-editor">{photoUrl ? <img src={photoUrl} alt="Vista previa de tu foto profesional"/> : <div className="partner-photo-empty"><ImagePlus/><span>Agrega una foto profesional</span></div>}<div><label className="secondary-btn partner-upload">{uploading ? 'Procesando…' : draft.photoPath ? 'Reemplazar foto' : 'Cargar foto'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={event => void upload(event.target.files?.[0])}/></label>{draft.photoPath && <button className="ghost-btn" type="button" disabled={uploading} onClick={() => void removePhoto()}><Trash2 size={16}/> Eliminar</button>}<small>JPG, PNG o WebP · máximo 5 MB.</small></div></div><div className="form-grid"><label><span>Nombre público</span><input value={draft.publicName} maxLength={100} onChange={event => change('publicName', event.target.value)}/></label><label><span>Profesión / especialidad</span><input value={draft.specialty} maxLength={140} placeholder="Ej. Psicóloga · Atención adultos" onChange={event => change('specialty', event.target.value)}/></label><label className="form-span"><span>Quién soy</span><textarea value={draft.bio} maxLength={1200} rows={5} onChange={event => change('bio', event.target.value)}/><small>{draft.bio.length}/1200 caracteres</small></label></div></section>

    <section className="partner-editor-section"><div><span className="section-kicker">Contacto</span><h3>Elige qué datos serán públicos</h3><p>Solo publicaremos la información que marques expresamente. Cualquier visitante de Internet podrá verla.</p></div><div className="form-grid"><label><span>WhatsApp / teléfono</span><input value={draft.whatsapp} maxLength={40} onChange={event => change('whatsapp', event.target.value)}/><span className="partner-public-check"><input type="checkbox" checked={draft.publicWhatsapp} onChange={event => change('publicWhatsapp', event.target.checked)}/> Mostrar en mi landing</span></label><label><span>Email</span><input type="email" value={draft.email} maxLength={254} onChange={event => change('email', event.target.value)}/><span className="partner-public-check"><input type="checkbox" checked={draft.publicEmail} onChange={event => change('publicEmail', event.target.checked)}/> Mostrar en mi landing</span></label></div></section>

    <section className={`partner-scheduling-card ${isPlus ? '' : 'locked'}`}><div className="partner-scheduling-icon">{isPlus ? <Check/> : <LockKeyhole/>}</div><div><h3>Agendamiento automático</h3><p>{isPlus ? 'Permite que tus clientes reserven directamente según tu disponibilidad.' : 'Permite que tus clientes vean tus horarios disponibles y reserven directamente desde tu landing.'}</p>{isPlus ? <label className="partner-public-check"><input type="checkbox" checked={draft.schedulingEnabled} onChange={event => change('schedulingEnabled', event.target.checked)}/> Activar agendamiento cuando el módulo esté disponible</label> : <><strong>Disponible con Hazento Plus</strong><button className="link-btn" type="button" onClick={onUpgrade}>Conocer Plus</button></>}</div></section>

    {page?.status === 'published' && <section className="partner-published-link"><div><span>Tu landing</span><strong>{buildPartnerUrl(page.slug, 'commercial').replace(/^https?:\/\//, '')}</strong></div><button className="secondary-btn" type="button" onClick={async () => { await navigator.clipboard.writeText(buildPartnerUrl(page.slug)); notify('Enlace copiado') }}><Copy size={16}/> Copiar enlace</button><a className="secondary-btn" href={buildPartnerUrl(page.slug)} target="_blank" rel="noreferrer">Ver landing <ExternalLink size={16}/></a></section>}

    <footer className="partner-settings-actions"><button className="ghost-btn" type="button" onClick={() => setPreviewOpen(true)}>Vista previa</button><button className="secondary-btn" disabled={saving} onClick={() => void save(draft.status)}>{saving ? 'Guardando…' : draft.status === 'published' ? 'Guardar cambios' : 'Guardar borrador'}</button>{draft.status === 'published' ? <button className="ghost-btn" disabled={saving} onClick={() => void save('draft')}>{saving ? 'Guardando…' : 'Despublicar'}</button> : <button className="primary-btn" disabled={saving || !canPublish} onClick={() => void save('published')}>{saving ? 'Publicando…' : 'Publicar'}</button>}</footer>
    {previewOpen && <div className="partner-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="partner-preview-title"><div className="partner-preview-dialog"><button className="partner-preview-close" type="button" aria-label="Cerrar vista previa" onClick={() => setPreviewOpen(false)}>×</button>{photoUrl ? <img src={photoUrl} alt=""/> : <div className="partner-preview-placeholder">Tu foto aparecerá aquí</div>}<div className="partner-preview-copy"><span className="section-kicker">VISTA PREVIA</span><h2 id="partner-preview-title">{draft.publicName || 'Tu nombre'}</h2><strong>{draft.specialty || 'Tu profesión o especialidad'}</strong><h3>Quién soy</h3><p>{draft.bio || 'Agrega una descripción para contarle a tus clientes quién eres y cómo trabajas.'}</p><div className="partner-preview-contact">{draft.publicWhatsapp && draft.whatsapp && <span>WhatsApp</span>}{draft.publicEmail && draft.email && <span>Email</span>}{!hasContact && <small>Elige al menos un dato de contacto público.</small>}</div></div></div></div>}
  </div>
}
