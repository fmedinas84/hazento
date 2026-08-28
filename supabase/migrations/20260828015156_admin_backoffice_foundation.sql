create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'support')),
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Server-only allowlist for Hazento backoffice access. Never exposed to browser clients.';

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (btrim(action) <> ''),
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.admin_audit_log is
  'Minimal metadata-only audit trail for backoffice access and future administrative actions.';

create index admin_audit_log_admin_created_idx
  on public.admin_audit_log (admin_user_id, created_at desc);
create index admin_audit_log_action_created_idx
  on public.admin_audit_log (action, created_at desc);

alter table public.admin_users enable row level security;
alter table public.admin_audit_log enable row level security;

revoke all on table public.admin_users from public, anon, authenticated;
revoke all on table public.admin_audit_log from public, anon, authenticated;

grant select on table public.admin_users to service_role;
grant select, insert on table public.admin_audit_log to service_role;
