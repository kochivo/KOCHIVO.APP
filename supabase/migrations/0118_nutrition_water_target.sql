alter table public.nutrition_plans add column water_target_ml integer
  check (water_target_ml between 500 and 10000);

-- Extend the existing atomic saver without disturbing portion preservation.
do $migration$
declare source text;
begin
  source := pg_get_functiondef('public.save_nutrition_plan(uuid,jsonb)'::regprocedure);
  if position('target_fat = (p_draft->''targets''->>''fat'')::smallint where id = p_plan;' in source) = 0 then
    raise exception 'Nutrition saver source drift';
  end if;
  source := replace(source,
    'target_fat = (p_draft->''targets''->>''fat'')::smallint where id = p_plan;',
    'target_fat = (p_draft->''targets''->>''fat'')::smallint,
     water_target_ml = case when p_draft ? ''waterTargetMl''
       then (p_draft->>''waterTargetMl'')::integer else water_target_ml end where id = p_plan;');
  execute source;
end;
$migration$;

-- Keep meal scheduling and portion units in all nutrition template copies.

create or replace function public.nutrition_plan_to_template(p_plan uuid, p_title text)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  v_source public.nutrition_plans;
  v_template uuid;
  v_meal record;
  v_item record;
  v_new_meal uuid;
  v_new_item uuid;
begin
  p_title := pg_catalog.regexp_replace(p_title, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if p_title is null or pg_catalog.char_length(p_title) not between 1 and 80 then
    raise exception 'invalid title' using errcode = '22023';
  end if;
  select * into v_source from public.nutrition_plans
    where id = p_plan and not is_template and captain_id = (select auth.uid()) for share;
  if not found then
    raise exception 'plan not found' using errcode = 'P0002';
  end if;
  insert into public.nutrition_plans
    (captain_id, player_id, is_template, source_template_id, title, status, target_kcal, target_protein, target_carbs, target_fat, water_target_ml)
    values (v_source.captain_id, null, true, null, p_title, 'draft',
      v_source.target_kcal, v_source.target_protein, v_source.target_carbs, v_source.target_fat, v_source.water_target_ml)
    returning id into v_template;
  for v_meal in select * from public.meals where plan_id = p_plan order by position loop
    insert into public.meals (plan_id, position, name, day_type, time_of_day)
      values (v_template, v_meal.position, v_meal.name, v_meal.day_type, v_meal.time_of_day) returning id into v_new_meal;
    for v_item in select * from public.meal_items where meal_id = v_meal.id order by position loop
      insert into public.meal_items (meal_id, food_id, grams, position, unit)
        values (v_new_meal, v_item.food_id, v_item.grams, v_item.position, v_item.unit) returning id into v_new_item;
      insert into public.meal_item_alternatives (meal_item_id, food_id, grams)
        select v_new_item, food_id, grams from public.meal_item_alternatives where meal_item_id = v_item.id;
    end loop;
  end loop;
  return v_template;
end;
$$;

create or replace function public.assign_nutrition_template(p_template uuid, p_player uuid)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  v_source public.nutrition_plans;
  v_plan uuid;
  v_meal record;
  v_item record;
  v_new_meal uuid;
  v_new_item uuid;
begin
  if not public.is_captain_of(p_player) then
    raise exception 'not your player' using errcode = '42501';
  end if;
  -- Match activate_nutrition_plan's lock so assignment and activation serialize per player.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_player::text, 0));
  select * into v_source from public.nutrition_plans
    where id = p_template and is_template and captain_id = (select auth.uid()) for share;
  if not found then
    raise exception 'template not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.meals where plan_id = p_template) then
    raise exception 'template is empty' using errcode = '22023';
  end if;

  update public.nutrition_plans set status = 'archived' where player_id = p_player and status = 'active';
  insert into public.nutrition_plans
    (captain_id, player_id, is_template, source_template_id, title, status, target_kcal, target_protein, target_carbs, target_fat, water_target_ml)
    values (v_source.captain_id, p_player, false, p_template, v_source.title, 'active',
      v_source.target_kcal, v_source.target_protein, v_source.target_carbs, v_source.target_fat, v_source.water_target_ml)
    returning id into v_plan;
  for v_meal in select * from public.meals where plan_id = p_template order by position loop
    insert into public.meals (plan_id, position, name, day_type, time_of_day)
      values (v_plan, v_meal.position, v_meal.name, v_meal.day_type, v_meal.time_of_day) returning id into v_new_meal;
    for v_item in select * from public.meal_items where meal_id = v_meal.id order by position loop
      insert into public.meal_items (meal_id, food_id, grams, position, unit)
        values (v_new_meal, v_item.food_id, v_item.grams, v_item.position, v_item.unit) returning id into v_new_item;
      insert into public.meal_item_alternatives (meal_item_id, food_id, grams)
        select v_new_item, food_id, grams from public.meal_item_alternatives where meal_item_id = v_item.id;
    end loop;
  end loop;
  return v_plan;
end;
$$;

create or replace function public.copy_template(p_kind text, p_template uuid, p_title text)
returns uuid language plpgsql security invoker set search_path = ''
as $$
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
      insert into public.meals (plan_id, position, name, day_type, time_of_day)
        values (v_copy, v_child.position, v_child.name, v_child.day_type, v_child.time_of_day) returning id into v_new_child;
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
$$;

revoke execute on function public.nutrition_plan_to_template(uuid, text),
  public.assign_nutrition_template(uuid, uuid), public.copy_template(text, uuid, text) from public, anon;
grant execute on function public.nutrition_plan_to_template(uuid, text),
  public.assign_nutrition_template(uuid, uuid), public.copy_template(text, uuid, text) to authenticated;

