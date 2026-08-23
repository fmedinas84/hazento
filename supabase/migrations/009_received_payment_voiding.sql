-- Received payments are immutable financial events. A correction is recorded
-- as an audited void; the original row and its allocations remain traceable.
alter table public.payments
  add column voided_at timestamptz null,
  add column voided_by uuid null references auth.users(id) on delete set null,
  add column void_reason text null;

do $$
declare constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.payments'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%pending%paid%cancelled%';
  if constraint_name is not null then
    execute format('alter table public.payments drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.payments
  add constraint payments_status_check check (status in ('pending', 'paid', 'cancelled', 'voided')),
  add constraint payments_void_audit_check check (
    (status = 'voided' and voided_at is not null and btrim(void_reason) <> '')
    or (status <> 'voided' and voided_at is null and voided_by is null and void_reason is null)
  );

create index payments_workspace_voided_at_idx
  on public.payments(workspace_id, voided_at) where status = 'voided';

create or replace function public.guard_received_payment_immutability()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_setting('hazento.voiding_payment', true) = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if old.status in ('paid', 'voided') then
    raise exception 'Los pagos recibidos son inmutables; usa la anulación auditada';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger payments_guard_received_immutability_update
before update on public.payments
for each row execute function public.guard_received_payment_immutability();

create trigger payments_guard_received_immutability_delete
before delete on public.payments
for each row execute function public.guard_received_payment_immutability();

create or replace function public.void_received_payment(
  p_payment_id uuid,
  p_reason text
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_payment public.payments%rowtype;
  v_request_id uuid;
  v_request_status text;
begin
  if nullif(btrim(p_reason), '') is null then
    raise exception 'Debes indicar el motivo de la anulación';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found or not public.is_workspace_member(v_payment.workspace_id) then
    raise exception 'Pago no disponible';
  end if;
  if v_payment.status <> 'paid' then
    raise exception 'Solo puedes anular un pago recibido vigente';
  end if;

  perform set_config('hazento.voiding_payment', 'on', true);
  perform set_config('hazento.settling_payment_request', 'on', true);

  update public.payments
  set status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason), updated_at = now()
  where id = p_payment_id;

  for v_request_id, v_request_status in
    select pr.id, pr.status
    from public.payment_allocations pa
    join public.payment_requests pr on pr.id = pa.payment_request_id and pr.workspace_id = pa.workspace_id
    where pa.payment_id = p_payment_id
    for update of pr
  loop
    if v_request_status = 'closed_transferred' then
      update public.payment_requests
      set status = 'cancelled', notes = concat_ws(' · ', notes, 'Cancelada al anular el pago de origen'), updated_at = now()
      where parent_request_id = v_request_id and status = 'pending';
    end if;
    if v_request_status in ('paid', 'closed_transferred', 'closed_waived') then
      update public.payment_requests set status = 'pending', updated_at = now() where id = v_request_id;
    end if;
  end loop;

  perform set_config('hazento.voiding_payment', 'off', true);
  perform set_config('hazento.settling_payment_request', 'off', true);
end;
$$;

revoke all on function public.guard_received_payment_immutability() from public, anon, authenticated;
revoke all on function public.void_received_payment(uuid, text) from public, anon;
grant execute on function public.void_received_payment(uuid, text) to authenticated;

comment on function public.void_received_payment(uuid, text) is
  'Atomically voids an immutable received payment and restores related payment request balances.';
