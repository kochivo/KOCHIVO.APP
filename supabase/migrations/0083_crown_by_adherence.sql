begin;
drop trigger points_z_count on public.points_log;
drop function security_private.count_points();
drop function public.team_leaderboard(date);
drop function public.my_points();
drop function security_private.points_board(uuid,date,public.points_log);

create function security_private.points_board(p_captain uuid,p_month date,p_extra public.points_log default null)
returns table(player_id uuid,monthly bigint,"position" bigint,adherence int,done int,planned int)
language sql stable security definer set search_path = '' as $$
  -- Past months deliberately use the currently active program, not a historical snapshot.
  with calendar as materialized (
    select d::date as calendar_date,extract(dow from d)::int weekday
    from generate_series(date_trunc('month',p_month)::timestamp,
      date_trunc('month',p_month)::timestamp+interval '1 month - 1 day',interval '1 day') d
  ), roster as materialized (
    select c.player_id,c.started_on from public.coach_clients c
    where c.captain_id=p_captain and c.archived_at is null
  ), active_programs as materialized (
    select p.id,p.player_id from public.programs p
    where p.captain_id=p_captain and p.status='active' and not p.is_template
  ), weekdays as (
    select distinct p.player_id,d.weekday from active_programs p
    join public.program_days d on d.program_id=p.id and not d.is_rest_day
  ), schedules as (
    select r.player_id,greatest(8,count(c.calendar_date))::int planned
    from roster r left join weekdays w on w.player_id=r.player_id
    left join calendar c on c.weekday=w.weekday and c.calendar_date>=r.started_on group by r.player_id
  ), ledger as (
    -- Replace the pending row during BEFORE UPDATE; never double count p_extra.
    select l.* from public.points_log l where l.captain_id=p_captain and l.status='counted'
      and ((p_extra).id is null or l.id<>(p_extra).id)
    union all select (p_extra).* where (p_extra).id is not null
  ), completions as (
    select l.player_id,count(distinct s.training_date)::int done
    from ledger l join public.workout_sessions s on s.id::text=l.source_key and s.player_id=l.player_id
    where l.captain_id=p_captain and l.kind='workout' and l.status='counted'
      and s.training_date>=date_trunc('month',p_month)::date
      and s.training_date<(date_trunc('month',p_month)+interval '1 month')::date
    group by l.player_id
  ), totals as (
    select r.player_id,coalesce(max(c.done),0)::int done,
      coalesce(sum(l.points) filter(where l.kind in ('pr','inbody')),0) bonus,
      coalesce(sum(l.points) filter(where l.kind<>'meal_check'),0) raw,
      max(l.created_at) filter(where l.kind<>'meal_check') last_award
    from roster r left join ledger l on l.player_id=r.player_id and l.captain_id=p_captain
      and l.status='counted' and l.earned_on>=date_trunc('month',p_month)::date
      and l.earned_on<(date_trunc('month',p_month)+interval '1 month')::date
    left join completions c on c.player_id=r.player_id
    group by r.player_id
  ), scores as (
    select t.*,s.planned,case when a.player_id is not null
      then least(100,round(100.0*t.done/s.planned))::int else 0 end adherence
    from totals t join schedules s using(player_id)
    left join (select distinct player_id from active_programs) a using(player_id)
  )
  select s.player_id,s.adherence+s.bonus,row_number() over (
    order by s.adherence+s.bonus desc,s.raw desc,s.last_award asc nulls last,s.player_id),
    s.adherence,s.done,s.planned from scores s;
$$;

create function security_private.count_points() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_before uuid; v_after uuid; v_total int;
begin
  if new.status<>'counted' then return new; end if;
  if tg_op='INSERT' and exists(select 1 from public.points_log where player_id=new.player_id
    and kind=new.kind and source_key=new.source_key) then return new; end if;
  select b.player_id into v_before from security_private.points_board(new.captain_id,new.earned_on) b
    where b.position=1 and b.done>=4 and b.adherence>0;
  insert into public.player_points(player_id,lifetime) values(new.player_id,new.points)
    on conflict(player_id) do update set lifetime=public.player_points.lifetime+excluded.lifetime,updated_at=now()
    returning lifetime into v_total;
  if security_private.points_tier(v_total)<>security_private.points_tier(v_total-new.points) then
    insert into public.notifications(user_id,type,payload) values(new.player_id,'rank_up',
      jsonb_build_object('tier',security_private.points_tier(v_total),'lifetime',v_total));
  end if;
  select b.player_id into v_after from security_private.points_board(new.captain_id,new.earned_on,new) b
    where b.position=1 and b.done>=4 and b.adherence>0;
  if v_before is distinct from v_after then
    insert into public.notifications(user_id,type,payload)
      select recipient,kind,jsonb_build_object('captain_id',new.captain_id,'month',date_trunc('month',new.earned_on)::date)
      from (values(v_after,'crown_taken'),(v_before,'crown_lost')) n(recipient,kind) where recipient is not null;
  end if;
  return new;
end $$;
create trigger points_z_count before insert or update on public.points_log
  for each row execute function security_private.count_points();

create function public.team_leaderboard(p_month date default (date_trunc('month',now() at time zone 'Africa/Cairo'))::date)
returns table(player_id uuid,display_name text,lifetime int,tier text,monthly bigint,is_crown boolean,"position" bigint,
  adherence int,done int,planned int)
language plpgsql stable security definer set search_path = '' as $$
declare v_captain uuid; v_role public.user_role;
begin
  perform public.require_active_caller();
  select p.role into v_role from public.profiles p where p.id=auth.uid();
  v_captain:=case when v_role='captain' then auth.uid() else public.my_captain_id() end;
  if auth.uid() is null or p_month is null then raise exception 'authenticated caller and month required' using errcode='42501'; end if;
  return query select case when v_role='captain' or b.player_id=auth.uid() then b.player_id end,
    case when v_role='captain' then p.full_name else split_part(btrim(p.full_name),' ',1) end,
    coalesce(pp.lifetime,0),security_private.points_tier(coalesce(pp.lifetime,0)),b.monthly,
    b.position=1 and b.done>=4 and b.adherence>0,b.position,b.adherence,b.done,b.planned
    from security_private.points_board(v_captain,p_month) b join public.profiles p on p.id=b.player_id
    left join public.player_points pp on pp.player_id=b.player_id order by b.position;
end $$;
create function public.my_points() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_total int; v_mine record; v_top bigint;
begin
  perform public.require_active_caller();
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='player') then
    raise exception 'player required' using errcode='42501'; end if;
  select lifetime into v_total from public.player_points where player_id=auth.uid();
  with board as materialized (select * from security_private.points_board(public.my_captain_id(),
    (now() at time zone 'Africa/Cairo')::date))
  select b.*, (select monthly from board where position=1) top into v_mine from board b where player_id=auth.uid();
  v_top:=coalesce(v_mine.top,0);
  return jsonb_build_object('lifetime',coalesce(v_total,0),'tier',security_private.points_tier(coalesce(v_total,0)),
    'monthly',coalesce(v_mine.monthly,0),'month_position',v_mine.position,
    'adherence',coalesce(v_mine.adherence,0),'done',coalesce(v_mine.done,0),'planned',coalesce(v_mine.planned,8),
    'crown_needs_workouts',greatest(0,4-coalesce(v_mine.done,0)),'crown_gap',
    case when v_mine.position=1 and v_mine.done>=4 and v_mine.adherence>0 then 0
      else greatest(1,v_top+1-coalesce(v_mine.monthly,0)) end,
    'logs',coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at desc,l.id desc) from
      (select * from public.points_log where player_id=auth.uid() order by created_at desc,id desc limit 10) l),'[]'::jsonb));
end $$;
revoke all on function security_private.points_board(uuid,date,public.points_log),security_private.count_points()
  from public,anon,authenticated,service_role;
revoke all on function public.team_leaderboard(date),public.my_points() from public,anon;
grant execute on function public.team_leaderboard(date),public.my_points() to authenticated;
commit;
