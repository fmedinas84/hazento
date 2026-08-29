import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { ArrowRight, BriefcaseBusiness, CalendarDays, Check, Menu, Target, UsersRound, WalletCards, X } from 'lucide-react'
import { AuthForm, type AuthMode } from '../auth/AuthForm'
import { formatPlanPrice, productPlans, type ProductPlanId } from '../productPlans'

type PublicLandingProps = {
  user?: User | null
  initialAuthMode?: AuthMode
  recoveryMode?: boolean
  onAuthenticated?: (user: User) => void
  onRecoveryComplete?: () => void
  authOnly?: boolean
}

const authPath: Record<AuthMode, string> = { login: '/login', signup: '/register', forgot: '/forgot-password', update: '/reset-password' }

const navigate = (path: string) => {
  window.location.assign(path)
}

function PublicHeader({ user, onOpenAuth }: { user?: User | null; onOpenAuth: (mode: AuthMode) => void }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return <header className="public-header">
    <a className="public-brand" href="/" aria-label="Hazento, inicio">Hazento</a>
    <button className="public-menu-toggle" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen(value => !value)}>{open ? <X/> : <Menu/>}</button>
    <nav id="public-navigation" className={open ? 'open' : ''} aria-label="Navegación pública">
      <a href="#como-funciona" onClick={close}>Cómo funciona</a>
      <a href="#planes" onClick={close}>Planes</a>
      {user ? <button className="public-text-action" onClick={() => navigate('/app')}>Ir a Hazento</button> : <button className="public-text-action" onClick={() => { close(); onOpenAuth('login') }}>Ingresar</button>}
      <button className="public-primary public-header-cta" onClick={() => { close(); user ? navigate('/app') : onOpenAuth('signup') }}>{user ? 'Ir a Hazento' : 'Crear cuenta gratis'}</button>
    </nav>
  </header>
}

const painPoints = [
  { icon: UsersRound, title: 'Clientes dispersos', text: 'Centraliza los datos, actividades y contexto de cada cliente en una sola ficha.' },
  { icon: CalendarDays, title: 'Agenda desordenada', text: 'Organiza atenciones, clases, entregables y seguimientos sin revisar distintas aplicaciones.' },
  { icon: WalletCards, title: 'Pagos pendientes', text: 'Visualiza cuánto has cobrado, cuánto te deben y qué solicitudes siguen pendientes.' },
  { icon: Target, title: 'Trabajo sin seguimiento', text: 'Mantén claros tus proyectos, oportunidades y próximas acciones para que nada quede olvidado.' },
]

const steps = [
  { title: 'Crea tu espacio', text: 'Configura Hazento según el tipo de trabajo que realizas.' },
  { title: 'Organiza tu operación', text: 'Registra clientes, atenciones, proyectos y oportunidades.' },
  { title: 'Haz seguimiento', text: 'Revisa tu agenda, ingresos y pagos pendientes desde un mismo lugar.' },
]

function PricingCard({ planId, user, onChoose }: { planId: ProductPlanId; user?: User | null; onChoose: (plan: ProductPlanId) => void }) {
  const plan = productPlans[planId]
  return <article className={`public-plan${plan.recommended ? ' recommended' : ''}`}>
    <div className="public-plan-heading"><div><span>{plan.name}</span><p><strong>{formatPlanPrice(plan)}</strong>{plan.price > 0 && <small> / mes</small>}</p></div>{plan.recommended && <b>Recomendado</b>}</div>
    <p>{plan.description}</p>
    <ul>{plan.features.map(feature => <li key={feature}><Check size={16}/>{feature}</li>)}</ul>
    <button className={plan.recommended ? 'public-primary' : 'public-secondary'} onClick={() => onChoose(planId)}>{user ? (planId === 'plus' ? 'Ver Hazento Plus' : 'Ir a Hazento') : (planId === 'plus' ? 'Comenzar con Plus' : 'Comenzar gratis')}</button>
  </article>
}

export function PublicLanding({ user, initialAuthMode = 'login', recoveryMode = false, onAuthenticated, onRecoveryComplete, authOnly = false }: PublicLandingProps) {
  const [authMode, setAuthMode] = useState<AuthMode>(recoveryMode ? 'update' : initialAuthMode)
  const [mobileAuthOpen, setMobileAuthOpen] = useState(authOnly || initialAuthMode !== 'login' || recoveryMode)

  useEffect(() => {
    const privateAuthPage = authOnly || window.location.pathname !== '/'
    document.title = privateAuthPage ? `${authMode === 'signup' ? 'Crear cuenta' : authMode === 'forgot' ? 'Recuperar contraseña' : authMode === 'update' ? 'Actualizar contraseña' : 'Ingresar'} | Hazento` : 'Hazento | Clientes, agenda y pagos en un solo lugar'
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (robots) robots.content = privateAuthPage ? 'noindex, nofollow' : 'index, follow'
    return () => { if (robots) robots.content = 'index, follow' }
  }, [authMode, authOnly])

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode)
    setMobileAuthOpen(true)
    if (window.location.pathname !== authPath[mode]) window.history.pushState({}, '', authPath[mode])
    requestAnimationFrame(() => document.getElementById('acceso')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }
  const choosePlan = (plan: ProductPlanId) => {
    if (user) navigate(plan === 'plus' ? '/configuracion?tab=Facturación' : '/app')
    else openAuth('signup')
  }

  if (authOnly) return <div className="public-page public-auth-page"><PublicHeader user={user} onOpenAuth={openAuth}/><main id="acceso" className="public-auth-standalone"><section className={`public-login-card${user && !recoveryMode ? ' public-welcome-card' : ''}`}>{user && !recoveryMode ? <><span className="public-card-kicker">Sesión activa</span><h2>Ya estás dentro de Hazento</h2><p>No necesitas volver a ingresar tu contraseña.</p><button className="public-primary" onClick={() => navigate('/app')}>Ir a Hazento <ArrowRight size={17}/></button></> : <AuthForm initialMode={authMode} onModeChange={mode => { setAuthMode(mode); window.history.replaceState({}, '', authPath[mode]) }} onAuthenticated={onAuthenticated} onRecoveryComplete={onRecoveryComplete}/>}</section></main></div>

  return <div className="public-page">
    <PublicHeader user={user} onOpenAuth={openAuth}/>
    <main>
      <section className="public-hero" aria-labelledby="public-hero-title">
        <div className="public-hero-media">
          <picture><source srcSet="/images/hazento-professionals-hero.webp" type="image/webp"/><img src="/images/hazento-professionals-hero.jpg" width="1920" height="1080" alt="Profesionales independientes colaborando en un espacio de trabajo cálido"/></picture>
          <div className="public-hero-copy"><span>Hazento para profesionales independientes</span><h1 id="public-hero-title">Tu trabajo, tus clientes y tus cobros en un solo lugar</h1><p>Organiza clientes, agenda, proyectos y pagos sin convertir la gestión en otro trabajo.</p><ul><li>Todo lo pendiente, en una sola vista.</li><li>Menos planillas y seguimientos olvidados.</li></ul></div>
        </div>
        <div className="public-hero-access" id="acceso">
          {user ? <section className="public-login-card public-welcome-card"><span className="public-card-kicker">Tu espacio está listo</span><h2>Hola{user.email ? `, ${user.email.split('@')[0]}` : ''}</h2><p>Continúa donde quedaste y mantén tu negocio al día.</p><button className="public-primary" onClick={() => navigate('/app')}>Ir a Hazento <ArrowRight size={17}/></button></section> : <>
            <div className="public-mobile-actions"><button className="public-primary" onClick={() => openAuth('signup')}>Crear cuenta gratis</button><button className="public-secondary" onClick={() => openAuth('login')}>Ingresar</button></div>
            <section className={`public-login-card${mobileAuthOpen ? ' mobile-visible' : ''}`}><AuthForm initialMode={authMode} onModeChange={mode => { setAuthMode(mode); window.history.replaceState({}, '', authPath[mode]) }} onAuthenticated={onAuthenticated} compact/></section>
          </>}
        </div>
      </section>

      <section className="public-section public-pains" aria-labelledby="pain-title"><div className="public-section-heading"><span>Un negocio más claro</span><h2 id="pain-title">Tu trabajo no debería depender de recordar todo</h2><p>Cuando los clientes, las fechas y los pagos están repartidos entre mensajes, calendarios y planillas, es fácil perder oportunidades y tiempo.</p></div><div className="public-pain-grid">{painPoints.map(({ icon: Icon, title, text }) => <article key={title}><span><Icon size={22}/></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>

      <section className="public-section public-how" id="como-funciona" aria-labelledby="how-title"><div className="public-section-heading"><span>Cómo funciona</span><h2 id="how-title">Organiza tu trabajo en pocos pasos</h2></div><ol>{steps.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol><div className="public-how-note"><BriefcaseBusiness size={20}/><p>El mismo Hazento se adapta al lenguaje de salud, diseño, creación de contenido, docencia y otras actividades.</p></div></section>

      <section className="public-section public-pricing" id="planes" aria-labelledby="plans-title"><div className="public-section-heading"><span>Planes simples</span><h2 id="plans-title">Empieza gratis. Avanza cuando lo necesites.</h2><p>Organiza lo esencial desde el primer día y activa Plus cuando tu forma de trabajar lo necesite.</p></div><div className="public-plan-grid"><PricingCard planId="free" user={user} onChoose={choosePlan}/><PricingCard planId="plus" user={user} onChoose={choosePlan}/></div></section>

      <section className="public-final-cta"><div><span>Haz espacio para tu trabajo</span><h2>Ordena hoy el trabajo que hace crecer tu negocio</h2><p>Empieza gratis y lleva clientes, agenda y pagos desde un solo lugar.</p></div><div><button className="public-primary" onClick={() => user ? navigate('/app') : openAuth('signup')}>{user ? 'Ir a Hazento' : 'Crear cuenta gratis'}</button><button className="public-secondary" onClick={() => document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' })}>Conocer Hazento Plus</button></div></section>
    </main>
    <footer className="public-footer"><a className="public-brand" href="/">Hazento</a><nav aria-label="Enlaces del pie"><a href="#planes">Planes</a>{user ? <button onClick={() => navigate('/app')}>Ir a Hazento</button> : <button onClick={() => openAuth('login')}>Ingreso</button>}</nav><small>© {new Date().getFullYear()} Hazento</small></footer>
  </div>
}
