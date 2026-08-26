-- Atomic repository operations required by the browser client.
-- All functions validate the authenticated workspace membership and preserve RLS boundaries.

alter table public.workspaces
  add column reminder_email_enabled boolean not null default false,
  add column reminder_primary_hours integer not null default 24 check (reminder_primary_hours in (48,24,12,2,1)),
  add column reminder_secondary_enabled boolean not null default false,
  add column reminder_secondary_hours integer not null default 2 check (reminder_secondary_hours in (48,24,12,2,1)),
  add constraint workspaces_distinct_reminder_slots check (
    not reminder_secondary_enabled or reminder_primary_hours <> reminder_secondary_hours
  );

create or replace function public.create_payment_request_with_items(
  p_account_id uuid,
  p_amount numeric,
  p_due_date date default null,
  p_notes text default null,
  p_origin_prestation_id uuid default null,
  p_origin_engagement_id uuid default null,
  p_origin_opportunity_id uuid default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_request_id uuid;
  v_item jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive' using errcode = '22023'; end if;
  select a.workspace_id into v_workspace_id
  from public.accounts a
  join public.workspace_members wm on wm.workspace_id = a.workspace_id and wm.user_id = (select auth.uid())
  where a.id = p_account_id;
  if v_workspace_id is null then raise exception 'Person not found in an authorized workspace' using errcode = '42501'; end if;

  insert into public.payment_requests(workspace_id, account_id, origin_prestation_id, origin_engagement_id, origin_opportunity_id, status, amount, due_date, notes)
  values(v_workspace_id, p_account_id, p_origin_prestation_id, p_origin_engagement_id, p_origin_opportunity_id, 'pending', p_amount, p_due_date, nullif(btrim(p_notes), ''))
  returning id into v_request_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    insert into public.payment_request_items(workspace_id, payment_request_id, prestation_id, engagement_id, description, amount)
    values(v_workspace_id, v_request_id, nullif(v_item->>'prestation_id','')::uuid, nullif(v_item->>'engagement_id','')::uuid, btrim(v_item->>'description'), coalesce((v_item->>'amount')::numeric,0));
  end loop;
  if not exists(select 1 from public.payment_request_items where payment_request_id = v_request_id) then
    raise exception 'At least one item is required' using errcode = '22023';
  end if;
  return v_request_id;
end;
$$;

revoke all on function public.create_payment_request_with_items(uuid,numeric,date,text,uuid,uuid,uuid,jsonb) from public, anon;
grant execute on function public.create_payment_request_with_items(uuid,numeric,date,text,uuid,uuid,uuid,jsonb) to authenticated;

create or replace function public.sync_prestation_follow_up()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if nullif(btrim(new.follow_up_note),'') is null then
    delete from public.activities where prestation_id = new.id and source = 'prestation_follow_up';
  else
    insert into public.activities(workspace_id, account_id, prestation_id, engagement_id, opportunity_id, activity_type, title, description, status, source, scheduled_at, completed_at)
    values(new.workspace_id,new.account_id,new.id,new.engagement_id,new.opportunity_id,'note','Seguimiento',btrim(new.follow_up_note),'completed','prestation_follow_up',coalesce(new.completed_at,now()),coalesce(new.completed_at,now()))
    on conflict (prestation_id) where source = 'prestation_follow_up'
    do update set account_id=excluded.account_id, engagement_id=excluded.engagement_id, opportunity_id=excluded.opportunity_id, description=excluded.description, updated_at=now();
  end if;
  return new;
end;
$$;

create trigger prestations_sync_follow_up
after insert or update of follow_up_note, account_id, engagement_id, opportunity_id on public.prestations
for each row execute function public.sync_prestation_follow_up();

revoke all on function public.sync_prestation_follow_up() from public, anon, authenticated;
