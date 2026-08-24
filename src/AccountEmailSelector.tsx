import { useMemo, useState } from 'react'
import { Check, ChevronDown, Mail, Plus, Search, UserRound, X } from 'lucide-react'
import { findAccountByEmail, isValidEmail, normalizeEmail, type NewAccountRecord } from './accountEmail'
import { OrganizationSelector } from './OrganizationSelector'
import type { OrganizationData } from './data'
import type { NewOrganizationRecord } from './organizationName'
import type { Account } from './store'

const MAX_VISIBLE_ACCOUNTS = 3

type AccountLabels = {
  account: string
  accounts: string
  createAccount: string
  organization: string
  organizationRelationship: string
  createOrganization: string
}

type Props = {
  accounts: Account[]
  labels: AccountLabels
  selectedAccountId: number | null
  onSelect: (account: Account | null) => void
  onCreate: (account: NewAccountRecord) => Account
  organizations: OrganizationData[]
  onCreateOrganization: (organization: NewOrganizationRecord) => OrganizationData
}

export function AccountEmailSelector({ accounts, labels, selectedAccountId, onSelect, onCreate, organizations, onCreateOrganization }: Props) {
  const selected = accounts.find(account => account.id === selectedAccountId)
  const [query, setQuery] = useState(selected?.email || '')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [duplicate, setDuplicate] = useState<Account | null>(null)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [organizationId, setOrganizationId] = useState<number | undefined>()
  const [role, setRole] = useState('')
  const [createError, setCreateError] = useState('')
  const normalizedQuery = normalizeEmail(query)
  const validEmail = isValidEmail(query)
  const exactMatch = findAccountByEmail(accounts, query)
  const inlineCreateLabel = labels.createAccount.replace(/^Nuev[oa]\s+/i, 'Crear ')
  const matches = useMemo(() => {
    if (!normalizedQuery) return accounts.filter(account => account.email).slice(0, MAX_VISIBLE_ACCOUNTS)
    return accounts.filter(account => normalizeEmail(account.email || '').includes(normalizedQuery) || account.name.toLowerCase().includes(normalizedQuery)).slice(0, MAX_VISIBLE_ACCOUNTS)
  }, [accounts, normalizedQuery])

  const choose = (account: Account) => {
    setQuery(account.email || account.name)
    setOpen(false)
    setCreating(false)
    setDuplicate(null)
    setCreateError('')
    onSelect(account)
  }

  const startCreation = () => {
    if (!validEmail) return
    setDuplicate(null)
    setNewName('')
    setNewPhone('')
    setOrganizationId(undefined)
    setRole('')
    setCreateError('')
    setCreating(true)
    setOpen(false)
  }

  const createAccount = () => {
    const existing = findAccountByEmail(accounts, query)
    if (existing) {
      setDuplicate(existing)
      return
    }
    if (!newName.trim()) { setCreateError('Ingresa el nombre para continuar.'); return }
    const created = onCreate({
      name: newName.trim(),
      workspaceId: 1,
      displayName: newName.trim(),
      firstName: newName.trim().split(/\s+/)[0],
      lastName: newName.trim().split(/\s+/).slice(1).join(' '),
      type: 'Persona',
      organizationId,
      role: role.trim() || undefined,
      status: 'Prospecto',
      last: 'Ahora',
      next: '—',
      income: '$0',
      pending: '$0',
      email: normalizeEmail(query),
      phone: newPhone.trim(),
      rut: '',
    })
    choose(created)
  }

  return <div className="account-email-selector form-span">
    <label><span>Email del {labels.account.toLowerCase()} *</span><div className="account-email-input"><Mail size={16}/><input
      type={selected && !selected.email ? 'text' : 'email'}
      value={query}
      autoComplete="email"
      placeholder={`Busca por email de ${labels.account.toLowerCase()}`}
      required={!selected}
      inputMode="email"
      autoFocus
      aria-expanded={open}
      aria-controls="account-email-results"
      onFocus={() => setOpen(Boolean(query.trim()))}
      onChange={event => { setQuery(event.target.value); setOpen(true); setCreating(false); setDuplicate(null); if (selectedAccountId) onSelect(null) }}
      onKeyDown={event => {
        if (event.key === 'Escape') setOpen(false)
        if (event.key === 'Enter' && exactMatch) { event.preventDefault(); choose(exactMatch) }
        if (event.key === 'Enter' && validEmail && !exactMatch) { event.preventDefault(); startCreation() }
      }}
    />{selected ? <Check size={16} className="account-selected-check"/> : <ChevronDown size={16}/>}</div></label>

    {open && !creating && <div className="account-email-results" id="account-email-results" role="listbox">
      <div className="account-result-heading"><Search size={14}/>{normalizedQuery ? 'Coincidencias por email' : `${labels.accounts} recientes`}</div>
      {matches.map(account => <button type="button" role="option" aria-selected={account.id === selectedAccountId} onClick={() => choose(account)} key={account.id}>
        <span className="account-result-avatar">{account.initials || <UserRound size={15}/>}</span><span><b>{account.email || 'Sin email'}</b><small>{account.name} · {labels.account} {account.status.toLowerCase()}</small></span>{account.id === selectedAccountId && <Check size={16}/>}</button>)}
      {!matches.length && normalizedQuery && <p>No encontramos {labels.account.toLowerCase()} con ese email.</p>}
      {validEmail && !exactMatch && <button type="button" className="account-create-option" onClick={startCreation}><Plus size={16}/><span><b>{inlineCreateLabel}</b><small>Usar {normalizeEmail(query)}</small></span></button>}
      {normalizedQuery && !validEmail && <p>Completa un email válido para crear {labels.account.toLowerCase()}.</p>}
    </div>}

    {selected && !creating && <div className="selected-account-summary"><span className="account-result-avatar">{selected.initials}</span><span><small>{labels.account} seleccionado</small><b>{selected.name}</b><em>{selected.email || 'Sin email'}</em></span><button type="button" aria-label={`Cambiar ${labels.account.toLowerCase()}`} onClick={() => { setQuery(''); setOpen(true); onSelect(null) }}><X size={15}/></button></div>}

    {creating && <section className="inline-account-create" aria-label={inlineCreateLabel}>
      <div><span className="section-kicker">Sin salir del formulario</span><h3>{inlineCreateLabel}</h3><p>Al guardar quedará seleccionado automáticamente.</p></div>
      <div className="inline-account-fields" onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); createAccount() } }}>
        <label><span>Email *</span><input value={normalizeEmail(query)} readOnly /></label>
        <label><span>Nombre del {labels.account.toLowerCase()} *</span><input value={newName} onChange={event => { setNewName(event.target.value); setCreateError('') }} required autoFocus /></label>
        <label><span>Teléfono</span><input value={newPhone} onChange={event => setNewPhone(event.target.value)} autoComplete="tel" /></label>
        <OrganizationSelector labels={labels} organizations={organizations} selectedId={organizationId} onSelect={organization => setOrganizationId(organization?.id)} onCreate={onCreateOrganization}/>
        <label><span>Cargo / Rol</span><input value={role} onChange={event => setRole(event.target.value)} placeholder="Opcional" disabled={!organizationId}/></label>
        {createError && <p className="form-error">{createError}</p>}
        {duplicate && <div className="duplicate-account"><b>Ya existe {labels.account.toLowerCase()} con este email.</b><span>{duplicate.name}<small>{duplicate.email}</small></span><button type="button" className="secondary-btn" onClick={() => choose(duplicate)}>Usar este {labels.account.toLowerCase()}</button></div>}
        <footer><button type="button" className="ghost-btn" onClick={() => { setCreating(false); setOpen(true); setDuplicate(null) }}>Volver</button><button type="button" className="primary-btn" onClick={createAccount}>Crear y seleccionar</button></footer>
      </div>
    </section>}
  </div>
}
