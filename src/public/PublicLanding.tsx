import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { ArrowRight, CalendarDays, Check, Clapperboard, GraduationCap, HeartPulse, Menu, Palette, Target, UsersRound, WalletCards, X } from 'lucide-react'
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
const validPlan = (value: string | null): ProductPlanId | null => value === 'free' || value === 'plus' ? value : null
const planFromLocation = () => validPlan(new URLSearchParams(window.location.search).get('plan'))
const pathForAuth = (mode: AuthMode, plan: ProductPlanId | null = null) => `${authPath[mode]}${mode === 'signup' && plan ? `?plan=${plan}` : ''}`
const authModeFromLocation = (): AuthMode => window.location.pathname === '/register' ? 'signup' : window.location.pathname === '/forgot-password' ? 'forgot' : window.location.pathname === '/reset-password' ? 'update' : 'login'

const navigate = (path: string) => {
  window.location.assign(path)
}

function PublicHeader({ user, onOpenAuth }: { user?: User | null; onOpenAuth: (mode: AuthMode, plan?: ProductPlanId | null) => void }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return <header className="public-header">
    <a className="public-brand" href="/" aria-label="Hazento, inicio"><img src="/images/hazento-logo.png" alt="Hazento" /></a>
    <button className="public-menu-toggle" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen(value => !value)}>{open ? <X/> : <Menu/>}</button>
    <nav id="public-navigation" className={open ? 'open' : ''} aria-label="Navegación pública">
      <a href="#como-funciona" onClick={close}>Cómo funciona</a>
      <a href="#planes" onClick={close}>Planes</a>
      {user ? <button className="public-text-action" onClick={() => navigate('/app')}>Ir a Hazento</button> : <button className="public-text-action" onClick={() => { close(); onOpenAuth('login') }}>Ingresar</button>}
      <button className="public-primary public-header-cta" onClick={() => { close(); user ? navigate('/app') : onOpenAuth('signup', 'free') }}>{user ? 'Ir a Hazento' : 'Crear cuenta gratis'}</button>
    </nav>
  </header>
}

const painPoints = [
  { icon: UsersRound, title: '¿Dónde anoté los datos de este cliente?', text: 'Encuentra su información, actividades y trabajo relacionado en una sola ficha.' },
  { icon: CalendarDays, title: '¿Qué tengo pendiente hoy?', text: 'Revisa atenciones, clases, entregables y seguimientos desde una misma agenda.' },
  { icon: WalletCards, title: '¿Ya me pagaron este trabajo?', text: 'Ten claro cuánto solicitaste, cuánto recibiste y qué saldo sigue pendiente.' },
  { icon: Target, title: '¿A quién debía hacer seguimiento?', text: 'Registra tu próxima acción para que ningún cliente u oportunidad quede olvidado.' },
]

const steps = [
  { title: 'Registra cada atención', text: 'Guarda quién fue atendido, cuándo, qué servicio realizaste, cuánto debes cobrar y cuál es el próximo paso.', benefit: 'Toda la información queda vinculada al cliente, sin volver a buscarla en mensajes o planillas.' },
  { title: 'Visualiza tu semana', text: 'Revisa tus próximas atenciones, clases, entregas y seguimientos desde una misma agenda.', benefit: 'Ordena tus prioridades, detecta espacios disponibles y comienza cada día sabiendo qué viene.' },
  { title: 'Haz seguimiento y cobra', text: 'Registra la próxima acción, genera solicitudes de pago y controla lo recibido y lo que sigue pendiente.', benefit: 'Evita seguimientos olvidados y mantén claridad sobre el trabajo realizado y sus cobros.' },
]

const professions = [
  { icon: HeartPulse, title: 'Salud', text: 'Pacientes, tratamientos, atenciones y seguimientos.' },
  { icon: Palette, title: 'Diseño y servicios profesionales', text: 'Clientes, proyectos, entregables y oportunidades.' },
  { icon: GraduationCap, title: 'Clases y sesiones', text: 'Alumnos, planes, clases y próximas actividades.' },
  { icon: Clapperboard, title: 'Creación de contenido', text: 'Marcas, partnerships, contenidos y compromisos pendientes.' },
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
  const [planIntent, setPlanIntent] = useState<ProductPlanId | null>(planFromLocation)

  useEffect(() => {
    const privateAuthPage = authOnly || window.location.pathname !== '/'
    document.title = privateAuthPage ? `${authMode === 'signup' ? 'Crear cuenta' : authMode === 'forgot' ? 'Recuperar contraseña' : authMode === 'update' ? 'Actualizar contraseña' : 'Ingresar'} | Hazento` : 'Hazento | Clientes, agenda y cobros para profesionales independientes'
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (robots) robots.content = privateAuthPage ? 'noindex, nofollow' : 'index, follow'
    return () => { if (robots) robots.content = 'index, follow' }
  }, [authMode, authOnly])

  useEffect(() => {
    const restoreAuthRoute = () => {
      const nextMode = authModeFromLocation()
      setAuthMode(nextMode)
      setPlanIntent(nextMode === 'signup' ? planFromLocation() : null)
      setMobileAuthOpen(authOnly || nextMode !== 'login')
    }
    window.addEventListener('popstate', restoreAuthRoute)
    return () => window.removeEventListener('popstate', restoreAuthRoute)
  }, [authOnly])

  const revealAuth = () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById('acceso')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
      window.setTimeout(() => document.querySelector<HTMLElement>('[data-auth-heading]')?.focus({ preventScroll: true }), reducedMotion ? 0 : 350)
    }))
  }
  const openAuth = (mode: AuthMode, plan: ProductPlanId | null = null) => {
    setAuthMode(mode)
    setPlanIntent(mode === 'signup' ? plan : null)
    setMobileAuthOpen(true)
    const nextPath = pathForAuth(mode, plan)
    if (`${window.location.pathname}${window.location.search}` !== nextPath) window.history.pushState({}, '', nextPath)
    revealAuth()
  }
  const choosePlan = (plan: ProductPlanId) => {
    if (user) navigate(plan === 'plus' ? '/configuracion?tab=Facturación' : '/app')
    else openAuth('signup', plan)
  }

  const handleModeChange = (mode: AuthMode) => {
    const nextPlan = mode === 'signup' ? planIntent : null
    setAuthMode(mode)
    setPlanIntent(nextPlan)
    const nextPath = pathForAuth(mode, nextPlan)
    if (`${window.location.pathname}${window.location.search}` !== nextPath) window.history.pushState({}, '', nextPath)
  }

  if (authOnly) return <div className="public-page public-auth-page"><PublicHeader user={user} onOpenAuth={openAuth}/><main id="acceso" className="public-auth-standalone"><section className={`public-login-card${user && !recoveryMode ? ' public-welcome-card' : ''}`}>{user && !recoveryMode ? <><span className="public-card-kicker">Sesión activa</span><h2>Ya estás dentro de Hazento</h2><p>No necesitas volver a ingresar tu contraseña.</p><button className="public-primary" onClick={() => navigate('/app')}>Ir a Hazento <ArrowRight size={17}/></button></> : <AuthForm initialMode={authMode} planIntent={planIntent} onModeChange={handleModeChange} onAuthenticated={onAuthenticated} onRecoveryComplete={onRecoveryComplete}/>}</section></main></div>

  return <div className="public-page">
    <PublicHeader user={user} onOpenAuth={openAuth}/>
    <main>
      <section className="public-hero" aria-labelledby="public-hero-title">
        <div className="public-hero-media">
          <picture><source srcSet="/images/hazento-independent-professional-hero-v2.webp" type="image/webp"/><img src="/images/hazento-independent-professional-hero-v2.jpg" width="1674" height="941" alt="Profesional independiente conversando con una clienta en un estudio cálido"/></picture>
          <div className="public-hero-copy"><span>Hazento para profesionales independientes</span><h1 id="public-hero-title">Trabajar por tu cuenta no significa tener que llevarlo todo en la cabeza</h1><p>Hazento reúne tus clientes, agenda, proyectos y cobros para que sepas qué viene, qué falta y qué ya te pagaron.</p><ul><li>Ten claro qué necesitas hacer hoy.</li><li>Encuentra todo el historial de cada cliente.</li><li>Revisa qué trabajos y pagos siguen pendientes.</li></ul></div>
        </div>
        <div className="public-hero-access" id="acceso">
          {user ? <section className="public-login-card public-welcome-card"><span className="public-card-kicker">Tu espacio está listo</span><h2>Hola{user.email ? `, ${user.email.split('@')[0]}` : ''}</h2><p>Continúa donde quedaste y mantén tu negocio al día.</p><button className="public-primary" onClick={() => navigate('/app')}>Ir a Hazento <ArrowRight size={17}/></button></section> : <>
            <div className="public-mobile-actions"><button className="public-primary" onClick={() => openAuth('signup', 'free')}>Crear cuenta gratis</button><button className="public-secondary" onClick={() => openAuth('login')}>Ingresar</button></div>
            <section className={`public-login-card${mobileAuthOpen ? ' mobile-visible' : ''}`}><AuthForm initialMode={authMode} planIntent={planIntent} onModeChange={handleModeChange} onAuthenticated={onAuthenticated} compact/></section>
          </>}
        </div>
      </section>

      <section className="public-section public-pains" aria-labelledby="pain-title"><div className="public-section-heading"><span>Un negocio más claro</span><h2 id="pain-title">Tu trabajo no debería depender de recordar todo</h2><p>Cuando los clientes, las fechas y los pagos están repartidos entre mensajes, calendarios y planillas, es fácil perder oportunidades y tiempo.</p></div><div className="public-pain-grid">{painPoints.map(({ icon: Icon, title, text }) => <article key={title}><span><Icon size={22}/></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>

      <section className="public-section public-professions" aria-labelledby="professions-title"><div className="public-section-heading"><span>Un sistema que se adapta</span><h2 id="professions-title">Hazento se adapta a la forma en que trabajas</h2><p>Un mismo sistema, con el lenguaje y la organización que necesita tu actividad.</p></div><div className="public-profession-grid">{professions.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={24}/><h3>{title}</h3><p>{text}</p></article>)}</div><p className="public-professions-note">Configura Hazento una vez y trabaja con las palabras que ya usas todos los días.</p></section>

      <section className="public-section public-how" id="como-funciona" aria-labelledby="how-title"><div className="public-section-heading"><span>Cómo funciona</span><h2 id="how-title">De cada atención al cobro, todo conectado</h2><p>Hazento reúne lo que haces, lo que viene y lo que todavía tienes pendiente.</p></div><ol>{steps.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{step.title}</h3><p>{step.text}</p><p className="public-step-benefit">{step.benefit}</p></li>)}</ol></section>

      <section className="public-section public-pricing" id="planes" aria-labelledby="plans-title"><div className="public-section-heading"><span>Planes simples</span><h2 id="plans-title">Empieza gratis. Avanza cuando lo necesites.</h2><p>Organiza lo esencial desde el primer día y activa Plus cuando tu forma de trabajar lo necesite.</p></div><div className="public-plan-grid"><PricingCard planId="free" user={user} onChoose={choosePlan}/><PricingCard planId="plus" user={user} onChoose={choosePlan}/></div></section>

      <section className="public-final-cta"><div><span>Haz espacio para tu trabajo</span><h2>Ordena hoy el trabajo que hace crecer tu negocio</h2><p>Empieza gratis y lleva clientes, agenda y pagos desde un solo lugar.</p></div><div><button className="public-primary" onClick={() => user ? navigate('/app') : openAuth('signup', 'free')}>{user ? 'Ir a Hazento' : 'Crear cuenta gratis'}</button><button className="public-secondary" onClick={() => document.getElementById('planes')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>Conocer Hazento Plus</button></div></section>
    </main>
    <footer className="public-footer"><a className="public-brand public-brand-text" href="/" aria-label="Hazento, inicio">Hazento</a><nav aria-label="Enlaces del pie"><a href="#planes">Planes</a>{user ? <button onClick={() => navigate('/app')}>Ir a Hazento</button> : <button onClick={() => openAuth('login')}>Ingreso</button>}</nav><small>© {new Date().getFullYear()} Hazento</small></footer>
  </div>
}
