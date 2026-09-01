begin;

create temporary table partner_test_members as
select row_number() over (order by w.created_at) as position, w.id as workspace_id, wm.user_id
from public.workspaces w
join public.workspace_members wm on wm.workspace_id = w.id
where w.country_code = 'CL'
limit 2;

grant select on partner_test_members to authenticated;

do $$
begin
  if (select count(*) from partner_test_members) < 2 then
    raise exception 'Partner isolation test requires two staging workspaces';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', (select user_id::text from partner_test_members where position = 1), true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into public.partner_pages (
  workspace_id, country_code, slug, status, public_name, specialty, bio,
  photo_path, whatsapp, public_whatsapp
)
select workspace_id, 'CL', 'partner-qa-one', 'published', 'Profesional QA',
  'Servicios profesionales', 'Descripción pública de prueba.',
  workspace_id || '/qa.webp', '+56911111111', true
from partner_test_members where position = 1;

insert into storage.objects(bucket_id, name, owner_id, metadata)
select 'partner-photos', workspace_id || '/policy-test.webp', user_id, '{}'::jsonb
from partner_test_members where position = 1;

do $$
begin
  if (select count(*) from public.partner_pages where slug = 'partner-qa-one') <> 1 then
    raise exception 'Workspace owner cannot read its partner page';
  end if;
  begin
    insert into public.partner_pages(workspace_id, country_code, slug)
    select workspace_id, 'CL', 'cross-workspace-attempt' from partner_test_members where position = 2;
    raise exception 'Cross-workspace insert unexpectedly succeeded';
  exception when insufficient_privilege or foreign_key_violation then null;
  end;
  begin
    insert into storage.objects(bucket_id, name, owner_id, metadata)
    select 'partner-photos', workspace_id || '/cross-workspace.webp', user_id, '{}'::jsonb
    from partner_test_members where position = 2;
    raise exception 'Cross-workspace photo insert unexpectedly succeeded';
  exception when insufficient_privilege or check_violation then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', (select user_id::text from partner_test_members where position = 2), true);

do $$
begin
  if exists (select 1 from public.partner_pages where slug = 'partner-qa-one') then
    raise exception 'Workspace B can read workspace A partner configuration';
  end if;
  begin
    insert into public.partner_pages(workspace_id, country_code, slug)
    select workspace_id, 'CL', 'partner-qa-one' from partner_test_members where position = 2;
    raise exception 'Duplicate slug unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end;
$$;

reset role;
set local role anon;

do $$
begin
  if (select count(*) from public.get_published_partner_page('CL', 'partner-qa-one')) <> 1 then
    raise exception 'Published page is not publicly resolvable';
  end if;
  if (select count(*) from public.get_published_partner_page('CL', 'does-not-exist')) <> 0 then
    raise exception 'Unknown page leaked public data';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', (select user_id::text from partner_test_members where position = 1), true);
update public.partner_pages set status = 'draft' where slug = 'partner-qa-one';
reset role;
set local role anon;

do $$
begin
  if (select count(*) from public.get_published_partner_page('CL', 'partner-qa-one')) <> 0 then
    raise exception 'Draft page leaked public data';
  end if;
end;
$$;

rollback;
