import { useEffect, useState } from 'react'
import { Mail, MessageCircle, RefreshCw } from 'lucide-react'
import { isValidPartnerSlug, PARTNERS_COUNTRY, partnerPhotoPublicUrl } from '../../../packages/partners-config'
import { partnersSupabaseUrl, supabase } from './supabase'
import { Booking } from './Booking'

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
  const firstName = page.public_name.trim().split(/\s+/)[0] || page.public_name
  return <main className="partner-page">
    <article>
      <div className="partner-hero">
        <aside className="contact-card" aria-labelledby="contact-title">
          <h2 id="contact-title">Contacta a {firstName}</h2>
          <div className="contact-actions">{page.whatsapp && <a className="primary" href={whatsappHref(page.whatsapp)} target="_blank" rel="noreferrer"><MessageCircle/> WhatsApp</a>}{page.email && <a href={`mailto:${page.email}`}><Mail/> Email</a>}</div>
          {page.can_auto_schedule && <a className="schedule-preview" href="#reservar">Agenda tu cita</a>}
        </aside>
        <div className="partner-profile">
          <header><h1>{page.public_name}</h1><p className="specialty">{page.specialty}</p></header>
          <img className="partner-photo" src={photoUrl} width="240" height="240" alt={`Foto profesional de ${page.public_name}`}/>
        </div>
      </div>
      <section className="about" aria-labelledby="about-title"><h2 id="about-title">En lo que puedo ayudarte</h2><p className="bio">{page.bio}</p></section>
      <Booking country={country} slug={page.slug} contact={!page.can_auto_schedule ? <section className="manual-booking"><h2>¿Quieres reservar una atención?</h2><p>Ponte en contacto directamente.</p><div className="contact-actions">{page.whatsapp&&<a className="primary" href={whatsappHref(page.whatsapp)}>WhatsApp</a>}{page.email&&<a href={`mailto:${page.email}`}>Email</a>}</div></section> : null}/>
      <footer><span>Gestionado con</span><a href={marketingUrl} rel="noreferrer">Hazento</a></footer>
    </article>
  </main>
}
