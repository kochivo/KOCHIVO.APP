-- Keep legacy rows while requiring useful rep counts on new writes and edits.
alter table public.set_logs
  add constraint set_logs_reps_positive check (reps >= 1) not valid;
