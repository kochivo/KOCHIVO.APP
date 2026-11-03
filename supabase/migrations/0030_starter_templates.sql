-- Private receipts survive deletion of editable copies: retries never restore or update them.
-- source_template_id remains reserved for assignments from a captain's own template.
create table security_private.starter_templates (
  key text primary key,
  payload jsonb not null
);
create table security_private.starter_template_receipts (
  captain_id uuid primary key references public.profiles(id) on delete cascade
);
alter table security_private.starter_templates enable row level security;
alter table security_private.starter_template_receipts enable row level security;
revoke all on security_private.starter_templates, security_private.starter_template_receipts
  from public, anon, authenticated;

insert into security_private.starter_templates (key, payload)
select value ->> 'key', value from pg_catalog.jsonb_array_elements(
$starter_library$
[
{"key":"beginner-full-body","title":"جسم كامل للمبتدئين","notes":"٣ أيام وبينهم يوم راحة. ابدأ بوزن خفيف وزوّد بالتدريج.","days":[{"title":"اليوم الأول","exercises":[{"dataset_id":"0739","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0025","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0861","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0300","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0334","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":90}]},{"title":"اليوم التاني","exercises":[{"dataset_id":"1760","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0662","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"2330","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0599","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0416","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":90}]},{"title":"اليوم التالت","exercises":[{"dataset_id":"0739","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0025","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0293","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0300","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0201","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":90}]}],"kind":"workout"},
{"key":"upper-lower","title":"علوي وسفلي","notes":"٤ أيام. يومين تمرين وبعدهم يوم راحة.","days":[{"title":"علوي أول","exercises":[{"dataset_id":"0025","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0861","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0426","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"2330","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0416","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0201","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90}]},{"title":"سفلي أول","exercises":[{"dataset_id":"0739","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120},{"dataset_id":"0300","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120},{"dataset_id":"0585","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120},{"dataset_id":"0599","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120},{"dataset_id":"1373","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120}]},{"title":"علوي تاني","exercises":[{"dataset_id":"0662","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0293","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0334","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"2330","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0416","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0200","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90}]},{"title":"سفلي تاني","exercises":[{"dataset_id":"1760","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120},{"dataset_id":"0336","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120},{"dataset_id":"0599","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120},{"dataset_id":"0585","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120},{"dataset_id":"1373","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120}]}],"kind":"workout"},
{"key":"push-pull-legs","title":"دفع وسحب ورجل","notes":"٦ أيام وبعدهم يوم راحة. سيب عدتين في قدرتك آخر كل مجموعة.","days":[{"title":"دفع أول","exercises":[{"dataset_id":"0025","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0426","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0334","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0201","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90}]},{"title":"سحب أول","exercises":[{"dataset_id":"2330","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0861","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0378","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0416","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90}]},{"title":"رجل أول","exercises":[{"dataset_id":"0739","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120},{"dataset_id":"0300","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120},{"dataset_id":"0599","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120},{"dataset_id":"1373","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120}]},{"title":"دفع تاني","exercises":[{"dataset_id":"0662","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0426","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0334","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0200","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90}]},{"title":"سحب تاني","exercises":[{"dataset_id":"2330","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0293","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0378","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0416","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90}]},{"title":"رجل تاني","exercises":[{"dataset_id":"1760","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120},{"dataset_id":"0336","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120},{"dataset_id":"0599","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120},{"dataset_id":"0585","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120},{"dataset_id":"1373","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":120}]}],"kind":"workout"},
{"key":"fat-loss-circuits","title":"دايرة تمارين للتخسيس","notes":"٣ أيام وبينهم راحة. العب التمارين ورا بعض، وارتاح ٩٠ ثانية بين اللفات. الأكل المناسب مهم للتخسيس.","days":[{"title":"دايرة أولى","exercises":[{"dataset_id":"1760","sets":3,"reps_min":12,"reps_max":15,"rest_seconds":30,"superset_group":1},{"dataset_id":"0662","sets":3,"reps_min":12,"reps_max":15,"rest_seconds":30,"superset_group":1},{"dataset_id":"0293","sets":3,"reps_min":12,"reps_max":15,"rest_seconds":30,"superset_group":1},{"dataset_id":"0630","sets":3,"reps_min":12,"reps_max":15,"rest_seconds":90,"superset_group":1}]},{"title":"دايرة تانية","exercises":[{"dataset_id":"0336","sets":3,"reps_min":12,"reps_max":15,"rest_seconds":30,"superset_group":1},{"dataset_id":"0426","sets":3,"reps_min":12,"reps_max":15,"rest_seconds":30,"superset_group":1},{"dataset_id":"0861","sets":3,"reps_min":12,"reps_max":15,"rest_seconds":30,"superset_group":1},{"dataset_id":"0630","sets":3,"reps_min":12,"reps_max":15,"rest_seconds":90,"superset_group":1}]},{"title":"دايرة تالتة","exercises":[{"dataset_id":"1760","sets":3,"reps_min":12,"reps_max":15,"rest_seconds":30,"superset_group":1},{"dataset_id":"0662","sets":3,"reps_min":12,"reps_max":15,"rest_seconds":30,"superset_group":1},{"dataset_id":"2330","sets":3,"reps_min":12,"reps_max":15,"rest_seconds":30,"superset_group":1},{"dataset_id":"0630","sets":3,"reps_min":12,"reps_max":15,"rest_seconds":90,"superset_group":1}]}],"kind":"workout"},
{"key":"home-dumbbells","title":"في البيت بالدامبل","notes":"٣ أيام وبينهم راحة. محتاج دامبل بس ومساحة فاضية على الأرض.","days":[{"title":"اليوم الأول","exercises":[{"dataset_id":"1760","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0293","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0426","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0416","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90}]},{"title":"اليوم التاني","exercises":[{"dataset_id":"0336","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0300","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0334","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0423","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90}]},{"title":"اليوم التالت","exercises":[{"dataset_id":"1760","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0293","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0426","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90},{"dataset_id":"0378","sets":3,"reps_min":8,"reps_max":12,"rest_seconds":90}]}],"kind":"workout"},
{"key":"ramadan-workout","title":"رمضان بعد الفطار","notes":"٤ حصص خفيفة بعد الفطار بساعتين. حوالي ٢٥ دقيقة، وراحة أطول بين المجموعات. اشرب مية كويس.","days":[{"title":"علوي أول","exercises":[{"dataset_id":"0025","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":150},{"dataset_id":"0861","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":150},{"dataset_id":"0334","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":150}]},{"title":"سفلي أول","exercises":[{"dataset_id":"0739","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":150},{"dataset_id":"0300","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":150},{"dataset_id":"1373","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":150}]},{"title":"علوي تاني","exercises":[{"dataset_id":"0662","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":150},{"dataset_id":"2330","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":150},{"dataset_id":"0416","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":150}]},{"title":"سفلي تاني","exercises":[{"dataset_id":"1760","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":150},{"dataset_id":"0599","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":150},{"dataset_id":"1373","sets":2,"reps_min":8,"reps_max":12,"rest_seconds":150}]}],"kind":"workout"},
{"key":"cutting","title":"أكل للتنشيف","meals":[{"name":"الفطار","items":[{"seed_key":"food_eggs-v1","grams":100,"alternatives":[]},{"seed_key":"food_baladi_bread-v1","grams":80,"alternatives":[]},{"seed_key":"food_cottage_cheese-v1","grams":150,"alternatives":[]},{"seed_key":"food_cucumber-v1","grams":150,"alternatives":[]}]},{"name":"الغدا","items":[{"seed_key":"food_chicken_breast-v1","grams":180,"alternatives":[{"seed_key":"food_tilapia-v1","grams":232}]},{"seed_key":"food_white_rice-v1","grams":200,"alternatives":[{"seed_key":"food_potatoes-v1","grams":299}]},{"seed_key":"food_broccoli-v1","grams":200,"alternatives":[]},{"seed_key":"food_olive_oil-v1","grams":15,"alternatives":[]}]},{"name":"سناك","items":[{"seed_key":"food_yogurt-v1","grams":200,"alternatives":[{"seed_key":"food_greek_yogurt-v1","grams":173}]},{"seed_key":"food_apple-v1","grams":180,"alternatives":[]},{"seed_key":"food_peanuts-v1","grams":25,"alternatives":[]}]},{"name":"العشا","items":[{"seed_key":"food_tuna-v1","grams":120,"alternatives":[]},{"seed_key":"food_baladi_bread-v1","grams":60,"alternatives":[]},{"seed_key":"food_tomato-v1","grams":150,"alternatives":[]}]}],"kind":"nutrition","targets":{"kcal":1939,"protein":162,"carbs":208,"fat":55}},
{"key":"maintenance","title":"أكل لتثبيت الوزن","meals":[{"name":"الفطار","items":[{"seed_key":"food_oats-v1","grams":70,"alternatives":[]},{"seed_key":"food_whole_milk-v1","grams":250,"alternatives":[]},{"seed_key":"food_banana-v1","grams":120,"alternatives":[]},{"seed_key":"food_peanut_butter-v1","grams":20,"alternatives":[]}]},{"name":"الغدا","items":[{"seed_key":"food_chicken_breast-v1","grams":200,"alternatives":[{"seed_key":"food_tilapia-v1","grams":258}]},{"seed_key":"food_white_rice-v1","grams":280,"alternatives":[{"seed_key":"food_potatoes-v1","grams":418}]},{"seed_key":"food_broccoli-v1","grams":200,"alternatives":[]},{"seed_key":"food_olive_oil-v1","grams":15,"alternatives":[]}]},{"name":"سناك","items":[{"seed_key":"food_greek_yogurt-v1","grams":200,"alternatives":[{"seed_key":"food_yogurt-v1","grams":232}]},{"seed_key":"food_apple-v1","grams":180,"alternatives":[]},{"seed_key":"food_almonds-v1","grams":25,"alternatives":[]}]},{"name":"العشا","items":[{"seed_key":"food_eggs-v1","grams":150,"alternatives":[]},{"seed_key":"food_baladi_bread-v1","grams":100,"alternatives":[]},{"seed_key":"food_cottage_cheese-v1","grams":100,"alternatives":[]},{"seed_key":"food_cucumber-v1","grams":150,"alternatives":[]}]}],"kind":"nutrition","targets":{"kcal":2521,"protein":168,"carbs":287,"fat":83}},
{"key":"bulking","title":"أكل لزيادة العضلات","meals":[{"name":"الفطار","items":[{"seed_key":"food_oats-v1","grams":90,"alternatives":[]},{"seed_key":"food_whole_milk-v1","grams":300,"alternatives":[]},{"seed_key":"food_banana-v1","grams":150,"alternatives":[]},{"seed_key":"food_peanut_butter-v1","grams":30,"alternatives":[]}]},{"name":"الغدا","items":[{"seed_key":"food_lean_beef-v1","grams":200,"alternatives":[{"seed_key":"food_chicken_thigh-v1","grams":242}]},{"seed_key":"food_white_rice-v1","grams":350,"alternatives":[{"seed_key":"food_pasta-v1","grams":288}]},{"seed_key":"food_broccoli-v1","grams":200,"alternatives":[]},{"seed_key":"food_olive_oil-v1","grams":15,"alternatives":[]}]},{"name":"سناك","items":[{"seed_key":"food_greek_yogurt-v1","grams":250,"alternatives":[]},{"seed_key":"food_dates-v1","grams":60,"alternatives":[]},{"seed_key":"food_peanuts-v1","grams":30,"alternatives":[]}]},{"name":"العشا","items":[{"seed_key":"food_eggs-v1","grams":150,"alternatives":[]},{"seed_key":"food_baladi_bread-v1","grams":120,"alternatives":[]},{"seed_key":"food_cottage_cheese-v1","grams":150,"alternatives":[]},{"seed_key":"food_tomato-v1","grams":150,"alternatives":[]}]}],"kind":"nutrition","targets":{"kcal":3138,"protein":184,"carbs":366,"fat":112}},
{"key":"ramadan-nutrition","title":"أكل رمضان","meals":[{"name":"الفطار","items":[{"seed_key":"food_dates-v1","grams":30,"alternatives":[]},{"seed_key":"food_chicken_breast-v1","grams":200,"alternatives":[{"seed_key":"food_tilapia-v1","grams":258}]},{"seed_key":"food_white_rice-v1","grams":300,"alternatives":[{"seed_key":"food_potatoes-v1","grams":448}]},{"seed_key":"food_broccoli-v1","grams":200,"alternatives":[]},{"seed_key":"food_olive_oil-v1","grams":20,"alternatives":[]}]},{"name":"سناك خفيف","items":[{"seed_key":"food_greek_yogurt-v1","grams":200,"alternatives":[{"seed_key":"food_yogurt-v1","grams":232}]},{"seed_key":"food_banana-v1","grams":120,"alternatives":[]},{"seed_key":"food_almonds-v1","grams":25,"alternatives":[]}]},{"name":"السحور","items":[{"seed_key":"food_foul-v1","grams":200,"alternatives":[{"seed_key":"food_lentils-v1","grams":190}]},{"seed_key":"food_eggs-v1","grams":100,"alternatives":[]},{"seed_key":"food_baladi_bread-v1","grams":120,"alternatives":[]},{"seed_key":"food_cottage_cheese-v1","grams":150,"alternatives":[]},{"seed_key":"food_cucumber-v1","grams":200,"alternatives":[]}]}],"kind":"nutrition","targets":{"kcal":2275,"protein":162,"carbs":281,"fat":61}}
]
$starter_library$::jsonb);

-- UUIDv7 without an extension: millisecond prefix, version 7, random tail retaining RFC variant bits.
create function security_private.starter_uuidv7() returns uuid
language sql volatile set search_path = '' as $$
  select (pg_catalog.substr(stamp, 1, 8) || '-' || pg_catalog.substr(stamp, 9, 4)
    || '-7' || pg_catalog.substr(random_id, 16, 3) || pg_catalog.substr(random_id, 19))::uuid
  from (select pg_catalog.lpad(pg_catalog.to_hex(
      pg_catalog.floor(extract(epoch from pg_catalog.now()) * 1000)::bigint), 12, '0') as stamp,
    pg_catalog.gen_random_uuid()::text as random_id) s;
$$;

create function security_private.copy_starter_templates(p_captain uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t record;
  d record;
  m record;
  i record;
  parent_id uuid;
  child_id uuid;
  item_id uuid;
  food_id uuid;
begin
  -- Serialize retries and suspension with the profile transition, including the backfill.
  perform 1 from public.profiles where id = p_captain and role = 'captain'
    and role_confirmed and suspended_at is null for update;
  if not found then return; end if;
  insert into security_private.starter_template_receipts (captain_id) values (p_captain)
    on conflict do nothing;
  if not found then return; end if;

  for t in select payload as p from security_private.starter_templates order by key loop
    parent_id := security_private.starter_uuidv7();
    if t.p ->> 'kind' = 'workout' then
      insert into public.programs (id, captain_id, is_template, title, notes)
        values (parent_id, p_captain, true, t.p ->> 'title', t.p ->> 'notes');
      for d in select value as p, ordinality as pos
        from pg_catalog.jsonb_array_elements(t.p -> 'days') with ordinality loop
        child_id := security_private.starter_uuidv7();
        insert into public.program_days (id, program_id, position, title)
          values (child_id, parent_id, d.pos, d.p ->> 'title');
        insert into public.program_exercises
          (id, day_id, exercise_id, position, sets, reps_min, reps_max, rest_seconds, superset_group)
          select security_private.starter_uuidv7(), child_id, e.id, x.pos,
            (x.p ->> 'sets')::smallint, (x.p ->> 'reps_min')::smallint,
            (x.p ->> 'reps_max')::smallint, (x.p ->> 'rest_seconds')::smallint,
            (x.p ->> 'superset_group')::smallint
          from pg_catalog.jsonb_array_elements(d.p -> 'exercises') with ordinality as x(p, pos)
          join public.exercises e on e.dataset_id = x.p ->> 'dataset_id' and e.owner_id is null;
      end loop;
    else
      insert into public.nutrition_plans
        (id, captain_id, is_template, title, target_kcal, target_protein, target_carbs, target_fat)
        values (parent_id, p_captain, true, t.p ->> 'title',
          (t.p -> 'targets' ->> 'kcal')::smallint, (t.p -> 'targets' ->> 'protein')::smallint,
          (t.p -> 'targets' ->> 'carbs')::smallint, (t.p -> 'targets' ->> 'fat')::smallint);
      for m in select value as p, ordinality as pos
        from pg_catalog.jsonb_array_elements(t.p -> 'meals') with ordinality loop
        child_id := security_private.starter_uuidv7();
        insert into public.meals (id, plan_id, position, name)
          values (child_id, parent_id, m.pos, m.p ->> 'name');
        for i in select value as p, ordinality as pos
          from pg_catalog.jsonb_array_elements(m.p -> 'items') with ordinality loop
          select f.id into food_id from public.foods f
            where f.seed_key = i.p ->> 'seed_key' and f.owner_id is null;
          if not found then continue; end if;
          item_id := security_private.starter_uuidv7();
          insert into public.meal_items (id, meal_id, food_id, grams, position)
            values (item_id, child_id, food_id, (i.p ->> 'grams')::numeric, i.pos);
          insert into public.meal_item_alternatives (id, meal_item_id, food_id, grams)
            select security_private.starter_uuidv7(), item_id, f.id, (a.p ->> 'grams')::numeric
            from pg_catalog.jsonb_array_elements(i.p -> 'alternatives') as a(p)
            join public.foods f on f.seed_key = a.p ->> 'seed_key' and f.owner_id is null;
        end loop;
      end loop;
    end if;
  end loop;
end;
$$;

create function security_private.on_captain_confirmed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'captain' and new.role_confirmed then
    if tg_op = 'INSERT' then
      perform security_private.copy_starter_templates(new.id);
    elsif old.role is distinct from new.role or not old.role_confirmed then
      perform security_private.copy_starter_templates(new.id);
    end if;
  end if;
  return new;
end;
$$;
revoke all on function security_private.starter_uuidv7(),
  security_private.copy_starter_templates(uuid), security_private.on_captain_confirmed()
  from public, anon, authenticated;

create trigger profiles_starter_templates after insert or update of role, role_confirmed on public.profiles
  for each row execute function security_private.on_captain_confirmed();

-- Backfill existing confirmed captains; the function also excludes suspended accounts.
select security_private.copy_starter_templates(id) from public.profiles
where role = 'captain' and role_confirmed and suspended_at is null;
