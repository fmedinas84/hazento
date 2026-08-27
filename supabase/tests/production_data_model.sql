begin;

do $$
declare
  workspace_a uuid := gen_random_uuid();
  workspace_b uuid := gen_random_uuid();
  organization_a uuid := gen_random_uuid();
  person_a uuid := gen_random_uuid();
  person_b uuid := gen_random_uuid();
  prestation_a uuid := gen_random_uuid();
begin
  insert into public.workspaces(id, name, vertical_type) values
    (workspace_a, 'Schema test A', 'sessions'),
    (workspace_b, 'Schema test B', 'other');

  insert into public.organizations(id, workspace_id, name)
  values (organization_a, workspace_a, '  ACME  ');
  assert (select normalized_name from public.organizations where id = organization_a) = 'acme';

  insert into public.accounts(id, workspace_id, account_type, status, display_name, email, organization_id)
  values (person_a, workspace_a, 'person', 'active', 'María A', ' Maria@Example.Test ', organization_a);
  assert (select normalized_email from public.accounts where id = person_a) = 'maria@example.test';

  -- Same normalized email is valid in a different workspace.
  insert into public.accounts(id, workspace_id, account_type, status, display_name, email)
  values (person_b, workspace_b, 'person', 'active', 'María B', 'maria@example.test');

  begin
    insert into public.accounts(workspace_id, account_type, status, display_name, email)
    values (workspace_a, 'person', 'active', 'Duplicada', 'MARIA@EXAMPLE.TEST');
    raise exception 'Expected duplicate workspace email to fail';
  exception when unique_violation then null;
  end;

  begin
    update public.accounts set organization_id = organization_a where id = person_b;
    raise exception 'Expected cross-workspace organization relationship to fail';
  exception when foreign_key_violation then null;
  end;

  insert into public.prestations(id, workspace_id, account_id, name, status, follow_up_note)
  values (prestation_a, workspace_a, person_a, 'Clase', 'scheduled', 'Seguimiento operativo');

  insert into public.appointment_reminders(
    workspace_id, prestation_id, account_id, recipient_email,
    scheduled_for, status, slot, lead_hours, provider
  ) values (
    workspace_a, prestation_a, person_a, 'maria@example.test',
    now() + interval '1 day', 'scheduled', 'primary', 24, 'mock'
  );

  begin
    insert into public.appointment_reminders(
      workspace_id, prestation_id, account_id, recipient_email,
      scheduled_for, status, slot, lead_hours, provider
    ) values (
      workspace_a, prestation_a, person_a, 'maria@example.test',
      now() + interval '2 days', 'scheduled', 'primary', 24, 'mock'
    );
    raise exception 'Expected duplicate active reminder slot to fail';
  exception when unique_violation then null;
  end;
end $$;

rollback;
