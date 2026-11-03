-- 0011 log ownership. The 0006/0007 write policies checked who writes a log but not what it points at,
-- so a player could attach a log to another player's meal, session, program day or program exercise.
-- Each reference must now belong to the writer. Ownership ignores plan/program status on purpose:
-- editing an old log after the captain archives a plan must keep working.

create function public.owns_meal(p_meal uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.meals m join public.nutrition_plans p on p.id = m.plan_id
    where m.id = p_meal and p.player_id = (select auth.uid())
  );
$$;

create function public.owns_session(p_session uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.workout_sessions where id = p_session and player_id = (select auth.uid()));
$$;

create function public.owns_program_day(p_day uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.program_days d join public.programs p on p.id = d.program_id
    where d.id = p_day and p.player_id = (select auth.uid())
  );
$$;

create function public.owns_program_exercise(p_item uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.program_exercises e
    join public.program_days d on d.id = e.day_id
    join public.programs p on p.id = d.program_id
    where e.id = p_item and p.player_id = (select auth.uid())
  );
$$;

revoke execute on function public.owns_meal(uuid), public.owns_session(uuid),
  public.owns_program_day(uuid), public.owns_program_exercise(uuid) from public, anon;
grant execute on function public.owns_meal(uuid), public.owns_session(uuid),
  public.owns_program_day(uuid), public.owns_program_exercise(uuid) to authenticated;

drop policy meal_logs_player_insert on public.meal_logs;
drop policy meal_logs_player_update on public.meal_logs;
create policy meal_logs_player_insert on public.meal_logs for insert to authenticated
  with check (player_id = (select auth.uid()) and public.player_can_write()
              and (meal_id is null or public.owns_meal(meal_id)));
create policy meal_logs_player_update on public.meal_logs for update to authenticated
  using (player_id = (select auth.uid()))
  with check (player_id = (select auth.uid()) and public.player_can_write()
              and (meal_id is null or public.owns_meal(meal_id)));

drop policy workout_sessions_player_insert on public.workout_sessions;
drop policy workout_sessions_player_update on public.workout_sessions;
create policy workout_sessions_player_insert on public.workout_sessions for insert to authenticated
  with check (player_id = (select auth.uid()) and public.player_can_write()
              and (program_day_id is null or public.owns_program_day(program_day_id)));
create policy workout_sessions_player_update on public.workout_sessions for update to authenticated
  using (player_id = (select auth.uid()))
  with check (player_id = (select auth.uid()) and public.player_can_write()
              and (program_day_id is null or public.owns_program_day(program_day_id)));

drop policy set_logs_player_insert on public.set_logs;
drop policy set_logs_player_update on public.set_logs;
create policy set_logs_player_insert on public.set_logs for insert to authenticated
  with check (player_id = (select auth.uid()) and public.player_can_write()
              and public.owns_session(session_id)
              and (program_exercise_id is null or public.owns_program_exercise(program_exercise_id)));
create policy set_logs_player_update on public.set_logs for update to authenticated
  using (player_id = (select auth.uid()))
  with check (player_id = (select auth.uid()) and public.player_can_write()
              and public.owns_session(session_id)
              and (program_exercise_id is null or public.owns_program_exercise(program_exercise_id)));
