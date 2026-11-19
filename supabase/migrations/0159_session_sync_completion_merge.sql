begin;

create or replace function public.sync_workout_sessions(p_rows jsonb)
returns void language sql security invoker set search_path = ''
as $$
  insert into public.workout_sessions as stored
    (id, program_day_id, training_date, started_at, completed_at, client_updated_at, session_rpe, player_note)
  select r.id,
         case when r.program_day_id is not null and public.owns_program_day(r.program_day_id) then r.program_day_id end,
         r.training_date, r.started_at, r.completed_at, r.client_updated_at, r.session_rpe, r.player_note
  from jsonb_to_recordset(p_rows) as r(
    id uuid, program_day_id uuid, training_date date, started_at timestamptz,
    completed_at timestamptz, client_updated_at timestamptz, session_rpe smallint, player_note text)
  on conflict (id) do update set
    completed_at = coalesce(stored.completed_at, excluded.completed_at),
    session_rpe = case
      when stored.client_updated_at >= excluded.client_updated_at then coalesce(stored.session_rpe, excluded.session_rpe)
      when stored.completed_at is not null then coalesce(excluded.session_rpe, stored.session_rpe)
      else excluded.session_rpe end,
    player_note = case
      when stored.client_updated_at >= excluded.client_updated_at then coalesce(stored.player_note, excluded.player_note)
      when stored.completed_at is not null then coalesce(excluded.player_note, stored.player_note)
      else excluded.player_note end,
    client_updated_at = greatest(stored.client_updated_at, excluded.client_updated_at),
    server_updated_at = now()
  where stored.client_updated_at < excluded.client_updated_at
    or (stored.completed_at is null and excluded.completed_at is not null);
$$;
revoke execute on function public.sync_workout_sessions(jsonb) from public, anon;
grant execute on function public.sync_workout_sessions(jsonb) to authenticated;

create function public.ko_confirm_meal(
  p_token text, p_meal_id uuid, p_log_date date, p_swaps jsonb, p_eaten boolean, p_eaten_macros jsonb
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare approval jsonb := ko_private.verified_approval(p_token);
begin
  perform public.require_active_caller();
  if approval ->> 'kind' is distinct from 'meal_log'
    or (approval ->> 'player')::uuid is distinct from auth.uid()
    or (approval -> 'payload' ->> 'mealId')::uuid is distinct from p_meal_id
    or (approval -> 'payload' ->> 'eaten')::boolean is distinct from p_eaten then
    raise insufficient_privilege using message = 'valid KO meal approval required';
  end if;

  insert into ko_private.ko_action_receipts(captain_id, action_id)
    values (auth.uid(), (approval ->> 'id')::uuid) on conflict do nothing;
  if not found then return false; end if;

  perform public.ai_log_meal(p_meal_id, p_log_date, p_swaps, p_eaten, p_eaten_macros);
  return true;
end;
$$;
revoke all on function public.ko_confirm_meal(text, uuid, date, jsonb, boolean, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.ko_confirm_meal(text, uuid, date, jsonb, boolean, jsonb) to authenticated;

commit;
