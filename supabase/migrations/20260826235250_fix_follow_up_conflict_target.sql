-- Match the upsert conflict target to the existing workspace-scoped partial
-- unique index activities_follow_up_source_uidx.
create or replace function public.sync_prestation_follow_up()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if nullif(btrim(new.follow_up_note),'') is null then
    delete from public.activities
    where prestation_id = new.id
      and source = 'prestation_follow_up';
  else
    insert into public.activities(
      workspace_id,
      account_id,
      prestation_id,
      engagement_id,
      opportunity_id,
      activity_type,
      title,
      description,
      status,
      source,
      scheduled_at,
      completed_at
    )
    values(
      new.workspace_id,
      new.account_id,
      new.id,
      new.engagement_id,
      new.opportunity_id,
      'note',
      'Seguimiento',
      btrim(new.follow_up_note),
      'completed',
      'prestation_follow_up',
      coalesce(new.completed_at, now()),
      coalesce(new.completed_at, now())
    )
    on conflict (workspace_id, prestation_id, source)
      where source = 'prestation_follow_up'
    do update set
      account_id = excluded.account_id,
      engagement_id = excluded.engagement_id,
      opportunity_id = excluded.opportunity_id,
      description = excluded.description,
      updated_at = now();
  end if;
  return new;
end;
$$;

revoke all on function public.sync_prestation_follow_up()
from public, anon, authenticated;
