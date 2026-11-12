begin;

alter table public.program_exercises
  add column alternatives uuid[] not null default '{}',
  add column set_plan jsonb,
  add constraint program_exercises_alternatives_limit check (cardinality(alternatives) <= 3);

create function security_private.validate_exercise_plan()
returns trigger language plpgsql security definer set search_path = '' as $$
declare captain uuid; item jsonb;
begin
  if cardinality(new.alternatives) <> (select count(distinct id) from unnest(new.alternatives) id)
    or new.exercise_id = any(new.alternatives) then
    raise exception 'alternatives must be unique, non-null and exclude the prescribed exercise' using errcode='23514';
  end if;
  select p.captain_id into captain from public.program_days d join public.programs p on p.id=d.program_id
    where d.id=new.day_id;
  if exists (select 1 from unnest(new.alternatives) candidate(id) where not exists (
    select 1 from public.exercises e where e.id=candidate.id and (e.owner_id is null or e.owner_id=captain))) then
    raise exception 'alternative must be visible to the program captain' using errcode='23514';
  end if;
  if new.set_plan is not null then
    if jsonb_typeof(new.set_plan) <> 'array' then
      raise exception 'set_plan must be an array' using errcode='23514';
    end if;
    if jsonb_array_length(new.set_plan) <> new.sets then
      raise exception 'set_plan length must equal sets' using errcode='23514';
    end if;
    for item in select value from jsonb_array_elements(new.set_plan) loop
      if jsonb_typeof(item) is distinct from 'object' then
        raise exception 'set_plan target must be an object' using errcode='23514';
      end if;
      if (item ?& array['reps_min','reps_max','rir']
        and item - array['reps_min','reps_max','rir'] = '{}'::jsonb
        and jsonb_typeof(item->'reps_min')='number' and (item->>'reps_min') ~ '^[0-9]+$'
        and (item->'reps_max'='null'::jsonb or (jsonb_typeof(item->'reps_max')='number'
          and (item->>'reps_max') ~ '^[0-9]+$'))
        and (item->'rir'='null'::jsonb or (jsonb_typeof(item->'rir')='number'
          and (item->>'rir') ~ '^[0-9]+$'))) is not true then
        raise exception 'set_plan requires integer reps_min, nullable integer reps_max and rir' using errcode='23514';
      end if;
      if ((item->>'reps_min')::numeric between 1 and 100
        and (item->'reps_max'='null'::jsonb or (item->>'reps_max')::numeric between (item->>'reps_min')::numeric and 2147483647)
        and (item->'rir'='null'::jsonb or (item->>'rir')::numeric between 0 and 5)) is not true then
        raise exception 'invalid set_plan target: integer reps_min 1-100, reps_max >= minimum or null, rir 0-5 or null required'
          using errcode='23514';
      end if;
    end loop;
  end if;
  return new;
end $$;
revoke all on function security_private.validate_exercise_plan() from public, anon, authenticated;
create trigger program_exercises_plan_guard before insert or update on public.program_exercises
  for each row execute function security_private.validate_exercise_plan();

-- Re-emit the live definitions, preserving all previous ownership guards and ACLs.
-- Separate insert/select anchors ensure every replacement matches exactly once.
do $migration$
declare patch record; definition text; signature text;
begin
  for patch in select * from (values
    ('public.save_weekly_program(jsonb)',
      $old$rest_seconds,rir,notes)$old$, $new$rest_seconds,rir,notes,alternatives,set_plan)$new$),
    ('public.save_weekly_program(jsonb)',
      $old$nullif(btrim(e ->> 'notes'),''))$old$,
      $new$nullif(btrim(e ->> 'notes'),''),
          coalesce(array(select jsonb_array_elements_text(e -> 'alternatives')::uuid),'{}'::uuid[]),
          nullif(e -> 'set_plan','null'::jsonb))$new$),
    ('public.save_weekly_program(jsonb)',
      $old$notes=excluded.notes;$old$,
      $new$notes=excluded.notes,
          alternatives=case when e ? 'alternatives' then excluded.alternatives else program_exercises.alternatives end,
          set_plan=case when e ? 'set_plan' then excluded.set_plan else program_exercises.set_plan end;$new$),
    -- Approval keeps the existing injury workflow and removes its new primary from alternatives.
    ('public.decide_exercise_swap(uuid,boolean)',
      $old$update public.program_exercises set exercise_id=r.to_exercise_id where id=r.program_exercise_id;$old$,
      $new$update public.program_exercises set exercise_id=r.to_exercise_id,
      alternatives=array_remove(alternatives,r.to_exercise_id) where id=r.program_exercise_id;$new$),
    ('security_private.copy_starter_templates(uuid)',
      $old$rest_seconds, superset_group, rir)$old$, $new$rest_seconds, superset_group, rir, alternatives, set_plan)$new$),
    ('security_private.copy_starter_templates(uuid)',
      $old$(x.p ->> 'rir')::smallint$old$,
      $new$(x.p ->> 'rir')::smallint,
            coalesce(array(select jsonb_array_elements_text(x.p -> 'alternatives')::uuid),'{}'::uuid[]),
            nullif(x.p -> 'set_plan','null'::jsonb)$new$)
  ) as patches(signature, old_sql, new_sql) loop
    definition := pg_catalog.pg_get_functiondef(patch.signature::regprocedure);
    if (length(definition)-length(replace(definition,patch.old_sql,''))) / length(patch.old_sql) <> 1 then
      raise exception 'exercise plan source drift: % / %',patch.signature,patch.old_sql;
    end if;
    execute replace(definition,patch.old_sql,patch.new_sql);
  end loop;
  foreach signature in array array['public.assign_program_template(uuid,uuid)',
    'public.program_to_template(uuid,text)','public.copy_template(text,uuid,text)'] loop
    for patch in select * from (values
      ($old$rest_seconds, rpe, rir, tempo, notes)$old$, $new$rest_seconds, rpe, rir, tempo, notes, alternatives, set_plan)$new$),
      ($old$rest_seconds, rpe, rir, tempo, notes
$old$, $new$rest_seconds, rpe, rir, tempo, notes, alternatives, set_plan
$new$)
    ) as patches(old_sql,new_sql) loop
      definition := pg_catalog.pg_get_functiondef(signature::regprocedure);
      if (length(definition)-length(replace(definition,patch.old_sql,''))) / length(patch.old_sql) <> 1 then
        raise exception 'exercise plan copy source drift: % / %',signature,patch.old_sql;
      end if;
      execute replace(definition,patch.old_sql,patch.new_sql);
    end loop;
  end loop;
end $migration$;

-- Current demo entrypoints delegate to the starter copier and assignment RPC.
-- They create no independent copies of program_exercises.
commit;
