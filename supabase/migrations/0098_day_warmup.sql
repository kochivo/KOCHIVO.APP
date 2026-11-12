-- T-197: additive day metadata; existing rows and RLS keep their behavior.
begin;

alter table public.program_days
  add column warmup jsonb not null default '{"items":[],"ramp":false}'::jsonb,
  add constraint program_days_warmup_shape check (
    (jsonb_typeof(warmup) = 'object'
      and jsonb_typeof(warmup -> 'items') = 'array'
      and jsonb_typeof(warmup -> 'ramp') = 'boolean'
      and case when jsonb_typeof(warmup -> 'items') = 'array'
        then jsonb_array_length(warmup -> 'items') <= 12 else false end) is true
  );

-- Re-emit catalog definitions to retain all intervening changes and ACLs.
-- Each replacement must match exactly once; schema drift aborts the transaction.
do $migration$
declare patch record; definition text;
begin
  for patch in select * from (values
    -- Latest save: 0097 (base 0050, template ownership 0055, RIR 0070).
    ('public.save_weekly_program(jsonb)',
      $old$public.program_days(id,program_id,position,title,weekday,is_rest_day)$old$,
      $new$public.program_days(id,program_id,position,title,weekday,is_rest_day,warmup)$new$),
    ('public.save_weekly_program(jsonb)',
      $old$and jsonb_array_length(d -> 'exercises')=0 and jsonb_array_length(d -> 'cardio')=0))$old$,
      $new$and jsonb_array_length(d -> 'exercises')=0 and jsonb_array_length(d -> 'cardio')=0),
        coalesce(d -> 'warmup','{"items":[],"ramp":false}'::jsonb))$new$),
    ('public.save_weekly_program(jsonb)',
      $old$weekday=excluded.weekday,is_rest_day=excluded.is_rest_day;$old$,
      $new$weekday=excluded.weekday,is_rest_day=excluded.is_rest_day,warmup=excluded.warmup;$new$),
    -- Latest assignment: 0097; save-as-template and duplication: 0070.
    ('public.assign_program_template(uuid,uuid)',
      $old$public.program_days (program_id, position, title, weekday, is_rest_day)$old$,
      $new$public.program_days (program_id, position, title, weekday, is_rest_day, warmup)$new$),
    ('public.assign_program_template(uuid,uuid)',
      $old$v_day.position, v_day.title, v_day.weekday, v_day.is_rest_day)$old$,
      $new$v_day.position, v_day.title, v_day.weekday, v_day.is_rest_day, v_day.warmup)$new$),
    ('public.program_to_template(uuid,text)',
      $old$public.program_days (program_id, position, title, weekday, is_rest_day)$old$,
      $new$public.program_days (program_id, position, title, weekday, is_rest_day, warmup)$new$),
    ('public.program_to_template(uuid,text)',
      $old$v_day.position, v_day.title, v_day.weekday, v_day.is_rest_day)$old$,
      $new$v_day.position, v_day.title, v_day.weekday, v_day.is_rest_day, v_day.warmup)$new$),
    ('public.copy_template(text,uuid,text)',
      $old$public.program_days (program_id, position, title, weekday, is_rest_day)$old$,
      $new$public.program_days (program_id, position, title, weekday, is_rest_day, warmup)$new$),
    ('public.copy_template(text,uuid,text)',
      $old$v_child.position, v_child.title, v_child.weekday, v_child.is_rest_day)$old$,
      $new$v_child.position, v_child.title, v_child.weekday, v_child.is_rest_day, v_child.warmup)$new$),
    -- Latest starter copier: 0070 (base 0030, weekly fields/cardio 0050).
    ('security_private.copy_starter_templates(uuid)',
      $old$public.program_days (id, program_id, position, title, weekday, is_rest_day)$old$,
      $new$public.program_days (id, program_id, position, title, weekday, is_rest_day, warmup)$new$),
    ('security_private.copy_starter_templates(uuid)',
      $old$coalesce((d.p ->> 'is_rest_day')::boolean,false));$old$,
      $new$coalesce((d.p ->> 'is_rest_day')::boolean,false),
        coalesce(d.p -> 'warmup','{"items":[],"ramp":false}'::jsonb));$new$),
    ('public.save_weekly_program(jsonb)',
      $old$insert into public.program_exercises(id,day_id,exercise_id,position,superset_group,sets,reps_min,reps_max,rest_seconds,rir)
        values((e ->> 'id')::uuid,(d ->> 'id')::uuid,(e ->> 'exercise_id')::uuid,(e ->> 'position')::smallint,
          (e ->> 'superset_group')::smallint,(e ->> 'sets')::smallint,(e ->> 'reps_min')::smallint,
          (e ->> 'reps_max')::smallint,(e ->> 'rest_seconds')::smallint,(e ->> 'rir')::smallint)
        on conflict(id) do update set day_id=excluded.day_id,exercise_id=excluded.exercise_id,position=excluded.position,
          superset_group=excluded.superset_group,sets=excluded.sets,reps_min=excluded.reps_min,
          reps_max=excluded.reps_max,rest_seconds=excluded.rest_seconds,rir=excluded.rir;$old$,
      $new$insert into public.program_exercises(id,day_id,exercise_id,position,superset_group,sets,reps_min,reps_max,rest_seconds,rir,notes)
        values((e ->> 'id')::uuid,(d ->> 'id')::uuid,(e ->> 'exercise_id')::uuid,(e ->> 'position')::smallint,
          (e ->> 'superset_group')::smallint,(e ->> 'sets')::smallint,(e ->> 'reps_min')::smallint,
          (e ->> 'reps_max')::smallint,(e ->> 'rest_seconds')::smallint,(e ->> 'rir')::smallint,
          nullif(btrim(e ->> 'notes'),''))
        on conflict(id) do update set day_id=excluded.day_id,exercise_id=excluded.exercise_id,position=excluded.position,
          superset_group=excluded.superset_group,sets=excluded.sets,reps_min=excluded.reps_min,
          reps_max=excluded.reps_max,rest_seconds=excluded.rest_seconds,rir=excluded.rir,notes=excluded.notes;$new$)
  ) as patches(signature, old_sql, new_sql)
  loop
    definition := pg_catalog.pg_get_functiondef(patch.signature::regprocedure);
    if (length(definition)-length(replace(definition,patch.old_sql,''))) / length(patch.old_sql) <> 1 then
      raise exception 'warmup source drift: % / %',patch.signature,patch.old_sql;
    end if;
    execute replace(definition,patch.old_sql,patch.new_sql);
  end loop;
end $migration$;

-- Both demo entrypoints (latest 0097) delegate to the starter copier and
-- assign_program_template; neither has a separate program-day insert path.
commit;
