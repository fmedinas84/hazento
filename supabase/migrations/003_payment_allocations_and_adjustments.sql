begin;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null,
  document_type text not null default 'boleta' check (document_type in ('boleta')),
  tax_status text not null default 'draft' check (tax_status in ('draft', 'issued', 'voided')),
  document_number text,
  currency_code text not null default 'CLP',
  total_amount numeric(14,2) not null check (total_amount >= 0),
  issued_at timestamptz,
  voided_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, account_id) references public.accounts(workspace_id, id) on delete restrict,
  check ((tax_status = 'issued' and issued_at is not null) or tax_status <> 'issued'),
  check ((tax_status = 'voided' and voided_at is not null) or tax_status <> 'voided')
);

create index documents_workspace_account_idx on public.documents(workspace_id, account_id);
create index documents_workspace_tax_status_idx on public.documents(workspace_id, tax_status);
create unique index documents_workspace_number_uidx
  on public.documents(workspace_id, document_number) where document_number is not null;

alter table public.payment_allocations alter column prestation_id drop not null;
alter table public.payment_allocations add column document_id uuid;
alter table public.payment_allocations
  add constraint payment_allocations_exactly_one_target
  check (num_nonnulls(prestation_id, document_id) = 1);
alter table public.payment_allocations
  add constraint payment_allocations_workspace_document_id_fkey
  foreign key (workspace_id, document_id) references public.documents(workspace_id, id) on delete restrict;
alter table public.payment_allocations
  add constraint payment_allocations_payment_document_key unique (payment_id, document_id);
create index payment_allocations_document_id_idx on public.payment_allocations(document_id);

create table public.document_adjustments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  adjustment_type text not null check (adjustment_type in ('discount', 'waived_balance')),
  reason text not null check (btrim(reason) <> ''),
  adjustment_date timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete restrict,
  tax_correction_status text not null default 'not_required'
    check (tax_correction_status in ('not_required', 'pending', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, document_id) references public.documents(workspace_id, id) on delete restrict
);

create index document_adjustments_workspace_document_idx
  on public.document_adjustments(workspace_id, document_id);

create or replace function public.validate_payment_allocation_account()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  payment_account uuid;
  prestation_account uuid;
begin
  if new.prestation_id is null then
    return new;
  end if;
  select account_id into payment_account from public.payments
  where workspace_id = new.workspace_id and id = new.payment_id;
  select account_id into prestation_account from public.prestations
  where workspace_id = new.workspace_id and id = new.prestation_id;
  if payment_account is distinct from prestation_account then
    raise exception 'Payment and prestation must belong to the same account';
  end if;
  return new;
end;
$$;

create or replace function public.validate_document_allocation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  payment_row public.payments%rowtype;
  document_row public.documents%rowtype;
  payment_allocated numeric(14,2);
  document_paid numeric(14,2);
  document_adjusted numeric(14,2);
begin
  if new.document_id is null then
    return new;
  end if;

  select * into payment_row from public.payments
  where workspace_id = new.workspace_id and id = new.payment_id
  for update;
  select * into document_row from public.documents
  where workspace_id = new.workspace_id and id = new.document_id
  for update;

  if payment_row.id is null or document_row.id is null then
    raise exception 'Payment and document must exist in the same workspace';
  end if;
  if payment_row.account_id <> document_row.account_id then
    raise exception 'Payment and document must belong to the same account';
  end if;
  if payment_row.status <> 'paid' then
    raise exception 'Only confirmed payments can be allocated to documents';
  end if;
  if document_row.tax_status = 'voided' then
    raise exception 'Cannot allocate payments to a voided document';
  end if;

  select coalesce(sum(pa.amount), 0) into payment_allocated
  from public.payment_allocations pa
  where pa.payment_id = new.payment_id and pa.id <> new.id;
  if payment_allocated + new.amount > payment_row.amount then
    raise exception 'Allocation exceeds the payment available balance';
  end if;

  select coalesce(sum(pa.amount), 0) into document_paid
  from public.payment_allocations pa
  join public.payments p on p.id = pa.payment_id and p.workspace_id = pa.workspace_id
  where pa.document_id = new.document_id and pa.id <> new.id and p.status = 'paid';
  select coalesce(sum(da.amount), 0) into document_adjusted
  from public.document_adjustments da
  where da.document_id = new.document_id;
  if document_paid + document_adjusted + new.amount > document_row.total_amount then
    raise exception 'Allocation exceeds the document outstanding balance';
  end if;
  return new;
end;
$$;

create trigger payment_allocations_validate_document
before insert or update on public.payment_allocations
for each row execute function public.validate_document_allocation();

create or replace function public.validate_payment_allocation_total()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare allocated numeric(14,2);
begin
  select coalesce(sum(amount), 0) into allocated
  from public.payment_allocations where payment_id = new.id;
  if allocated > new.amount then
    raise exception 'Payment amount cannot be lower than its allocations';
  end if;
  return new;
end;
$$;
create trigger payments_validate_allocation_total
before update of amount on public.payments
for each row execute function public.validate_payment_allocation_total();

create or replace function public.replace_document_payment_allocations(p_payment_id uuid, p_allocations jsonb)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  payment_row public.payments%rowtype;
  item jsonb;
begin
  select * into payment_row from public.payments where id = p_payment_id for update;
  if payment_row.id is null or not public.is_workspace_member(payment_row.workspace_id) then
    raise exception 'Payment not found or inaccessible';
  end if;
  delete from public.payment_allocations where payment_id = p_payment_id and document_id is not null;
  for item in select value from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb))
  loop
    insert into public.payment_allocations(workspace_id, payment_id, document_id, amount)
    values (payment_row.workspace_id, payment_row.id, (item->>'document_id')::uuid, (item->>'amount')::numeric);
  end loop;
end;
$$;
revoke all on function public.replace_document_payment_allocations(uuid, jsonb) from public, anon;
grant execute on function public.replace_document_payment_allocations(uuid, jsonb) to authenticated;

create or replace function public.validate_document_adjustment()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  document_row public.documents%rowtype;
  paid_amount numeric(14,2);
  adjusted_amount numeric(14,2);
begin
  select * into document_row from public.documents
  where workspace_id = new.workspace_id and id = new.document_id
  for update;
  if document_row.id is null or document_row.tax_status = 'voided' then
    raise exception 'Adjustment requires an active document in the same workspace';
  end if;

  select coalesce(sum(pa.amount), 0) into paid_amount
  from public.payment_allocations pa
  join public.payments p on p.id = pa.payment_id and p.workspace_id = pa.workspace_id
  where pa.document_id = new.document_id and p.status = 'paid';
  select coalesce(sum(da.amount), 0) into adjusted_amount
  from public.document_adjustments da
  where da.document_id = new.document_id and da.id <> new.id;
  if paid_amount + adjusted_amount + new.amount > document_row.total_amount then
    raise exception 'Adjustment exceeds the document outstanding balance';
  end if;

  new.recorded_by := coalesce(new.recorded_by, auth.uid());
  new.tax_correction_status := case
    when document_row.tax_status = 'issued' then 'pending'
    else 'not_required'
  end;
  return new;
end;
$$;

create trigger document_adjustments_validate
before insert or update on public.document_adjustments
for each row execute function public.validate_document_adjustment();
create trigger documents_set_updated_at before update on public.documents
for each row execute function public.set_updated_at();
create trigger document_adjustments_set_updated_at before update on public.document_adjustments
for each row execute function public.set_updated_at();

create view public.document_payment_summaries
with (security_invoker = true)
as
select
  d.id,
  d.workspace_id,
  d.account_id,
  d.tax_status,
  d.total_amount,
  coalesce(paid.amount, 0)::numeric(14,2) as paid_amount,
  coalesce(adjusted.amount, 0)::numeric(14,2) as adjusted_amount,
  greatest(d.total_amount - coalesce(paid.amount, 0) - coalesce(adjusted.amount, 0), 0)::numeric(14,2) as outstanding_amount,
  case
    when d.tax_status = 'voided' then 'voided'
    when d.total_amount - coalesce(paid.amount, 0) - coalesce(adjusted.amount, 0) <= 0
      and coalesce(adjusted.amount, 0) > 0 then 'closed_with_adjustment'
    when d.total_amount - coalesce(paid.amount, 0) <= 0 then 'paid'
    when coalesce(paid.amount, 0) > 0 then 'partially_paid'
    else 'unpaid'
  end as collection_status
from public.documents d
left join lateral (
  select sum(pa.amount) amount
  from public.payment_allocations pa
  join public.payments p on p.id = pa.payment_id and p.workspace_id = pa.workspace_id
  where pa.document_id = d.id and pa.workspace_id = d.workspace_id and p.status = 'paid'
) paid on true
left join lateral (
  select sum(da.amount) amount
  from public.document_adjustments da
  where da.document_id = d.id and da.workspace_id = d.workspace_id
) adjusted on true;

alter table public.documents enable row level security;
alter table public.document_adjustments enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['documents','document_adjustments']
  loop
    execute format('create policy %I_select_member on public.%I for select to authenticated using (public.is_workspace_member(workspace_id))', table_name, table_name);
    execute format('create policy %I_insert_member on public.%I for insert to authenticated with check (public.is_workspace_member(workspace_id))', table_name, table_name);
    execute format('create policy %I_update_member on public.%I for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id))', table_name, table_name);
    execute format('create policy %I_delete_member on public.%I for delete to authenticated using (public.is_workspace_member(workspace_id))', table_name, table_name);
  end loop;
end $$;

comment on table public.documents is 'Tax documents such as boletas. Tax status is independent from derived collection status.';
comment on table public.document_adjustments is 'Non-cash discounts and waived balances. Issued documents retain their original tax total and require a pending tax correction.';
comment on view public.document_payment_summaries is 'Derived paid, adjusted, outstanding and collection status; adjustments never count as cash received.';

commit;
