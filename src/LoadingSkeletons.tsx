import { useEffect, useState } from 'react'

type SkeletonPage = 'dashboard' | 'accounts' | 'account' | 'opportunities' | 'opportunity' | 'agenda' | 'work' | 'engagement' | 'prestations' | 'activities' | 'payments' | 'services' | 'settings'

function Bone({ className = '' }: { className?: string }) {
  return <span className={`skeleton-bone ${className}`} />
}

function PageHeadingSkeleton() {
  return <div className="skeleton-page-heading"><div><Bone className="skeleton-title"/><Bone className="skeleton-subtitle"/></div><Bone className="skeleton-action"/></div>
}

function MetricSkeletons({ count = 4 }: { count?: number }) {
  return <div className={`skeleton-metrics skeleton-metrics-${count}`}>{Array.from({ length: count }, (_, index) => <div className="card skeleton-metric" key={index}><Bone className="skeleton-label"/><Bone className="skeleton-value"/><Bone className="skeleton-meta"/></div>)}</div>
}

function RowSkeletons({ count = 5 }: { count?: number }) {
  return <div className="card skeleton-list">{Array.from({ length: count }, (_, index) => <div className="skeleton-row" key={index}><Bone className="skeleton-avatar"/><span><Bone className="skeleton-row-title"/><Bone className="skeleton-row-copy"/></span><Bone className="skeleton-row-status"/><Bone className="skeleton-row-action"/></div>)}</div>
}

function DashboardSkeleton() {
  return <><PageHeadingSkeleton/><MetricSkeletons/><div className="skeleton-dashboard-grid"><section className="card skeleton-panel skeleton-panel-large"><Bone className="skeleton-section-title"/>{Array.from({length:4},(_,index)=><div className="skeleton-agenda-row" key={index}><Bone className="skeleton-time"/><Bone className="skeleton-agenda-content"/></div>)}</section><section className="card skeleton-panel"><Bone className="skeleton-section-title"/>{Array.from({length:3},(_,index)=><div className="skeleton-recommendation" key={index}><Bone className="skeleton-icon"/><span><Bone className="skeleton-row-title"/><Bone className="skeleton-row-copy"/></span></div>)}</section></div></>
}

function AgendaSkeleton() {
  return <><PageHeadingSkeleton/><div className="card skeleton-toolbar"><Bone/><Bone/><Bone/></div><div className="card skeleton-calendar"><div className="skeleton-calendar-header">{Array.from({length:7},(_,index)=><Bone key={index}/>)}</div><div className="skeleton-calendar-body">{Array.from({length:21},(_,index)=><div key={index}><Bone className={index % 4 === 0 ? 'skeleton-event' : ''}/></div>)}</div></div></>
}

function OpportunitiesSkeleton() {
  return <><PageHeadingSkeleton/><MetricSkeletons/><div className="skeleton-card-grid">{Array.from({length:6},(_,index)=><article className="card skeleton-opportunity" key={index}><div><Bone className="skeleton-row-title"/><Bone className="skeleton-row-action"/></div><Bone className="skeleton-section-title"/><Bone className="skeleton-value"/><div><Bone/><Bone/><Bone/></div></article>)}</div></>
}

function WorkSkeleton() {
  return <><PageHeadingSkeleton/><div className="card skeleton-toolbar"><Bone/><Bone/><Bone/></div><div className="skeleton-card-grid">{Array.from({length:4},(_,index)=><article className="card skeleton-work-card" key={index}><Bone className="skeleton-section-title"/><Bone className="skeleton-row-copy"/><Bone className="skeleton-progress"/><Bone className="skeleton-meta"/></article>)}</div></>
}

function DetailSkeleton() {
  return <><section className="card skeleton-detail-header"><Bone className="skeleton-avatar-large"/><div><Bone className="skeleton-title"/><Bone className="skeleton-subtitle"/><Bone className="skeleton-meta"/></div><Bone className="skeleton-action"/></section><MetricSkeletons count={3}/><div className="skeleton-detail-grid"><section className="card skeleton-panel"><Bone className="skeleton-section-title"/><RowSkeletons count={3}/></section><section className="card skeleton-panel"><Bone className="skeleton-section-title"/><Bone className="skeleton-paragraph"/><Bone className="skeleton-paragraph short"/></section></div></>
}

function GenericListSkeleton({ metrics = false }: { metrics?: boolean }) {
  return <><PageHeadingSkeleton/>{metrics && <MetricSkeletons count={2}/>}<div className="card skeleton-toolbar"><Bone/><Bone/><Bone/></div><RowSkeletons/></>
}

export function PageLoadingSkeleton({ page }: { page: SkeletonPage }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => { const timer = window.setTimeout(() => setSlow(true), 3500); return () => window.clearTimeout(timer) }, [])
  let content
  if (page === 'dashboard') content = <DashboardSkeleton/>
  else if (page === 'agenda') content = <AgendaSkeleton/>
  else if (page === 'opportunities') content = <OpportunitiesSkeleton/>
  else if (page === 'work') content = <WorkSkeleton/>
  else if (page === 'account' || page === 'engagement' || page === 'opportunity') content = <DetailSkeleton/>
  else content = <GenericListSkeleton metrics={page === 'payments'}/>
  return <div className="page-loading-skeleton" aria-hidden="true">{content}{slow && <p className="skeleton-slow-message">Está tardando un poco más de lo habitual…</p>}</div>
}

export function RepositoryLoadError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return <section className="card repository-inline-error" role="alert"><div><h1>No pudimos cargar tus datos.</h1><p>{message || 'Revisa tu conexión e inténtalo nuevamente.'}</p></div><button className="primary-btn" onClick={onRetry}>Reintentar</button></section>
}
