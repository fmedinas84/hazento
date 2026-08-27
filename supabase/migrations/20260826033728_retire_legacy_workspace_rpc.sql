-- The legacy RPC creates a new workspace on every retry and does not create a
-- profile. Keep it for migration history, but remove all client execution.
revoke all on function public.create_workspace(text, text, text, text, text, text)
from public, anon, authenticated;

comment on function public.create_workspace(text, text, text, text, text, text) is
  'Deprecated. Client execution revoked; use bootstrap_user_workspace.';
