-- Populate a real workspace with its minimal service catalog exactly once.
-- These are product defaults, not demo records; users can edit or deactivate them.
create or replace function public.bootstrap_user_workspace(
  p_workspace_name text,
  p_vertical_type text,
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
    insert into public.workspaces(name, vertical_type)
    values (btrim(p_workspace_name), p_vertical_type)
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

revoke all on function public.bootstrap_user_workspace(text, text, text, text) from public, anon;
grant execute on function public.bootstrap_user_workspace(text, text, text, text) to authenticated;

comment on function public.bootstrap_user_workspace(text, text, text, text) is
  'Creates one profile/workspace/owner membership and initializes the workspace service catalog idempotently.';
