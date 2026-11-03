create index if not exists check_ins_player_created_idx
  on public.check_ins (player_id, created_at desc);
create index if not exists form_checks_player_created_idx
  on public.form_checks (player_id, created_at desc);

-- The composite index above also serves player_id lookups, so the 0029 single-column one is redundant.
drop index if exists public.form_checks_player_id;
