-- Atomic and idempotent first-workspace bootstrap for an authenticated user.
create or replace function public.bootstrap_user_workspace(
  p_workspace_name text,
  p_vertical_type text,
  p_first_name text default null,
  p_last_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  existing_workspace_id uuid;
  created_workspace_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if nullif(btrim(p_workspace_name), '') is null then
    raise exception 'Workspace name is required' using errcode = '22023';
  end if;
  if p_vertical_type not in ('health', 'creative', 'creator', 'sessions', 'other') then
    raise exception 'Invalid vertical type' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(caller_id::text, 0));

  insert into public.profiles(id, first_name, last_name)
  values (caller_id, nullif(btrim(p_first_name), ''), nullif(btrim(p_last_name), ''))
  on conflict (id) do update set
    first_name = coalesce(public.profiles.first_name, excluded.first_name),
    last_name = coalesce(public.profiles.last_name, excluded.last_name);

  select wm.workspace_id into existing_workspace_id
  from public.workspace_members wm
  where wm.user_id = caller_id
  order by wm.created_at, wm.id
  limit 1;

  if existing_workspace_id is not null then
    return existing_workspace_id;
  end if;

  insert into public.workspaces(name, vertical_type)
  values (btrim(p_workspace_name), p_vertical_type)
  returning id into created_workspace_id;

  insert into public.workspace_members(workspace_id, user_id, role)
  values (created_workspace_id, caller_id, 'owner');

  return created_workspace_id;
end;
$$;

revoke all on function public.bootstrap_user_workspace(text, text, text, text) from public, anon;
grant execute on function public.bootstrap_user_workspace(text, text, text, text) to authenticated;

comment on function public.bootstrap_user_workspace(text, text, text, text) is
  'Creates exactly one initial profile/workspace/owner membership for the authenticated user. Idempotent under retries.';
