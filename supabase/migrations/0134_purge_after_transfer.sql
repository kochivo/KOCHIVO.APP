begin;

alter table public.exercises add column orphaned_at timestamptz default null;
alter table public.foods add column orphaned_at timestamptz default null;

-- Bypass history RLS only for the caller's own references, never their captain's.
create function security_private.owns_orphan_reference(library text, item uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select (select auth.uid()) is not null and not (select public.is_suspended()) and case library
    when 'exercises' then
      exists (select 1 from public.set_logs where exercise_id=item and player_id=(select auth.uid()))
      or exists (select 1 from public.program_exercises e join public.program_days d on d.id=e.day_id
        join public.programs p on p.id=d.program_id
        where (e.exercise_id=item or e.alternatives @> array[item]) and p.player_id=(select auth.uid()))
    when 'foods' then
      exists (select 1 from public.meal_items i join public.meals m on m.id=i.meal_id
        join public.nutrition_plans p on p.id=m.plan_id where i.food_id=item and p.player_id=(select auth.uid()))
      or exists (select 1 from public.meal_item_alternatives a join public.meal_items i on i.id=a.meal_item_id
        join public.meals m on m.id=i.meal_id join public.nutrition_plans p on p.id=m.plan_id
        where a.food_id=item and p.player_id=(select auth.uid()))
    else false end;
$$;
revoke all on function security_private.owns_orphan_reference(text,uuid) from public,anon,authenticated,service_role;

-- Match the existing boolean RLS helpers without exposing private-schema execution.
create function public.can_read_orphan(library text, item uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select security_private.owns_orphan_reference(library,item);
$$;
revoke all on function public.can_read_orphan(text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.can_read_orphan(text,uuid) to authenticated;

alter policy exercises_select on public.exercises using (
  (orphaned_at is null and (owner_id is null or owner_id=(select auth.uid()) or owner_id=public.my_captain_id()))
  or (orphaned_at is not null and public.can_read_orphan('exercises',id))
);
alter policy foods_select on public.foods using (
  (orphaned_at is null and (owner_id is null or owner_id=(select auth.uid()) or owner_id=public.my_captain_id()))
  or (orphaned_at is not null and public.can_read_orphan('foods',id))
);

-- Existing library/search queries filter archived_at; history reads by ID do not.
alter table public.exercises add constraint exercises_orphan_private
  check (orphaned_at is null or (owner_id is null and archived_at is not null));
alter table public.foods add constraint foods_orphan_private
  check (orphaned_at is null or (owner_id is null and archived_at is not null));

-- Includes every restrictive FK, including swap references and copied meal alternatives.
-- Cascading and SET NULL references must keep their original deletion behavior.
create function security_private.library_is_referenced(library regclass, item uuid) returns boolean
language plpgsql set search_path = '' as $$
declare reference record; found boolean;
begin
  if library='public.exercises'::regclass and exists (
    select 1 from public.program_exercises where alternatives @> array[item]
  ) then return true; end if;
  for reference in select c.conrelid::regclass as relation, a.attname as column_name
    from pg_catalog.pg_constraint c join pg_catalog.pg_attribute a
      on a.attrelid=c.conrelid and a.attnum=any(c.conkey)
    where c.contype='f' and c.confrelid=library and c.confdeltype not in ('c','n') loop
    execute pg_catalog.format('select exists (select 1 from %s where %I=$1)', reference.relation, reference.column_name)
      into found using item;
    if found then return true; end if;
  end loop;
  return false;
end;
$$;
revoke all on function security_private.library_is_referenced(regclass,uuid) from public,anon,authenticated,service_role;

create or replace function public.purge_deleted_accounts() returns int
language plpgsql security definer set search_path = '' as $$
declare user_ids uuid[]; exercise_ids uuid[]; food_ids uuid[]; v_count int;
begin
  select array_agg(id) into user_ids from (
    select p.id from public.profiles p
    where p.deletion_requested_at < now() - interval '7 days'
      and not exists (select 1 from public.admins a where a.user_id=p.id)
    order by p.id for update
  ) due;
  perform security_private.purge_account_forms(user_ids);
  perform 1 from public.exercises where owner_id=any(user_ids) order by id for update;
  perform 1 from public.foods where owner_id=any(user_ids) order by id for update;
  -- Detach before cascades, then collect only references that survive those cascades.
  -- Updating the library rows also locks out concurrent FK inserts until commit.
  with detached as (
    update public.exercises set owner_id=null, orphaned_at=now(), archived_at=coalesce(archived_at,now())
    where owner_id=any(user_ids) returning id
  ) select array_agg(id) into exercise_ids from detached;
  with detached as (
    update public.foods set owner_id=null, orphaned_at=now(), archived_at=coalesce(archived_at,now()), replaces_id=null
    where owner_id=any(user_ids) returning id
  ) select array_agg(id) into food_ids from detached;
  delete from auth.users where id=any(user_ids);
  get diagnostics v_count = row_count;
  delete from public.exercises where id=any(exercise_ids)
    and not security_private.library_is_referenced('public.exercises'::regclass,id);
  delete from public.foods where id=any(food_ids)
    and not security_private.library_is_referenced('public.foods'::regclass,id);
  return v_count;
end;
$$;

-- Privileged catalog consumers must not treat detached rows as seeded globals.
-- Replacing live definitions preserves the existing guards and function ACLs.
do $migration$
declare signature text; definition text;
begin
  foreach signature in array array[
    'security_private.copy_starter_templates(uuid)', 'public.create_demo_workspace()',
    'security_private.check_generator_global()', 'security_private.seed_imported_generator_tag()',
    'security_private.validate_exercise_plan()', 'public.check_food_replacement()'
  ] loop
    definition := pg_catalog.pg_get_functiondef(signature::regprocedure);
    definition := replace(definition,'e.owner_id is null','e.owner_id is null and e.orphaned_at is null');
    definition := replace(definition,'f.owner_id is null','f.owner_id is null and f.orphaned_at is null');
    definition := replace(definition,'where owner_id is null','where owner_id is null and orphaned_at is null');
    definition := replace(definition,'and owner_id is null','and owner_id is null and orphaned_at is null');
    definition := replace(definition,'if new.owner_id is null then','if new.owner_id is null and new.orphaned_at is null then');
    execute definition;
  end loop;
end $migration$;

commit;
