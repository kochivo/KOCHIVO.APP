begin;

-- Patch installed definitions to preserve timezone rules, privacy gates and ACLs.
do $migration$
declare patch record; definition text; signature text;
begin
  for patch in select * from (values
    (1,'security_private.points_board(uuid,date,public.points_log)',
      $old$select p.id,p.player_id from public.programs p$old$,
      $new$select p.id,p.player_id,case
        when coalesce(p.settings->'repeatWeekly'='false'::jsonb,false)
          and p.settings->>'weeklyStartedOn' is not null
          and exists(select 1 from public.program_days d where d.program_id=p.id and d.weekday is not null)
        then (p.settings->>'weeklyStartedOn')::date end weekly_start
      from public.programs p$new$),
    (2,'security_private.points_board(uuid,date,public.points_log)',
      $old$select distinct p.player_id,d.weekday from active_programs p$old$,
      $new$select distinct p.player_id,d.weekday,p.weekly_start from active_programs p$new$),
    (3,'security_private.points_board(uuid,date,public.points_log)',
      $old$select p.player_id,(training_day+1)%7 from active_programs p$old$,
      $new$select p.player_id,(training_day+1)%7,p.weekly_start from active_programs p$new$),
    (4,'security_private.points_board(uuid,date,public.points_log)',
      $old$c.calendar_date>=r.started_on group by r.player_id$old$,
      $new$c.calendar_date>=r.started_on
      and (w.weekly_start is null or c.calendar_date between w.weekly_start and w.weekly_start+6)
    group by r.player_id$new$),
    (5,'public.coach_public_stats(text)',
      $old$and d.weekday=(extract(dow from calendar.day)::int+1)%7$old$,
      $new$and (d.weekday=(extract(dow from calendar.day)::int+1)%7
        or (not exists(select 1 from public.program_days weekly
              where weekly.program_id=p.id and weekly.weekday is not null)
          and exists(select 1 from public.player_intake i where i.player_id=r.player_id
            and extract(dow from calendar.day)::int=any(i.training_days))))$new$),
    (6,'public.coach_public_stats(text)',
      $old$where s.completed_at is not null),$old$,
      $new$where s.completed_at is not null and s.training_date>=r.started_on),$new$)
  ) as patches(patch_order,signature,old_sql,new_sql) order by patch_order loop
    if signature is distinct from patch.signature then
      if signature is not null then execute definition; end if;
      signature:=patch.signature;
      definition:=pg_catalog.pg_get_functiondef(signature::regprocedure);
    end if;
    if (length(definition)-length(replace(definition,patch.old_sql,'')))/length(patch.old_sql)<>1 then
      raise exception 'Board/public stats source drift: %',patch.signature;
    end if;
    definition:=replace(definition,patch.old_sql,patch.new_sql);
  end loop;
  execute definition;
end $migration$;

commit;
