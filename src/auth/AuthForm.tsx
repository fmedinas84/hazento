import { FormEvent, useEffect, useId, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { COUNTRIES, countryEntries, enabledCountryCode, type CountryCode } from '../countries'

export type AuthMode = 'login' | 'signup' | 'forgot' | 'update'

type AuthFormProps = {
  initialMode?: AuthMode
  onAuthenticated?: (user: User) => void
  onModeChange?: (mode: AuthMode) => void
  onRecoveryComplete?: () => void
  compact?: boolean
  planIntent?: 'free' | 'plus' | null
}

const authErrorMessage = (cause: unknown) => {
  const message = cause instanceof Error ? cause.message.toLowerCase() : ''
  if (message.includes('invalid login')) return 'Correo o contraseña incorrectos.'
  if (message.includes('email not confirmed')) return 'Confirma tu correo antes de ingresar.'
  if (message.includes('network') || message.includes('fetch')) return 'No pudimos conectarnos. Revisa tu conexión e inténtalo nuevamente.'
  if (message.includes('already registered')) return 'Ya existe una cuenta con este correo.'
  return 'No pudimos completar esta acción. Inténtalo nuevamente.'
}

export function AuthForm({ initialMode = 'login', onAuthenticated, onModeChange, onRecoveryComplete, compact = false, planIntent = null }: AuthFormProps) {
  const [mode, setModeState] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [countryCode, setCountryCode] = useState<CountryCode | ''>('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const errorId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => setModeState(initialMode), [initialMode])

  const setMode = (next: AuthMode) => {
    setModeState(next)
    setError('')
    setNotice('')
    onModeChange?.(next)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (!supabase) {
      setError('El acceso no está disponible en este entorno.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
        if (resetError) throw resetError
        setNotice('Te enviamos un enlace para crear una nueva contraseña. Revisa tu correo.')
        return
      }
      if (mode === 'update') {
        if (password !== passwordConfirmation) throw new Error('password mismatch')
        const { data, error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
        setNotice('Tu contraseña fue actualizada correctamente.')
        onRecoveryComplete?.()
        if (data.user) onAuthenticated?.(data.user)
        return
      }
      if (mode === 'signup' && !enabledCountryCode(countryCode)) throw new Error('country required')
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { country_code: countryCode }, emailRedirectTo: `${window.location.origin}${planIntent === 'plus' ? '/configuracion?tab=Facturación' : '/app'}` } })
      if (result.error) throw result.error
      if (result.data.session?.user) onAuthenticated?.(result.data.session.user)
      else if (mode === 'signup') setNotice('Cuenta creada. Revisa tu correo para confirmar tu email antes de ingresar.')
    } catch (cause) {
      if (cause instanceof Error && cause.message === 'password mismatch') setError('Las contraseñas no coinciden.')
      else if (cause instanceof Error && cause.message === 'country required') setError('Selecciona el país donde trabajas.')
      else setError(authErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'login' ? 'Entra a tu espacio de trabajo' : mode === 'signup' && planIntent === 'plus' ? 'Crea tu cuenta para comenzar con Hazento Plus' : mode === 'signup' ? 'Crea tu cuenta gratis' : mode === 'forgot' ? 'Recupera tu contraseña' : 'Crea una nueva contraseña'
  const submitLabel = mode === 'login' ? 'Ingresar' : mode === 'signup' ? 'Crear cuenta gratis' : mode === 'forgot' ? 'Enviar enlace' : 'Actualizar contraseña'

  return <form className={`auth-form${compact ? ' auth-form-compact' : ''}`} onSubmit={submit} aria-describedby={error ? errorId : undefined}>
    {(mode === 'login' || mode === 'signup') && <div className="auth-mode-tabs" role="group" aria-label="Acceso a Hazento"><button type="button" aria-pressed={mode === 'login'} onClick={() => setMode('login')}>Ingresar</button><button type="button" aria-pressed={mode === 'signup'} onClick={() => setMode('signup')}>Crear cuenta</button></div>}
    <div className="auth-form-heading"><h2 ref={headingRef} data-auth-heading tabIndex={-1}>{title}</h2><p>{mode === 'forgot' ? 'Escribe tu correo y te enviaremos un enlace seguro para crear una nueva contraseña.' : mode === 'update' ? 'Elige una contraseña de al menos 8 caracteres.' : mode === 'signup' ? 'Empieza a organizar tu trabajo sin tarjeta de crédito.' : 'Revisa tus clientes, agenda y pendientes.'}</p></div>
    {mode !== 'update' && <label><span>Correo electrónico</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" inputMode="email" /></label>}
    {mode !== 'forgot' && <label><span>{mode === 'update' ? 'Nueva contraseña' : 'Contraseña'}</span><span className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} aria-invalid={Boolean(error)} /><button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span></label>}
    {mode === 'signup' && <label className="auth-country-field"><span>País donde trabajas</span><select value={countryCode} onChange={event => setCountryCode(event.target.value as CountryCode | '')} required><option value="" disabled>Selecciona tu país</option>{countryEntries.map(([code, country]) => <option key={code} value={code} disabled={!country.enabled}>{country.name}{country.enabled ? '' : ' — Próximamente'}</option>)}</select><small>Cuéntanos en qué país realizas principalmente tu trabajo. No importa dónde naciste: usamos este dato para adaptar Hazento a tu moneda y a las funciones disponibles en tu país.</small><small>Este dato quedará asociado a tu workspace. Si necesitas corregirlo después, podrás solicitarlo a soporte.</small>{countryCode && <small>Moneda del workspace: {COUNTRIES[countryCode].currency}</small>}</label>}
    {mode === 'update' && <label><span>Confirmar nueva contraseña</span><input type="password" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} required minLength={8} autoComplete="new-password" /></label>}
    {error && <p className="form-error" id={errorId} role="alert">{error}</p>}
    {notice && <p className="form-notice" role="status">{notice}</p>}
    <button className="public-primary" disabled={busy}>{busy ? 'Procesando…' : submitLabel}</button>
    {mode === 'login' && <div className="auth-form-links"><button type="button" onClick={() => setMode('forgot')}>¿Olvidaste tu contraseña?</button><span>¿Aún no usas Hazento?</span><button type="button" className="auth-register-link" onClick={() => setMode('signup')}>Crea tu cuenta gratis</button></div>}
    {(mode === 'signup' || mode === 'forgot') && <button className="auth-back-link" type="button" onClick={() => setMode('login')}>Volver a iniciar sesión</button>}
    {mode === 'signup' && <small className="auth-no-card">Sin tarjeta de crédito</small>}
  </form>
}
