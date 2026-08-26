create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_workspace_member(workspace_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_uuid
      and wm.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public, anon;
grant execute on function private.is_workspace_member(uuid) to authenticated;

-- Compatibility wrapper used by existing policies. It is invoker-security and
-- exposes no membership rows; the privileged lookup remains outside Data API schemas.
create or replace function public.is_workspace_member(workspace_uuid uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_workspace_member(workspace_uuid); $$;

revoke all on function public.is_workspace_member(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;

drop policy if exists workspace_members_select_member on public.workspace_members;
drop policy if exists workspace_members_insert_member on public.workspace_members;
drop policy if exists workspace_members_update_member on public.workspace_members;
drop policy if exists workspace_members_delete_member on public.workspace_members;

create policy workspace_members_select_own
on public.workspace_members for select to authenticated
using (user_id = (select auth.uid()));

revoke insert, update, delete on public.workspace_members from authenticated;
grant select on public.workspace_members to authenticated;

comment on table public.workspace_members is
  'Membership mutations are server-managed. The first owner is created only by bootstrap_user_workspace.';
