import { Building2, Check, ChevronDown, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { OrganizationData } from './data'
import { findOrganizationByName, type NewOrganizationRecord } from './organizationName'

type Labels = { organization: string; organizationRelationship: string; createOrganization: string }

export function OrganizationSelector({ organizations, labels, selectedId, onSelect, onCreate }: {
  organizations: OrganizationData[]
  labels: Labels
  selectedId?: string
  onSelect: (organization?: OrganizationData) => void
  onCreate: (record: NewOrganizationRecord) => Promise<OrganizationData>
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [legalName, setLegalName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const selected = organizations.find(organization => organization.id === selectedId)
  const duplicate = creating ? findOrganizationByName(organizations, query) : undefined
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return organizations.filter(organization => !normalized || organization.name.toLowerCase().includes(normalized)).slice(0, 5)
  }, [organizations, query])

  const choose = (organization?: OrganizationData) => {
    onSelect(organization)
    setOpen(false)
    setCreating(false)
    setQuery('')
  }

  const create = async () => {
    const name = query.trim().replace(/\s+/g, ' ')
    if (!name || duplicate) return
    setSaving(true); setError('')
    try { choose(await onCreate({ workspaceId: 'workspace-demo-001', name, legalName: legalName.trim() || undefined, taxId: taxId.trim() || undefined })) } catch { setError('No pudimos crear la organización. Inténtalo nuevamente.') } finally { setSaving(false) }
    setLegalName('')
    setTaxId('')
  }

  return <div className="organization-selector">
    <span>{labels.organizationRelationship}</span>
    <button type="button" className="organization-trigger" onClick={() => setOpen(value => !value)}>
      <Building2 size={16}/><span>{selected?.name || 'Organización opcional'}</span>
      {selected ? <X size={15} onClick={event => { event.stopPropagation(); choose(undefined) }}/> : <ChevronDown size={15}/>} 
    </button>
    {open && <div className="organization-popover">
      <label><Search size={15}/><input autoFocus value={query} onChange={event => { setQuery(event.target.value); setCreating(false) }} placeholder={`Buscar ${labels.organization.toLowerCase()}`}/></label>
      {!creating ? <>
        <button type="button" className="organization-option" onClick={() => choose(undefined)}><span><b>Sin {labels.organization.toLowerCase()}</b><small>Independiente</small></span>{!selected && <Check size={15}/>}</button>
        {matches.map(organization => <button type="button" className="organization-option" onClick={() => choose(organization)} key={organization.id}><span><b>{organization.name}</b><small>{organization.legalName || labels.organization}</small></span>{selectedId === organization.id && <Check size={15}/>}</button>)}
        {query.trim() && !findOrganizationByName(organizations, query) && <button type="button" className="organization-create" onClick={() => setCreating(true)}><Plus size={15}/>Crear {labels.organization.toLowerCase()} “{query.trim()}”</button>}
      </> : <div className="organization-inline-create">
        <span className="section-kicker">{labels.createOrganization}</span>
        <label><span>Nombre *</span><input value={query} onChange={event => setQuery(event.target.value)}/></label>
        <label><span>RUT</span><input value={taxId} onChange={event => setTaxId(event.target.value)} placeholder="Opcional"/></label>
        <label><span>Razón social</span><input value={legalName} onChange={event => setLegalName(event.target.value)} placeholder="Opcional"/></label>
        {duplicate && <div className="organization-duplicate"><b>Ya existe {labels.organization.toLowerCase()} con un nombre similar.</b><span>{duplicate.name}</span><button type="button" className="secondary-btn" onClick={() => choose(duplicate)}>Usar esta {labels.organization.toLowerCase()}</button></div>}
        {error && <p className="form-error">{error}</p>}<footer><button type="button" className="ghost-btn" onClick={() => setCreating(false)}>Volver</button><button type="button" className="primary-btn" disabled={saving || !query.trim() || Boolean(duplicate)} onClick={create}>{saving ? 'Guardando...' : 'Crear y seleccionar'}</button></footer>
      </div>}
    </div>}
  </div>
}
