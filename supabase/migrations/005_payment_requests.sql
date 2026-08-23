-- Separate expected collections (payment requests) from cash received (payments)
-- and future tax documents (documents).

create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null,
  parent_request_id uuid null,
  origin_opportunity_id uuid null,
  origin_engagement_id uuid null,
  origin_prestation_id uuid null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'closed_transferred', 'closed_waived', 'cancelled')),
  amount numeric(14,2) not null check (amount > 0),
  currency_code text not null default 'CLP',
  due_date date null,
  notes text null,
  waived_amount numeric(14,2) not null default 0 check (waived_amount >= 0),
  waiver_reason text null,
  waived_at timestamptz null,
  waived_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_requests_workspace_account_fk foreign key (workspace_id, account_id)
    references public.accounts(workspace_id, id) on delete restrict,
  constraint payment_requests_parent_fk foreign key (workspace_id, account_id, parent_request_id)
    references public.payment_requests(workspace_id, account_id, id) on delete restrict,
  constraint payment_requests_opportunity_fk foreign key (workspace_id, account_id, origin_opportunity_id)
    references public.opportunities(workspace_id, account_id, id) on delete restrict,
  constraint payment_requests_engagement_fk foreign key (workspace_id, account_id, origin_engagement_id)
    references public.engagements(workspace_id, account_id, id) on delete restrict,
  constraint payment_requests_prestation_fk foreign key (workspace_id, account_id, origin_prestation_id)
    references public.prestations(workspace_id, account_id, id) on delete restrict,
  constraint payment_requests_waiver_consistency check (
    (waived_amount = 0 and waiver_reason is null and waived_at is null)
    or (waived_amount > 0 and btrim(waiver_reason) <> '' and waived_at is not null)
  ),
  unique (workspace_id, id),
  unique (workspace_id, account_id, id)
);

create table public.payment_request_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payment_request_id uuid not null,
  prestation_id uuid null,
  engagement_id uuid null,
  description text not null check (btrim(description) <> ''),
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  constraint payment_request_items_request_fk foreign key (workspace_id, payment_request_id)
    references public.payment_requests(workspace_id, id) on delete cascade,
  constraint payment_request_items_prestation_fk foreign key (workspace_id, prestation_id)
    references public.prestations(workspace_id, id) on delete restrict,
  constraint payment_request_items_engagement_fk foreign key (workspace_id, engagement_id)
    references public.engagements(workspace_id, id) on delete restrict,
  constraint payment_request_items_at_most_one_source check (num_nonnulls(prestation_id, engagement_id) <= 1)
);

create unique index payment_request_items_request_prestation_uidx
  on public.payment_request_items(payment_request_id, prestation_id) where prestation_id is not null;
create unique index payment_request_items_request_engagement_uidx
  on public.payment_request_items(payment_request_id, engagement_id) where engagement_id is not null;
create index payment_requests_workspace_account_idx on public.payment_requests(workspace_id, account_id);
create index payment_requests_workspace_status_idx on public.payment_requests(workspace_id, status);
create index payment_requests_parent_idx on public.payment_requests(parent_request_id) where parent_request_id is not null;
create index payment_requests_origin_prestation_idx on public.payment_requests(origin_prestation_id) where origin_prestation_id is not null;
create index payment_requests_origin_engagement_idx on public.payment_requests(origin_engagement_id) where origin_engagement_id is not null;
create index payment_request_items_workspace_request_idx on public.payment_request_items(workspace_id, payment_request_id);

alter table public.payment_allocations add column payment_request_id uuid null;
alter table public.payment_allocations drop constraint payment_allocations_exactly_one_target;
alter table public.payment_allocations add constraint payment_allocations_exactly_one_target
  check (num_nonnulls(prestation_id, document_id, payment_request_id) = 1);
alter table public.payment_allocations add constraint payment_allocations_workspace_request_fk
  foreign key (workspace_id, payment_request_id)
  references public.payment_requests(workspace_id, id) on delete restrict;
create unique index payment_allocations_payment_request_uidx
  on public.payment_allocations(payment_id, payment_request_id) where payment_request_id is not null;
create index payment_allocations_workspace_request_idx
  on public.payment_allocations(workspace_id, payment_request_id) where payment_request_id is not null;

create or replace function public.validate_payment_request_allocation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_payment_account uuid;
  v_payment_status text;
  v_payment_total numeric;
  v_request_account uuid;
  v_request_status text;
  v_request_total numeric;
  v_request_waived numeric;
  v_allocated_payment numeric;
  v_allocated_request numeric;
begin
  if new.payment_request_id is null then return new; end if;

  select account_id, status, amount into v_payment_account, v_payment_status, v_payment_total
  from public.payments where workspace_id = new.workspace_id and id = new.payment_id for update;
  select account_id, status, amount, waived_amount into v_request_account, v_request_status, v_request_total, v_request_waived
  from public.payment_requests where workspace_id = new.workspace_id and id = new.payment_request_id for update;

  if v_payment_account is null or v_request_account is null then raise exception 'Pago o solicitud inexistente'; end if;
  if v_payment_account <> v_request_account then raise exception 'Pago y solicitud deben pertenecer a la misma persona'; end if;
  if v_payment_status <> 'paid' then raise exception 'Solo se asignan pagos efectivamente recibidos'; end if;
  if v_request_status <> 'pending' then raise exception 'La solicitud no está pendiente'; end if;

  select coalesce(sum(amount), 0) into v_allocated_payment from public.payment_allocations
  where payment_id = new.payment_id and id <> coalesce(new.id, gen_random_uuid());
  if v_allocated_payment + new.amount > v_payment_total then raise exception 'La asignación supera el saldo del pago'; end if;

  select coalesce(sum(pa.amount), 0) into v_allocated_request
  from public.payment_allocations pa join public.payments p on p.id = pa.payment_id
  where pa.payment_request_id = new.payment_request_id and pa.id <> coalesce(new.id, gen_random_uuid()) and p.status = 'paid';
  if v_allocated_request + new.amount + v_request_waived > v_request_total then raise exception 'La asignación supera el saldo de la solicitud'; end if;
  return new;
end;
$$;

create trigger validate_payment_request_allocation_before_write
before insert or update on public.payment_allocations
for each row execute function public.validate_payment_request_allocation();

create or replace view public.payment_request_summaries
with (security_invoker = true)
as
select
  pr.id,
  pr.workspace_id,
  pr.account_id,
  pr.amount,
  pr.status,
  coalesce(sum(pa.amount) filter (where p.status = 'paid'), 0)::numeric(14,2) as paid_amount,
  pr.waived_amount,
  greatest(pr.amount - coalesce(sum(pa.amount) filter (where p.status = 'paid'), 0) - pr.waived_amount, 0)::numeric(14,2) as outstanding_amount
from public.payment_requests pr
left join public.payment_allocations pa on pa.payment_request_id = pr.id
left join public.payments p on p.id = pa.payment_id
group by pr.id;

create or replace function public.settle_payment_request(
  p_request_id uuid,
  p_received_amount numeric,
  p_payment_method text,
  p_difference_action text default null,
  p_waiver_reason text default null
) returns table(payment_id uuid, successor_request_id uuid)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_request public.payment_requests%rowtype;
  v_paid numeric;
  v_outstanding numeric;
  v_payment_id uuid;
  v_successor uuid;
begin
  if p_received_amount <= 0 then raise exception 'El monto recibido debe ser mayor que cero'; end if;
  select * into v_request from public.payment_requests where id = p_request_id for update;
  if not found or not public.is_workspace_member(v_request.workspace_id) then raise exception 'Solicitud no disponible'; end if;
  if v_request.status <> 'pending' then raise exception 'La solicitud no está pendiente'; end if;
  select coalesce(sum(pa.amount), 0) into v_paid from public.payment_allocations pa join public.payments p on p.id = pa.payment_id
    where pa.payment_request_id = v_request.id and p.status = 'paid';
  v_outstanding := v_request.amount - v_request.waived_amount - v_paid;
  if p_received_amount > v_outstanding then raise exception 'El pago supera el saldo de la solicitud'; end if;
  if p_received_amount < v_outstanding and p_difference_action not in ('transfer', 'waive') then
    raise exception 'Debes trasladar o condonar la diferencia';
  end if;

  insert into public.payments(workspace_id, account_id, amount, currency_code, payment_date, payment_method, status, reference)
  values (v_request.workspace_id, v_request.account_id, p_received_amount, v_request.currency_code, now(), nullif(btrim(p_payment_method), ''), 'paid', 'Solicitud ' || v_request.id)
  returning id into v_payment_id;
  insert into public.payment_allocations(workspace_id, payment_id, payment_request_id, amount)
  values (v_request.workspace_id, v_payment_id, v_request.id, p_received_amount);

  if p_received_amount = v_outstanding then
    update public.payment_requests set status = 'paid', updated_at = now() where id = v_request.id;
  elsif p_difference_action = 'transfer' then
    update public.payment_requests set status = 'closed_transferred', updated_at = now() where id = v_request.id;
    insert into public.payment_requests(workspace_id, account_id, parent_request_id, status, amount, currency_code, due_date, notes)
    values (v_request.workspace_id, v_request.account_id, v_request.id, 'pending', v_outstanding - p_received_amount, v_request.currency_code, v_request.due_date, 'Saldo trasladado desde solicitud ' || v_request.id)
    returning id into v_successor;
  else
    if nullif(btrim(p_waiver_reason), '') is null then raise exception 'Debes indicar el motivo de la condonación'; end if;
    update public.payment_requests set status = 'closed_waived', waived_amount = v_outstanding - p_received_amount,
      waiver_reason = btrim(p_waiver_reason), waived_at = now(), waived_by = auth.uid(), updated_at = now()
    where id = v_request.id;
  end if;
  return query select v_payment_id, v_successor;
end;
$$;

create trigger payment_requests_set_updated_at before update on public.payment_requests
for each row execute function public.set_updated_at();

alter table public.payment_requests enable row level security;
alter table public.payment_request_items enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['payment_requests', 'payment_request_items'] loop
    execute format('create policy %I_select_member on public.%I for select to authenticated using (public.is_workspace_member(workspace_id))', table_name, table_name);
    execute format('create policy %I_insert_member on public.%I for insert to authenticated with check (public.is_workspace_member(workspace_id))', table_name, table_name);
    execute format('create policy %I_update_member on public.%I for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id))', table_name, table_name);
    execute format('create policy %I_delete_member on public.%I for delete to authenticated using (public.is_workspace_member(workspace_id))', table_name, table_name);
  end loop;
end $$;

revoke all on public.payment_requests, public.payment_request_items from anon;
grant select, insert, update, delete on public.payment_requests, public.payment_request_items to authenticated;
revoke all on function public.settle_payment_request(uuid, numeric, text, text, text) from public, anon;
grant execute on function public.settle_payment_request(uuid, numeric, text, text, text) to authenticated;
grant select on public.payment_request_summaries to authenticated;

comment on table public.payment_requests is 'Explicit requests for payment; not cash received and not a tax document.';
comment on table public.payment_request_items is 'Line concepts grouped into a payment request with optional FK-backed prestation or engagement source.';
