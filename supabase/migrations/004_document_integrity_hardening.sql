begin;

create index payment_allocations_workspace_document_idx
  on public.payment_allocations(workspace_id, document_id)
  where document_id is not null;

create or replace function public.preserve_issued_document_total()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.tax_status in ('issued', 'voided') and new.total_amount <> old.total_amount then
    raise exception 'Issued document totals are immutable; void and reissue the document';
  end if;
  return new;
end;
$$;

create trigger documents_preserve_issued_total
before update of total_amount on public.documents
for each row execute function public.preserve_issued_document_total();

commit;
