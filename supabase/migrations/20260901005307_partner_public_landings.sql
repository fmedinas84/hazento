create table public.partner_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  country_code text not null,
  slug text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  public_name text not null default '',
  specialty text not null default '',
  bio text not null default '' check (char_length(bio) <= 1200),
  photo_path text,
  whatsapp text,
  public_whatsapp boolean not null default false,
  email text,
  public_email boolean not null default false,
  scheduling_enabled boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_pages_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint partner_pages_country_slug_key unique (country_code, slug),
  constraint partner_pages_public_name_length check (char_length(public_name) <= 100),
  constraint partner_pages_specialty_length check (char_length(specialty) <= 140),
  constraint partner_pages_whatsapp_length check (char_length(whatsapp) <= 40),
  constraint partner_pages_email_length check (char_length(email) <= 254),
  constraint partner_pages_publishable check (
    status <> 'published' or (
      public_name <> '' and specialty <> '' and bio <> '' and photo_path is not null
      and ((public_whatsapp and nullif(btrim(whatsapp), '') is not null)
        or (public_email and nullif(btrim(email), '') is not null))
    )
  )
);

create index partner_pages_status_slug_idx on public.partner_pages(country_code, slug) where status = 'published';

create or replace function private.prepare_partner_page()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  workspace_country text;
begin
  new.slug := lower(btrim(new.slug));
  select w.country_code into workspace_country
  from public.workspaces w
  where w.id = new.workspace_id;

  if workspace_country is null then
    raise exception 'Workspace not found' using errcode = '23503';
  end if;
  if workspace_country <> 'CL' then
    raise exception 'Partners is not available for this country' using errcode = '22023';
  end if;
  if new.slug in ('admin','api','www','app','login','registro','signup','soporte','support','ayuda','help','contacto','pricing','planes','hazento') then
    raise exception 'Reserved partner slug' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and new.workspace_id is distinct from old.workspace_id then
    raise exception 'Workspace cannot be reassigned' using errcode = '42501';
  end if;

  new.country_code := workspace_country;
  new.updated_at := now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := now();
  end if;
  return new;
end;
$$;

revoke all on function private.prepare_partner_page() from public, anon, authenticated;

create trigger partner_pages_prepare
before insert or update on public.partner_pages
for each row execute function private.prepare_partner_page();

alter table public.partner_pages enable row level security;

create policy partner_pages_select_member on public.partner_pages
for select to authenticated using (public.is_workspace_member(workspace_id));
create policy partner_pages_insert_member on public.partner_pages
for insert to authenticated with check (public.is_workspace_member(workspace_id));
create policy partner_pages_update_member on public.partner_pages
for update to authenticated using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
create policy partner_pages_delete_member on public.partner_pages
for delete to authenticated using (public.is_workspace_member(workspace_id));

revoke all on table public.partner_pages from anon;
grant select, insert, update, delete on table public.partner_pages to authenticated;

create or replace function public.is_partner_slug_available(p_country_code text, p_slug text, p_workspace_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    upper(btrim(p_country_code)) = 'CL'
    and lower(btrim(p_slug)) ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and lower(btrim(p_slug)) <> all(array['admin','api','www','app','login','registro','signup','soporte','support','ayuda','help','contacto','pricing','planes','hazento'])
    and not exists (
      select 1 from public.partner_pages page
      where page.country_code = upper(btrim(p_country_code))
        and page.slug = lower(btrim(p_slug))
        and (
          p_workspace_id is null
          or not public.is_workspace_member(p_workspace_id)
          or page.workspace_id <> p_workspace_id
        )
    );
$$;

revoke all on function public.is_partner_slug_available(text, text, uuid) from public;
grant execute on function public.is_partner_slug_available(text, text, uuid) to anon, authenticated;

create or replace function public.get_published_partner_page(p_country_code text, p_slug text)
returns table (
  slug text,
  public_name text,
  specialty text,
  bio text,
  photo_path text,
  whatsapp text,
  email text,
  can_auto_schedule boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select page.slug,
    page.public_name,
    page.specialty,
    page.bio,
    page.photo_path,
    case when page.public_whatsapp then page.whatsapp else null end,
    case when page.public_email then page.email else null end,
    page.scheduling_enabled and exists (
      select 1 from public.subscriptions subscription
      where subscription.workspace_id = page.workspace_id
        and subscription.plan = 'plus'
        and subscription.status = 'active'
    )
  from public.partner_pages page
  where page.country_code = upper(btrim(p_country_code))
    and page.slug = lower(btrim(p_slug))
    and page.status = 'published'
  limit 1;
$$;

revoke all on function public.get_published_partner_page(text, text) from public;
grant execute on function public.get_published_partner_page(text, text) to anon, authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('partner-photos', 'partner-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.partner_photo_workspace_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  first_folder text;
begin
  first_folder := (storage.foldername(object_name))[1];
  if first_folder is null or first_folder !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' then
    return null;
  end if;
  return first_folder::uuid;
end;
$$;

revoke all on function private.partner_photo_workspace_id(text) from public, anon, authenticated;
grant execute on function private.partner_photo_workspace_id(text) to authenticated;

create policy partner_photos_insert_member on storage.objects
for insert to authenticated with check (
  bucket_id = 'partner-photos'
  and public.is_workspace_member(private.partner_photo_workspace_id(name))
);
create policy partner_photos_update_member on storage.objects
for update to authenticated using (
  bucket_id = 'partner-photos'
  and public.is_workspace_member(private.partner_photo_workspace_id(name))
) with check (
  bucket_id = 'partner-photos'
  and public.is_workspace_member(private.partner_photo_workspace_id(name))
);
create policy partner_photos_select_member on storage.objects
for select to authenticated using (
  bucket_id = 'partner-photos'
  and public.is_workspace_member(private.partner_photo_workspace_id(name))
);
create policy partner_photos_delete_member on storage.objects
for delete to authenticated using (
  bucket_id = 'partner-photos'
  and public.is_workspace_member(private.partner_photo_workspace_id(name))
);

comment on table public.partner_pages is 'Workspace-owned configuration for Hazento Partners. Anonymous clients must use get_published_partner_page, never direct table access.';
