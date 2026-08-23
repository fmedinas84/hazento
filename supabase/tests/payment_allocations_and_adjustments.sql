begin;

do $$
declare
  workspace_uuid uuid := gen_random_uuid();
  account_uuid uuid := gen_random_uuid();
  payment_20 uuid := gen_random_uuid();
  payment_10 uuid := gen_random_uuid();
  payment_split uuid := gen_random_uuid();
  document_a uuid := gen_random_uuid();
  document_b uuid := gen_random_uuid();
  summary record;
begin
  insert into public.workspaces(id, name, vertical_type) values (workspace_uuid, 'Allocation test', 'health');
  insert into public.accounts(id, workspace_id, account_type, status, display_name)
  values (account_uuid, workspace_uuid, 'person', 'active', 'Persona test');
  insert into public.documents(id, workspace_id, account_id, tax_status, total_amount, issued_at)
  values
    (document_a, workspace_uuid, account_uuid, 'issued', 30000, now()),
    (document_b, workspace_uuid, account_uuid, 'issued', 20000, now());
  insert into public.payments(id, workspace_id, account_id, amount, status)
  values
    (payment_20, workspace_uuid, account_uuid, 20000, 'paid'),
    (payment_10, workspace_uuid, account_uuid, 10000, 'paid'),
    (payment_split, workspace_uuid, account_uuid, 15000, 'paid');

  -- 1. Partial payment.
  insert into public.payment_allocations(workspace_id, payment_id, document_id, amount)
  values (workspace_uuid, payment_20, document_a, 20000);
  select * into summary from public.document_payment_summaries where id = document_a;
  assert summary.paid_amount = 20000 and summary.outstanding_amount = 10000 and summary.collection_status = 'partially_paid';

  -- 2. Second payment closes the document.
  insert into public.payment_allocations(workspace_id, payment_id, document_id, amount)
  values (workspace_uuid, payment_10, document_a, 10000);
  select * into summary from public.document_payment_summaries where id = document_a;
  assert summary.outstanding_amount = 0 and summary.collection_status = 'paid';

  -- Return to partial and close with an adjustment.
  delete from public.payment_allocations where payment_id = payment_10 and document_id = document_a;
  insert into public.document_adjustments(workspace_id, document_id, amount, adjustment_type, reason)
  values (workspace_uuid, document_a, 10000, 'discount', 'Test discount');
  select * into summary from public.document_payment_summaries where id = document_a;
  assert summary.paid_amount = 20000 and summary.adjusted_amount = 10000 and summary.collection_status = 'closed_with_adjustment';

  -- 4. A single payment distributed between two documents.
  delete from public.document_adjustments where document_id = document_a;
  insert into public.payment_allocations(workspace_id, payment_id, document_id, amount)
  values
    (workspace_uuid, payment_split, document_a, 5000),
    (workspace_uuid, payment_split, document_b, 10000);

  -- 5. Editing an allocation immediately changes the derived balance.
  update public.payment_allocations set amount = 8000 where payment_id = payment_split and document_id = document_b;
  select * into summary from public.document_payment_summaries where id = document_b;
  assert summary.paid_amount = 8000 and summary.outstanding_amount = 12000;

  -- 6. Oversized allocations are rejected by the trigger.
  begin
    update public.payment_allocations set amount = 16000 where payment_id = payment_split and document_id = document_b;
    raise exception 'Expected payment balance validation to fail';
  exception when others then
    assert sqlerrm like '%available balance%';
  end;

  begin
    update public.documents set total_amount = 25000 where id = document_a;
    raise exception 'Expected issued document total validation to fail';
  exception when others then
    assert sqlerrm like '%immutable%';
  end;
end $$;

rollback;
