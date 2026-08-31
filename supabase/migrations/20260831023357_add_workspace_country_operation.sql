-- Country of operation belongs to the workspace and determines its currency.
-- Existing Hazento workspaces are Chilean; abort rather than reinterpret an
-- unexpected regional value or historical currency.
do $$
begin
  if exists (
    select 1 from public.workspaces
    where country_code is distinct from 'CL' or currency_code is distinct from 'CLP'
  ) then
    raise exception 'Unexpected workspace country/currency found; review before migrating';
  end if;
end;
$$;

update public.workspaces
set country_code = 'CL', currency_code = 'CLP'
where country_code is null or btrim(country_code) = ''
   or currency_code is null or btrim(currency_code) = '';

alter table public.workspaces
  alter column country_code set default 'CL',
  alter column currency_code set default 'CLP';

create or replace function private.workspace_currency_for_country(country text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case upper(country)
    when 'CL' then 'CLP'
    when 'PE' then 'PEN'
    when 'PY' then 'PYG'
    else null
  end;
$$;

revoke all on function private.workspace_currency_for_country(text) from public, anon, authenticated;

create or replace function private.enforce_workspace_region()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  expected_currency text;
begin
  new.country_code := upper(btrim(new.country_code));
  expected_currency := private.workspace_currency_for_country(new.country_code);

  if expected_currency is null then
    raise exception 'Unsupported country code' using errcode = '22023';
  end if;
  if new.currency_code is distinct from expected_currency then
    raise exception 'Currency does not match workspace country' using errcode = '22023';
  end if;

  if tg_op = 'UPDATE'
     and (new.country_code is distinct from old.country_code
       or new.currency_code is distinct from old.currency_code)
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'Workspace country can only be corrected by support' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_workspace_region() from public, anon, authenticated;

drop trigger if exists workspaces_enforce_region on public.workspaces;
create trigger workspaces_enforce_region
before insert or update of country_code, currency_code on public.workspaces
for each row execute function private.enforce_workspace_region();

drop function if exists public.bootstrap_user_workspace(text, text, text, text);

create function public.bootstrap_user_workspace(
  p_workspace_name text,
  p_vertical_type text,
  p_country_code text default 'CL',
  p_first_name text default null,
  p_last_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  resolved_workspace_id uuid;
  resolved_vertical text;
  normalized_country text := upper(btrim(p_country_code));
  resolved_currency text;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if nullif(btrim(p_workspace_name), '') is null then
    raise exception 'Workspace name is required' using errcode = '22023';
  end if;
  if p_vertical_type not in ('health', 'creative', 'creator', 'sessions', 'other') then
    raise exception 'Invalid vertical type' using errcode = '22023';
  end if;
  -- CL is the only market enabled for onboarding. PE/PY remain modeled but
  -- cannot be enabled by manipulating the browser request.
  if normalized_country <> 'CL' then
    raise exception 'Country is not currently available' using errcode = '22023';
  end if;
  resolved_currency := private.workspace_currency_for_country(normalized_country);

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text, 0));

  insert into public.profiles(id, first_name, last_name)
  values (caller_id, nullif(btrim(p_first_name), ''), nullif(btrim(p_last_name), ''))
  on conflict (id) do update set
    first_name = coalesce(public.profiles.first_name, excluded.first_name),
    last_name = coalesce(public.profiles.last_name, excluded.last_name);

  select wm.workspace_id into resolved_workspace_id
  from public.workspace_members wm
  where wm.user_id = caller_id
  order by wm.created_at, wm.id
  limit 1;

  if resolved_workspace_id is null then
    insert into public.workspaces(name, vertical_type, country_code, currency_code)
    values (btrim(p_workspace_name), p_vertical_type, normalized_country, resolved_currency)
    returning id into resolved_workspace_id;

    insert into public.workspace_members(workspace_id, user_id, role)
    values (resolved_workspace_id, caller_id, 'owner');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(resolved_workspace_id::text, 1));
  select vertical_type into resolved_vertical from public.workspaces where id = resolved_workspace_id;

  if not exists (select 1 from public.services where workspace_id = resolved_workspace_id) then
    insert into public.services(workspace_id, name, description, default_duration_minutes, default_price, active)
    select resolved_workspace_id, defaults.name, defaults.description, defaults.duration_minutes, defaults.price, true
    from (values
      ('health', 'Sesión individual', 'Sesión de atención individual', 60, 35000::numeric),
      ('health', 'Evaluación inicial', 'Evaluación y definición de objetivos', 90, 45000::numeric),
      ('health', 'Control', 'Sesión breve de seguimiento', 45, 30000::numeric),
      ('health', 'Taller grupal', 'Sesión para equipos u organizaciones', 120, 180000::numeric),
      ('creative', 'Diseño de logo', 'Diseño y entrega de identidad gráfica principal', 60, 400000::numeric),
      ('creative', 'Identidad visual', 'Sistema visual completo para una marca', 90, 850000::numeric),
      ('creative', 'Diseño web', 'Diseño de interfaz y experiencia web', 60, 1200000::numeric),
      ('creative', 'Piezas para redes', 'Pack de piezas para comunicación digital', 60, 280000::numeric),
      ('creator', 'Reel', 'Video vertical para redes sociales', 60, 350000::numeric),
      ('creator', 'Stories', 'Secuencia de historias para campaña', 60, 180000::numeric),
      ('creator', 'Post', 'Publicación estática o carrusel', 60, 220000::numeric),
      ('creator', 'UGC', 'Contenido generado para uso de la marca', 60, 300000::numeric),
      ('sessions', 'Clase individual', 'Clase personalizada uno a uno', 60, 25000::numeric),
      ('sessions', 'Clase grupal', 'Clase para dos o más alumnos', 90, 18000::numeric),
      ('sessions', 'Evaluación', 'Evaluación de avance y próximos objetivos', 60, 25000::numeric),
      ('sessions', 'Taller intensivo', 'Sesión temática de mayor duración', 120, 45000::numeric),
      ('other', 'Asesoría', 'Servicio profesional personalizado', 60, 120000::numeric),
      ('other', 'Diagnóstico', 'Levantamiento y definición de necesidades', 90, 180000::numeric),
      ('other', 'Implementación', 'Ejecución del trabajo acordado', 60, 450000::numeric),
      ('other', 'Entrega final', 'Cierre y entrega de resultados', 60, 200000::numeric)
    ) as defaults(vertical, name, description, duration_minutes, price)
    where defaults.vertical = resolved_vertical;
  end if;

  return resolved_workspace_id;
end;
$$;

revoke all on function public.bootstrap_user_workspace(text, text, text, text, text) from public, anon;
grant execute on function public.bootstrap_user_workspace(text, text, text, text, text) to authenticated;

comment on function public.bootstrap_user_workspace(text, text, text, text, text) is
  'Creates one CL workspace with CLP currency after server-side country availability validation.';

comment on column public.workspaces.country_code is
  'ISO 3166-1 alpha-2 country where this workspace operates. User read-only after creation.';
comment on column public.workspaces.currency_code is
  'Workspace currency derived from country_code at creation; never inferred independently.';
