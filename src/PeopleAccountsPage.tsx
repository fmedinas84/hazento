import { Building2, ChevronRight, Pencil, Plus, Search, UsersRound, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { OrganizationData, Vertical } from './data'
import { verticalLabels } from './data'
import { useRepositories } from './repositories'

type Labels = typeof verticalLabels[Vertical]

function OrganizationDialog({ organization, labels, onClose, onUse }: { organization?: OrganizationData; labels: Labels; onClose: () => void; onUse: (organization: OrganizationData) => void }) {
  const repository = useRepositories()
  const [editing, setEditing] = useState(!organization)
  const [duplicate, setDuplicate] = useState<OrganizationData | null>(null)
  const current = organization ? repository.organizations.find(record => record.id === organization.id) : undefined
  const people = current ? repository.accounts.filter(person => person.organizationId === current.id) : []
  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    const record = {
      workspaceId: 1,
      name: String(values.name || '').trim(), legalName: String(values.legalName || '').trim() || undefined,
      taxId: String(values.taxId || '').trim() || undefined, email: String(values.email || '').trim() || undefined,
      phone: String(values.phone || '').trim() || undefined, website: String(values.website || '').trim() || undefined,
      businessActivity: String(values.businessActivity || '').trim() || undefined, address: String(values.address || '').trim() || undefined,
      commune: String(values.commune || '').trim() || undefined, city: String(values.city || '').trim() || undefined,
      region: String(values.region || '').trim() || undefined, notes: String(values.notes || '').trim() || undefined,
    }
    const duplicate = repository.organizationRepository.findByName(record.name)
    if (!current && duplicate) { setDuplicate(duplicate); return }
    if (current) repository.organizationRepository.update(current.id, record)
    else repository.organizationRepository.create(record)
    onClose()
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal organization-dialog" role="dialog" aria-modal="true" aria-label={current?.name || labels.createOrganization} onMouseDown={event => event.stopPropagation()}>
    <header><div><span className="section-kicker">Entidad secundaria</span><h2>{current?.name || labels.createOrganization}</h2><p>{current ? `${people.length} ${people.length === 1 ? 'persona relacionada' : 'personas relacionadas'}` : `Solo el nombre de la ${labels.organization.toLowerCase()} es obligatorio.`}</p></div><button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={18}/></button></header>
    {editing ? <form onSubmit={save}><div className="form-grid"><label><span>Nombre *</span><input name="name" required autoFocus defaultValue={current?.name} onChange={() => setDuplicate(null)}/></label><label><span>Razón social</span><input name="legalName" defaultValue={current?.legalName}/></label><label><span>RUT</span><input name="taxId" defaultValue={current?.taxId}/></label><label><span>Giro</span><input name="businessActivity" defaultValue={current?.businessActivity}/></label><label><span>Email</span><input name="email" type="email" defaultValue={current?.email}/></label><label><span>Teléfono</span><input name="phone" defaultValue={current?.phone}/></label><label><span>Sitio web</span><input name="website" defaultValue={current?.website}/></label><label><span>Dirección</span><input name="address" defaultValue={current?.address}/></label><label><span>Comuna</span><input name="commune" defaultValue={current?.commune}/></label><label><span>Ciudad</span><input name="city" defaultValue={current?.city}/></label><label><span>Región</span><input name="region" defaultValue={current?.region}/></label><label className="form-span"><span>Notas</span><textarea name="notes" rows={3} defaultValue={current?.notes}/></label></div>{duplicate && <div className="organization-duplicate"><b>Ya existe una {labels.organization.toLowerCase()} con un nombre similar.</b><span>{duplicate.name}</span><button type="button" className="secondary-btn" onClick={() => onUse(duplicate)}>Usar esta {labels.organization.toLowerCase()}</button></div>}<footer className="modal-actions"><button type="button" className="ghost-btn" onClick={() => current ? setEditing(false) : onClose()}>Cancelar</button><button className="primary-btn">Guardar</button></footer></form> : <>
      <div className="organization-dialog-view">
        <div className="organization-summary"><div><span>Razón social</span><b>{current?.legalName || 'Pendiente'}</b></div><div><span>RUT</span><b>{current?.taxId || 'Pendiente'}</b></div><div><span>Contacto</span><b>{current?.email || current?.phone || 'Sin datos'}</b></div><div><span>Ubicación</span><b>{[current?.commune, current?.city, current?.region].filter(Boolean).join(', ') || 'Sin dirección'}</b></div></div>
        <section className="organization-people"><div className="card-heading organization-people-heading"><h2>Personas relacionadas</h2><button className="secondary-btn" onClick={() => setEditing(true)}><Pencil size={15}/>Editar empresa</button></div><div className="organization-people-list">{people.length ? people.map(person => <div className="organization-person-row" key={person.id}><span className="avatar" style={{ background: person.color }}>{person.initials}</span><span><b>{person.name}</b><small>{person.role || 'Sin cargo'} · {person.email}</small></span></div>) : <p>Nadie está asociado todavía a esta {labels.organization.toLowerCase()}.</p>}</div></section>
      </div>
      <footer className="modal-actions organization-dialog-footer"><button className="primary-btn" onClick={onClose}>Listo</button></footer>
    </>}
  </section></div>
}

export function PeopleAccountsPage({ labels, go, onCreate }: { labels: Labels; go: (page: 'account', query: { id: number }) => void; onCreate: () => void }) {
  const repository = useRepositories()
  const requestedOrganizationId = Number(new URLSearchParams(window.location.search).get('organization')) || null
  const [view, setView] = useState<'people' | 'organizations'>(requestedOrganizationId ? 'organizations' : 'people')
  const [status, setStatus] = useState('Todos')
  const [query, setQuery] = useState('')
  const [ascending, setAscending] = useState(true)
  const [organizationId, setOrganizationId] = useState<number | null>(requestedOrganizationId)
  const [creatingOrganization, setCreatingOrganization] = useState(false)
  const organizationById = useMemo(() => new Map(repository.organizations.map(organization => [organization.id, organization])), [repository.organizations])
  const normalized = query.trim().toLowerCase()
  const people = [...repository.accounts.filter(person => (status === 'Todos' || person.status === status.slice(0, -1) || person.status === status) && `${person.name} ${person.email || ''} ${organizationById.get(person.organizationId || 0)?.name || ''}`.toLowerCase().includes(normalized))].sort((left, right) => ascending ? left.name.localeCompare(right.name) : right.name.localeCompare(left.name))
  const organizations = repository.organizations.filter(organization => organization.name.toLowerCase().includes(normalized))
  const selectedOrganization = repository.organizations.find(organization => organization.id === organizationId)

  return <>
    <div className="page-header"><div><h1>{labels.accounts}</h1><p>{view === 'people' ? `Cada ${labels.account.toLowerCase()} es una persona; la ${labels.organization.toLowerCase()} es opcional.` : `${labels.organizations} relacionadas con tus personas, sin dominar la relación.`}</p></div><button className="primary-btn" onClick={() => view === 'people' ? onCreate() : setCreatingOrganization(true)}><Plus size={16}/>{view === 'people' ? labels.createAccount : labels.createOrganization}</button></div>
    <nav className="people-tabs" aria-label={`Vistas de ${labels.accounts.toLowerCase()}`}><button className={view === 'people' ? 'active' : ''} onClick={() => { setView('people'); setQuery('') }}><UsersRound size={16}/>{labels.peopleTab}</button><button className={view === 'organizations' ? 'active' : ''} onClick={() => { setView('organizations'); setQuery('') }}><Building2 size={16}/>{labels.organizations}</button></nav>
    <div className="toolbar card"><div className="tabs">{view === 'people' ? ['Todos','Prospectos','Activos','Inactivos'].map(item => <button className={status === item ? 'active' : ''} onClick={() => setStatus(item)} key={item}>{item}</button>) : <span className="section-kicker">{organizations.length} {labels.organizations.toLowerCase()}</span>}</div><div className="toolbar-actions"><label className="search-small"><Search size={16}/><input aria-label={`Buscar ${view === 'people' ? labels.peopleTab.toLowerCase() : labels.organizations.toLowerCase()}`} value={query} onChange={event => setQuery(event.target.value)} placeholder={`Buscar ${view === 'people' ? labels.account.toLowerCase() : labels.organization.toLowerCase()}`}/></label>{view === 'people' && <button className="secondary-btn" onClick={() => setAscending(value => !value)}>{ascending ? 'A–Z' : 'Z–A'}</button>}</div></div>
    {view === 'people' ? <div className="table-card card people-table"><table><thead><tr><th>Persona</th><th>{labels.organization} / cargo</th><th>Estado</th><th>Última actividad</th><th>Próxima actividad</th><th>Ingresos</th><th>Pendiente</th><th/></tr></thead><tbody>{people.map(person => { const organization = organizationById.get(person.organizationId || 0); return <tr key={person.id} onClick={() => go('account', { id: person.id })}><td><div className="person-cell"><span className="avatar" style={{ background: person.color }}>{person.initials}</span><div><b>{person.name}</b><span>{person.email || 'Sin email'}</span></div></div></td><td><span className="people-org-cell"><b>{organization?.name || 'Independiente'}</b><small>{person.role || (organization ? 'Sin cargo' : 'Sin empresa asociada')}</small></span></td><td><span className={`badge badge-${person.status.toLowerCase()}`}>{person.status}</span></td><td>{person.last}</td><td>{person.next}</td><td className="number">{person.income}</td><td className={person.pending === '$0' ? 'muted' : 'pending-number'}>{person.pending}</td><td><ChevronRight size={16}/></td></tr> })}</tbody></table>{!people.length && <div className="empty-state"><h3>No encontramos personas</h3><p>Prueba otra búsqueda o crea tu primera persona.</p><button className="primary-btn" onClick={onCreate}>{labels.createAccount}</button></div>}</div> : <div className="table-card card organization-list"><table><thead><tr><th>{labels.organization}</th><th>Personas relacionadas</th><th>RUT</th><th>Ciudad</th><th/></tr></thead><tbody>{organizations.map(organization => { const count = repository.accounts.filter(person => person.organizationId === organization.id).length; return <tr onClick={() => setOrganizationId(organization.id)} key={organization.id}><td><div className="organization-list-name"><span><Building2 size={17}/></span><b>{organization.name}</b></div></td><td>{count} {count === 1 ? 'persona' : 'personas'}</td><td>{organization.taxId || 'Pendiente'}</td><td>{organization.city || '—'}</td><td><ChevronRight size={16}/></td></tr> })}</tbody></table>{!organizations.length && <div className="empty-state"><h3>No hay {labels.organizations.toLowerCase()}</h3><p>Crea una {labels.organization.toLowerCase()} cuando una persona la represente.</p><button className="primary-btn" onClick={() => setCreatingOrganization(true)}>{labels.createOrganization}</button></div>}</div>}
    {(selectedOrganization || creatingOrganization) && <OrganizationDialog organization={selectedOrganization} labels={labels} onUse={record => { setOrganizationId(record.id); setCreatingOrganization(false) }} onClose={() => { setOrganizationId(null); setCreatingOrganization(false) }}/>} 
  </>
}
