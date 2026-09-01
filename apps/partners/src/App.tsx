import { useEffect, useState } from 'react'
import { Mail, MessageCircle, RefreshCw } from 'lucide-react'
import { isValidPartnerSlug, PARTNERS_COUNTRY, partnerPhotoPublicUrl } from '../../../packages/partners-config'
import { partnersSupabaseUrl, supabase } from './supabase'

type PublicPartnerPage = {
  slug: string
  public_name: string
  specialty: string
  bio: string
  photo_path: string
  whatsapp: string | null
  email: string | null
  can_auto_schedule: boolean
}

const country = (import.meta.env.VITE_PARTNERS_COUNTRY_CODE as string | undefined) || PARTNERS_COUNTRY
const marketingUrl = (import.meta.env.VITE_HAZENTO_MARKETING_URL as string | undefined) || 'https://hazento.vercel.app'

function currentSlug() {
  return decodeURIComponent(window.location.pathname.replace(/^\/+|\/+$/g, '')).toLowerCase()
}

function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : '#'
}

export function App() {
  const [page, setPage] = useState<PublicPartnerPage | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading')

  const load = async () => {
    const slug = currentSlug()
    if (!isValidPartnerSlug(slug) || country !== 'CL') { setStatus('not-found'); return }
    setStatus('loading')
    const { data, error } = await supabase.rpc('get_published_partner_page', { p_country_code: country, p_slug: slug })
    if (error) { setStatus('error'); return }
    const result = data?.[0] as PublicPartnerPage | undefined
    if (!result) { setStatus('not-found'); return }
    setPage(result)
    setStatus('ready')
    document.title = `${result.public_name} · Hazento`
  }

  useEffect(() => { void load() }, [])

  if (status === 'loading') return <main className="public-state" aria-busy="true"><div className="partner-skeleton photo"/><div className="partner-skeleton title"/><div className="partner-skeleton copy"/></main>
  if (status === 'not-found') return <main className="public-state"><span className="brand">Hazento</span><h1>Página no disponible</h1><p>Esta landing no existe o todavía no está publicada.</p></main>
  if (status === 'error') return <main className="public-state"><span className="brand">Hazento</span><h1>No pudimos cargar esta página</h1><p>Inténtalo nuevamente en unos momentos.</p><button onClick={() => void load()}><RefreshCw size={17}/> Reintentar</button></main>
  if (!page) return null

  const photoUrl = partnerPhotoPublicUrl(partnersSupabaseUrl, page.photo_path)
  return <main className="partner-page">
    <article>
      <div className="partner-profile">
        <img className="partner-photo" src={photoUrl} width="240" height="240" alt={`Foto profesional de ${page.public_name}`}/>
        <header><span className="eyebrow">PROFESIONAL INDEPENDIENTE</span><h1>{page.public_name}</h1><p className="specialty">{page.specialty}</p></header>
      </div>
      <section aria-labelledby="about-title"><span className="eyebrow">QUIÉN SOY</span><h2 id="about-title">Conoce mi trabajo</h2><p className="bio">{page.bio}</p></section>
      <section className="contact" aria-labelledby="contact-title"><span className="eyebrow">CONTACTO</span><h2 id="contact-title">¿Quieres agendar o hacer una consulta?</h2><div>{page.whatsapp && <a className="primary" href={whatsappHref(page.whatsapp)} target="_blank" rel="noreferrer"><MessageCircle/> WhatsApp</a>}{page.email && <a href={`mailto:${page.email}`}><Mail/> Email</a>}</div></section>
      {/* El entitlement ya llega resuelto server-side. La UI de reserva se incorporará en su HU independiente. */}
      <footer><span>Gestionado con</span><a href={marketingUrl} rel="noreferrer">Hazento</a></footer>
    </article>
  </main>
}
