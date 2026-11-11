-- Existing plans and catalog entries retain their previous meaning.
alter table public.meals add column day_type text not null default 'all'
  check (day_type in ('all', 'training', 'rest'));
alter table public.foods add column units jsonb not null default '[]'
  check (jsonb_typeof(units) = 'array');

-- Keep the original signature and implementation intact for flag-off clients.
create function public.save_nutrition_plan(p_plan uuid, p_draft jsonb, p_day_types jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
declare v_day jsonb;
begin
  perform public.save_nutrition_plan(p_plan, p_draft);
  for v_day in select value from jsonb_array_elements(p_day_types) loop
    update public.meals set day_type = v_day->>'dayType'
      where id = (v_day->>'id')::uuid and plan_id = p_plan;
    if not found then
      raise exception 'Meal is not in this plan' using errcode = '42501';
    end if;
  end loop;
end;
$$;
revoke execute on function public.save_nutrition_plan(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_nutrition_plan(uuid, jsonb, jsonb) to authenticated;

-- Seed existing global staples only; re-running this update changes no row counts.
update public.foods set units = case name_ar
  when 'عيش بلدي' then '[{"key":"loaf","name_ar":"رغيف","name_en":"loaf","grams":90}]'::jsonb
  when 'بيض مسلوق' then '[{"key":"egg","name_ar":"حباية بيض","name_en":"egg","grams":50}]'::jsonb
  when 'أرز أبيض مطبوخ' then '[{"key":"plate","name_ar":"طبق","name_en":"plate","grams":200}]'::jsonb
end
where owner_id is null and units = '[]'::jsonb
  and name_ar in ('عيش بلدي', 'بيض مسلوق', 'أرز أبيض مطبوخ');
