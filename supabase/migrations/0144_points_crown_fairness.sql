begin;

-- Keep board positions unchanged; eligibility only changes who holds the crown.
create or replace function security_private.crown_holder(
  p_captain uuid,p_month date,p_extra public.points_log default null)
returns uuid language sql stable security definer set search_path = '' as $$
  select b.player_id from security_private.points_board(p_captain,p_month,p_extra) b
    where b.done>=4 and b.adherence>0 order by b.position limit 1;
$$;
revoke all on function security_private.crown_holder(uuid,date,public.points_log)
  from public,anon,authenticated,service_role;

-- Preserve installed timezone, drop-set, medal and notification behavior.
-- Abort on source drift instead of silently losing an intervening change.
do $migration$
declare patch record; definition text;
begin
  for patch in select * from (values
    ('security_private.award_session_points(uuid)',
      $old$v_status:=case when extract(epoch from s.completed_at-s.started_at)<greatest(1200,v_seconds*0.5)$old$,
      $new$v_status:=case when v_sets=0 and exists(
        select 1 from public.program_cardio where day_id=s.program_day_id)
        then case when extract(epoch from s.completed_at-s.started_at)>=(
          select sum(minutes)*60 from public.program_cardio where day_id=s.program_day_id)
          then 'counted' else 'pending' end
        when extract(epoch from s.completed_at-s.started_at)<greatest(1200,v_seconds*0.5)$new$),
    ('security_private.award_perfect_week()',
      $old$where w.player_id=new.player_id and w.completed_at is not null$old$,
      $new$join public.coach_clients wc on wc.player_id=w.player_id and wc.captain_id=new.captain_id
      and wc.archived_at is null
    where l.captain_id=new.captain_id and w.training_date>=wc.started_on
      and w.player_id=new.player_id and w.completed_at is not null$new$),
    ('security_private.count_points()',
      $old$select b.player_id into v_before from security_private.points_board(new.captain_id,new.earned_on) b
    where b.position=1 and b.done>=4 and b.adherence>0;$old$,
      $new$v_before:=security_private.crown_holder(new.captain_id,new.earned_on);$new$),
    ('security_private.count_points()',
      $old$select b.player_id into v_after from security_private.points_board(new.captain_id,new.earned_on,new) b
    where b.position=1 and b.done>=4 and b.adherence>0;$old$,
      $new$v_after:=security_private.crown_holder(new.captain_id,new.earned_on,new);$new$),
    ('public.team_leaderboard(date)',
      $old$b.position=1 and b.done>=4 and b.adherence>0$old$,
      $new$coalesce(b.player_id=(select security_private.crown_holder(v_captain,p_month)),false)$new$),
    ('public.my_points()',
      $old$(select monthly from board where position=1)$old$,
      $new$(select monthly from board where done>=4 and adherence>0 order by position limit 1)$new$),
    ('public.my_points()',
      $old$v_mine.position=1 and v_mine.done>=4 and v_mine.adherence>0$old$,
      $new$v_mine.player_id=security_private.crown_holder(public.my_captain_id(),public.user_today(public.my_captain_id()))$new$)
  ) as patches(signature,old_sql,new_sql) loop
    definition:=pg_catalog.pg_get_functiondef(patch.signature::regprocedure);
    if (length(definition)-length(replace(definition,patch.old_sql,'')))/length(patch.old_sql)<>1 then
      raise exception 'Points fairness source drift: %',patch.signature;
    end if;
    execute replace(definition,patch.old_sql,patch.new_sql);
  end loop;
end $migration$;

do $reminders$
declare definition text;
begin
  definition:=pg_catalog.pg_get_functiondef('public.queue_crown_reminders(date)'::regprocedure);
  if (length(definition)-length(replace(definition,
    'b.position=1 and b.done>=4 and b.adherence>0','')))/length(
    'b.position=1 and b.done>=4 and b.adherence>0')<>3 then
    raise exception 'Crown reminder source drift';
  end if;
  definition:=replace(definition,'b.position=1 and b.done>=4 and b.adherence>0',
    'b.player_id=(select security_private.crown_holder(v_captain,v_month))');
  definition:=replace(definition,
    'case when b.position=1 then 0 else (select monthly from board where position=1)+1-b.monthly end',
    'greatest(0,coalesce((select monthly from board where player_id=(select security_private.crown_holder(v_captain,v_month)))+1,0)-b.monthly)');
  execute definition;
end $reminders$;

-- The stored start and completion timestamps also record logged cardio duration.
-- Strength workouts retain their existing minimum duration and set thresholds.

create or replace function security_private.freeze_crown_winners(p_month date)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_month is null or p_month<>date_trunc('month',p_month)::date
    or p_month>=coalesce((select max(date_trunc('month',public.user_today(id))::date)
      from public.profiles where role='captain'),date_trunc('month',public.user_today(null))::date) then
    raise exception 'completed month required' using errcode='22023';
  end if;
  -- Exactly 48 elapsed hours after each captain's local month boundary.
  -- Conflict protection makes retries harmless; medals and history read this row.
  insert into public.crown_winners(captain_id,month,player_id,adherence,done,planned)
    select p.id,p_month,b.player_id,b.adherence,b.done,b.planned
    from public.profiles p cross join lateral (
      select * from security_private.points_board(p.id,p_month) ranked
      where ranked.done>=4 and ranked.adherence>0 order by ranked.position limit 1
    ) b
    where p.role='captain' and now()>=(
      (p_month+interval '1 month') at time zone public.safe_timezone(p.id))+interval '48 hours'
    on conflict(captain_id,month) do nothing;
end $$;

-- Retry hourly, including after downtime; never freeze a month still settling.
do $jobs$
begin
  if exists(select 1 from pg_catalog.pg_namespace where nspname='cron') then
    execute $cron$select cron.schedule('freeze-crown-winners','10 * * * *',
      $job$select security_private.freeze_crown_winners(m.month)
        from (select distinct date_trunc('month',l.earned_on)::date as month
          from public.points_log l
          where l.earned_on<date_trunc('month',public.user_today(null))::date
            -- Only months still inside the settlement window; older ones are already final.
            and l.earned_on>=(date_trunc('month',public.user_today(null))-interval '2 months')::date) m$job$)$cron$;
  end if;
end $jobs$;
commit;
