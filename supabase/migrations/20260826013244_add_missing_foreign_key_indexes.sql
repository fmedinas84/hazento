-- Cover FK joins and delete checks reported by the Supabase Performance Advisor.
create index activities_workspace_account_idx
  on public.activities(workspace_id, account_id);
create index activities_workspace_account_contact_idx
  on public.activities(workspace_id, account_id, contact_id) where contact_id is not null;
create index activities_workspace_account_opportunity_idx
  on public.activities(workspace_id, account_id, opportunity_id) where opportunity_id is not null;
create index activities_workspace_account_engagement_idx
  on public.activities(workspace_id, account_id, engagement_id) where engagement_id is not null;
create index activities_workspace_account_prestation_idx
  on public.activities(workspace_id, account_id, prestation_id) where prestation_id is not null;
create index document_adjustments_recorded_by_idx
  on public.document_adjustments(recorded_by) where recorded_by is not null;
create index engagements_workspace_account_opportunity_idx
  on public.engagements(workspace_id, account_id, opportunity_id) where opportunity_id is not null;
create index opportunities_workspace_account_contact_idx
  on public.opportunities(workspace_id, account_id, primary_contact_id) where primary_contact_id is not null;
create index payment_allocations_workspace_prestation_idx
  on public.payment_allocations(workspace_id, prestation_id) where prestation_id is not null;
create index prestations_workspace_account_engagement_idx
  on public.prestations(workspace_id, account_id, engagement_id) where engagement_id is not null;
create index prestations_workspace_account_opportunity_idx
  on public.prestations(workspace_id, account_id, opportunity_id) where opportunity_id is not null;
create index prestations_workspace_service_idx
  on public.prestations(workspace_id, service_id) where service_id is not null;
