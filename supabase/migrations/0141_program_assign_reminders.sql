begin;

-- Re-emit the installed functions so later copy fields, caller guards and grants survive.
do $migration$
declare definition text; old_sql text; new_sql text; patch record;
begin
  definition := pg_get_functiondef('public.assign_program_template(uuid,uuid)'::regprocedure);
  old_sql := 'select 1 from public.program_days where program_id = p_template';
  new_sql := $sql$select 1 from public.program_days d
    where d.program_id = p_template and not d.is_rest_day
      and (exists(select 1 from public.program_exercises e where e.day_id=d.id)
        or exists(select 1 from public.program_cardio c where c.day_id=d.id))$sql$;
  if (length(definition)-length(replace(definition,old_sql,'')))/length(old_sql) <> 1 then
    raise exception 'Program assignment source drift';
  end if;
  execute replace(definition,old_sql,new_sql);

  -- An unseeded demo keeps its empty starter templates, without assigning an empty plan.
  definition := pg_get_functiondef('public.create_demo_workspace()'::regprocedure);
  old_sql := 'if found then perform public.assign_program_template(template, players[i]); end if;';
  new_sql := $sql$if found and exists(select 1 from public.program_days d
    where d.program_id=template and not d.is_rest_day
      and (exists(select 1 from public.program_exercises e where e.day_id=d.id)
        or exists(select 1 from public.program_cardio c where c.day_id=d.id))) then
    perform public.assign_program_template(template, players[i]);
  end if;$sql$;
  if (length(definition)-length(replace(definition,old_sql,'')))/length(old_sql) <> 1 then
    raise exception 'Demo program assignment source drift';
  end if;
  execute replace(definition,old_sql,new_sql);

  definition := pg_get_functiondef('public.create_demo_player_workspace()'::regprocedure);
  old_sql := 'program := public.assign_program_template(template,player);';
  new_sql := $sql$if exists(select 1 from public.program_days d
    where d.program_id=template and not d.is_rest_day
      and (exists(select 1 from public.program_exercises e where e.day_id=d.id)
        or exists(select 1 from public.program_cardio c where c.day_id=d.id))) then
    program := public.assign_program_template(template,player);
  end if;$sql$;
  if (length(definition)-length(replace(definition,old_sql,'')))/length(old_sql) <> 1 then
    raise exception 'Demo player program assignment source drift';
  end if;
  execute replace(definition,old_sql,new_sql);

  -- Match weeklyFinished: explicit false, a start date, weekly days and age >= 7.
  for patch in select * from (values
    ('public.queue_workout_reminders(date)',
      'and p.status = ''active'' and not p.is_template',
      'coalesce(p_today,public.user_today(p.player_id))'),
    ('security_private.queue_ramadan_reminders(timestamp with time zone)',
      'and p.status=''active'' and not p.is_template', 't.d'),
    ('ko_private.workout_reminder(text)',
      'and not p.is_template and c.archived_at is null', 'v_today')
  ) as patches(signature,fragment,today_sql) loop
    definition := pg_get_functiondef(patch.signature::regprocedure);
    if (length(definition)-length(replace(definition,patch.fragment,'')))/length(patch.fragment) <> 1 then
      raise exception 'Workout reminder source drift: %',patch.signature;
    end if;
    new_sql := patch.fragment || format($sql$
      and not (coalesce(p.settings->'repeatWeekly' = 'false'::jsonb,false)
        and p.settings->>'weeklyStartedOn' is not null
        and %s >= (p.settings->>'weeklyStartedOn')::date + 7
        and exists(select 1 from public.program_days weekly
          where weekly.program_id=p.id and weekly.weekday is not null))$sql$, patch.today_sql);
    execute replace(definition,patch.fragment,new_sql);
  end loop;
end $migration$;

commit;
