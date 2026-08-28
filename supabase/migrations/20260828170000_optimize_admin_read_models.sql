create or replace function public.admin_workspace_usage(
  p_current_start timestamptz,
  p_previous_start timestamptz,
  p_previous_end timestamptz,
  p_now timestamptz
)
returns table (
  user_id uuid,
  workspace_id uuid,
  first_name text,
  last_name text,
  workspace_name text,
  vertical_type text,
  member_created_at timestamptz,
  workspace_created_at timestamptz,
  workspace_updated_at timestamptz,
  plan text,
  subscription_status text,
  provider text,
  subscription_started_at timestamptz,
  next_payment_at timestamptz,
  subscription_created_at timestamptz,
  subscription_updated_at timestamptz,
  clients bigint,
  prestations bigint,
  opportunities bigint,
  payment_requests bigint,
  payments bigint,
  clients_current bigint,
  clients_previous bigint,
  prestations_current bigint,
  prestations_previous bigint,
  recent_events bigint,
  last_activity_at timestamptz,
  first_client_at timestamptz,
  first_prestation_at timestamptz,
  first_payment_at timestamptz,
  total_workspaces bigint,
  failed_reminders bigint
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with account_stats as (
    select workspace_id,
      count(*)::bigint as total,
      count(*) filter (where created_at between p_current_start and p_now)::bigint as current_count,
      count(*) filter (where created_at between p_previous_start and p_previous_end)::bigint as previous_count,
      count(*) filter (where greatest(created_at, updated_at) >= p_now - interval '30 days')::bigint as recent,
      max(greatest(created_at, updated_at)) as last_activity,
      min(created_at) as first_at
    from public.accounts group by workspace_id
  ), prestation_stats as (
    select workspace_id,
      count(*)::bigint as total,
      count(*) filter (where created_at between p_current_start and p_now)::bigint as current_count,
      count(*) filter (where created_at between p_previous_start and p_previous_end)::bigint as previous_count,
      count(*) filter (where greatest(created_at, updated_at) >= p_now - interval '30 days')::bigint as recent,
      max(greatest(created_at, updated_at)) as last_activity,
      min(created_at) as first_at
    from public.prestations group by workspace_id
  ), opportunity_stats as (
    select workspace_id, count(*)::bigint as total,
      count(*) filter (where greatest(created_at, updated_at) >= p_now - interval '30 days')::bigint as recent,
      max(greatest(created_at, updated_at)) as last_activity
    from public.opportunities group by workspace_id
  ), engagement_stats as (
    select workspace_id,
      count(*) filter (where greatest(created_at, updated_at) >= p_now - interval '30 days')::bigint as recent,
      max(greatest(created_at, updated_at)) as last_activity
    from public.engagements group by workspace_id
  ), activity_stats as (
    select workspace_id,
      count(*) filter (where greatest(created_at, updated_at) >= p_now - interval '30 days')::bigint as recent,
      max(greatest(created_at, updated_at)) as last_activity
    from public.activities group by workspace_id
  ), request_stats as (
    select workspace_id, count(*)::bigint as total,
      count(*) filter (where greatest(created_at, updated_at) >= p_now - interval '30 days')::bigint as recent,
      max(greatest(created_at, updated_at)) as last_activity
    from public.payment_requests group by workspace_id
  ), payment_stats as (
    select workspace_id,
      count(*) filter (where status <> 'voided')::bigint as total,
      count(*) filter (where status <> 'voided' and greatest(created_at, updated_at) >= p_now - interval '30 days')::bigint as recent,
      max(greatest(created_at, updated_at)) as last_activity,
      min(created_at) filter (where status <> 'voided') as first_at
    from public.payments group by workspace_id
  )
  select
    wm.user_id, w.id, p.first_name, p.last_name, w.name, w.vertical_type,
    wm.created_at, w.created_at, w.updated_at,
    coalesce(s.plan, 'free'), coalesce(s.status, 'free'), s.provider,
    s.current_period_start, s.next_payment_date, s.created_at, s.updated_at,
    coalesce(a.total, 0), coalesce(pr.total, 0), coalesce(o.total, 0),
    coalesce(r.total, 0), coalesce(py.total, 0),
    coalesce(a.current_count, 0), coalesce(a.previous_count, 0),
    coalesce(pr.current_count, 0), coalesce(pr.previous_count, 0),
    coalesce(a.recent, 0) + coalesce(pr.recent, 0) + coalesce(o.recent, 0) +
      coalesce(e.recent, 0) + coalesce(ac.recent, 0) + coalesce(r.recent, 0) + coalesce(py.recent, 0),
    greatest(a.last_activity, pr.last_activity, o.last_activity, e.last_activity,
      ac.last_activity, r.last_activity, py.last_activity),
    a.first_at, pr.first_at, py.first_at,
    (select count(*) from public.workspaces),
    (select count(*) from public.appointment_reminders where status = 'failed')
  from public.workspace_members wm
  join public.workspaces w on w.id = wm.workspace_id
  left join public.profiles p on p.id = wm.user_id
  left join public.subscriptions s on s.workspace_id = w.id
  left join account_stats a on a.workspace_id = w.id
  left join prestation_stats pr on pr.workspace_id = w.id
  left join opportunity_stats o on o.workspace_id = w.id
  left join engagement_stats e on e.workspace_id = w.id
  left join activity_stats ac on ac.workspace_id = w.id
  left join request_stats r on r.workspace_id = w.id
  left join payment_stats py on py.workspace_id = w.id;
$$;

comment on function public.admin_workspace_usage(timestamptz, timestamptz, timestamptz, timestamptz) is
  'Read-only aggregate used exclusively by the server-side Hazento Admin endpoint.';

revoke all on function public.admin_workspace_usage(timestamptz, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_workspace_usage(timestamptz, timestamptz, timestamptz, timestamptz) to service_role;
