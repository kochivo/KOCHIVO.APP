CREATE OR REPLACE FUNCTION public.nutrition_plan_to_template(p_plan uuid, p_title text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_source public.nutrition_plans; v_template uuid;
  v_meal record; v_item record;
  v_new_meal uuid; v_new_item uuid;
begin
  p_title := pg_catalog.regexp_replace(p_title, '^[[:space:]]+|[[:space:]]+$', '', 'g'); if p_title is null or pg_catalog.char_length(p_title) not between 1 and 80 then
    raise exception 'invalid title' using errcode = '22023'; end if;
  select * into v_source from public.nutrition_plans where id = p_plan and not is_template and captain_id = (select auth.uid()) for share;
  if not found then raise exception 'plan not found' using errcode = 'P0002';
  end if; insert into public.nutrition_plans
    (captain_id, player_id, is_template, source_template_id, title, status, target_kcal, target_protein, target_carbs, target_fat, water_target_ml) values (v_source.captain_id, null, true, null, p_title, 'draft',
      v_source.target_kcal, v_source.target_protein, v_source.target_carbs, v_source.target_fat, v_source.water_target_ml) returning id into v_template;
  for v_meal in select * from public.meals where plan_id = p_plan order by position loop insert into public.meals (plan_id, position, name, day_type, time_of_day, ramadan_slot)
      values (v_template, v_meal.position, v_meal.name, v_meal.day_type, v_meal.time_of_day, v_meal.ramadan_slot) returning id into v_new_meal; for v_item in select * from public.meal_items where meal_id = v_meal.id order by position loop
      insert into public.meal_items (meal_id, food_id, grams, position, unit) values (v_new_meal, v_item.food_id, v_item.grams, v_item.position, v_item.unit) returning id into v_new_item;
      insert into public.meal_item_alternatives (meal_item_id, food_id, grams) select v_new_item, food_id, grams from public.meal_item_alternatives where meal_item_id = v_item.id;
    end loop; end loop;
  return v_template;
end;
$function$;

CREATE OR REPLACE FUNCTION public.assign_nutrition_template(p_template uuid, p_player uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_source public.nutrition_plans; v_plan uuid;
  v_meal record; v_item record;
  v_new_meal uuid; v_new_item uuid;
begin
  if not public.is_captain_of(p_player) then raise exception 'not your player' using errcode = '42501';
  end if;
  -- Match activate_nutrition_plan's lock so assignment and activation serialize per player.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_player::text, 0)); select * into v_source from public.nutrition_plans
    where id = p_template and is_template and captain_id = (select auth.uid()) for share; if not found then
    raise exception 'template not found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.meals where plan_id = p_template) then raise exception 'template is empty' using errcode = '22023';
  end if;

  update public.nutrition_plans set status = 'archived' where player_id = p_player and status = 'active'; insert into public.nutrition_plans
    (captain_id, player_id, is_template, source_template_id, title, status, target_kcal, target_protein, target_carbs, target_fat, water_target_ml) values (v_source.captain_id, p_player, false, p_template, v_source.title, 'active',
      v_source.target_kcal, v_source.target_protein, v_source.target_carbs, v_source.target_fat, v_source.water_target_ml) returning id into v_plan;
  for v_meal in select * from public.meals where plan_id = p_template order by position loop insert into public.meals (plan_id, position, name, day_type, time_of_day, ramadan_slot)
      values (v_plan, v_meal.position, v_meal.name, v_meal.day_type, v_meal.time_of_day, v_meal.ramadan_slot) returning id into v_new_meal; for v_item in select * from public.meal_items where meal_id = v_meal.id order by position loop
      insert into public.meal_items (meal_id, food_id, grams, position, unit) values (v_new_meal, v_item.food_id, v_item.grams, v_item.position, v_item.unit) returning id into v_new_item;
      insert into public.meal_item_alternatives (meal_item_id, food_id, grams) select v_new_item, food_id, grams from public.meal_item_alternatives where meal_item_id = v_item.id;
    end loop; end loop;
  return v_plan;
end;
$function$;

CREATE OR REPLACE FUNCTION public.copy_template(p_kind text, p_template uuid, p_title text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_program public.programs;
  v_plan public.nutrition_plans;
  v_copy uuid;
  v_child record;
  v_item record;
  v_new_child uuid;
  v_new_item uuid;
begin
  p_title := pg_catalog.regexp_replace(p_title, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if p_title is null or pg_catalog.char_length(p_title) not between 1 and 80 then
    raise exception 'invalid title' using errcode = '22023';
  end if;
  if p_kind = 'program' then
    select * into v_program from public.programs
      where id = p_template and is_template and captain_id = (select auth.uid());
    if not found then raise exception 'template not found' using errcode = 'P0002'; end if;
    insert into public.programs (captain_id, player_id, is_template, source_template_id, title, notes, settings, status)
      values (v_program.captain_id, null, true, null, p_title, v_program.notes, v_program.settings, 'draft')
      returning id into v_copy;
    for v_child in select * from public.program_days where program_id = p_template order by position loop
      insert into public.program_days (program_id, position, title, weekday, is_rest_day, warmup)
        values (v_copy, v_child.position, v_child.title, v_child.weekday, v_child.is_rest_day, v_child.warmup) returning id into v_new_child;
      insert into public.program_exercises
        (day_id, exercise_id, position, superset_group, sets, reps_min, reps_max, rest_seconds, rpe, rir, tempo, notes, alternatives, set_plan)
        select v_new_child, exercise_id, position, superset_group, sets, reps_min, reps_max, rest_seconds, rpe, rir, tempo, notes, alternatives, set_plan
        from public.program_exercises where day_id = v_child.id; insert into public.program_cardio(day_id,position,kind,minutes,intensity,notes)
        select v_new_child,position,kind,minutes,intensity,notes from public.program_cardio where day_id=v_child.id;
    end loop;
  elsif p_kind = 'nutrition' then
    select * into v_plan from public.nutrition_plans
      where id = p_template and is_template and captain_id = (select auth.uid());
    if not found then raise exception 'template not found' using errcode = 'P0002'; end if;
    insert into public.nutrition_plans
      (captain_id, player_id, is_template, source_template_id, title, status, target_kcal, target_protein, target_carbs, target_fat, water_target_ml)
      values (v_plan.captain_id, null, true, null, p_title, 'draft',
        v_plan.target_kcal, v_plan.target_protein, v_plan.target_carbs, v_plan.target_fat, v_plan.water_target_ml)
      returning id into v_copy;
    for v_child in select * from public.meals where plan_id = p_template order by position loop
      insert into public.meals (plan_id, position, name, day_type, time_of_day, ramadan_slot)
        values (v_copy, v_child.position, v_child.name, v_child.day_type, v_child.time_of_day, v_child.ramadan_slot) returning id into v_new_child;
      for v_item in select * from public.meal_items where meal_id = v_child.id order by position loop
        insert into public.meal_items (meal_id, food_id, grams, position, unit)
          values (v_new_child, v_item.food_id, v_item.grams, v_item.position, v_item.unit) returning id into v_new_item;
        insert into public.meal_item_alternatives (meal_item_id, food_id, grams)
          select v_new_item, food_id, grams from public.meal_item_alternatives where meal_item_id = v_item.id;
      end loop;
    end loop;
  else
    raise exception 'invalid kind' using errcode = '22023';
  end if;
  return v_copy;
end;
$function$;

CREATE OR REPLACE FUNCTION public.queue_workout_reminders(p_today date DEFAULT NULL::date)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  insert into public.notifications(user_id, type, payload)
    select distinct on (p.player_id) p.player_id, 'workout_reminder',
      jsonb_build_object('day_title', d.title, 'program_id', p.id, 'training_date', coalesce(p_today,public.user_today(p.player_id)))
    from public.programs p
    join public.profiles u on u.id = p.player_id and u.role = 'player' and u.suspended_at is null
    join public.program_days d on d.program_id = p.id
    where not security_private.ramadan_active(p.player_id,coalesce(p_today,public.user_today(p.player_id))) and p.status = 'active' and not p.is_template and not d.is_rest_day
      and exists (select 1 from public.coach_clients c
        where c.player_id=p.player_id and c.captain_id=p.captain_id
          and c.archived_at is null and not c.pending and c.frozen_at is null and c.access_until >= public.user_today(c.captain_id))
      and (d.weekday = (extract(dow from coalesce(p_today,public.user_today(p.player_id)))::integer + 1) % 7
        or (not exists (select 1 from public.program_days weekly where weekly.program_id=p.id and weekly.weekday is not null)
        and exists (select 1 from public.player_intake i where i.player_id=p.player_id
          and extract(dow from coalesce(p_today,public.user_today(p.player_id)))::int=any(i.training_days)) and d.id=(select candidate.id from public.program_days candidate where candidate.program_id=p.id
          order by case when candidate.position>coalesce((select previous.position
            from public.workout_sessions s join public.program_days previous on previous.id=s.program_day_id
            where previous.program_id=p.id and s.training_date<=coalesce(p_today,public.user_today(p.player_id)) and s.completed_at is not null
            order by s.completed_at desc,s.id desc limit 1),-1) then 0 else 1 end,candidate.position limit 1)))
      and not exists (select 1 from public.workout_sessions s
        where s.player_id = p.player_id and s.training_date = coalesce(p_today,public.user_today(p.player_id)))
    order by p.player_id, p.created_at desc, p.id
    on conflict (user_id, (payload ->> 'training_date')) where type = 'workout_reminder' do nothing;
$function$;

CREATE OR REPLACE FUNCTION security_private.queue_ramadan_reminders(p_now timestamp with time zone DEFAULT now())
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with players as (
    select c.player_id,p.ramadan_training,city.lat,city.lng,dates.d from public.coach_clients c
    join public.profiles p on p.id=c.captain_id
    join public.profiles u on u.id=c.player_id and u.suspended_at is null
    cross join lateral (select coalesce(u.prayer_city,(select code from security_private.prayer_cities
      where timezone=public.safe_timezone(u.id) order by case when code in ('cairo','riyadh') then 0 else 1 end,code limit 1),'cairo') code) chosen
    join security_private.prayer_cities city on city.code=chosen.code
    cross join lateral (select (p_now at time zone city.timezone)::date + n as d from generate_series(-1,1) n) dates
    where c.archived_at is null and security_private.ramadan_active(c.player_id,dates.d)
  ), times as (
    select *,case ramadan_training
      when 'before_iftar_1h' then security_private.sunset_utc(d,lat,lng)-interval '1 hour'
      when 'after_iftar_2h' then security_private.sunset_utc(d,lat,lng)+interval '2 hours'
      when 'after_taraweeh' then security_private.sunset_utc(d,lat,lng)+interval '150 minutes'
      else security_private.solar_utc(d+1,lat,lng,109.5,false)-interval '90 minutes' end as training_at
    from players
  ) insert into public.notifications(user_id,type,payload)
    select distinct on (t.player_id,t.d) t.player_id,'workout_reminder',
      jsonb_build_object('training_date',t.d,'program_id',p.id,'day_title',p.title)
    from times t join public.programs p on p.player_id=t.player_id and p.status='active' and not p.is_template
    where p_now>=t.training_at-interval '30 minutes' and p_now<t.training_at+interval '30 minutes'
      and exists(select 1 from public.program_days d where d.program_id=p.id and not d.is_rest_day
        and (d.weekday=(extract(dow from t.d)::integer+1)%7
        or (not exists (select 1 from public.program_days weekly where weekly.program_id=p.id and weekly.weekday is not null)
        and exists (select 1 from public.player_intake i where i.player_id=p.player_id
          and extract(dow from t.d)::int=any(i.training_days)) and d.id=(select candidate.id from public.program_days candidate where candidate.program_id=p.id
          order by case when candidate.position>coalesce((select previous.position
            from public.workout_sessions s join public.program_days previous on previous.id=s.program_day_id
            where previous.program_id=p.id and s.training_date<=t.d and s.completed_at is not null
            order by s.completed_at desc,s.id desc limit 1),-1) then 0 else 1 end,candidate.position limit 1))))
      and not exists(select 1 from public.workout_sessions s where s.player_id=t.player_id and s.training_date=t.d)
    order by t.player_id,t.d,p.created_at desc,p.id
    on conflict(user_id,(payload->>'training_date')) where type='workout_reminder' do nothing;
$function$;

CREATE OR REPLACE FUNCTION security_private.points_board(p_captain uuid, p_month date, p_extra public.points_log DEFAULT NULL::public.points_log)
 RETURNS TABLE(player_id uuid, monthly bigint, "position" bigint, adherence integer, done integer, planned integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  -- Past months deliberately use the currently active program, not a historical snapshot.
  with calendar as materialized (
    select d::date as calendar_date,(extract(dow from d)::int + 1) % 7 weekday
    from generate_series(date_trunc('month',p_month)::timestamp,
      date_trunc('month',p_month)::timestamp+interval '1 month - 1 day',interval '1 day') d
  ), roster as materialized (
    select c.player_id,c.started_on from public.coach_clients c
    where c.captain_id=p_captain and c.archived_at is null
  ), active_programs as materialized (
    select p.id,p.player_id from public.programs p
    where p.captain_id=p_captain and p.status='active' and not p.is_template
  ), weekdays as (
    select distinct p.player_id,d.weekday from active_programs p
    join public.program_days d on d.program_id=p.id and not d.is_rest_day
    union
    select p.player_id,(training_day+1)%7 from active_programs p
    join public.player_intake i on i.player_id=p.player_id
    cross join lateral unnest(i.training_days) training_day
    where not exists (select 1 from public.program_days d where d.program_id=p.id and d.weekday is not null)
      and exists (select 1 from public.program_days d where d.program_id=p.id and not d.is_rest_day)
  ), schedules as (
    select r.player_id,greatest(8,count(c.calendar_date))::int planned
    from roster r left join weekdays w on w.player_id=r.player_id
    left join calendar c on c.weekday=w.weekday and c.calendar_date>=r.started_on group by r.player_id
  ), ledger as (
    -- Replace the pending row during BEFORE UPDATE; never double count p_extra.
    select l.* from public.points_log l where l.captain_id=p_captain and l.status='counted'
      and ((p_extra).id is null or l.id<>(p_extra).id)
    union all select (p_extra).* where (p_extra).id is not null
  ), completions as (
    select l.player_id,count(distinct (case when public.safe_timezone(s.player_id)=public.safe_timezone(p_captain) then s.training_date else l.earned_on end))::int done
    from ledger l join public.workout_sessions s on s.id::text=l.source_key and s.player_id=l.player_id
    where l.captain_id=p_captain and l.kind='workout' and l.status='counted'
      and (case when public.safe_timezone(s.player_id)=public.safe_timezone(p_captain) then s.training_date else l.earned_on end)>=date_trunc('month',p_month)::date
      and (case when public.safe_timezone(s.player_id)=public.safe_timezone(p_captain) then s.training_date else l.earned_on end)<(date_trunc('month',p_month)+interval '1 month')::date
    group by l.player_id
  ), totals as (
    select r.player_id,coalesce(max(c.done),0)::int done,
      coalesce(sum(l.points) filter(where l.kind in ('pr','inbody')),0) bonus,
      coalesce(sum(l.points) filter(where l.kind<>'meal_check'),0) raw,
      max(l.created_at) filter(where l.kind<>'meal_check') last_award
    from roster r left join ledger l on l.player_id=r.player_id and l.captain_id=p_captain
      and l.status='counted' and l.earned_on>=date_trunc('month',p_month)::date
      and l.earned_on<(date_trunc('month',p_month)+interval '1 month')::date
    left join completions c on c.player_id=r.player_id
    group by r.player_id
  ), scores as (
    select t.*,s.planned,case when a.player_id is not null
      then least(100,round(100.0*t.done/s.planned))::int else 0 end adherence
    from totals t join schedules s using(player_id)
    left join (select distinct player_id from active_programs) a using(player_id)
  )
  select s.player_id,s.adherence+s.bonus,row_number() over (
    order by s.adherence+s.bonus desc,s.raw desc,s.last_award asc nulls last,s.player_id),
    s.adherence,s.done,s.planned from scores s;
$function$;
