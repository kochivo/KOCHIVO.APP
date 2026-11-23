-- 0164 check-in sync: insert-only sync for offline weekly check-ins (T-421).
-- Insert-only because guard_review_update() forbids player updates of check_ins and
-- there is no player UPDATE policy; a re-send is a no-op on (player_id, week_start).

create function public.sync_check_ins(p_rows jsonb)
returns void language sql security invoker set search_path = ''
as $$
  insert into public.check_ins (id, week_start, body_weight_kg, waist_cm, notes, photo_paths, body_fat_pct, photo_poses)
  select r.id, r.week_start, r.body_weight_kg, r.waist_cm, r.notes, r.photo_paths, r.body_fat_pct, r.photo_poses
  from jsonb_to_recordset(p_rows) as r(
    id uuid, week_start date, body_weight_kg numeric, waist_cm numeric, notes text,
    photo_paths text[], body_fat_pct numeric, photo_poses text[])
  on conflict (player_id, week_start) do nothing;
$$;

revoke all on function public.sync_check_ins(jsonb) from public, anon;
grant execute on function public.sync_check_ins(jsonb) to authenticated;
