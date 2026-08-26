-- Hazento demo data for development and product validation.
-- Idempotent: fixed UUIDs make this safe to run repeatedly.
-- Remove the complete demo dataset with:
-- delete from public.workspaces where id = '10000000-0000-4000-8000-000000000001';

begin;

insert into public.workspaces (id, name, vertical_type, country_code, currency_code, timezone)
values ('10000000-0000-4000-8000-000000000001', 'Consulta Demo', 'health', 'CL', 'CLP', 'America/Santiago')
on conflict (id) do update set
  name = excluded.name,
  vertical_type = excluded.vertical_type,
  country_code = excluded.country_code,
  currency_code = excluded.currency_code,
  timezone = excluded.timezone;

insert into public.organizations
  (id, workspace_id, name, legal_name, tax_id, email, phone, city, commune, notes)
values
  ('11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Acme', 'Acme SpA', '76.432.100-8', 'contacto@acme.example.test', '+56 2 2345 6789', 'Santiago', 'Providencia', '[DEMO] Empresa representada por Juan Soto'),
  ('11000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Nike', null, null, null, null, 'Santiago', 'Las Condes', '[DEMO] Empresa representada por Carolina Díaz')
on conflict (id) do update set
  name = excluded.name,
  legal_name = excluded.legal_name,
  tax_id = excluded.tax_id,
  email = excluded.email,
  phone = excluded.phone,
  notes = excluded.notes;

insert into public.accounts
  (id, workspace_id, account_type, status, first_name, last_name, display_name, organization_id, role, legal_name, tax_id, email, phone, city, commune, notes)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'person', 'active', 'María', 'Pérez', 'María Pérez', null, null, 'María Pérez', '17.284.391-2', 'maria.perez@example.test', '+56 9 4421 8870', 'Santiago', 'Providencia', '[DEMO] Paciente con tratamiento activo y una atención pendiente.'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'person', 'active', 'Juan', 'Soto', 'Juan Soto', '11000000-0000-4000-8000-000000000001', 'Gerente Comercial', 'Juan Soto', '15.931.240-8', 'juan.soto@example.test', '+56 9 6732 2210', 'Santiago', 'Ñuñoa', '[DEMO] Persona que representa a Acme y mantiene pagos parciales.'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'person', 'active', 'Carolina', 'Díaz', 'Carolina Díaz', '11000000-0000-4000-8000-000000000002', 'Brand Manager', 'Carolina Díaz', '18.402.116-5', 'carolina.diaz@example.test', '+56 9 7814 9022', 'Santiago', 'Las Condes', '[DEMO] Persona que representa a Nike.'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'person', 'active', 'Pedro', 'González', 'Pedro González', null, null, 'Pedro González', '14.770.803-1', 'pedro.gonzalez@example.test', '+56 9 3380 1244', 'Santiago', 'Macul', '[DEMO] Plan activo con prepago.'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'person', 'prospect', 'Daniela', 'Silva', 'Daniela Silva', null, null, 'Daniela Silva', '19.730.842-9', 'daniela.silva@example.test', '+56 9 2284 6115', 'Santiago', 'La Reina', '[DEMO] Prospecto con oportunidad abierta.'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'person', 'inactive', 'Felipe', 'Vargas', 'Felipe Vargas', null, null, 'Felipe Vargas', '16.982.177-4', 'felipe.vargas@example.test', '+56 9 3120 4566', 'Santiago', 'San Miguel', '[DEMO] Paciente inactivo con atención no asistida.')
on conflict (id) do update set
  status = excluded.status,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  display_name = excluded.display_name,
  organization_id = excluded.organization_id,
  role = excluded.role,
  email = excluded.email,
  phone = excluded.phone,
  notes = excluded.notes;

insert into public.services
  (id, workspace_id, name, description, default_price, default_duration_minutes, active)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Sesión individual', 'Sesión de atención individual', 35000, 60, true),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Evaluación inicial', 'Evaluación y definición de objetivos', 45000, 90, true),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Control', 'Sesión breve de seguimiento', 30000, 45, true),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Taller grupal', 'Sesión para equipos u organizaciones', 180000, 120, true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  default_price = excluded.default_price,
  default_duration_minutes = excluded.default_duration_minutes,
  active = excluded.active;

insert into public.opportunities
  (id, workspace_id, account_id, primary_contact_id, name, stage, status, estimated_amount, probability, expected_close_date, won_at, lost_at, lost_reason, notes)
values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', null, 'Plan de 8 sesiones', 'Ganada', 'won', 280000, 100, '2026-06-01', '2026-06-01 14:00:00-04', null, null, '[DEMO] Oportunidad convertida en tratamiento.'),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', null, 'Evaluación y plan inicial', 'Nuevo', 'open', 180000, 25, '2026-08-24', null, null, null, '[DEMO] Requiere llamada de seguimiento.'),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', null, 'Plan de continuidad', 'Contactado', 'open', 175000, 45, '2026-08-28', null, null, null, '[DEMO] Esperando confirmación.'),
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', null, 'Plan posterior a evaluación', 'Perdida', 'lost', 150000, 0, '2026-08-10', null, '2026-08-11 11:00:00-04', 'Prioridad postergada', '[DEMO] Ejemplo de oportunidad perdida.'),
  ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', null, 'Renovación plan mensual', 'Negociación', 'open', 140000, 70, '2026-09-05', null, null, null, '[DEMO] Oportunidad en negociación.')
on conflict (id) do update set
  stage = excluded.stage,
  status = excluded.status,
  estimated_amount = excluded.estimated_amount,
  probability = excluded.probability,
  expected_close_date = excluded.expected_close_date,
  notes = excluded.notes;

insert into public.engagements
  (id, workspace_id, account_id, opportunity_id, engagement_type, name, status, billing_type, agreed_amount, start_date, end_date, recurrence_rule, notes)
values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'treatment', 'Tratamiento María Pérez', 'active', 'one_off', 280000, '2026-06-03', '2026-08-28', 'FREQ=WEEKLY;COUNT=8', '[DEMO] Plan de ocho sesiones.'),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', null, 'treatment', 'Plan de recuperación Pedro', 'active', 'recurring', 280000, '2026-07-27', '2026-09-21', 'FREQ=WEEKLY;COUNT=8', '[DEMO] Plan con prepago.'),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000003', 'treatment', 'Seguimiento Juan Soto', 'active', 'one_off', 150000, '2026-07-31', '2026-09-04', 'FREQ=WEEKLY;COUNT=5', '[DEMO] Plan con pagos parciales.')
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  billing_type = excluded.billing_type,
  agreed_amount = excluded.agreed_amount,
  recurrence_rule = excluded.recurrence_rule,
  notes = excluded.notes;

insert into public.prestations
  (id, workspace_id, account_id, engagement_id, opportunity_id, service_id, name, description, status, scheduled_start, scheduled_end, completed_at, quantity, unit_price, total_amount, notes)
values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', null, '30000000-0000-4000-8000-000000000001', 'Sesión individual 1', '[DEMO] Atención realizada', 'completed', '2026-08-03 09:00:00-04', '2026-08-03 10:00:00-04', '2026-08-03 10:00:00-04', 1, 35000, 35000, '[DEMO] Pagada'),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', null, '30000000-0000-4000-8000-000000000001', 'Sesión individual 2', '[DEMO] Atención realizada', 'completed', '2026-08-10 09:00:00-04', '2026-08-10 10:00:00-04', '2026-08-10 10:00:00-04', 1, 35000, 35000, '[DEMO] Pagada'),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', null, '30000000-0000-4000-8000-000000000001', 'Sesión individual 3', '[DEMO] Atención programada', 'scheduled', '2026-08-17 09:00:00-04', '2026-08-17 10:00:00-04', null, 1, 35000, 35000, '[DEMO] Pendiente'),
  ('60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', null, '30000000-0000-4000-8000-000000000001', 'Sesión individual 4', '[DEMO] Atención futura', 'scheduled', '2026-08-24 09:00:00-04', '2026-08-24 10:00:00-04', null, 1, 35000, 35000, '[DEMO] Prepagada'),
  ('60000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', null, '30000000-0000-4000-8000-000000000003', 'Control 1', '[DEMO] Atención realizada', 'completed', '2026-08-07 11:00:00-04', '2026-08-07 11:45:00-04', '2026-08-07 11:45:00-04', 1, 30000, 30000, '[DEMO] Pago parcial'),
  ('60000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', null, '30000000-0000-4000-8000-000000000003', 'Control 2', '[DEMO] Atención realizada', 'completed', '2026-08-14 11:00:00-04', '2026-08-14 11:45:00-04', '2026-08-14 11:45:00-04', 1, 30000, 30000, '[DEMO] Pago parcial'),
  ('60000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', null, '30000000-0000-4000-8000-000000000003', 'Control 3', '[DEMO] Atención futura', 'scheduled', '2026-08-21 11:00:00-04', '2026-08-21 11:45:00-04', null, 1, 30000, 30000, '[DEMO] Pendiente'),
  ('60000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', null, null, '30000000-0000-4000-8000-000000000002', 'Evaluación inicial', '[DEMO] Atención directa', 'scheduled', '2026-08-17 10:30:00-04', '2026-08-17 12:00:00-04', null, 1, 45000, 45000, '[DEMO] Abono parcial'),
  ('60000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', null, null, '30000000-0000-4000-8000-000000000003', 'Control posterior', '[DEMO] Atención futura', 'scheduled', '2026-08-25 10:30:00-04', '2026-08-25 11:15:00-04', null, 1, 30000, 30000, '[DEMO] Pendiente'),
  ('60000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000002', null, '30000000-0000-4000-8000-000000000001', 'Sesión recuperación 1', '[DEMO] Atención realizada', 'completed', '2026-08-03 15:00:00-04', '2026-08-03 16:00:00-04', '2026-08-03 16:00:00-04', 1, 35000, 35000, '[DEMO] Pagada'),
  ('60000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000002', null, '30000000-0000-4000-8000-000000000001', 'Sesión recuperación 2', '[DEMO] Atención realizada', 'completed', '2026-08-10 15:00:00-04', '2026-08-10 16:00:00-04', '2026-08-10 16:00:00-04', 1, 35000, 35000, '[DEMO] Pagada'),
  ('60000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000002', null, '30000000-0000-4000-8000-000000000001', 'Sesión recuperación 3', '[DEMO] Atención programada', 'scheduled', '2026-08-17 15:00:00-04', '2026-08-17 16:00:00-04', null, 1, 35000, 35000, '[DEMO] Prepagada'),
  ('60000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', null, null, '30000000-0000-4000-8000-000000000001', 'Sesión individual', '[DEMO] No asistió', 'no_show', '2026-08-12 16:30:00-04', '2026-08-12 17:30:00-04', null, 1, 35000, 35000, '[DEMO] Pendiente'),
  ('60000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', null, '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Evaluación propuesta', '[DEMO] Borrador desde oportunidad', 'draft', null, null, null, 1, 45000, 45000, '[DEMO] Sin agendar'),
  ('60000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', null, '30000000-0000-4000-8000-000000000001', 'Sesión individual inicial', '[DEMO] Atención histórica', 'completed', '2026-07-27 09:00:00-04', '2026-07-27 10:00:00-04', '2026-07-27 10:00:00-04', 1, 35000, 35000, '[DEMO] Pagada'),
  ('60000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000002', null, '30000000-0000-4000-8000-000000000001', 'Sesión recuperación inicial', '[DEMO] Atención histórica', 'completed', '2026-07-27 15:00:00-04', '2026-07-27 16:00:00-04', '2026-07-27 16:00:00-04', 1, 35000, 35000, '[DEMO] Pagada'),
  ('60000000-0000-4000-8000-000000000017', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', null, '30000000-0000-4000-8000-000000000003', 'Control inicial', '[DEMO] Atención histórica', 'completed', '2026-07-31 11:00:00-04', '2026-07-31 11:45:00-04', '2026-07-31 11:45:00-04', 1, 30000, 30000, '[DEMO] Pagada'),
  ('60000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', null, null, '30000000-0000-4000-8000-000000000003', 'Control previo', '[DEMO] Atención histórica', 'completed', '2026-08-08 10:30:00-04', '2026-08-08 11:15:00-04', '2026-08-08 11:15:00-04', 1, 30000, 30000, '[DEMO] Pagada')
on conflict (id) do update set
  status = excluded.status,
  scheduled_start = excluded.scheduled_start,
  scheduled_end = excluded.scheduled_end,
  completed_at = excluded.completed_at,
  unit_price = excluded.unit_price,
  total_amount = excluded.total_amount,
  notes = excluded.notes;

update public.prestations
set follow_up_note = case id
  when '60000000-0000-4000-8000-000000000001' then 'Se mantiene frecuencia semanal.'
  when '60000000-0000-4000-8000-000000000005' then 'Se acuerda revisar evolución en la próxima sesión.'
end
where id in (
  '60000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000005'
);

insert into public.activities
  (id, workspace_id, account_id, contact_id, opportunity_id, engagement_id, prestation_id, activity_type, title, description, scheduled_at, completed_at, status)
values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', null, null, null, '60000000-0000-4000-8000-000000000008', 'task', 'Confirmar evaluación de Carolina', '[DEMO] Confirmación de asistencia', '2026-08-17 09:30:00-04', null, 'pending'),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', null, '40000000-0000-4000-8000-000000000002', null, null, 'call', 'Llamar para coordinar evaluación', '[DEMO] Próximo paso comercial', '2026-08-17 12:00:00-04', null, 'pending'),
  ('70000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', null, '40000000-0000-4000-8000-000000000003', null, null, 'email', 'Enviar propuesta de continuidad', '[DEMO] Seguimiento de oportunidad', '2026-08-17 16:00:00-04', null, 'pending'),
  ('70000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', null, null, '50000000-0000-4000-8000-000000000001', null, 'milestone', 'Revisar avance del tratamiento', '[DEMO] Revisión del plan', '2026-08-18 10:00:00-04', null, 'pending'),
  ('70000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', null, '40000000-0000-4000-8000-000000000005', null, null, 'call', 'Seguimiento renovación', '[DEMO] Actividad vencida', '2026-08-15 11:00:00-04', null, 'pending'),
  ('70000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', null, null, '50000000-0000-4000-8000-000000000001', null, 'note', 'Objetivos del plan acordados', '[DEMO] Nota operacional, no clínica', null, '2026-06-03 13:00:00-04', 'completed'),
  ('70000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', null, null, '50000000-0000-4000-8000-000000000003', null, 'meeting', 'Reunión de seguimiento', '[DEMO] Reunión completada', '2026-08-14 12:00:00-04', '2026-08-14 12:40:00-04', 'completed'),
  ('70000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', null, null, null, '60000000-0000-4000-8000-000000000013', 'whatsapp', 'Consultar reagendamiento', '[DEMO] Sin integración real de WhatsApp', '2026-08-18 15:00:00-04', null, 'pending'),
  ('70000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', null, null, null, '60000000-0000-4000-8000-000000000009', 'task', 'Preparar próximo control', '[DEMO] Tarea futura', '2026-08-24 17:00:00-04', null, 'pending')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  scheduled_at = excluded.scheduled_at,
  completed_at = excluded.completed_at,
  status = excluded.status;

insert into public.activities
  (id, workspace_id, account_id, engagement_id, prestation_id, activity_type, source, title, description, completed_at, status)
values
  ('71000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'note', 'prestation_follow_up', 'Seguimiento', 'Se mantiene frecuencia semanal.', '2026-08-03 10:05:00-04', 'completed'),
  ('71000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000005', 'note', 'prestation_follow_up', 'Seguimiento', 'Se acuerda revisar evolución en la próxima sesión.', '2026-08-07 11:50:00-04', 'completed')
on conflict (id) do update set
  description = excluded.description,
  completed_at = excluded.completed_at,
  source = excluded.source,
  status = excluded.status;

insert into public.appointment_reminders
  (id, workspace_id, prestation_id, account_id, recipient_email, scheduled_for, status, slot, lead_hours, provider)
values
  ('72000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000003', 'carolina.diaz@example.test', '2026-08-24 10:30:00-04', 'scheduled', 'primary', 24, 'mock')
on conflict (id) do update set
  recipient_email = excluded.recipient_email,
  scheduled_for = excluded.scheduled_for,
  status = excluded.status,
  lead_hours = excluded.lead_hours,
  provider = excluded.provider;

insert into public.payments
  (id, workspace_id, account_id, amount, currency_code, payment_date, payment_method, status, reference, notes)
values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 35000, 'CLP', '2026-08-03 17:10:00-04', 'transfer', 'paid', 'DEMO-PED-001', '[DEMO] Pago sesión 1'),
  ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 35000, 'CLP', '2026-08-10 17:05:00-04', 'transfer', 'paid', 'DEMO-PED-002', '[DEMO] Pago sesión 2'),
  ('80000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 35000, 'CLP', '2026-08-16 12:00:00-04', 'transfer', 'paid', 'DEMO-PED-003', '[DEMO] Prepago sesión 3'),
  ('80000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 35000, 'CLP', '2026-08-03 10:05:00-04', 'transfer', 'paid', 'DEMO-MAR-001', '[DEMO] Pago sesión 1'),
  ('80000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 35000, 'CLP', '2026-08-10 10:05:00-04', 'card', 'paid', 'DEMO-MAR-002', '[DEMO] Pago sesión 2'),
  ('80000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 35000, 'CLP', '2026-07-27 10:05:00-04', 'cash', 'paid', 'DEMO-MAR-003', '[DEMO] Pago sesión inicial'),
  ('80000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 15000, 'CLP', '2026-08-07 12:00:00-04', 'cash', 'paid', 'DEMO-JUA-001', '[DEMO] Abono parcial'),
  ('80000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 15000, 'CLP', '2026-08-14 12:00:00-04', 'transfer', 'paid', 'DEMO-JUA-002', '[DEMO] Abono parcial'),
  ('80000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 30000, 'CLP', '2026-07-31 12:00:00-04', 'transfer', 'paid', 'DEMO-JUA-003', '[DEMO] Pago control inicial'),
  ('80000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 30000, 'CLP', '2026-08-08 12:00:00-04', 'card', 'paid', 'DEMO-CAR-001', '[DEMO] Pago control previo'),
  ('80000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 20000, 'CLP', '2026-08-16 18:00:00-04', 'transfer', 'paid', 'DEMO-CAR-002', '[DEMO] Abono evaluación'),
  ('80000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 35000, 'CLP', '2026-08-16 09:00:00-04', 'transfer', 'paid', 'DEMO-MAR-004', '[DEMO] Prepago atención futura')
on conflict (id) do update set
  amount = excluded.amount,
  payment_date = excluded.payment_date,
  payment_method = excluded.payment_method,
  status = excluded.status,
  reference = excluded.reference,
  notes = excluded.notes;

insert into public.payment_allocations
  (id, workspace_id, payment_id, prestation_id, amount)
values
  ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000010', 35000),
  ('90000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000011', 35000),
  ('90000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000012', 35000),
  ('90000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000001', 35000),
  ('90000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000002', 35000),
  ('90000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000006', '60000000-0000-4000-8000-000000000015', 35000),
  ('90000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000007', '60000000-0000-4000-8000-000000000005', 15000),
  ('90000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000008', '60000000-0000-4000-8000-000000000006', 15000),
  ('90000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000009', '60000000-0000-4000-8000-000000000017', 30000),
  ('90000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000010', '60000000-0000-4000-8000-000000000018', 30000),
  ('90000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000011', '60000000-0000-4000-8000-000000000008', 20000),
  ('90000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000012', '60000000-0000-4000-8000-000000000004', 35000)
on conflict (id) do update set amount = excluded.amount;

commit;
