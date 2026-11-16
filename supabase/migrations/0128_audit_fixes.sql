begin;

alter table public.pain_reports add column swap_alternatives uuid[]
  check (cardinality(swap_alternatives)<=3);
create policy pain_snapshot_server on public.pain_reports as restrictive for insert to authenticated
  with check (swap_alternatives is null);

-- Re-emit the installed definitions to preserve intervening guards and ACLs.
-- Every anchor must occur exactly once; drift rolls back the whole migration.
do $migration$
declare patch record; definition text;
begin
  for patch in select * from (values
    ('public.sync_set_logs(jsonb)',
      'update public.set_logs set weight_kg=r.weight_kg',
      'update public.set_logs set exercise_id=r.exercise_id,weight_kg=r.weight_kg'),
    ('public.sync_set_logs(jsonb)',
      'weight_kg=excluded.weight_kg,reps=excluded.reps',
      'exercise_id=excluded.exercise_id,weight_kg=excluded.weight_kg,reps=excluded.reps'),
    ('security_private.points_board(uuid,date,public.points_log)',
      'extract(dow from d)::int weekday',
      '(extract(dow from d)::int + 1) % 7 weekday'),
    ('security_private.award_perfect_week()',
      'select count(distinct d.weekday) into v_days',
      $new$select case when count(*)=0 then 0 when count(d.weekday)>0 then count(distinct d.weekday)
        else coalesce((select cardinality(i.training_days) from public.player_intake i
          where i.player_id=new.player_id),0) end into v_days$new$),
    ('public.renew_player(uuid,integer,integer,integer,uuid)',
      'billing_started_at=now(), access_until=v_end',
      $new$billing_started_at=case when pkg.kind='sessions' and c.sessions_left>0
        and c.access_until>=today and c.awaiting_plans_at is null
        then c.billing_started_at else now() end, access_until=v_end$new$),
    ('public.renew_player_offer(uuid,uuid,integer,integer,integer,uuid)',
      'billing_started_at=now(), access_until=v_end',
      $new$billing_started_at=case when pkg.kind='sessions' and c.sessions_left>0
        and c.access_until>=today and c.awaiting_plans_at is null
        then c.billing_started_at else now() end, access_until=v_end$new$),
    ('public.captain_money_owed()',
      'or c.access_until<public.user_today(auth.uid())',
      'or (c.frozen_at is null and c.awaiting_plans_at is null and c.access_until<public.user_today(auth.uid()))'),
    ('public.request_exercise_swap(uuid,uuid,text,text)',
      $old$(p_reason='discomfort' or not (p_injury=any(b.stress)))$old$,
      $new$not (b.stress && (coalesce((select i.injuries from public.player_intake i
        where i.player_id=v.player_id),'{}'::text[]) || array_remove(array[p_injury],null)))$new$),
    ('public.decide_exercise_swap(uuid,boolean)',
      $old$(r.reason='discomfort' or not (r.injury=any(b.stress)))$old$,
      $new$not (b.stress && (coalesce((select i.injuries from public.player_intake i
        where i.player_id=r.player_id),'{}'::text[]) || array_remove(array[r.injury],null)))$new$),
    ('public.answer_pain(uuid,text)',
      'update public.pain_reports set swap_original_id=',
      $new$update public.pain_reports set swap_alternatives=coalesce((select old.swap_alternatives
        from public.pain_reports old where old.program_exercise_id=v.id and old.player_id=r.player_id
          and old.swap_to_id=v.exercise_id and old.swap_until>=(now() at time zone 'Africa/Cairo')::date
        order by old.answered_at desc limit 1),v.alternatives),swap_original_id=$new$),
    ('public.expire_pain_swaps()',
      'set exercise_id=r.swap_original_id',
      'set exercise_id=r.swap_original_id,alternatives=coalesce(r.swap_alternatives[1:3],e.alternatives)')
  ) as patches(signature,old_sql,new_sql) loop
    definition := pg_catalog.pg_get_functiondef(patch.signature::regprocedure);
    if (length(definition)-length(replace(definition,patch.old_sql,'')))/length(patch.old_sql)<>1 then
      raise exception 'Audit fixes source drift: % / %',patch.signature,patch.old_sql;
    end if;
    execute replace(definition,patch.old_sql,patch.new_sql);
  end loop;
end $migration$;

commit;
