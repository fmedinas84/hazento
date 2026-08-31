begin;

do $$
begin
  if exists (
    select 1 from public.workspaces
    where country_code <> 'CL' or currency_code <> 'CLP'
  ) then
    raise exception 'Existing workspaces must remain CL/CLP';
  end if;

  if private.workspace_currency_for_country('CL') <> 'CLP'
     or private.workspace_currency_for_country('PE') <> 'PEN'
     or private.workspace_currency_for_country('PY') <> 'PYG' then
    raise exception 'Country/currency mapping is invalid';
  end if;
end;
$$;

do $$
declare
  qa_user uuid;
begin
  select user_id into qa_user from public.workspace_members order by created_at limit 1;
  perform set_config('request.jwt.claim.sub', qa_user::text, true);

  begin
    perform public.bootstrap_user_workspace('No crear PE', 'health', 'PE', null, null);
    raise exception 'PE unexpectedly accepted';
  exception when sqlstate '22023' then
    null;
  end;

  begin
    perform public.bootstrap_user_workspace('No crear PY', 'health', 'PY', null, null);
    raise exception 'PY unexpectedly accepted';
  exception when sqlstate '22023' then
    null;
  end;
end;
$$;

rollback;
