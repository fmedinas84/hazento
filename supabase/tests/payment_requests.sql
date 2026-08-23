begin;

do $$
declare
  user_uuid uuid := gen_random_uuid();
  workspace_a uuid := gen_random_uuid();
  workspace_b uuid := gen_random_uuid();
  account_a uuid := gen_random_uuid();
  account_b uuid := gen_random_uuid();
  prestation_a uuid := gen_random_uuid();
  request_total uuid := gen_random_uuid();
  request_transfer uuid := gen_random_uuid();
  request_waive uuid := gen_random_uuid();
  result record;
  summary record;
  successor_count integer;
begin
  insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
  values (user_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'payment-request-test@example.invalid', '', now(), now());
  insert into public.workspaces(id, name, vertical_type) values (workspace_a, 'Request test A', 'health'), (workspace_b, 'Request test B', 'creative');
  insert into public.workspace_members(workspace_id, user_id, role) values (workspace_a, user_uuid, 'owner');
  insert into public.accounts(id, workspace_id, account_type, status, display_name) values
    (account_a, workspace_a, 'person', 'active', 'Persona A'), (account_b, workspace_b, 'person', 'active', 'Persona B');
  perform set_config('request.jwt.claim.sub', user_uuid::text, true);

  -- 1. Creating work never creates a request automatically.
  insert into public.prestations(id, workspace_id, account_id, name, status, total_amount)
  values (prestation_a, workspace_a, account_a, 'Atención', 'completed', 30000);
  assert (select count(*) from public.payment_requests where origin_prestation_id = prestation_a) = 0;

  -- 2/3. Explicit request and full payment.
  insert into public.payment_requests(id, workspace_id, account_id, origin_prestation_id, amount)
  values (request_total, workspace_a, account_a, prestation_a, 30000);
  insert into public.payment_request_items(workspace_id, payment_request_id, prestation_id, description, amount)
  values (workspace_a, request_total, prestation_a, 'Atención', 30000);
  select * into result from public.settle_payment_request(request_total, 30000, 'transferencia');
  select * into summary from public.payment_request_summaries where id = request_total;
  assert summary.status = 'paid' and summary.paid_amount = 30000 and summary.outstanding_amount = 0;

  -- 4. Partial payment transfers only the remaining 10,000.
  insert into public.payment_requests(id, workspace_id, account_id, amount) values (request_transfer, workspace_a, account_a, 30000);
  select * into result from public.settle_payment_request(request_transfer, 20000, 'efectivo', 'transfer');
  assert (select status from public.payment_requests where id = request_transfer) = 'closed_transferred';
  assert (select amount from public.payment_requests where parent_request_id = request_transfer) = 10000;
  select count(*) into successor_count from public.payment_requests where parent_request_id = request_transfer;
  assert successor_count = 1;

  -- 5/6/7. Partial payment plus explicit waiver closes without inflating cash.
  insert into public.payment_requests(id, workspace_id, account_id, amount) values (request_waive, workspace_a, account_a, 30000);
  select * into result from public.settle_payment_request(request_waive, 20000, 'transferencia', 'waive', 'Diferencia acordada');
  select * into summary from public.payment_request_summaries where id = request_waive;
  assert summary.status = 'closed_waived' and summary.paid_amount = 20000 and summary.waived_amount = 10000 and summary.outstanding_amount = 0;
  assert (select sum(amount) from public.payments where reference = 'Solicitud ' || request_waive) = 20000;

  begin
    update public.payment_requests set status = 'paid' where parent_request_id = request_transfer;
    raise exception 'Expected direct financial state mutation to fail';
  exception when others then
    assert sqlerrm like '%únicamente al registrar un pago%';
  end;

  -- Overpayments are rejected atomically.
  begin
    perform public.settle_payment_request((select id from public.payment_requests where parent_request_id = request_transfer), 11000, 'efectivo');
    raise exception 'Expected overpayment validation to fail';
  exception when others then
    assert sqlerrm like '%supera el saldo%';
  end;
end $$;

-- RLS: the member of workspace A cannot see requests from workspace B.
set local role authenticated;
do $$ begin
  assert (select count(*) from public.payment_requests pr join public.accounts a on a.id = pr.account_id where a.display_name = 'Persona B') = 0;
end $$;
reset role;

rollback;
