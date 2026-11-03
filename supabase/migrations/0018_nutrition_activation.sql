create unique index nutrition_plans_one_active on public.nutrition_plans (player_id)
  where status = 'active' and player_id is not null;

create function public.activate_nutrition_plan(p_plan uuid)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v_plan public.nutrition_plans;
begin
  select * into v_plan from public.nutrition_plans where id = p_plan;
  if not found or v_plan.captain_id is distinct from (select auth.uid()) then
    raise exception 'Plan is not owned by caller' using errcode = '42501';
  end if;
  -- Acquire the player lock before row locks to avoid cross-plan activation deadlocks.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_plan.player_id::text, 0));
  select * into v_plan from public.nutrition_plans where id = p_plan for update;
  if not found or v_plan.captain_id is distinct from (select auth.uid()) then
    raise exception 'Plan is not owned by caller' using errcode = '42501';
  end if;
  if v_plan.is_template or v_plan.player_id is null or not exists (
    select 1 from public.meals m join public.meal_items i on i.meal_id = m.id where m.plan_id = p_plan
  ) then
    raise exception 'Assigned plan needs a meal with an item' using errcode = '22023';
  end if;
  update public.nutrition_plans set status = 'archived'
    where player_id = v_plan.player_id and status = 'active' and id <> p_plan;
  update public.nutrition_plans set status = 'active' where id = p_plan;
end;
$$;
revoke execute on function public.activate_nutrition_plan(uuid) from public, anon;
grant execute on function public.activate_nutrition_plan(uuid) to authenticated;

-- Replacing the hierarchy must be atomic so failed saves preserve the previous plan.
create function public.save_nutrition_plan(p_plan uuid, p_draft jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v_plan public.nutrition_plans;
  v_meal jsonb;
  v_item jsonb;
  v_alt jsonb;
  v_position integer;
  v_item_position integer;
begin
  select * into v_plan from public.nutrition_plans where id = p_plan for update;
  if not found or v_plan.captain_id is distinct from (select auth.uid()) then
    raise exception 'Plan is not owned by caller' using errcode = '42501';
  end if;
  update public.nutrition_plans set title = p_draft->>'title',
    target_kcal = (p_draft->'targets'->>'kcal')::smallint,
    target_protein = (p_draft->'targets'->>'protein')::smallint,
    target_carbs = (p_draft->'targets'->>'carbs')::smallint,
    target_fat = (p_draft->'targets'->>'fat')::smallint where id = p_plan;
  -- Keep surviving meal IDs in place: deleting them would detach historical meal logs.
  delete from public.meals where plan_id = p_plan and id not in (
    select (value->>'id')::uuid from jsonb_array_elements(p_draft->'meals')
  );
  v_position := 0;
  for v_meal in select value from jsonb_array_elements(p_draft->'meals') loop
    v_position := v_position + 1;
    insert into public.meals (id, plan_id, name, position)
      values ((v_meal->>'id')::uuid, p_plan, v_meal->>'name', v_position)
      on conflict (id) do update set name = excluded.name, position = excluded.position
      where public.meals.plan_id = p_plan;
    if not found then
      raise exception 'Meal belongs to another plan' using errcode = '42501';
    end if;
    delete from public.meal_items where meal_id = (v_meal->>'id')::uuid;
    v_item_position := 0;
    for v_item in select value from jsonb_array_elements(v_meal->'items') loop
      v_item_position := v_item_position + 1;
      insert into public.meal_items (id, meal_id, food_id, grams, position)
        values ((v_item->>'id')::uuid, (v_meal->>'id')::uuid, (v_item->'food'->>'id')::uuid,
          (v_item->>'grams')::numeric, v_item_position);
      for v_alt in select value from jsonb_array_elements(v_item->'alternatives') loop
        insert into public.meal_item_alternatives (id, meal_item_id, food_id, grams)
          values ((v_alt->>'id')::uuid, (v_item->>'id')::uuid, (v_alt->'food'->>'id')::uuid, (v_alt->>'grams')::numeric);
      end loop;
    end loop;
  end loop;
end;
$$;
revoke execute on function public.save_nutrition_plan(uuid, jsonb) from public, anon;
grant execute on function public.save_nutrition_plan(uuid, jsonb) to authenticated;
