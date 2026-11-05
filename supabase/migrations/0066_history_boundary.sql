-- started_on is immutable (0015 guard) and survives renewals; seeded demo links backdate it with their history.
-- coach_clients_one_active_captain already indexes this lookup by player_id.
create function public.captain_since(p_player uuid) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select c.started_on::timestamp at time zone 'Africa/Cairo' from public.coach_clients c
  where c.player_id = p_player and c.captain_id = (select auth.uid())
    and c.archived_at is null and not (select public.is_suspended());
$$;
revoke all on function public.captain_since(uuid) from public, anon;
grant execute on function public.captain_since(uuid) to authenticated;

alter policy workout_sessions_captain_select on public.workout_sessions using (
  training_date >= (public.captain_since(player_id) at time zone 'Africa/Cairo')::date);

-- Sets inherit the training date, including offline sets uploaded after a move.
alter policy set_logs_captain_select on public.set_logs using (
  exists (select 1 from public.workout_sessions s where s.id = session_id
    and s.player_id = set_logs.player_id
    and s.training_date >= (public.captain_since(set_logs.player_id) at time zone 'Africa/Cairo')::date));

alter policy meal_logs_captain_select on public.meal_logs using (
  log_date >= (public.captain_since(player_id) at time zone 'Africa/Cairo')::date);
alter policy supplement_logs_read on public.supplement_logs using (
  player_id = (select auth.uid())
  or log_date >= (public.captain_since(player_id) at time zone 'Africa/Cairo')::date);
alter policy daily_checks_read on public.daily_checks using (
  player_id = (select auth.uid())
  or log_date >= (public.captain_since(player_id) at time zone 'Africa/Cairo')::date);
alter policy body_scans_coach on public.body_scans using (
  scan_date >= (public.captain_since(player_id) at time zone 'Africa/Cairo')::date);
alter policy readiness_decisions_read on public.readiness_decisions using (
  player_id = (select auth.uid())
  or (captain_id = (select auth.uid())
    and decision_date >= (public.captain_since(player_id) at time zone 'Africa/Cairo')::date));

alter policy check_ins_captain_select on public.check_ins using (
  captain_id = (select auth.uid())
  and week_start >= (public.captain_since(player_id) at time zone 'Africa/Cairo')::date);
alter policy form_checks_captain_select on public.form_checks using (
  captain_id = (select auth.uid()) and created_at >= public.captain_since(player_id));

-- A known object path must not bypass the corresponding log's RLS boundary.
alter policy body_scans_read on storage.objects using (
  bucket_id = 'body-scans' and (public.storage_owner(name) = (select auth.uid())
    or exists (select 1 from public.body_scans s where s.file_path = name
      and s.player_id = public.storage_owner(name)
      and s.scan_date >= (public.captain_since(s.player_id) at time zone 'Africa/Cairo')::date)));
alter policy private_media_read on storage.objects using (
  bucket_id in ('checkin-photos', 'form-videos')
  and (public.storage_owner(name) = (select auth.uid())
    or (bucket_id = 'checkin-photos' and exists (
      select 1 from public.check_ins c where name = any(c.photo_paths)
        and c.player_id = public.storage_owner(name)
        and c.week_start >= (public.captain_since(c.player_id) at time zone 'Africa/Cairo')::date))
    or (bucket_id = 'form-videos' and exists (
      select 1 from public.form_checks f where f.video_path = name
        and f.player_id = public.storage_owner(name)
        and f.created_at >= public.captain_since(f.player_id)))));
