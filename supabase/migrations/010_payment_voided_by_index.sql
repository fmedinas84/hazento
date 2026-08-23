create index payments_voided_by_idx
  on public.payments(voided_by) where voided_by is not null;
