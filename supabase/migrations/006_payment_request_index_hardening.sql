-- Cover the composite foreign keys introduced by payment requests.
create index payment_requests_parent_fk_idx on public.payment_requests(workspace_id, account_id, parent_request_id) where parent_request_id is not null;
create index payment_requests_opportunity_fk_idx on public.payment_requests(workspace_id, account_id, origin_opportunity_id) where origin_opportunity_id is not null;
create index payment_requests_engagement_fk_idx on public.payment_requests(workspace_id, account_id, origin_engagement_id) where origin_engagement_id is not null;
create index payment_requests_prestation_fk_idx on public.payment_requests(workspace_id, account_id, origin_prestation_id) where origin_prestation_id is not null;
create index payment_requests_waived_by_idx on public.payment_requests(waived_by) where waived_by is not null;
create index payment_request_items_prestation_fk_idx on public.payment_request_items(workspace_id, prestation_id) where prestation_id is not null;
create index payment_request_items_engagement_fk_idx on public.payment_request_items(workspace_id, engagement_id) where engagement_id is not null;
create index payment_allocations_workspace_payment_idx on public.payment_allocations(workspace_id, payment_id);
