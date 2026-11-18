begin;

-- Replace the 0156 security-definer view (flagged by the Supabase security advisor)
-- with a function that returns only the caller's own training days.
drop view public.ai_player_training_days;

create function public.ai_my_training_days() returns smallint[]
language sql stable security definer set search_path = '' as $$
  select i.training_days
  from public.player_intake i
  join public.profiles p on p.id = i.player_id
  where i.player_id = (select auth.uid()) and p.role = 'player' and p.role_confirmed
    and p.suspended_at is null and not coalesce((auth.jwt()->>'is_anonymous')::boolean, false);
$$;
revoke all on function public.ai_my_training_days() from public, anon, authenticated, service_role;
grant execute on function public.ai_my_training_days() to authenticated;

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
    '/ai_player_workout_history'
  ) then
    return;
  end if;

  if request_method = 'POST' and request_path in (
    '/rpc/captain_roster', '/rpc/captain_dues', '/rpc/current_tier',
    '/rpc/team_leaderboard', '/rpc/my_points', '/rpc/ai_audit_write', '/rpc/ko_rate_take',
    '/rpc/ai_log_meal', '/rpc/ai_my_training_days'
  ) then
    return;
  end if;

  raise insufficient_privilege using message = 'not available to connected apps';
end;
$$;

commit;
