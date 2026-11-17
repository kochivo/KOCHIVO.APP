begin;

-- Include approved ledger days and finished training days in the displayed count.
-- Crown eligibility, adherence and point awards keep their existing review rules.
do $migration$
declare definition text;
  old_sql text := 'b.position,b.adherence,b.done,b.planned';
  new_sql text := $replacement$b.position,b.adherence,(
      select count(distinct days.day)::int from (
        select case when public.safe_timezone(s.player_id)=public.safe_timezone(v_captain)
          then s.training_date else l.earned_on end as day
        from public.points_log l join public.workout_sessions s
          on s.id::text=l.source_key and s.player_id=l.player_id
        where l.player_id=b.player_id and l.captain_id=v_captain
          and l.kind='workout' and l.status='counted'
        union
        select case when public.safe_timezone(s.player_id)=public.safe_timezone(v_captain)
          then s.training_date else coalesce(l.earned_on,
            (s.completed_at at time zone public.safe_timezone(v_captain))::date) end as day
        from public.workout_sessions s
        join public.coach_clients c on c.player_id=s.player_id and c.captain_id=v_captain and c.archived_at is null
        join public.profiles cp on cp.id=c.captain_id
        left join public.points_log l on l.player_id=s.player_id and l.captain_id=v_captain
          and l.kind='workout' and l.source_key=s.id::text
        where s.player_id=b.player_id and s.completed_at is not null
          and s.training_date<=public.user_today(s.player_id)
          and (cp.demo_expires_at is not null or s.training_date>=(
            c.started_on::timestamp at time zone public.safe_timezone(v_captain)
            at time zone public.safe_timezone(s.player_id))::date)
      ) days
      where days.day>=date_trunc('month',p_month)::date
        and days.day<(date_trunc('month',p_month)+interval '1 month')::date
    ),b.planned$replacement$;
begin
  definition:=pg_catalog.pg_get_functiondef('public.team_leaderboard(date)'::regprocedure);
  if (length(definition)-length(replace(definition,old_sql,'')))/length(old_sql)<>1 then
    raise exception 'Leaderboard count source drift';
  end if;
  execute replace(definition,old_sql,new_sql);
end $migration$;

commit;
