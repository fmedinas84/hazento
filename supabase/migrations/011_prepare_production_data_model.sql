-- Align PostgreSQL with the current Hazento V1 product model without switching
-- the frontend away from DemoStore. `accounts` remains the technical person
-- table for FK compatibility; organizations are secondary People First data.

-- Product configuration shared by every workspace.
do $$
declare constraint_name text;
begin
  select conname into constraint_name from pg_constraint
  where conrelid = 'public.workspaces'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%vertical_type%';
  if constraint_name is not null then execute format('alter table public.workspaces drop constraint %I', constraint_name); end if;
end $$;
alter table public.workspaces
  add constraint workspaces_vertical_type_check
  check (vertical_type in ('health', 'creative', 'creator', 'sessions', 'other'));
alter table public.workspaces add column address_line text null;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  normalized_name text generated always as (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) stored,
  legal_name text null,
  tax_id text null,
  email text null,
  phone text null,
  website text null,
  business_activity text null,
  address text null,
  commune text null,
  city text null,
  region text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  unique (workspace_id, id)
);
create unique index organizations_workspace_normalized_name_uidx
  on public.organizations(workspace_id, normalized_name) where archived_at is null;
create index organizations_workspace_active_idx
  on public.organizations(workspace_id, name) where archived_at is null;

alter table public.accounts
  add column first_name text null,
  add column last_name text null,
  add column organization_id uuid null,
  add column role text null,
  add column normalized_email text generated always as (nullif(lower(btrim(email)), '')) stored;
alter table public.accounts add constraint accounts_workspace_organization_fk
  foreign key (workspace_id, organization_id)
  references public.organizations(workspace_id, id) on delete restrict;
create unique index accounts_workspace_normalized_email_uidx
  on public.accounts(workspace_id, normalized_email) where normalized_email is not null;
create index accounts_workspace_organization_idx
  on public.accounts(workspace_id, organization_id) where organization_id is not null;

-- Existing company/brand account rows are retained for a later data migration.
comment on table public.accounts is
  'Technical person store for Hazento V1. account_type company/brand rows are legacy; new organization data belongs in organizations.';
comment on table public.contacts is
  'Legacy CRM contact table retained for compatibility. People First relationships use accounts as persons and organizations as optional context.';

-- Shared models support every vertical without profession-specific tables.
do $$
declare constraint_name text;
begin
  select conname into constraint_name from pg_constraint
  where conrelid = 'public.engagements'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%engagement_type%';
  if constraint_name is not null then execute format('alter table public.engagements drop constraint %I', constraint_name); end if;
end $$;
alter table public.engagements add constraint engagements_type_check
  check (engagement_type in ('treatment', 'project', 'partnership', 'plan'));

do $$
declare constraint_name text;
begin
  select conname into constraint_name from pg_constraint
  where conrelid = 'public.prestations'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%scheduled%no_show%';
  if constraint_name is not null then execute format('alter table public.prestations drop constraint %I', constraint_name); end if;
end $$;
alter table public.prestations
  add column follow_up_note text null,
  add constraint prestations_status_check check (status in (
    'draft', 'pending', 'scheduled', 'in_progress', 'approved',
    'published', 'completed', 'cancelled', 'no_show'
  ));

alter table public.activities add column source text null;
alter table public.activities add constraint activities_source_check
  check (source is null or source in ('prestation_follow_up'));
create unique index activities_follow_up_source_uidx
  on public.activities(workspace_id, prestation_id, source)
  where source = 'prestation_follow_up';

-- Appointment reminders are operational records. Sending/provider state is
-- server-managed; authenticated members only receive read access for now.
create table public.appointment_reminders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  prestation_id uuid not null,
  account_id uuid not null,
  recipient_email text not null check (btrim(recipient_email) <> ''),
  scheduled_for timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'cancelled', 'failed')),
  slot text not null check (slot in ('primary', 'secondary')),
  lead_hours integer not null check (lead_hours in (48, 24, 12, 2, 1)),
  sent_at timestamptz null,
  provider text not null default 'mock' check (provider in ('mock', 'resend')),
  provider_message_id text null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_reminders_prestation_fk foreign key (workspace_id, prestation_id)
    references public.prestations(workspace_id, id) on delete cascade,
  constraint appointment_reminders_account_fk foreign key (workspace_id, account_id)
    references public.accounts(workspace_id, id) on delete cascade,
  constraint appointment_reminders_sent_consistency check (
    (status = 'sent' and sent_at is not null) or status <> 'sent'
  ),
  unique (workspace_id, id),
  unique (prestation_id, slot, scheduled_for, recipient_email)
);
create unique index appointment_reminders_active_slot_uidx
  on public.appointment_reminders(prestation_id, slot) where status = 'scheduled';
create index appointment_reminders_workspace_schedule_idx
  on public.appointment_reminders(workspace_id, scheduled_for) where status = 'scheduled';
create index appointment_reminders_account_idx
  on public.appointment_reminders(workspace_id, account_id);
create index appointment_reminders_prestation_idx
  on public.appointment_reminders(workspace_id, prestation_id);

create trigger organizations_set_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
create trigger appointment_reminders_set_updated_at before update on public.appointment_reminders
for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.appointment_reminders enable row level security;

create policy organizations_select_member on public.organizations for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));
create policy organizations_insert_member on public.organizations for insert to authenticated
  with check ((select public.is_workspace_member(workspace_id)));
create policy organizations_update_member on public.organizations for update to authenticated
  using ((select public.is_workspace_member(workspace_id)))
  with check ((select public.is_workspace_member(workspace_id)));
create policy organizations_delete_member on public.organizations for delete to authenticated
  using ((select public.is_workspace_member(workspace_id)));
create policy appointment_reminders_select_member on public.appointment_reminders for select to authenticated
  using ((select public.is_workspace_member(workspace_id)));

revoke all on public.organizations, public.appointment_reminders from anon;
grant select, insert, update, delete on public.organizations to authenticated;
grant select on public.appointment_reminders to authenticated;
grant select, insert, update, delete on public.organizations, public.appointment_reminders to service_role;

comment on table public.organizations is 'Secondary organizations represented by People First accounts.';
comment on table public.appointment_reminders is 'Scheduled appointment emails; provider delivery fields are server-managed.';
comment on column public.accounts.organization_id is 'Optional organization represented by this person.';
comment on column public.prestations.follow_up_note is 'Simple operational follow-up; not a clinical record.';
