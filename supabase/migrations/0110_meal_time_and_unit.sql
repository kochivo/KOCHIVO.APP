alter table public.meals add column time_of_day time;
alter table public.meal_items add column unit text;

-- The legacy saver recreates items. Retain units for surviving IDs even when
-- an old client saves, or when only grams/targets change through the old overload.
do $migration$
declare source text;
begin
  source := pg_get_functiondef('public.save_nutrition_plan(uuid,jsonb)'::regprocedure);
  if position('delete from public.meal_items where meal_id' in source)=0
    or position('(v_item->>''grams'')::numeric, v_item_position);' in source)=0 then
    raise exception 'Nutrition saver source drift';
  end if;
  source := replace(source, 'v_item_position integer;', 'v_item_position integer; v_units jsonb;');
  source := replace(source, 'delete from public.meal_items where meal_id',
    'select jsonb_object_agg(id::text,jsonb_build_object(''food'',food_id,''unit'',unit)) into v_units
       from public.meal_items where meal_id=(v_meal->>''id'')::uuid;
     delete from public.meal_items where meal_id');
  source := replace(source, 'public.meal_items (id, meal_id, food_id, grams, position)',
    'public.meal_items (id, meal_id, food_id, grams, position, unit)');
  source := replace(source, '(v_item->>''grams'')::numeric, v_item_position);',
    '(v_item->>''grams'')::numeric, v_item_position,
      case when v_units->(v_item->>''id'')->>''food''=v_item->''food''->>''id''
        then v_units->(v_item->>''id'')->>''unit'' else null end);');
  execute source;
end;
$migration$;

-- The original overloads remain the authority for ownership and plan writes.
create function public.save_nutrition_plan(p_plan uuid, p_draft jsonb, p_day_types jsonb, p_portions jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
declare m jsonb; i jsonb;
begin
  perform public.save_nutrition_plan(p_plan, p_draft, p_day_types);
  for m in select value from jsonb_array_elements(p_portions) loop
    update public.meals set time_of_day = (m->>'timeOfDay')::time
      where id = (m->>'id')::uuid and plan_id = p_plan;
    if not found then raise exception 'Meal is not in this plan' using errcode='42501'; end if;
    for i in select value from jsonb_array_elements(m->'items') loop
      if i->>'unit' is not null and not exists (
        select 1 from public.foods f, jsonb_array_elements(f.units) u
        where f.id=(i->>'foodId')::uuid and u->>'key'=i->>'unit'
          and (u->>'grams')::numeric > 0
      ) then raise exception 'Unknown food unit' using errcode='22023'; end if;
      update public.meal_items set unit=i->>'unit'
        where id=(i->>'id')::uuid and meal_id=(m->>'id')::uuid and food_id=(i->>'foodId')::uuid;
      if not found then raise exception 'Item is not in this meal' using errcode='42501'; end if;
    end loop;
  end loop;
end;
$$;
revoke execute on function public.save_nutrition_plan(uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_nutrition_plan(uuid,jsonb,jsonb,jsonb) to authenticated;
