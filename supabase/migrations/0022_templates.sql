create function public.program_to_template(p_program uuid, p_title text)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  v_source public.programs;
  v_template uuid;
  v_day record;
  v_new_day uuid;
begin
  p_title := pg_catalog.regexp_replace(p_title, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if p_title is null or pg_catalog.char_length(p_title) not between 1 and 80 then
    raise exception 'invalid title' using errcode = '22023';
  end if;
  select * into v_source from public.programs
    where id = p_program and not is_template and captain_id = (select auth.uid()) for share;
  if not found then
    raise exception 'program not found' using errcode = 'P0002';
  end if;
  insert into public.programs (captain_id, player_id, is_template, source_template_id, title, notes, settings, status)
    values (v_source.captain_id, null, true, null, p_title, v_source.notes, v_source.settings, 'draft')
    returning id into v_template;
  for v_day in select * from public.program_days where program_id = p_program order by position loop
    insert into public.program_days (program_id, position, title)
      values (v_template, v_day.position, v_day.title) returning id into v_new_day;
    insert into public.program_exercises
      (day_id, exercise_id, position, superset_group, sets, reps_min, reps_max, rest_seconds, rpe, tempo, notes)
      select v_new_day, exercise_id, position, superset_group, sets, reps_min, reps_max, rest_seconds, rpe, tempo, notes
      from public.program_exercises where day_id = v_day.id;
  end loop;
  return v_template;
end;
$$;

create function public.nutrition_plan_to_template(p_plan uuid, p_title text)
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
    (captain_id, player_id, is_template, source_template_id, title, status, target_kcal, target_protein, target_carbs, target_fat)
    values (v_source.captain_id, null, true, null, p_title, 'draft',
      v_source.target_kcal, v_source.target_protein, v_source.target_carbs, v_source.target_fat)
    returning id into v_template;
  for v_meal in select * from public.meals where plan_id = p_plan order by position loop
    insert into public.meals (plan_id, position, name)
      values (v_template, v_meal.position, v_meal.name) returning id into v_new_meal;
    for v_item in select * from public.meal_items where meal_id = v_meal.id order by position loop
      insert into public.meal_items (meal_id, food_id, grams, position)
        values (v_new_meal, v_item.food_id, v_item.grams, v_item.position) returning id into v_new_item;
      insert into public.meal_item_alternatives (meal_item_id, food_id, grams)
        select v_new_item, food_id, grams from public.meal_item_alternatives where meal_item_id = v_item.id;
    end loop;
  end loop;
  return v_template;
end;
$$;

create function public.assign_nutrition_template(p_template uuid, p_player uuid)
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
  update public.nutrition_plans set status = 'archived' where player_id = p_player and status = 'active';
  insert into public.nutrition_plans
    (captain_id, player_id, is_template, source_template_id, title, status, target_kcal, target_protein, target_carbs, target_fat)
    values (v_source.captain_id, p_player, false, p_template, v_source.title, 'active',
      v_source.target_kcal, v_source.target_protein, v_source.target_carbs, v_source.target_fat)
    returning id into v_plan;
  for v_meal in select * from public.meals where plan_id = p_template order by position loop
    insert into public.meals (plan_id, position, name)
      values (v_plan, v_meal.position, v_meal.name) returning id into v_new_meal;
    for v_item in select * from public.meal_items where meal_id = v_meal.id order by position loop
      insert into public.meal_items (meal_id, food_id, grams, position)
        values (v_new_meal, v_item.food_id, v_item.grams, v_item.position) returning id into v_new_item;
      insert into public.meal_item_alternatives (meal_item_id, food_id, grams)
        select v_new_item, food_id, grams from public.meal_item_alternatives where meal_item_id = v_item.id;
    end loop;
  end loop;
  return v_plan;
end;
$$;

revoke execute on function public.program_to_template(uuid, text),
  public.nutrition_plan_to_template(uuid, text), public.assign_nutrition_template(uuid, uuid) from public, anon;
grant execute on function public.program_to_template(uuid, text),
  public.nutrition_plan_to_template(uuid, text), public.assign_nutrition_template(uuid, uuid) to authenticated;
