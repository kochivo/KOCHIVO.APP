alter table public.profiles add column demo_expires_at timestamptz;
create index profiles_demo_expiry on public.profiles (demo_expires_at) where demo_expires_at is not null;

-- No captain FK: account deletion must not erase the player ownership or rate receipt.
create table security_private.demo_workspaces (
  captain_id uuid primary key,
  player_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index demo_workspaces_created on security_private.demo_workspaces (created_at);
create index demo_workspaces_expiry on security_private.demo_workspaces (expires_at);
alter table security_private.demo_workspaces enable row level security;
create policy active_caller on security_private.demo_workspaces as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
revoke all on security_private.demo_workspaces from public, anon, authenticated;

create function security_private.guard_demo_expiry() returns trigger
language plpgsql set search_path = '' as $$ begin
  if current_user in ('anon', 'authenticated') and new.demo_expires_at is distinct from old.demo_expires_at then
    raise exception 'demo expiry is protected' using errcode = '42501';
  end if;
  return new;
end; $$;
create trigger profiles_demo_guard before update on public.profiles
  for each row execute function security_private.guard_demo_expiry();

create function security_private.guard_demo_invite() returns trigger
language plpgsql security definer set search_path = '' as $$ begin
  if exists (select 1 from public.profiles where id = new.captain_id and demo_expires_at is not null) then
    raise exception 'demo cannot invite' using errcode = '42501';
  end if;
  return new;
end; $$;
create trigger coach_invites_demo_guard before insert on public.coach_invites
  for each row execute function security_private.guard_demo_invite();

create or replace function public.enforce_player_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_limit int; v_count int;
begin
  if new.archived_at is not null then return new; end if;
  perform 1 from public.profiles where id = new.captain_id for update;
  if not exists (select 1 from public.profiles where id = new.captain_id and role = 'captain' and role_confirmed) then
    raise exception 'confirmed captain required' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = new.captain_id and suspended_at is not null) then
    raise exception 'captain is suspended' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = new.player_id and demo_expires_at is not null) then return new; end if;
  select player_limit into v_limit from public.plan_tiers where tier = security_private.current_tier(new.captain_id);
  select count(*) into v_count from public.coach_clients c join public.profiles p on p.id = c.player_id
    where c.captain_id = new.captain_id and c.archived_at is null and p.demo_expires_at is null;
  if v_count >= v_limit then raise exception 'plan allows % active players', v_limit using errcode = 'P0001'; end if;
  return new;
end; $$;

-- Match core/offline/ids.ts: SHA-256 of unit-separated parts and UUID v8 layout.
create function security_private.demo_stable_id(variadic parts text[]) returns uuid
language sql immutable set search_path = '' as $$
  select (substr(h, 1, 8) || '-' || substr(h, 9, 4) || '-8' || substr(h, 14, 3) || '-'
    || substr('89ab', ((get_byte(decode(h, 'hex'), 8) >> 4) & 3) + 1, 1)
    || substr(h, 18, 3) || '-' || substr(h, 21, 12))::uuid
  from (select encode(extensions.digest(convert_to(array_to_string(parts, chr(31)), 'UTF8'), 'sha256'), 'hex') as h) s;
$$;

create function public.create_demo_workspace() returns void
language plpgsql security definer set search_path = '' as $$
declare
  captain uuid := auth.uid(); player uuid; players uuid[] := '{}';
  program uuid; day_id uuid; plan uuid; meal uuid; exercise uuid; pe uuid; food uuid; session uuid;
  i int; ago int; stamp timestamptz; local_day date;
  names text[] := array['أحمد محمود', 'محمد حسن', 'عمر خالد', 'يوسف علي', 'مريم أحمد', 'سارة مصطفى', 'نور إبراهيم', 'منة سامح'];
begin
  if captain is null or (auth.jwt() ->> 'is_anonymous')::boolean is distinct from true then
    raise exception 'anonymous caller required' using errcode = '42501';
  end if;
  perform public.require_active_caller();
  perform 1 from public.profiles where id = captain for update;
  if not found then raise exception 'profile required' using errcode = '42501'; end if;
  if exists (select 1 from security_private.demo_workspaces where captain_id = captain) then return; end if;
  -- All anonymous callers share this lock, so simultaneous admissions cannot exceed 50.
  perform pg_catalog.pg_advisory_xact_lock(312026, 50);
  if (select count(*) from security_private.demo_workspaces where created_at > now() - interval '1 hour') >= 50 then
    raise exception 'demo_limit' using errcode = 'P0001';
  end if;
  insert into security_private.demo_workspaces (captain_id) values (captain);
  -- Consume the starter receipt before confirmation: demo content replaces the normal starter library.
  insert into security_private.starter_template_receipts (captain_id) values (captain) on conflict do nothing;
  update public.profiles set role = 'captain', role_confirmed = true, full_name = 'كابتن تجريبي',
    demo_expires_at = now() + interval '24 hours' where id = captain;
  local_day := (now() at time zone 'Africa/Cairo')::date;
  for i in 1..8 loop
    player := security_private.starter_uuidv7();
    insert into auth.users (id, raw_user_meta_data)
      values (player, jsonb_build_object('role', 'player', 'full_name', names[i]));
    update public.profiles set demo_expires_at = now() + interval '24 hours' where id = player;
    players := array_append(players, player);
    insert into public.coach_clients (id, captain_id, player_id, started_on, access_until)
      values (security_private.starter_uuidv7(), captain, player, local_day - 21,
        local_day + case when i = 8 then -2 when i <= 3 then i else 30 end);
    insert into public.player_intake (player_id, birth_year, sex, height_cm, weight_kg,
      target_weight_kg, training_days, session_minutes, experience, completed_at, created_at)
      values (player, 1990 + i, case when i <= 4 then 'male' else 'female' end, 165 + i,
        70 + i, 68 + i, array[0,2,4]::smallint[], 60, 'under_1y', now() - interval '15 days', now() - interval '21 days');
  end loop;
  update security_private.demo_workspaces set player_ids = players where captain_id = captain;
  select id into exercise from public.exercises where owner_id is null order by id limit 1;
  select id into food from public.foods where owner_id is null order by id limit 1;
  for i in 1..2 loop
    player := players[i]; program := security_private.starter_uuidv7(); day_id := security_private.starter_uuidv7();
    plan := security_private.starter_uuidv7(); meal := security_private.starter_uuidv7(); pe := security_private.starter_uuidv7();
    insert into public.programs (id, captain_id, player_id, title, status)
      values (program, captain, player, case when i = 1 then 'تقوية الجسم' else 'بداية جديدة' end, 'active');
    insert into public.program_days (id, program_id, position, title) values (day_id, program, 1, 'تمرين الجسم كله');
    if exercise is not null then
      insert into public.program_exercises (id, day_id, exercise_id, position, sets, reps_min, reps_max)
        values (pe, day_id, exercise, 1, 3, 8, 12);
    end if;
    insert into public.nutrition_plans (id, captain_id, player_id, title, status, target_kcal, target_protein, target_carbs, target_fat)
      values (plan, captain, player, case when i = 1 then 'أكل متوازن' else 'أكل لزيادة العضلات' end, 'active', 2200, 150, 260, 60);
    insert into public.meals (id, plan_id, position, name) values (meal, plan, 1, 'الغدا');
    if food is not null then
      insert into public.meal_items (id, meal_id, food_id, grams, position)
        values (security_private.starter_uuidv7(), meal, food, 200, 1);
    end if;
    for ago in 5..14 loop
      stamp := now() - ago * interval '1 day';
      session := security_private.demo_stable_id(day_id::text, ((stamp at time zone 'Africa/Cairo')::date)::text);
      insert into public.workout_sessions (id, player_id, program_day_id, training_date, started_at, completed_at, client_updated_at)
        values (session, player, day_id, (stamp at time zone 'Africa/Cairo')::date, stamp - interval '1 hour', stamp, stamp);
      if exercise is not null then
        insert into public.set_logs (id, session_id, player_id, program_exercise_id, exercise_id, set_index,
          weight_kg, reps, completed_at, client_updated_at)
          select security_private.demo_stable_id(session::text, pe::text, n::text), session, player, pe, exercise,
            n, 40 + (14 - ago) * 2 + i, 10, stamp, stamp from generate_series(0, 2) n;
      end if;
      if food is not null then
        insert into public.meal_logs (id, player_id, meal_id, log_date, completed_at, client_updated_at)
          values (security_private.demo_stable_id(meal::text, ((stamp at time zone 'Africa/Cairo')::date)::text),
            player, meal, (stamp at time zone 'Africa/Cairo')::date, stamp, stamp);
      end if;
    end loop;
    insert into public.check_ins (id, player_id, captain_id, week_start, body_weight_kg, notes, created_at)
      values (security_private.starter_uuidv7(), player, captain, local_day - 7, 71 + i,
        'التمرين ماشي كويس، محتاج أظبط الأكل', now() - interval '2 days');
  end loop;
end; $$;

create function security_private.purge_demo_workspaces() returns int
language plpgsql security definer set search_path = '' as $$
declare workspace record; ids uuid[]; total int := 0;
begin
  for workspace in select w.captain_id, w.player_ids from security_private.demo_workspaces w
    where w.expires_at <= now() or w.captain_id in
      (select id from public.profiles where demo_expires_at <= now()) for update loop
    ids := array_prepend(workspace.captain_id, workspace.player_ids);
    -- No storage cleanup: hosted Supabase forbids direct DELETE on storage.objects, and demo
    -- accounts cannot upload (demo players never sign in; the captain has no upload flow).
    delete from auth.users where id = any(ids);
    delete from security_private.demo_workspaces where captain_id = workspace.captain_id;
    total := total + 1;
  end loop;
  return total;
end; $$;
revoke all on function security_private.guard_demo_expiry(), security_private.guard_demo_invite(),
  security_private.demo_stable_id(text[]), security_private.purge_demo_workspaces(),
  public.create_demo_workspace() from public, anon, authenticated;
grant execute on function public.create_demo_workspace() to authenticated;
