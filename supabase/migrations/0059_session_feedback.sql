alter table public.workout_sessions
  add column session_rpe smallint check (session_rpe between 1 and 10),
  add column player_note text check (char_length(player_note) <= 500);

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
    completed_at = excluded.completed_at,
    session_rpe = excluded.session_rpe,
    player_note = excluded.player_note,
    client_updated_at = excluded.client_updated_at,
    server_updated_at = now()
  where public.workout_sessions.client_updated_at < excluded.client_updated_at;
$$;
revoke execute on function public.sync_workout_sessions(jsonb) from public, anon;
grant execute on function public.sync_workout_sessions(jsonb) to authenticated;
-- Push resolves the player route without reading the private note.
grant select (id, player_id) on public.workout_sessions to service_role;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('plan_assigned','nutrition_updated','player_joined','player_inactive','join_requested','workout_reminder','workout_feedback'));
-- Reading an alert must not allow a later resync to send it again.
create unique index notifications_workout_feedback_session on public.notifications ((payload ->> 'session_id'))
  where type = 'workout_feedback';

create function security_private.notify_workout_feedback() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.completed_at is not null and (nullif(btrim(new.player_note), '') is not null or new.session_rpe >= 9) then
    insert into public.notifications(user_id, type, payload)
      select c.captain_id, 'workout_feedback', jsonb_build_object(
        'session_id', new.id, 'rpe', new.session_rpe, 'has_note', nullif(btrim(new.player_note), '') is not null)
      from public.coach_clients c
      join public.profiles p on p.id = c.captain_id and p.suspended_at is null
      where c.player_id = new.player_id and c.archived_at is null
        and c.access_until >= (now() at time zone 'Africa/Cairo')::date
      on conflict ((payload ->> 'session_id')) where type = 'workout_feedback' do nothing;
  end if;
  return new;
end;
$$;
revoke all on function security_private.notify_workout_feedback() from public, anon, authenticated;
create trigger workout_feedback_notify after insert or update on public.workout_sessions
  for each row execute function security_private.notify_workout_feedback();
