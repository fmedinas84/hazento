begin;

do $$
declare
  workspace_a uuid := gen_random_uuid();
  workspace_b uuid := gen_random_uuid();
  workspace_c uuid := gen_random_uuid();
  person_id uuid := gen_random_uuid();
  service_id uuid := gen_random_uuid();
  engagement_id uuid;
  prestation_id uuid;
  request_id uuid := gen_random_uuid();
  successor_id uuid := gen_random_uuid();
begin
  insert into public.workspaces(id, name, vertical_type) values
    (workspace_a, 'Validation A', 'health'),
    (workspace_b, 'Validation B', 'creative'),
    (workspace_c, 'Validation C', 'creator');

  -- No subscription row means Free. Paid workspaces have at most one row.
  assert not exists (select 1 from public.subscriptions where workspace_id = workspace_a);
  insert into public.subscriptions(workspace_id, plan, status, provider, provider_subscription_id)
  values
    (workspace_b, 'plus', 'active', 'mercadopago', 'validation-active'),
    (workspace_c, 'plus', 'payment_failed', 'mercadopago', 'validation-failed');
  begin
    insert into public.subscriptions(workspace_id, plan, status, provider, provider_subscription_id)
    values (workspace_b, 'plus', 'active', 'mercadopago', 'duplicate-workspace');
    raise exception 'Expected one subscription per workspace';
  exception when unique_violation then null;
  end;

  insert into public.accounts(id, workspace_id, account_type, status, display_name, email)
  values (person_id, workspace_a, 'person', 'active', 'Persona validación', 'validation@example.test');
  insert into public.services(id, workspace_id, name, default_price, default_duration_minutes)
  values (service_id, workspace_a, 'Servicio validación', 30000, 60);

  foreach engagement_id in array array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()]
  loop
    insert into public.engagements(id, workspace_id, account_id, engagement_type, name, status, billing_type)
    values (
      engagement_id, workspace_a, person_id,
      (array['treatment','project','partnership','plan'])[1 + (select count(*)::int from public.engagements where workspace_id = workspace_a and name like 'Validación %')],
      'Validación ' || engagement_id, 'active', 'one_off'
    );
  end loop;

  -- Appointment and non-appointment states share one stable table.
  foreach prestation_id in array array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()]
  loop
    insert into public.prestations(id, workspace_id, account_id, service_id, name, status, scheduled_start, scheduled_end, total_amount)
    values (
      prestation_id, workspace_a, person_id, service_id, 'Prestación ' || prestation_id,
      (array['scheduled','in_progress','approved','published'])[1 + (select count(*)::int from public.prestations where workspace_id = workspace_a and name like 'Prestación %')],
      now() + interval '2 days', now() + interval '2 days 1 hour', 30000
    );
  end loop;

  -- Every reminder state is representable; a prestation may also have none.
  insert into public.appointment_reminders(
    workspace_id, prestation_id, account_id, recipient_email, scheduled_for,
    status, slot, lead_hours, provider, sent_at, error_message
  )
  select workspace_a, p.id, person_id, 'validation@example.test', now() + interval '1 day',
    x.status, 'primary', 24, 'mock',
    case when x.status = 'sent' then now() else null end,
    case when x.status = 'failed' then 'Falla simulada' else null end
  from unnest(array['scheduled', 'sent', 'cancelled', 'failed']) with ordinality x(status, ord)
  join lateral (
    select id from public.prestations
    where workspace_id = workspace_a and name like 'Prestación %'
    order by id offset (x.ord - 1) limit 1
  ) p on true;

  -- Request traceability: the successor exclusively carries the transferred balance.
  insert into public.payment_requests(id, workspace_id, account_id, status, amount)
  values (request_id, workspace_a, person_id, 'closed_transferred', 30000);
  insert into public.payment_requests(id, workspace_id, account_id, parent_request_id, status, amount)
  values (successor_id, workspace_a, person_id, request_id, 'pending', 10000);
  assert (select amount from public.payment_requests where id = successor_id) = 10000;
  assert (select count(*) from public.payment_requests where parent_request_id = request_id) = 1;
end $$;

-- Calendar, payment and billing timestamps use timestamptz.
do $$
declare invalid_count integer;
begin
  select count(*) into invalid_count
  from information_schema.columns
  where table_schema = 'public'
    and (table_name, column_name) in (
      ('prestations','scheduled_start'), ('prestations','scheduled_end'),
      ('activities','scheduled_at'), ('payments','payment_date'),
      ('appointment_reminders','scheduled_for'), ('subscriptions','next_payment_date')
    )
    and data_type <> 'timestamp with time zone';
  assert invalid_count = 0;
end $$;

rollback;
