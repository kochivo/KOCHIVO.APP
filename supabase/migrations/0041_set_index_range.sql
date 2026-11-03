-- The workout queue numbers sets from 1, so the 20th set was rejected by the 0..19 check.
-- Zero stays valid for rows written before the queue switched to 1-based numbering.
alter table public.set_logs drop constraint set_logs_set_index_check;
alter table public.set_logs add constraint set_logs_set_index_check
  check (set_index between 0 and 20);
