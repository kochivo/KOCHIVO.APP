alter table public.admin_audit_log drop constraint admin_audit_log_action_check;
alter table public.admin_audit_log add constraint admin_audit_log_action_check
  check (action in ('activate_plan','suspend','unsuspend','approve_captain','reject_captain','import_template'));

create table public.imported_plan_sources (
  id uuid primary key,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid unique references public.programs(id) on delete cascade,
  nutrition_plan_id uuid unique references public.nutrition_plans(id) on delete cascade,
  source jsonb not null check (jsonb_typeof(source) = 'object' and octet_length(source::text) <= 420000),
  check (num_nonnulls(program_id, nutrition_plan_id) = 1 and id = coalesce(program_id, nutrition_plan_id))
);
create index imported_plan_sources_captain on public.imported_plan_sources (captain_id);
alter table public.imported_plan_sources enable row level security;
revoke all on table public.imported_plan_sources from public, anon, authenticated;
grant select on table public.imported_plan_sources to authenticated;
create policy active_caller on public.imported_plan_sources as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy imported_source_captain on public.imported_plan_sources for select to authenticated using (
  captain_id = (select auth.uid()) and not (select public.is_oauth_client())
);

create function public.captain_plan_source_id(p_plan uuid, p_kind text)
returns uuid language sql stable security invoker set search_path = '' as $$
  select s.id from public.imported_plan_sources s
  where s.captain_id = (select auth.uid()) and (
    (p_kind = 'training' and s.program_id = coalesce(
      (select p.source_template_id from public.programs p where p.id = p_plan and p.captain_id = (select auth.uid())), p_plan
    )) or
    (p_kind = 'nutrition' and s.nutrition_plan_id = coalesce(
      (select p.source_template_id from public.nutrition_plans p where p.id = p_plan and p.captain_id = (select auth.uid())), p_plan
    ))
  );
$$;
revoke all on function public.captain_plan_source_id(uuid,text) from public, anon, authenticated;
grant execute on function public.captain_plan_source_id(uuid,text) to authenticated;

create function security_private.import_nutrition_template(p_id uuid, p_captain uuid, p_title text, p_plan jsonb)
returns void language plpgsql set search_path = '' as $$
declare
  v_meal record;
  v_item record;
  v_food uuid;
begin
  if coalesce(jsonb_array_length(p_plan->'meals'), 0) not between 1 and 12
    or (p_plan->'targets'->>'protein')::int not between 0 and 1000
    or (p_plan->'targets'->>'carbs')::int not between 0 and 2000
    or (p_plan->'targets'->>'fat')::int not between 0 and 1000 then
    raise exception 'invalid nutrition template' using errcode = '22023';
  end if;
  insert into public.nutrition_plans
    (id, captain_id, is_template, title, target_kcal, target_protein, target_carbs, target_fat, water_target_ml)
  values (p_id, p_captain, true, p_title, (p_plan->'targets'->>'kcal')::int,
    (p_plan->'targets'->>'protein')::int, (p_plan->'targets'->>'carbs')::int, (p_plan->'targets'->>'fat')::int,
    (p_plan->>'water')::int);

  for v_meal in select * from jsonb_array_elements(p_plan->'meals') with ordinality loop
    if coalesce(jsonb_array_length(v_meal.value->'items'), 0) not between 1 and 24 then
      raise exception 'invalid meal' using errcode = '22023';
    end if;
    insert into public.meals (id, plan_id, name, position)
      values ((v_meal.value->>'id')::uuid, p_id, v_meal.value->>'name', v_meal.ordinality);
    for v_item in select * from jsonb_array_elements(v_meal.value->'items') with ordinality loop
      if coalesce(char_length(btrim(v_item.value->>'name')), 0) not between 1 and 60
        or not coalesce((v_item.value->>'grams')::numeric between 5 and 2000, false)
        or coalesce(jsonb_array_length(v_item.value->'units'), 0) > 1
        or not coalesce(
          ((v_item.value->>'unit') is null and v_item.value->'units' = '[]'::jsonb) or
          ((v_item.value->>'unit') in ('ml','piece') and v_item.value->>'unit' = v_item.value->'units'->0->>'key'
            and (v_item.value->'units'->0->>'grams')::numeric between 0.1 and 1000), false) then
        raise exception 'invalid food portion' using errcode = '22023';
      end if;
      select f.id into v_food from public.foods f
      where f.owner_id = p_captain and f.archived_at is null and f.name_ar = v_item.value->>'name'
        and f.units = v_item.value->'units' and f.kcal_per_100g = (v_item.value->>'kcal')::numeric
        and f.protein_per_100g = (v_item.value->>'protein')::numeric
        and f.carbs_per_100g = (v_item.value->>'carbs')::numeric and f.fat_per_100g = (v_item.value->>'fat')::numeric
      order by f.id limit 1;
      if v_food is null then
        v_food := (v_item.value->>'foodId')::uuid;
        insert into public.foods (id, owner_id, name_ar, units, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
        values (v_food, p_captain, v_item.value->>'name', v_item.value->'units', (v_item.value->>'kcal')::numeric,
          (v_item.value->>'protein')::numeric, (v_item.value->>'carbs')::numeric, (v_item.value->>'fat')::numeric);
      end if;
      insert into public.meal_items (id, meal_id, food_id, position, grams, unit)
      values ((v_item.value->>'id')::uuid, (v_meal.value->>'id')::uuid, v_food, v_item.ordinality,
        (v_item.value->>'grams')::numeric, v_item.value->>'unit');
    end loop;
  end loop;
end;
$$;

create function security_private.import_training_template(p_id uuid, p_captain uuid, p_title text, p_plan jsonb)
returns void language plpgsql set search_path = '' as $$
declare
  v_day record;
  v_row record;
  v_exercise uuid;
  v_matches uuid[];
begin
  if coalesce(jsonb_array_length(p_plan->'days'), 0) not between 1 and 14 or char_length(p_plan->>'notes') > 300 then
    raise exception 'invalid training template' using errcode = '22023';
  end if;
  insert into public.programs (id, captain_id, is_template, title, notes, settings)
  values (p_id, p_captain, true, p_title, p_plan->>'notes', '{"advanced":true,"repeatWeekly":true}');

  for v_day in select * from jsonb_array_elements(p_plan->'days') with ordinality loop
    if coalesce(jsonb_array_length(v_day.value->'exercises'), 0) not between 1 and 30 then
      raise exception 'invalid training day' using errcode = '22023';
    end if;
    insert into public.program_days (id, program_id, title, position, warmup)
      values ((v_day.value->>'id')::uuid, p_id, v_day.value->>'name', v_day.ordinality,
        coalesce(v_day.value->'warmup', '{"items":[],"ramp":false}'));
    for v_row in select * from jsonb_array_elements(v_day.value->'exercises') with ordinality loop
      if coalesce(char_length(btrim(v_row.value->>'name')), 0) not between 1 and 100
        or coalesce(char_length(btrim(v_row.value->>'bodyPart')), 0) not between 1 and 60
        or char_length(v_row.value->>'note') > 200 or (v_row.value->>'rest')::int % 15 <> 0
        or jsonb_array_length(v_row.value->'setPlan') is distinct from (v_row.value->>'sets')::int then
        raise exception 'invalid exercise prescription' using errcode = '22023';
      end if;
      select array(
        select e.id from public.exercises e
        where (e.owner_id = p_captain or (e.owner_id is null and e.orphaned_at is null)) and e.archived_at is null
          and (lower(e.name_en) = lower(v_row.value->>'name') or lower(e.name_ar) = lower(v_row.value->>'name'))
        order by (e.owner_id = p_captain) desc nulls last, e.id limit 2
      ) into v_matches;
      select e.id into v_exercise from public.exercises e
      where e.id = v_matches[1] and (cardinality(v_matches) = 1 or (e.owner_id = p_captain and not exists (
        select 1 from public.exercises duplicate where duplicate.id = v_matches[2] and duplicate.owner_id = p_captain
      )));
      if v_exercise is null then
        v_exercise := (v_row.value->>'exerciseId')::uuid;
        insert into public.exercises (id, owner_id, name_en, name_ar, body_part)
        values (v_exercise, p_captain, v_row.value->>'name', v_row.value->>'name', v_row.value->>'bodyPart');
      end if;
      insert into public.program_exercises
        (id, day_id, exercise_id, position, sets, reps_min, reps_max, rest_seconds, notes, alternatives, set_plan)
      values ((v_row.value->>'id')::uuid, (v_day.value->>'id')::uuid, v_exercise, v_row.ordinality,
        (v_row.value->>'sets')::int, (v_row.value->>'repsMin')::int, (v_row.value->>'repsMax')::int,
        (v_row.value->>'rest')::int, nullif(v_row.value->>'note',''), '{}', v_row.value->'setPlan');
    end loop;
  end loop;
end;
$$;

revoke all on function security_private.import_nutrition_template(uuid,uuid,text,jsonb),
  security_private.import_training_template(uuid,uuid,text,jsonb) from public, anon, authenticated;

create function public.admin_import_plan(p_id uuid, p_captain uuid, p_kind text, p_title text, p_plan jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := auth.uid();
  v_audit public.admin_audit_log%rowtype;
  v_details jsonb := jsonb_build_object('kind', p_kind, 'fingerprint', p_plan->>'fingerprint');
begin
  if v_admin is null or not public.is_admin() or public.is_oauth_client() then
    raise exception 'admin required' using errcode = '42501';
  end if;
  if p_id is null or p_kind is null or p_kind not in ('nutrition','training')
    or coalesce(char_length(btrim(p_title)), 0) not between 1 and 80
    or jsonb_typeof(p_plan) is distinct from 'object' or octet_length((p_plan - 'source')::text) > 195000
    or not coalesce(p_plan->>'fingerprint' ~ '^[0-9a-f]{64}$', false) then
    raise exception 'invalid import' using errcode = '22023';
  end if;
  -- Serialize library changes for this coach so retries and repeated rows reuse private entries.
  perform 1 from public.profiles
    where id = p_captain and role = 'captain' and role_confirmed and captain_status = 'approved'
      and suspended_at is null for update;
  if not found then raise exception 'eligible coach required' using errcode = '22023'; end if;
  select * into v_audit from public.admin_audit_log where id = p_id;
  if found then
    if v_audit.action = 'import_template' and v_audit.admin_id = v_admin and v_audit.target_id = p_captain
      and v_audit.details = v_details and
      ((p_kind = 'nutrition' and exists (select 1 from public.nutrition_plans where id = p_id and captain_id = p_captain and is_template))
        or (p_kind = 'training' and exists (select 1 from public.programs where id = p_id and captain_id = p_captain and is_template))) then
      return p_id;
    end if;
    raise exception 'import already used' using errcode = '22023';
  end if;
  if p_kind = 'nutrition' then
    perform security_private.import_nutrition_template(p_id, p_captain, btrim(p_title), p_plan);
  else
    perform security_private.import_training_template(p_id, p_captain, btrim(p_title), p_plan);
  end if;
  if p_plan ? 'source' then
    if jsonb_typeof(p_plan->'source'->'sheets') is distinct from 'array'
      or jsonb_array_length(p_plan->'source'->'sheets') not between 1 and 24 then
      raise exception 'invalid workbook' using errcode = '22023';
    end if;
    insert into public.imported_plan_sources (id, captain_id, program_id, nutrition_plan_id, source)
    values (p_id, p_captain, case when p_kind = 'training' then p_id end,
      case when p_kind = 'nutrition' then p_id end, p_plan->'source');
  end if;
  insert into public.admin_audit_log (id, admin_id, action, target_id, details)
    values (p_id, v_admin, 'import_template', p_captain, v_details);
  return p_id;
end;
$$;

revoke all on function public.admin_import_plan(uuid,uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.admin_import_plan(uuid,uuid,text,text,jsonb) to authenticated;

create function public.admin_find_import_captain(p_email text)
returns table(id uuid, full_name text, email text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() or public.is_oauth_client() then raise exception 'admin required' using errcode = '42501'; end if;
  if char_length(p_email) > 254 then raise exception 'invalid email' using errcode = '22023'; end if;
  return query
    select p.id, p.full_name, u.email::text from public.profiles p
      join auth.users u on u.id = p.id
    where lower(u.email) = lower(btrim(p_email)) and p.role = 'captain' and p.role_confirmed
      and p.captain_status = 'approved' and p.suspended_at is null
    limit 2;
end;
$$;

revoke all on function public.admin_find_import_captain(text) from public, anon, authenticated;
grant execute on function public.admin_find_import_captain(text) to authenticated;
