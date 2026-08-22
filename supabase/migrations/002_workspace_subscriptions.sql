begin;

-- A subscription is an entitlement for a workspace, never for an individual
-- profile. Absence of a row means the workspace uses Hazento Free.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  plan text not null,
  status text not null,
  provider text,
  provider_subscription_id text,
  provider_plan_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_payment_date timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint subscriptions_workspace_id_key unique (workspace_id),
  constraint subscriptions_workspace_id_fkey
    foreign key (workspace_id)
    references public.workspaces(id)
    on delete cascade,
  constraint subscriptions_plan_check
    check (plan in ('free', 'plus')),
  constraint subscriptions_status_check
    check (status in ('free', 'pending', 'active', 'paused', 'cancelled', 'payment_failed')),
  constraint subscriptions_plan_status_check
    check (
      (plan = 'free' and status = 'free')
      or
      (plan = 'plus' and status in ('pending', 'active', 'paused', 'cancelled', 'payment_failed'))
    ),
  constraint subscriptions_provider_check
    check (provider is null or btrim(provider) <> ''),
  constraint subscriptions_provider_subscription_id_check
    check (provider_subscription_id is null or btrim(provider_subscription_id) <> ''),
  constraint subscriptions_provider_plan_id_check
    check (provider_plan_id is null or btrim(provider_plan_id) <> ''),
  constraint subscriptions_paid_state_provider_check
    check (
      status not in ('active', 'paused', 'cancelled', 'payment_failed')
      or (provider is not null and provider_subscription_id is not null)
    ),
  constraint subscriptions_free_provider_check
    check (
      plan <> 'free'
      or (
        provider is null
        and provider_subscription_id is null
        and provider_plan_id is null
        and current_period_start is null
        and current_period_end is null
        and next_payment_date is null
      )
    ),
  constraint subscriptions_period_check
    check (
      current_period_end is null
      or current_period_start is null
      or current_period_end >= current_period_start
    ),
  constraint subscriptions_cancelled_at_check
    check (
      (status = 'cancelled' and cancelled_at is not null)
      or (status <> 'cancelled' and cancelled_at is null)
    )
);

-- Prevent a provider subscription from being attached to two workspaces while
-- keeping provider and provider plan identifiers implementation-neutral.
create unique index subscriptions_provider_reference_uidx
  on public.subscriptions(provider, provider_subscription_id)
  where provider is not null and provider_subscription_id is not null;

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

comment on table public.subscriptions is
  'Workspace billing entitlement. No row means Hazento Free; paid states are written only by trusted backend processes.';
comment on column public.subscriptions.workspace_id is
  'Workspace that owns the subscription. A workspace can have at most one row.';
comment on column public.subscriptions.provider is
  'Billing provider identifier, initially mercadopago but intentionally provider-neutral.';
comment on column public.subscriptions.provider_subscription_id is
  'Provider-side recurring subscription identifier; never a card token or sensitive payment credential.';
comment on column public.subscriptions.provider_plan_id is
  'Optional provider-side plan identifier.';

alter table public.subscriptions enable row level security;

-- Workspace members may inspect billing state. There are deliberately no
-- INSERT, UPDATE or DELETE policies for authenticated users: browser clients
-- must never be able to grant themselves Plus or forge an active status.
create policy subscriptions_select_member
on public.subscriptions
for select
to authenticated
using (public.is_workspace_member(workspace_id));

-- Explicit privileges keep the table compatible with Supabase projects where
-- new public tables are not automatically exposed to the Data API.
revoke all on table public.subscriptions from anon, authenticated;
grant select on table public.subscriptions to authenticated;
grant select, insert, update, delete on table public.subscriptions to service_role;

commit;
