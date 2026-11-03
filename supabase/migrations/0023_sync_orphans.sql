-- Deleted or unowned plan rows must not block offline history or later outbox batches.
create or replace function public.sync_workout_sessions(p_rows jsonb)
returns void language sql security invoker set search_path = ''
as $$
  insert into public.workout_sessions (id, program_day_id, training_date, started_at, completed_at, client_updated_at)
  select r.id,
         case when r.program_day_id is not null and public.owns_program_day(r.program_day_id) then r.program_day_id end,
         r.training_date, r.started_at, r.completed_at, r.client_updated_at
  from jsonb_to_recordset(p_rows) as r(
    id uuid, program_day_id uuid, training_date date, started_at timestamptz,
    completed_at timestamptz, client_updated_at timestamptz)
  on conflict (id) do update set
    completed_at = excluded.completed_at,
    client_updated_at = excluded.client_updated_at,
    server_updated_at = now()
  where public.workout_sessions.client_updated_at < excluded.client_updated_at;
$$;

create or replace function public.sync_set_logs(p_rows jsonb)
returns void language sql security invoker set search_path = ''
as $$
  insert into public.set_logs
    (id, session_id, program_exercise_id, exercise_id, set_index, weight_kg, reps, completed_at, client_updated_at, deleted_at)
  select r.id, r.session_id,
         case when r.program_exercise_id is not null and public.owns_program_exercise(r.program_exercise_id)
           then r.program_exercise_id end,
         r.exercise_id, r.set_index, r.weight_kg, r.reps,
         r.completed_at, r.client_updated_at, r.deleted_at
  from jsonb_to_recordset(p_rows) as r(
    id uuid, session_id uuid, program_exercise_id uuid, exercise_id uuid, set_index smallint,
    weight_kg numeric, reps smallint, completed_at timestamptz, client_updated_at timestamptz, deleted_at timestamptz)
  on conflict (id) do update set
    weight_kg = excluded.weight_kg,
    reps = excluded.reps,
    completed_at = excluded.completed_at,
    client_updated_at = excluded.client_updated_at,
    deleted_at = excluded.deleted_at,
    server_updated_at = now()
  where public.set_logs.client_updated_at < excluded.client_updated_at;
$$;

create or replace function public.sync_meal_logs(p_rows jsonb)
returns void language sql security invoker set search_path = ''
as $$
  insert into public.meal_logs (id, meal_id, log_date, swaps, completed_at, client_updated_at, deleted_at)
  select r.id,
         case when r.meal_id is not null and public.owns_meal(r.meal_id) then r.meal_id end,
         r.log_date, coalesce(r.swaps, '{}'), r.completed_at, r.client_updated_at, r.deleted_at
  from jsonb_to_recordset(p_rows) as r(
    id uuid, meal_id uuid, log_date date, swaps jsonb, completed_at timestamptz,
    client_updated_at timestamptz, deleted_at timestamptz)
  on conflict (id) do update set
    swaps = excluded.swaps,
    completed_at = excluded.completed_at,
    client_updated_at = excluded.client_updated_at,
    deleted_at = excluded.deleted_at,
    server_updated_at = now()
  where public.meal_logs.client_updated_at < excluded.client_updated_at;
$$;

revoke execute on function public.sync_workout_sessions(jsonb), public.sync_set_logs(jsonb),
  public.sync_meal_logs(jsonb) from public, anon;
grant execute on function public.sync_workout_sessions(jsonb), public.sync_set_logs(jsonb),
  public.sync_meal_logs(jsonb) to authenticated;
