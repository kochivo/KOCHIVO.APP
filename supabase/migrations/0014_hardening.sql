-- 0014 hardening, driven by the Supabase security advisors after the first deploy.
-- Every policy targets `authenticated`, so `anon` needs nothing here except invite_preview (0013).

-- Trigger functions are never called through the API. Triggers fire without an EXECUTE check.
revoke execute on function
  public.touch_updated_at(), public.handle_new_user(), public.guard_profile_update(),
  public.enforce_player_limit(), public.set_inbox_captain(), public.guard_review_update()
from public, anon, authenticated;

-- RLS helpers and RPCs: signed-in callers only. The helpers stay callable by `authenticated`
-- because policies run as the caller; each one only answers about auth.uid() itself.
revoke execute on function
  public.is_captain_of(uuid), public.player_can_read(), public.player_can_write(), public.my_captain_id(),
  public.redeem_invite(text), public.can_edit_program(uuid), public.can_read_program(uuid),
  public.assign_program_template(uuid, uuid), public.sync_workout_sessions(jsonb), public.sync_set_logs(jsonb),
  public.can_edit_plan(uuid), public.can_read_plan(uuid), public.plan_of_meal(uuid), public.plan_of_item(uuid),
  public.sync_meal_logs(jsonb), public.storage_owner(text), public.valid_intake_training_days(smallint[])
from public, anon;
grant execute on function
  public.is_captain_of(uuid), public.player_can_read(), public.player_can_write(), public.my_captain_id(),
  public.redeem_invite(text), public.can_edit_program(uuid), public.can_read_program(uuid),
  public.assign_program_template(uuid, uuid), public.sync_workout_sessions(jsonb), public.sync_set_logs(jsonb),
  public.can_edit_plan(uuid), public.can_read_plan(uuid), public.plan_of_meal(uuid), public.plan_of_item(uuid),
  public.sync_meal_logs(jsonb), public.storage_owner(text), public.valid_intake_training_days(smallint[])
to authenticated;

-- Supabase grants anon every table by default. RLS already hides the rows; this removes the surface.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- New objects start closed to anon and PUBLIC; each migration grants what it needs explicitly.
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- A form check may only point at the player's own set and the player's own storage folder.
drop policy form_checks_player_insert on public.form_checks;
create policy form_checks_player_insert on public.form_checks for insert to authenticated
  with check (
    player_id = (select auth.uid()) and public.player_can_write()
    and public.storage_owner(video_path) = (select auth.uid())
    and (set_log_id is null or exists (
      select 1 from public.set_logs s where s.id = set_log_id and s.player_id = (select auth.uid())))
  );

-- Same for check-in photos: every path must sit in the player's own folder.
drop policy check_ins_player_insert on public.check_ins;
create policy check_ins_player_insert on public.check_ins for insert to authenticated
  with check (
    player_id = (select auth.uid()) and public.player_can_write()
    and not exists (
      select 1 from unnest(photo_paths) as path
      where public.storage_owner(path) is distinct from (select auth.uid()))
  );
