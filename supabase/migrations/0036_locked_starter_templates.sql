-- Starter templates are KOCHIVO's library: a captain can preview, assign or copy them, but never edit
-- or delete them. The lock lives in the database so a hidden button is not the only guard.
-- A later migration that must fix starter content disables these triggers for its statement.
alter table public.programs add column is_starter boolean not null default false;
alter table public.nutrition_plans add column is_starter boolean not null default false;

-- Copies keep the library title, so a captain who renamed one keeps it as their own template.
create function security_private.mark_starter_templates(p_captain uuid) returns void
language sql security definer set search_path = '' as $$
  update public.programs p set is_starter = true
    where p.captain_id = p_captain and p.is_template and not p.is_starter
      and p.title in (select s.payload ->> 'title' from security_private.starter_templates s
        where s.payload ->> 'kind' = 'workout');
  update public.nutrition_plans n set is_starter = true
    where n.captain_id = p_captain and n.is_template and not n.is_starter
      and n.title in (select s.payload ->> 'title' from security_private.starter_templates s
        where s.payload ->> 'kind' is distinct from 'workout');
$$;

create or replace function security_private.on_captain_confirmed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'captain' and new.role_confirmed then
    if tg_op = 'INSERT' or old.role is distinct from new.role or not old.role_confirmed then
      perform security_private.copy_starter_templates(new.id);
      perform security_private.mark_starter_templates(new.id);
    end if;
  end if;
  return new;
end;
$$;

-- Account deletion cascades from auth.users, whose row is already gone when the cascade reaches here.
create function security_private.guard_starter_template() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.is_starter and exists (select 1 from auth.users u where u.id = old.captain_id) then
    raise exception 'starter templates are read-only' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function security_private.in_starter_template(p_table text, p_row jsonb) returns boolean
language sql stable security definer set search_path = '' as $$
  select case p_table
    when 'program_days' then exists (select 1 from public.programs p
      where p.id = (p_row ->> 'program_id')::uuid and p.is_starter)
    when 'program_exercises' then exists (select 1 from public.program_days d
      join public.programs p on p.id = d.program_id where d.id = (p_row ->> 'day_id')::uuid and p.is_starter)
    when 'meals' then exists (select 1 from public.nutrition_plans n
      where n.id = (p_row ->> 'plan_id')::uuid and n.is_starter)
    when 'meal_items' then exists (select 1 from public.meals m
      join public.nutrition_plans n on n.id = m.plan_id where m.id = (p_row ->> 'meal_id')::uuid and n.is_starter)
    when 'meal_item_alternatives' then exists (select 1 from public.meal_items i
      join public.meals m on m.id = i.meal_id join public.nutrition_plans n on n.id = m.plan_id
      where i.id = (p_row ->> 'meal_item_id')::uuid and n.is_starter)
    else false
  end;
$$;

create function security_private.guard_starter_child() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op <> 'INSERT' and security_private.in_starter_template(tg_table_name, to_jsonb(old)))
    or (tg_op <> 'DELETE' and security_private.in_starter_template(tg_table_name, to_jsonb(new))) then
    raise exception 'starter templates are read-only' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function security_private.mark_starter_templates(uuid), security_private.guard_starter_template(),
  security_private.in_starter_template(text, jsonb), security_private.guard_starter_child()
  from public, anon, authenticated;

create trigger programs_starter_guard before update or delete on public.programs
  for each row execute function security_private.guard_starter_template();
create trigger nutrition_plans_starter_guard before update or delete on public.nutrition_plans
  for each row execute function security_private.guard_starter_template();
create trigger program_days_starter_guard before insert or update or delete on public.program_days
  for each row execute function security_private.guard_starter_child();
create trigger program_exercises_starter_guard before insert or update or delete on public.program_exercises
  for each row execute function security_private.guard_starter_child();
create trigger meals_starter_guard before insert or update or delete on public.meals
  for each row execute function security_private.guard_starter_child();
create trigger meal_items_starter_guard before insert or update or delete on public.meal_items
  for each row execute function security_private.guard_starter_child();
create trigger meal_item_alternatives_starter_guard before insert or update or delete on public.meal_item_alternatives
  for each row execute function security_private.guard_starter_child();

-- An editable copy of any of the captain's templates, starter or their own.
create function public.copy_template(p_kind text, p_template uuid, p_title text)
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
      insert into public.program_days (program_id, position, title)
        values (v_copy, v_child.position, v_child.title) returning id into v_new_child;
      insert into public.program_exercises
        (day_id, exercise_id, position, superset_group, sets, reps_min, reps_max, rest_seconds, rpe, tempo, notes)
        select v_new_child, exercise_id, position, superset_group, sets, reps_min, reps_max, rest_seconds, rpe, tempo, notes
        from public.program_exercises where day_id = v_child.id;
    end loop;
  elsif p_kind = 'nutrition' then
    select * into v_plan from public.nutrition_plans
      where id = p_template and is_template and captain_id = (select auth.uid());
    if not found then raise exception 'template not found' using errcode = 'P0002'; end if;
    insert into public.nutrition_plans
      (captain_id, player_id, is_template, source_template_id, title, status, target_kcal, target_protein, target_carbs, target_fat)
      values (v_plan.captain_id, null, true, null, p_title, 'draft',
        v_plan.target_kcal, v_plan.target_protein, v_plan.target_carbs, v_plan.target_fat)
      returning id into v_copy;
    for v_child in select * from public.meals where plan_id = p_template order by position loop
      insert into public.meals (plan_id, position, name)
        values (v_copy, v_child.position, v_child.name) returning id into v_new_child;
      for v_item in select * from public.meal_items where meal_id = v_child.id order by position loop
        insert into public.meal_items (meal_id, food_id, grams, position)
          values (v_new_child, v_item.food_id, v_item.grams, v_item.position) returning id into v_new_item;
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
revoke execute on function public.copy_template(text, uuid, text) from public, anon;
grant execute on function public.copy_template(text, uuid, text) to authenticated;

-- Existing captains already have their library copied.
select security_private.mark_starter_templates(id) from public.profiles where role = 'captain';
