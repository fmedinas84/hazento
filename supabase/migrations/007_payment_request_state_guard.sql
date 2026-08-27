-- Paid/closed states are outcomes of the atomic settlement function, not
-- editable labels that a client can set directly.
create or replace function public.guard_payment_request_financial_state()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_user = 'postgres' then return new; end if;
  if new.status is distinct from old.status and new.status in ('paid', 'closed_transferred', 'closed_waived') then
    raise exception 'Los estados financieros se actualizan únicamente al registrar un pago';
  end if;
  if new.waived_amount is distinct from old.waived_amount
    or new.waiver_reason is distinct from old.waiver_reason
    or new.waived_at is distinct from old.waived_at
    or new.waived_by is distinct from old.waived_by then
    raise exception 'La condonación se registra únicamente mediante el flujo de pago';
  end if;
  return new;
end;
$$;

create trigger payment_requests_guard_financial_state
before update on public.payment_requests
for each row execute function public.guard_payment_request_financial_state();

create or replace function public.settle_payment_request(
  p_request_id uuid,
  p_received_amount numeric,
  p_payment_method text,
  p_difference_action text default null,
  p_waiver_reason text default null
) returns table(payment_id uuid, successor_request_id uuid)
language plpgsql
security definer
set search_path = ''
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
  if p_received_amount < v_outstanding and p_difference_action not in ('transfer', 'waive') then raise exception 'Debes trasladar o condonar la diferencia'; end if;
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

revoke all on function public.guard_payment_request_financial_state() from public, anon, authenticated;
