begin;

create function security_private.medal_rank(p_total int) returns text
language sql immutable set search_path = '' as $$
  select case when p_total>=900 then 'legend' when p_total>=600 then 'diamond'
    when p_total>=400 then 'platinum' when p_total>=300 then 'gold'
    when p_total>=200 then 'silver' when p_total>=100 then 'bronze' else 'iron' end;
$$;
revoke all on function security_private.medal_rank(int) from public,anon,authenticated;

do $migration$
declare definition text; expression text; patch record;
begin
  select pg_get_constraintdef(oid) into expression from pg_constraint
    where conrelid='public.notifications'::regclass and conname='notifications_type_check';
  if expression is null then raise exception 'Missing notifications_type_check'; end if;
  alter table public.notifications drop constraint notifications_type_check;
  execute 'alter table public.notifications add constraint notifications_type_check check (' ||
    substring(expression from 7) || ' or type = ''player_rank_up'')';

  definition := pg_get_functiondef('security_private.count_points()'::regprocedure);
  for patch in select * from (values
    ('if security_private.points_tier(v_total)<>security_private.points_tier(v_total-new.points) then',
     'if security_private.medal_rank(v_total)<>security_private.medal_rank(v_total-new.points) then'),
    ($old$jsonb_build_object('tier',security_private.points_tier(v_total),'lifetime',v_total));$old$,
     $new$jsonb_build_object('tier',security_private.points_tier(v_total),'lifetime',v_total,
        'medal',security_private.medal_rank(v_total)));
    insert into public.notifications(user_id,type,payload)
      select c.captain_id,'player_rank_up',jsonb_build_object('player_id',new.player_id,
        'display_name',split_part(btrim(p.full_name),' ',1),'medal',security_private.medal_rank(v_total))
      from public.coach_clients c join public.profiles p on p.id=c.player_id
      where c.player_id=new.player_id and c.archived_at is null and not c.pending;$new$)
  ) patches(old_sql,new_sql) loop
    if (length(definition)-length(replace(definition,patch.old_sql,'')))/length(patch.old_sql)<>1 then
      raise exception 'Medal rank trigger source drift';
    end if;
    definition := replace(definition,patch.old_sql,patch.new_sql);
  end loop;
  execute definition;
end $migration$;

-- Crown months are the frozen results produced by freeze_crown_winners, also
-- consumed by crown_hall_of_fame. Never recompute historical rankings here.
create function security_private.medal_counts(p_player uuid)
returns table(workouts int,full_weeks int,prs int,crowns int,crown_streak int)
language sql stable security definer set search_path = '' as $$
  with months as (
    select distinct month from public.crown_winners where player_id=p_player
  ), runs as (
    select month,(extract(year from month)::int*12+extract(month from month)::int)
      -row_number() over(order by month) as run from months
  ), streaks as (select count(*)::int n from runs group by run)
  select (select count(*)::int from public.workout_sessions
      where player_id=p_player and completed_at is not null),
    (select count(*)::int from public.points_log where player_id=p_player and status='counted' and kind='perfect_week'),
    (select count(*)::int from public.points_log where player_id=p_player and status='counted' and kind='pr'),
    (select count(*)::int from months),coalesce((select max(n) from streaks),0);
$$;
revoke all on function security_private.medal_counts(uuid) from public,anon,authenticated;

create function public.my_medals()
returns table(workouts int,full_weeks int,prs int,crowns int,crown_streak int)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_active_caller();
  if auth.uid() is null then raise exception 'Player required' using errcode='42501'; end if;
  return query select * from security_private.medal_counts(auth.uid());
end $$;
create function public.player_medals(p_player uuid)
returns table(workouts int,full_weeks int,prs int,crowns int,crown_streak int)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_active_caller();
  if not public.is_captain_of(p_player) then raise exception 'Captain required' using errcode='42501'; end if;
  return query select * from security_private.medal_counts(p_player);
end $$;
revoke all on function public.my_medals(),public.player_medals(uuid) from public,anon,authenticated;
grant execute on function public.my_medals(),public.player_medals(uuid) to authenticated;
commit;
