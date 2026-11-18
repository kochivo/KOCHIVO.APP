begin;

alter table public.ai_audit_log drop constraint ai_audit_log_kind_check,
  add constraint ai_audit_log_kind_check check (kind in ('read', 'propose', 'write'));

-- The workout rotation needs the schedule, while intake also holds private health data.
create view public.ai_player_training_days with (security_barrier = true) as
  select i.training_days
  from public.player_intake i
  join public.profiles p on p.id = i.player_id
  where i.player_id = (select auth.uid()) and p.role = 'player' and p.role_confirmed
    and p.suspended_at is null and not coalesce((auth.jwt()->>'is_anonymous')::boolean, false);
revoke all on public.ai_player_training_days from public, anon, authenticated, service_role;
grant select on public.ai_player_training_days to authenticated;

-- Keep workout notes out of the connector while using the existing session RLS.
create view public.ai_player_workout_history with (security_invoker = true) as
  select id, player_id, program_day_id, training_date, completed_at
  from public.workout_sessions
  where player_id = (select auth.uid());
revoke all on public.ai_player_workout_history from public, anon, authenticated, service_role;
grant select on public.ai_player_workout_history to authenticated;

create function public.ai_log_meal(
  p_meal_id uuid, p_log_date date, p_swaps jsonb, p_eaten boolean, p_eaten_macros jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  today date;
  swaps jsonb := coalesce(p_swaps, '{}'::jsonb);
  raw_id bytea;
  log_id uuid;
begin
  perform public.require_active_caller();
  if caller is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false)
    or not exists (select from public.profiles where id = caller and role = 'player' and role_confirmed)
    or not public.player_can_write()
    or not public.owns_meal(p_meal_id)
    or not public.can_read_plan(public.plan_of_meal(p_meal_id))
  then
    raise insufficient_privilege using message = 'active player and plan meal required';
  end if;

  today := public.user_today(caller);
  if p_log_date is null or p_log_date not in (today, today - 1) or p_eaten is null then
    raise invalid_parameter_value using message = 'valid meal status and date required';
  end if;

  if jsonb_typeof(swaps) <> 'object' then
    raise invalid_parameter_value using message = 'swaps must be an object';
  end if;
  if exists (
    select from jsonb_each_text(swaps) s
    where not exists (
      select from public.meal_items i
      join public.meal_item_alternatives a on a.meal_item_id = i.id
      where i.meal_id = p_meal_id and i.id::text = s.key and a.id::text = s.value
    )
  ) then
    raise invalid_parameter_value using message = 'invalid meal swap';
  end if;

  -- Mirror stableId in src/core/offline/ids.ts, including its version and variant bits.
  raw_id := substring(sha256(convert_to(
    'meal' || chr(31) || p_meal_id::text || chr(31) || to_char(p_log_date, 'YYYY-MM-DD'), 'UTF8'
  )) from 1 for 16);
  raw_id := set_byte(raw_id, 6, (get_byte(raw_id, 6) & 15) | 128);
  raw_id := set_byte(raw_id, 8, (get_byte(raw_id, 8) & 63) | 128);
  log_id := encode(raw_id, 'hex')::uuid;

  insert into public.meal_logs as current_log
    (id, player_id, meal_id, log_date, swaps, completed_at, eaten_macros, client_updated_at)
  values (log_id, caller, p_meal_id, p_log_date, swaps, case when p_eaten then now() end,
    case when p_eaten then nullif(p_eaten_macros, 'null'::jsonb) end, now())
  on conflict (id) do update set
    meal_id = excluded.meal_id,
    swaps = excluded.swaps,
    completed_at = excluded.completed_at,
    eaten_macros = excluded.eaten_macros,
    client_updated_at = excluded.client_updated_at,
    deleted_at = excluded.deleted_at,
    server_updated_at = now()
  where current_log.player_id = caller and current_log.log_date = excluded.log_date
    and current_log.client_updated_at < excluded.client_updated_at;
end;
$$;
revoke all on function public.ai_log_meal(uuid, date, jsonb, boolean, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.ai_log_meal(uuid, date, jsonb, boolean, jsonb) to authenticated;

create or replace function public.oauth_request_gate() returns void
language plpgsql stable set search_path = '' as $$
declare
  request_method text;
  request_path text;
begin
  if not public.is_oauth_client() then
    return;
  end if;

  request_method := current_setting('request.method', true);
  request_path := current_setting('request.path', true);

  if request_method in ('GET', 'HEAD') and request_path in (
    '/profiles', '/coach_clients', '/nutrition_plans', '/programs', '/program_days',
    '/program_exercises', '/exercises', '/plan_tiers', '/body_scans', '/ai_audit_log',
    '/meals', '/meal_items', '/meal_item_alternatives', '/foods', '/meal_logs',
    '/ai_player_workout_history', '/ai_player_training_days'
  ) then
    return;
  end if;

  if request_method = 'POST' and request_path in (
    '/rpc/captain_roster', '/rpc/captain_dues', '/rpc/current_tier',
    '/rpc/team_leaderboard', '/rpc/my_points', '/rpc/ai_audit_write', '/rpc/ko_rate_take',
    '/rpc/ai_log_meal'
  ) then
    return;
  end if;

  raise insufficient_privilege using message = 'not available to connected apps';
end;
$$;

drop policy first_party_select on public.meals;
drop policy first_party_select on public.meal_items;
drop policy first_party_select on public.meal_item_alternatives;
drop policy first_party_select on public.foods;
drop policy first_party_select on public.meal_logs;

commit;
