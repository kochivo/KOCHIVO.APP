begin;

-- Preserve the live action's authorization, receipt handling and unrelated branches.
do $migration$
declare definition text; patch record;
begin
  for patch in select * from (values
    ($old$or v_exercise.reps_max is distinct from (p_payload ->> 'previousMax')::smallint then$old$,
     $new$or v_exercise.reps_max is distinct from (p_payload ->> 'previousMax')::smallint
          or v_exercise.set_plan is distinct from nullif(p_payload -> 'previousSetPlan', 'null'::jsonb) then$new$),
    ($old$reps_max = case when v_reps is null then e.reps_max else null end$old$,
     $new$reps_max = case when v_reps is null then e.reps_max else null end,
        set_plan = case when e.set_plan is null then null else (
          select jsonb_agg(
            (e.set_plan -> least(i, jsonb_array_length(e.set_plan) - 1))
            || case when v_reps is null then '{}'::jsonb
              else jsonb_build_object('reps_min', v_reps, 'reps_max', null) end
            order by i)
          from generate_series(0, coalesce(v_sets, e.sets) - 1) i
        ) end$new$)
  ) as patches(old_sql,new_sql) loop
    definition := pg_catalog.pg_get_functiondef('public.ko_apply_action(text)'::regprocedure);
    if (length(definition) - length(replace(definition,patch.old_sql,''))) / length(patch.old_sql) <> 1 then
      raise exception 'KO set plan source drift: %', patch.old_sql;
    end if;
    execute replace(definition,patch.old_sql,patch.new_sql);
  end loop;
end $migration$;

create function security_private.guard_alternative_exercise_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Cascading account deletion removes the profile before its owned exercises.
  -- This catalog-backed signal cannot be forged by setting a client session flag.
  if old.owner_id is not null and not exists (select 1 from public.profiles where id=old.owner_id) then
    return old;
  end if;
  if exists (select 1 from public.program_exercises where alternatives @> array[old.id]) then
    raise exception 'exercise is referenced as a program alternative' using errcode='23503';
  end if;
  return old;
end;
$$;
revoke all on function security_private.guard_alternative_exercise_delete() from public, anon, authenticated;
create trigger exercises_alternative_delete_guard before delete on public.exercises
  for each row execute function security_private.guard_alternative_exercise_delete();

commit;
