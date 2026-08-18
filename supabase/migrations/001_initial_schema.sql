begin;

create extension if not exists pgcrypto with schema extensions;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vertical_type text not null check (vertical_type in ('health', 'creative', 'creator')),
  country_code text not null default 'CL',
  currency_code text not null default 'CLP',
  timezone text not null default 'America/Santiago',
  tax_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index workspace_members_user_id_idx on public.workspace_members(user_id);

create function public.is_workspace_member(workspace_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_uuid and wm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_member(uuid) from anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_type text not null check (account_type in ('person', 'company', 'brand')),
  status text not null check (status in ('prospect', 'active', 'inactive')),
  display_name text not null,
  legal_name text,
  tax_id text,
  email text,
  phone text,
  address_line text,
  city text,
  commune text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (workspace_id, id)
);
create index accounts_workspace_id_idx on public.accounts(workspace_id);
create index accounts_workspace_status_idx on public.accounts(workspace_id, status);
create index accounts_workspace_display_name_idx on public.accounts(workspace_id, display_name);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null,
  first_name text not null,
  last_name text not null,
  job_title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, account_id, id),
  foreign key (workspace_id, account_id) references public.accounts(workspace_id, id) on delete restrict
);
create index contacts_workspace_id_idx on public.contacts(workspace_id);
create index contacts_account_id_idx on public.contacts(account_id);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null,
  primary_contact_id uuid,
  name text not null,
  stage text not null,
  status text not null check (status in ('open', 'won', 'lost')),
  estimated_amount numeric(14,2),
  probability smallint check (probability between 0 and 100),
  expected_close_date date,
  won_at timestamptz,
  lost_at timestamptz,
  lost_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, account_id, id),
  foreign key (workspace_id, account_id) references public.accounts(workspace_id, id) on delete restrict,
  foreign key (workspace_id, account_id, primary_contact_id) references public.contacts(workspace_id, account_id, id) on delete restrict
);
create index opportunities_workspace_id_idx on public.opportunities(workspace_id);
create index opportunities_account_id_idx on public.opportunities(account_id);
create index opportunities_workspace_status_idx on public.opportunities(workspace_id, status);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  default_price numeric(14,2) check (default_price is null or default_price >= 0),
  default_duration_minutes integer check (default_duration_minutes is null or default_duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);
create index services_workspace_id_idx on public.services(workspace_id);
create index services_workspace_active_idx on public.services(workspace_id, active);

create table public.engagements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null,
  opportunity_id uuid,
  engagement_type text not null check (engagement_type in ('treatment', 'project', 'partnership')),
  name text not null,
  status text not null check (status in ('draft', 'active', 'completed', 'cancelled')),
  billing_type text not null check (billing_type in ('one_off', 'recurring')),
  agreed_amount numeric(14,2) check (agreed_amount is null or agreed_amount >= 0),
  start_date date,
  end_date date,
  recurrence_rule text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, account_id, id),
  foreign key (workspace_id, account_id) references public.accounts(workspace_id, id) on delete restrict,
  foreign key (workspace_id, account_id, opportunity_id) references public.opportunities(workspace_id, account_id, id) on delete restrict
);
create index engagements_workspace_id_idx on public.engagements(workspace_id);
create index engagements_account_id_idx on public.engagements(account_id);
create index engagements_opportunity_id_idx on public.engagements(opportunity_id);
create index engagements_workspace_status_idx on public.engagements(workspace_id, status);

create table public.prestations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null,
  engagement_id uuid,
  opportunity_id uuid,
  service_id uuid,
  name text not null,
  description text,
  status text not null check (status in ('draft', 'scheduled', 'completed', 'cancelled', 'no_show')),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  completed_at timestamptz,
  quantity numeric(10,2) not null default 1 check (quantity >= 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, account_id, id),
  foreign key (workspace_id, account_id) references public.accounts(workspace_id, id) on delete restrict,
  foreign key (workspace_id, account_id, engagement_id) references public.engagements(workspace_id, account_id, id) on delete restrict,
  foreign key (workspace_id, account_id, opportunity_id) references public.opportunities(workspace_id, account_id, id) on delete restrict,
  foreign key (workspace_id, service_id) references public.services(workspace_id, id) on delete restrict,
  check (scheduled_end is null or scheduled_start is null or scheduled_end >= scheduled_start)
);
create index prestations_workspace_id_idx on public.prestations(workspace_id);
create index prestations_account_id_idx on public.prestations(account_id);
create index prestations_engagement_id_idx on public.prestations(engagement_id);
create index prestations_service_id_idx on public.prestations(service_id);
create index prestations_workspace_status_idx on public.prestations(workspace_id, status);
create index prestations_workspace_scheduled_start_idx on public.prestations(workspace_id, scheduled_start);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null,
  contact_id uuid,
  opportunity_id uuid,
  engagement_id uuid,
  prestation_id uuid,
  activity_type text not null check (activity_type in ('task', 'call', 'meeting', 'email', 'whatsapp', 'note', 'milestone')),
  title text not null,
  description text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  status text not null check (status in ('pending', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, account_id) references public.accounts(workspace_id, id) on delete restrict,
  foreign key (workspace_id, account_id, contact_id) references public.contacts(workspace_id, account_id, id) on delete restrict,
  foreign key (workspace_id, account_id, opportunity_id) references public.opportunities(workspace_id, account_id, id) on delete restrict,
  foreign key (workspace_id, account_id, engagement_id) references public.engagements(workspace_id, account_id, id) on delete restrict,
  foreign key (workspace_id, account_id, prestation_id) references public.prestations(workspace_id, account_id, id) on delete restrict
);
create index activities_workspace_id_idx on public.activities(workspace_id);
create index activities_account_id_idx on public.activities(account_id);
create index activities_opportunity_id_idx on public.activities(opportunity_id);
create index activities_engagement_id_idx on public.activities(engagement_id);
create index activities_prestation_id_idx on public.activities(prestation_id);
create index activities_workspace_scheduled_at_idx on public.activities(workspace_id, scheduled_at);
create index activities_workspace_status_idx on public.activities(workspace_id, status);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  currency_code text not null default 'CLP',
  payment_date timestamptz,
  payment_method text,
  status text not null check (status in ('pending', 'paid', 'cancelled')),
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, account_id, id),
  foreign key (workspace_id, account_id) references public.accounts(workspace_id, id) on delete restrict
);
create index payments_workspace_id_idx on public.payments(workspace_id);
create index payments_account_id_idx on public.payments(account_id);
create index payments_workspace_status_idx on public.payments(workspace_id, status);
create index payments_workspace_payment_date_idx on public.payments(workspace_id, payment_date);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payment_id uuid not null,
  prestation_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, prestation_id),
  foreign key (workspace_id, payment_id) references public.payments(workspace_id, id) on delete restrict,
  foreign key (workspace_id, prestation_id) references public.prestations(workspace_id, id) on delete restrict
);
create index payment_allocations_workspace_id_idx on public.payment_allocations(workspace_id);
create index payment_allocations_payment_id_idx on public.payment_allocations(payment_id);
create index payment_allocations_prestation_id_idx on public.payment_allocations(prestation_id);

create function public.validate_payment_allocation_account()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  payment_account uuid;
  prestation_account uuid;
begin
  select account_id into payment_account from public.payments
  where workspace_id = new.workspace_id and id = new.payment_id;
  select account_id into prestation_account from public.prestations
  where workspace_id = new.workspace_id and id = new.prestation_id;
  if payment_account is distinct from prestation_account then
    raise exception 'Payment and prestation must belong to the same account';
  end if;
  return new;
end;
$$;
create trigger payment_allocations_same_account
before insert or update on public.payment_allocations
for each row execute function public.validate_payment_allocation_account();

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','workspaces','accounts','contacts','opportunities','services','engagements','prestations','activities','payments']
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.accounts enable row level security;
alter table public.contacts enable row level security;
alter table public.opportunities enable row level security;
alter table public.services enable row level security;
alter table public.engagements enable row level security;
alter table public.prestations enable row level security;
alter table public.activities enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_delete_own on public.profiles for delete to authenticated using (id = (select auth.uid()));

create policy workspaces_select_member on public.workspaces for select to authenticated using (public.is_workspace_member(id));
create policy workspaces_update_member on public.workspaces for update to authenticated using (public.is_workspace_member(id)) with check (public.is_workspace_member(id));
create policy workspaces_delete_member on public.workspaces for delete to authenticated using (public.is_workspace_member(id));

create policy workspace_members_select_member on public.workspace_members for select to authenticated using (public.is_workspace_member(workspace_id));
create policy workspace_members_insert_member on public.workspace_members for insert to authenticated with check (public.is_workspace_member(workspace_id));
create policy workspace_members_update_member on public.workspace_members for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy workspace_members_delete_member on public.workspace_members for delete to authenticated using (public.is_workspace_member(workspace_id));

do $$
declare table_name text;
begin
  foreach table_name in array array['accounts','contacts','opportunities','services','engagements','prestations','activities','payments','payment_allocations']
  loop
    execute format('create policy %I_select_member on public.%I for select to authenticated using (public.is_workspace_member(workspace_id))', table_name, table_name);
    execute format('create policy %I_insert_member on public.%I for insert to authenticated with check (public.is_workspace_member(workspace_id))', table_name, table_name);
    execute format('create policy %I_update_member on public.%I for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id))', table_name, table_name);
    execute format('create policy %I_delete_member on public.%I for delete to authenticated using (public.is_workspace_member(workspace_id))', table_name, table_name);
  end loop;
end $$;

create function public.create_workspace(
  p_name text,
  p_vertical_type text,
  p_country_code text default 'CL',
  p_currency_code text default 'CLP',
  p_timezone text default 'America/Santiago',
  p_tax_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_workspace_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.workspaces(name, vertical_type, country_code, currency_code, timezone, tax_id)
  values (p_name, p_vertical_type, p_country_code, p_currency_code, p_timezone, p_tax_id)
  returning id into new_workspace_id;
  insert into public.workspace_members(workspace_id, user_id, role)
  values (new_workspace_id, auth.uid(), 'owner');
  return new_workspace_id;
end;
$$;
revoke all on function public.create_workspace(text,text,text,text,text,text) from public;
revoke all on function public.create_workspace(text,text,text,text,text,text) from anon;
grant execute on function public.create_workspace(text,text,text,text,text,text) to authenticated;

commit;
