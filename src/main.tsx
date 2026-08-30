import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { DemoProvider } from './store'
import { SupabaseDataProvider } from './persistence/SupabaseDataProvider'
import { dataSource } from './persistence/dataSource'
import { PublicLanding } from './public/PublicLanding'
import './styles.css'
import './public/public.css'
import './public/public-refinement.css'

const App = lazy(() => import('./App'))
const appFallback = <div className="public-page" role="status" aria-label="Cargando Hazento" />

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Suspense fallback={appFallback}>{dataSource === 'supabase'
    ? <SupabaseDataProvider><App /></SupabaseDataProvider>
    : window.location.pathname === '/' || ['/login','/register','/forgot-password','/reset-password'].includes(window.location.pathname)
      ? <PublicLanding initialAuthMode={window.location.pathname === '/register' ? 'signup' : window.location.pathname === '/forgot-password' ? 'forgot' : window.location.pathname === '/reset-password' ? 'update' : 'login'} authOnly={window.location.pathname !== '/'} onAuthenticated={() => { window.location.assign('/app') }}/>
      : <DemoProvider><App /></DemoProvider>}
  </Suspense></React.StrictMode>,
)
