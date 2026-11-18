begin;

create function public.is_oauth_client() returns boolean
language sql stable set search_path = '' as $$
  select (auth.jwt() ->> 'client_id') is not null;
$$;
revoke execute on function public.is_oauth_client() from public;
grant execute on function public.is_oauth_client() to authenticated, anon, service_role;

create function public.oauth_request_gate() returns void
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
    '/program_exercises', '/exercises', '/plan_tiers', '/body_scans', '/ai_audit_log'
  ) then
    return;
  end if;

  if request_method = 'POST' and request_path in (
    '/rpc/captain_roster', '/rpc/captain_dues', '/rpc/current_tier',
    '/rpc/team_leaderboard', '/rpc/my_points', '/rpc/ai_audit_write', '/rpc/ko_rate_take'
  ) then
    return;
  end if;

  raise insufficient_privilege using message = 'not available to connected apps';
end;
$$;
revoke execute on function public.oauth_request_gate() from public;
grant execute on function public.oauth_request_gate() to authenticated, anon, service_role;

do $migration$
declare
  table_name name;
begin
  for table_name in select tablename from pg_tables where schemaname = 'public' and rowsecurity
  loop
    execute format('create policy first_party_insert on public.%I as restrictive for insert to authenticated
      with check (not public.is_oauth_client())', table_name);
    execute format('create policy first_party_update on public.%I as restrictive for update to authenticated
      using (not public.is_oauth_client()) with check (not public.is_oauth_client())', table_name);
    execute format('create policy first_party_delete on public.%I as restrictive for delete to authenticated
      using (not public.is_oauth_client())', table_name);

    -- The last five feed the security-invoker tool RPCs captain_roster and captain_dues.
    -- The request gate still refuses direct REST reads of them, and none is in a Realtime publication.
    if table_name not in ('profiles', 'coach_clients', 'nutrition_plans', 'programs', 'program_days',
        'program_exercises', 'exercises', 'plan_tiers', 'body_scans', 'ai_audit_log',
        'workout_sessions', 'check_ins', 'form_checks', 'player_payments', 'payment_collections') then
      execute format('create policy first_party_select on public.%I as restrictive for select to authenticated
        using (not public.is_oauth_client())', table_name);
    end if;
  end loop;
end;
$migration$;

create policy first_party_objects on storage.objects as restrictive for all to authenticated
  using (not public.is_oauth_client()) with check (not public.is_oauth_client());

-- Local test databases have no PostgREST role; hosted Supabase always does.
do $migration$
begin
  if exists (select from pg_roles where rolname = 'authenticator') then
    alter role authenticator set pgrst.db_pre_request = 'public.oauth_request_gate';
    notify pgrst, 'reload config';
  end if;
end;
$migration$;

commit;
