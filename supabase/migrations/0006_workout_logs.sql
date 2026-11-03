-- 0006 workout logs written by the player, usually offline first (src/core/offline).
-- Ids are deterministic on the device (stableId), so retries and multi-device edits hit one row;
-- the sync RPCs keep whichever version has the latest client_updated_at.

create table public.workout_sessions (
  id uuid primary key,
  player_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  program_day_id uuid references public.program_days (id) on delete set null,
  training_date date not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  client_updated_at timestamptz not null,
  server_updated_at timestamptz not null default now()
);

create index workout_sessions_player_date on public.workout_sessions (player_id, training_date desc);

create table public.set_logs (
  id uuid primary key,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  player_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  program_exercise_id uuid references public.program_exercises (id) on delete set null,
  exercise_id uuid not null references public.exercises (id),
  set_index smallint not null check (set_index between 0 and 19),
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg between 0 and 1000),
  reps smallint check (reps is null or reps between 0 and 200),
  completed_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create index set_logs_session on public.set_logs (session_id);
create index set_logs_player_exercise on public.set_logs (player_id, exercise_id, completed_at desc);

alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;
grant select, insert, update on public.workout_sessions, public.set_logs to authenticated;

-- Player: always reads own history; writes only while the subscription is active (not in grace).
create policy workout_sessions_player_select on public.workout_sessions
  for select to authenticated using (player_id = (select auth.uid()));
create policy workout_sessions_player_insert on public.workout_sessions
  for insert to authenticated with check (player_id = (select auth.uid()) and public.player_can_write());
create policy workout_sessions_player_update on public.workout_sessions
  for update to authenticated
  using (player_id = (select auth.uid()))
  with check (player_id = (select auth.uid()) and public.player_can_write());
create policy workout_sessions_captain_select on public.workout_sessions
  for select to authenticated using (public.is_captain_of(player_id));

create policy set_logs_player_select on public.set_logs
  for select to authenticated using (player_id = (select auth.uid()));
create policy set_logs_player_insert on public.set_logs
  for insert to authenticated with check (player_id = (select auth.uid()) and public.player_can_write());
create policy set_logs_player_update on public.set_logs
  for update to authenticated
  using (player_id = (select auth.uid()))
  with check (player_id = (select auth.uid()) and public.player_can_write());
create policy set_logs_captain_select on public.set_logs
  for select to authenticated using (public.is_captain_of(player_id));

-- ---------- sync RPCs (security invoker: RLS above decides what is accepted) ----------

create function public.sync_workout_sessions(p_rows jsonb)
returns void language sql security invoker set search_path = ''
as $$
  insert into public.workout_sessions (id, program_day_id, training_date, started_at, completed_at, client_updated_at)
  select r.id, r.program_day_id, r.training_date, r.started_at, r.completed_at, r.client_updated_at
  from jsonb_to_recordset(p_rows) as r(
    id uuid, program_day_id uuid, training_date date, started_at timestamptz,
    completed_at timestamptz, client_updated_at timestamptz)
  on conflict (id) do update set
    completed_at = excluded.completed_at,
    client_updated_at = excluded.client_updated_at,
    server_updated_at = now()
  where public.workout_sessions.client_updated_at < excluded.client_updated_at;
$$;

create function public.sync_set_logs(p_rows jsonb)
returns void language sql security invoker set search_path = ''
as $$
  insert into public.set_logs
    (id, session_id, program_exercise_id, exercise_id, set_index, weight_kg, reps, completed_at, client_updated_at, deleted_at)
  select r.id, r.session_id, r.program_exercise_id, r.exercise_id, r.set_index, r.weight_kg, r.reps,
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

grant execute on function public.sync_workout_sessions(jsonb), public.sync_set_logs(jsonb) to authenticated;
