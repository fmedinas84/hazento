begin;

create table public.partner_scheduling_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  duration_minutes integer not null default 60 check (duration_minutes in (30,45,60,90)),
  minimum_notice_hours integer not null default 12 check (minimum_notice_hours in (2,6,12,24,48)),
  booking_horizon_days integer not null default 30 check (booking_horizon_days in (14,30,60,90)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.partner_availability_windows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index partner_availability_workspace_day_idx on public.partner_availability_windows(workspace_id, weekday, start_time);

create table public.partner_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text check (reason is null or char_length(reason) <= 160),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index partner_schedule_blocks_workspace_range_idx on public.partner_schedule_blocks(workspace_id, starts_at, ends_at);

create table public.partner_bookable_services (
  workspace_id uuid not null,
  service_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, service_id),
  foreign key (workspace_id, service_id) references public.services(workspace_id, id) on delete cascade
);
create index partner_bookable_services_service_idx on public.partner_bookable_services(service_id);

create trigger partner_scheduling_settings_updated_at before update on public.partner_scheduling_settings
for each row execute function public.set_updated_at();

alter table public.partner_scheduling_settings enable row level security;
alter table public.partner_availability_windows enable row level security;
alter table public.partner_schedule_blocks enable row level security;
alter table public.partner_bookable_services enable row level security;

create policy partner_scheduling_settings_member on public.partner_scheduling_settings for all to authenticated
using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy partner_availability_windows_member on public.partner_availability_windows for all to authenticated
using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy partner_schedule_blocks_member on public.partner_schedule_blocks for all to authenticated
using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy partner_bookable_services_member on public.partner_bookable_services for all to authenticated
using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

revoke all on public.partner_scheduling_settings, public.partner_availability_windows, public.partner_schedule_blocks, public.partner_bookable_services from anon, authenticated;
grant select, insert, update, delete on public.partner_scheduling_settings, public.partner_availability_windows, public.partner_schedule_blocks, public.partner_bookable_services to authenticated;

create or replace function public.get_partner_booking_setup(p_country_code text, p_slug text)
returns table (duration_minutes integer, minimum_notice_hours integer, booking_horizon_days integer, services jsonb)
language sql stable security definer set search_path = ''
as $$
  select settings.duration_minutes, settings.minimum_notice_hours, settings.booking_horizon_days,
    coalesce(jsonb_agg(jsonb_build_object('id', service.id, 'name', service.name, 'description', service.description)
      order by service.name) filter (where service.id is not null), '[]'::jsonb)
  from public.partner_pages page
  join public.subscriptions subscription on subscription.workspace_id = page.workspace_id and subscription.plan = 'plus' and subscription.status = 'active'
  join public.partner_scheduling_settings settings on settings.workspace_id = page.workspace_id
  left join public.partner_bookable_services bookable on bookable.workspace_id = page.workspace_id
  left join public.services service on service.id = bookable.service_id and service.workspace_id = page.workspace_id and service.active
  where page.country_code = upper(btrim(p_country_code)) and page.slug = lower(btrim(p_slug))
    and page.status = 'published' and page.scheduling_enabled
  group by settings.duration_minutes, settings.minimum_notice_hours, settings.booking_horizon_days;
$$;

create or replace function public.get_partner_available_slots(p_country_code text, p_slug text, p_service_id uuid, p_date date)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  with context as (
    select page.workspace_id, workspace.timezone, settings.duration_minutes, settings.minimum_notice_hours, settings.booking_horizon_days
    from public.partner_pages page
    join public.workspaces workspace on workspace.id = page.workspace_id
    join public.subscriptions subscription on subscription.workspace_id = page.workspace_id and subscription.plan = 'plus' and subscription.status = 'active'
    join public.partner_scheduling_settings settings on settings.workspace_id = page.workspace_id
    join public.partner_bookable_services bookable on bookable.workspace_id = page.workspace_id and bookable.service_id = p_service_id
    join public.services service on service.id = bookable.service_id and service.active
    where page.country_code = upper(btrim(p_country_code)) and page.slug = lower(btrim(p_slug))
      and page.status = 'published' and page.scheduling_enabled
  ), candidates as (
    select context.*, slot as starts_at, slot + make_interval(mins => context.duration_minutes) as ends_at
    from context
    join public.partner_availability_windows availability on availability.workspace_id = context.workspace_id and availability.weekday = extract(isodow from p_date)
    cross join lateral generate_series(
      (p_date + availability.start_time) at time zone context.timezone,
      ((p_date + availability.end_time) at time zone context.timezone) - make_interval(mins => context.duration_minutes),
      make_interval(mins => context.duration_minutes)
    ) slot
    where p_date between (now() at time zone context.timezone)::date
      and (now() at time zone context.timezone)::date + context.booking_horizon_days
      and slot >= now() + make_interval(hours => context.minimum_notice_hours)
  )
  select candidate.starts_at, candidate.ends_at from candidates candidate
  where not exists (select 1 from public.partner_schedule_blocks block where block.workspace_id = candidate.workspace_id and block.starts_at < candidate.ends_at and block.ends_at > candidate.starts_at)
    and not exists (select 1 from public.prestations prestation where prestation.workspace_id = candidate.workspace_id and prestation.status = 'scheduled' and prestation.scheduled_start < candidate.ends_at and prestation.scheduled_end > candidate.starts_at)
  order by candidate.starts_at;
$$;

create or replace function public.book_partner_slot(
  p_country_code text, p_slug text, p_service_id uuid, p_starts_at timestamptz,
  p_name text, p_email text, p_phone text default null
)
returns table (booking_id uuid, starts_at timestamptz, ends_at timestamptz, service_name text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_workspace_id uuid; v_duration integer; v_end timestamptz; v_account_id uuid; v_service public.services%rowtype;
begin
  if nullif(btrim(p_name),'') is null or char_length(btrim(p_name)) > 100 then raise exception 'Invalid visitor name' using errcode='22023'; end if;
  if nullif(btrim(p_email),'') is null or char_length(btrim(p_email)) > 254 or btrim(p_email) !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Invalid visitor email' using errcode='22023'; end if;
  if p_phone is not null and char_length(btrim(p_phone)) > 40 then raise exception 'Invalid visitor phone' using errcode='22023'; end if;

  select page.workspace_id, settings.duration_minutes into v_workspace_id, v_duration
  from public.partner_pages page
  join public.subscriptions subscription on subscription.workspace_id=page.workspace_id and subscription.plan='plus' and subscription.status='active'
  join public.partner_scheduling_settings settings on settings.workspace_id=page.workspace_id
  where page.country_code=upper(btrim(p_country_code)) and page.slug=lower(btrim(p_slug)) and page.status='published' and page.scheduling_enabled;
  if v_workspace_id is null then raise exception 'Booking is not available' using errcode='P0001'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_workspace_id::text, 0));
  select service.* into v_service from public.services service
  join public.partner_bookable_services bookable on bookable.workspace_id=service.workspace_id and bookable.service_id=service.id
  where service.workspace_id=v_workspace_id and service.id=p_service_id and service.active;
  if v_service.id is null then raise exception 'Service is not available' using errcode='22023'; end if;
  v_end := p_starts_at + make_interval(mins => v_duration);
  if not exists (select 1 from public.get_partner_available_slots(p_country_code,p_slug,p_service_id,(p_starts_at at time zone (select timezone from public.workspaces where id=v_workspace_id))::date) slot where slot.starts_at=p_starts_at) then
    raise exception 'SLOT_UNAVAILABLE' using errcode='P0001';
  end if;

  select account.id into v_account_id from public.accounts account
  where account.workspace_id=v_workspace_id and account.account_type='person' and account.archived_at is null and lower(account.email)=lower(btrim(p_email))
  order by account.created_at limit 1;
  if v_account_id is null then
    insert into public.accounts(workspace_id,account_type,status,display_name,email,phone)
    values(v_workspace_id,'person','active',btrim(p_name),lower(btrim(p_email)),nullif(btrim(p_phone),'')) returning id into v_account_id;
  end if;

  return query insert into public.prestations(workspace_id,account_id,service_id,name,status,scheduled_start,scheduled_end,unit_price,total_amount)
  values(v_workspace_id,v_account_id,v_service.id,v_service.name,'scheduled',p_starts_at,v_end,coalesce(v_service.default_price,0),coalesce(v_service.default_price,0))
  returning id, scheduled_start, scheduled_end, name;
end;
$$;

revoke all on function public.get_partner_booking_setup(text,text), public.get_partner_available_slots(text,text,uuid,date), public.book_partner_slot(text,text,uuid,timestamptz,text,text,text) from public;
grant execute on function public.get_partner_booking_setup(text,text), public.get_partner_available_slots(text,text,uuid,date), public.book_partner_slot(text,text,uuid,timestamptz,text,text,text) to anon, authenticated;

comment on function public.get_partner_available_slots(text,text,uuid,date) is 'Returns anonymous-safe availability only; never exposes appointment details.';
comment on function public.book_partner_slot(text,text,uuid,timestamptz,text,text,text) is 'Atomically revalidates and books a public partner slot while preserving the People First model.';

commit;


