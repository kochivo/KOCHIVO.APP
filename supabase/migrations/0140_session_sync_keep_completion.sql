create or replace function public.sync_workout_sessions(p_rows jsonb)
returns void language sql security invoker set search_path = ''
as $$
  insert into public.workout_sessions
    (id, program_day_id, training_date, started_at, completed_at, client_updated_at, session_rpe, player_note)
  select r.id,
         case when r.program_day_id is not null and public.owns_program_day(r.program_day_id) then r.program_day_id end,
         r.training_date, r.started_at, r.completed_at, r.client_updated_at, r.session_rpe, r.player_note
  from jsonb_to_recordset(p_rows) as r(
    id uuid, program_day_id uuid, training_date date, started_at timestamptz,
    completed_at timestamptz, client_updated_at timestamptz, session_rpe smallint, player_note text)
  on conflict (id) do update set
    completed_at = coalesce(excluded.completed_at, public.workout_sessions.completed_at),
    session_rpe = case when public.workout_sessions.completed_at is not null
      then coalesce(excluded.session_rpe, public.workout_sessions.session_rpe) else excluded.session_rpe end,
    player_note = case when public.workout_sessions.completed_at is not null
      then coalesce(excluded.player_note, public.workout_sessions.player_note) else excluded.player_note end,
    client_updated_at = excluded.client_updated_at,
    server_updated_at = now()
  where public.workout_sessions.client_updated_at < excluded.client_updated_at;
$$;
revoke execute on function public.sync_workout_sessions(jsonb) from public, anon;
grant execute on function public.sync_workout_sessions(jsonb) to authenticated;
