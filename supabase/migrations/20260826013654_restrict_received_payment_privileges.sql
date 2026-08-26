-- RLS does not protect TRUNCATE. Received payments are read directly and are
-- created/voided exclusively through the audited financial RPCs.
revoke all on public.payments from authenticated;
grant select on public.payments to authenticated;
