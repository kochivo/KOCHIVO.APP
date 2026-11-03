-- Richer demo: the demo captain now keeps the normal starter library (copied by the
-- profiles_starter_templates trigger on confirmation) and six players get real programs and
-- nutrition plans from it, with history shaped so every captain screen has something to show.

-- One player's training history: p_count sessions every p_step days, the newest p_last days ago,
-- cycling through the active program's days with slowly rising weights.
create function security_private.demo_history(p_player uuid, p_last int, p_count int, p_step int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  days uuid[]; v_day uuid; session uuid; stamp timestamptz; local_day date; k int; ago int;
begin
  select array_agg(d.id order by d.position) into days
    from public.program_days d join public.programs p on p.id = d.program_id
    where p.player_id = p_player and p.status = 'active';
  if days is null then return; end if;
  for k in 0..p_count - 1 loop
    ago := p_last + (p_count - 1 - k) * p_step;
    stamp := now() - ago * interval '1 day';
    local_day := (stamp at time zone 'Africa/Cairo')::date;
    v_day := days[k % array_length(days, 1) + 1];
    session := security_private.demo_stable_id(v_day::text, local_day::text);
    insert into public.workout_sessions (id, player_id, program_day_id, training_date, started_at, completed_at, client_updated_at)
      values (session, p_player, v_day, local_day, stamp - interval '1 hour', stamp, stamp);
    insert into public.set_logs (id, session_id, player_id, program_exercise_id, exercise_id, set_index,
      weight_kg, reps, completed_at, client_updated_at)
      select security_private.demo_stable_id(session::text, e.id::text, n::text), session, p_player, e.id, e.exercise_id, n,
        round((15 + 5 * e.position + k * 1.25) / 2.5) * 2.5, greatest(coalesce(e.reps_max, e.reps_min) - n, e.reps_min), stamp, stamp
      from public.program_exercises e cross join generate_series(0, e.sets - 1) n
      where e.day_id = v_day;
  end loop;
end; $$;

-- Meals ticked on most of the last ten days; every fourth day is skipped so adherence is not perfect.
create function security_private.demo_meal_logs(p_player uuid, p_offset int)
returns void language plpgsql security definer set search_path = '' as $$
declare ago int; stamp timestamptz; local_day date;
begin
  for ago in 1..10 loop
    continue when (ago + p_offset) % 4 = 0;
    stamp := now() - ago * interval '1 day';
    local_day := (stamp at time zone 'Africa/Cairo')::date;
    insert into public.meal_logs (id, player_id, meal_id, log_date, completed_at, client_updated_at)
      select security_private.demo_stable_id(m.id::text, local_day::text), p_player, m.id, local_day, stamp, stamp
      from public.meals m join public.nutrition_plans p on p.id = m.plan_id
      where p.player_id = p_player and p.status = 'active';
  end loop;
end; $$;

create or replace function public.create_demo_workspace() returns void
language plpgsql security definer set search_path = '' as $$
declare
  captain uuid := auth.uid(); player uuid; players uuid[] := '{}'; template uuid;
  i int; local_day date; saturday date;
  names text[] := array['أحمد محمود', 'محمد حسن', 'عمر خالد', 'يوسف علي', 'مريم أحمد', 'سارة مصطفى', 'نور إبراهيم', 'منة سامح'];
  workouts text[] := array['push-pull-legs', 'upper-lower', 'beginner-full-body', 'fat-loss-circuits', 'home-dumbbells', 'beginner-full-body'];
  diets text[] := array['bulking', 'maintenance', 'maintenance', 'cutting', 'cutting', 'bulking'];
  -- Per player: newest session (days ago), session count, gap. Player 4 stopped (dropout radar),
  -- player 5 is new, player 6 never started; 7 has no program and 8's access has ended.
  last_ago int[] := array[1, 2, 1, 9, 1]; sessions int[] := array[7, 6, 5, 4, 3]; gaps int[] := array[2, 2, 3, 3, 2];
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
  update public.profiles set role = 'captain', role_confirmed = true, full_name = 'كابتن تجريبي',
    demo_expires_at = now() + interval '24 hours' where id = captain;
  local_day := (now() at time zone 'Africa/Cairo')::date;
  saturday := local_day - ((extract(dow from local_day)::int + 1) % 7);
  for i in 1..8 loop
    player := security_private.starter_uuidv7();
    insert into auth.users (id, raw_user_meta_data)
      values (player, jsonb_build_object('role', 'player', 'full_name', names[i]));
    update public.profiles set demo_expires_at = now() + interval '24 hours' where id = player;
    players := array_append(players, player);
    insert into public.coach_clients (id, captain_id, player_id, started_on, access_until)
      values (security_private.starter_uuidv7(), captain, player, local_day - case when i = 5 then 7 else 28 end,
        local_day + case when i = 8 then -2 when i <= 3 then i else 30 end);
    insert into public.player_intake (player_id, birth_year, sex, height_cm, weight_kg,
      target_weight_kg, training_days, session_minutes, experience, completed_at, created_at)
      values (player, 1990 + i, case when i <= 4 then 'male' else 'female' end, 165 + i,
        70 + i, 68 + i, array[0,2,4]::smallint[], 60, 'under_1y', now() - interval '15 days', now() - interval '21 days');
    insert into public.player_payments (captain_id, player_id, amount_egp, days, period_start, period_end, created_at)
      values (captain, player, case when i % 2 = 0 then 800 else 1000 end, 30,
        local_day - case when i = 8 then 32 else 28 end, local_day + case when i = 8 then -2 else 2 end,
        now() - case when i = 8 then interval '32 days' else interval '28 days' end);
  end loop;
  update security_private.demo_workspaces set player_ids = players where captain_id = captain;

  for i in 1..6 loop
    select p.id into template from public.programs p join security_private.starter_templates t
      on t.payload ->> 'title' = p.title and t.key = workouts[i]
      where p.captain_id = captain and p.is_template;
    if found then perform public.assign_program_template(template, players[i]); end if;
    select p.id into template from public.nutrition_plans p join security_private.starter_templates t
      on t.payload ->> 'title' = p.title and t.key = diets[i]
      where p.captain_id = captain and p.is_template;
    if found then perform public.assign_nutrition_template(template, players[i]); end if;
  end loop;
  for i in 1..5 loop
    perform security_private.demo_history(players[i], last_ago[i], sessions[i], gaps[i]);
    perform security_private.demo_meal_logs(players[i], i);
  end loop;

  insert into public.check_ins (player_id, captain_id, week_start, body_weight_kg, waist_cm, notes, captain_reply, reviewed_at, created_at)
    values
      (players[1], captain, saturday - 14, 74.5, 86, 'الأسبوع ده كان حلو، زودت في البنش', 'ممتاز، كمّل كده وزوّد البروتين شوية', now() - interval '12 days', now() - interval '13 days'),
      (players[1], captain, saturday - 7, 75.2, 85.5, 'حاسس إني أتقل، والنوم أحسن', null, null, now() - interval '2 days'),
      (players[2], captain, saturday - 7, 68.1, 79, 'التمرين ماشي كويس، محتاج أظبط الأكل', null, null, now() - interval '1 day'),
      (players[3], captain, saturday - 7, 81.4, 92, 'وزني نزل كيلو', 'شغل حلو، خلّي الكارب زي ما هو', now() - interval '3 days', now() - interval '4 days');
end; $$;

revoke all on function security_private.demo_history(uuid, int, int, int), security_private.demo_meal_logs(uuid, int)
  from public, anon, authenticated;
