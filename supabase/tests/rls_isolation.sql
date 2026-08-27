-- Run only after Auth creates two real test users. This script deliberately
-- does not insert rows into auth.users. The harness must set these transaction
-- settings to existing UUIDs before execution:
--   set local hazento.test_user_a = '<uuid>';
--   set local hazento.test_user_b = '<uuid>';
-- and provision one workspace membership for each user.

begin;

set local role authenticated;

do $$
declare
  user_a uuid := current_setting('hazento.test_user_a')::uuid;
  user_b uuid := current_setting('hazento.test_user_b')::uuid;
  workspace_a uuid;
  workspace_b uuid;
begin
  select workspace_id into workspace_a from public.workspace_members where user_id = user_a limit 1;
  select workspace_id into workspace_b from public.workspace_members where user_id = user_b limit 1;
  assert workspace_a is not null and workspace_b is not null and workspace_a <> workspace_b;

  perform set_config('request.jwt.claim.sub', user_a::text, true);
  assert public.is_workspace_member(workspace_a);
  assert not public.is_workspace_member(workspace_b);
  assert not exists (select 1 from public.accounts where workspace_id = workspace_b);

  perform set_config('request.jwt.claim.sub', user_b::text, true);
  assert public.is_workspace_member(workspace_b);
  assert not public.is_workspace_member(workspace_a);
  assert not exists (select 1 from public.accounts where workspace_id = workspace_a);
end $$;

rollback;
