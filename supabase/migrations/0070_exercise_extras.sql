alter table public.program_exercises
  add column rir smallint check (rir is null or rir between 0 and 5);

-- Re-emit the latest definitions, retaining weekly metadata, ownership checks,
-- signatures, security mode, search_path and existing grants (as in 0050/0055).
do $migration$
declare signature text; definition text; fragment text;
begin
  foreach signature in array array['public.assign_program_template(uuid,uuid)',
    'public.program_to_template(uuid,text)', 'public.copy_template(text,uuid,text)'] loop
    definition := pg_get_functiondef(signature::regprocedure);
    fragment := 'rest_seconds, rpe, tempo, notes';
    if (length(definition) - length(replace(definition, fragment, ''))) / length(fragment) <> 2 then
      raise exception 'RIR copy source drift: %', signature;
    end if;
    execute replace(definition, fragment, 'rest_seconds, rpe, rir, tempo, notes');
  end loop;

  definition := pg_get_functiondef('security_private.copy_starter_templates(uuid)'::regprocedure);
  if position('rest_seconds, superset_group)' in definition) = 0
    or position('(x.p ->> ''superset_group'')::smallint' in definition) = 0 then
    raise exception 'RIR starter source drift';
  end if;
  definition := replace(definition, 'rest_seconds, superset_group)', 'rest_seconds, superset_group, rir)');
  definition := replace(definition, '(x.p ->> ''superset_group'')::smallint',
    '(x.p ->> ''superset_group'')::smallint, (x.p ->> ''rir'')::smallint');
  execute definition;

  definition := pg_get_functiondef('public.save_weekly_program(jsonb)'::regprocedure);
  if position('reps_max,rest_seconds)' in definition) = 0
    or position('(e ->> ''rest_seconds'')::smallint)' in definition) = 0
    or position('rest_seconds=excluded.rest_seconds;' in definition) = 0 then
    raise exception 'RIR weekly save source drift';
  end if;
  definition := replace(definition, 'reps_max,rest_seconds)', 'reps_max,rest_seconds,rir)');
  definition := replace(definition, '(e ->> ''rest_seconds'')::smallint)',
    '(e ->> ''rest_seconds'')::smallint,(e ->> ''rir'')::smallint)');
  definition := replace(definition, 'rest_seconds=excluded.rest_seconds;',
    'rest_seconds=excluded.rest_seconds,rir=excluded.rir;');
  execute definition;
end; $migration$;
