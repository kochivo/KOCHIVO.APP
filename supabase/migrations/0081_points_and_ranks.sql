create table public.points_log (
  id uuid primary key default security_private.starter_uuidv7(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('workout','pr','perfect_week','inbody','meal_check')),
  source_key text not null, points smallint not null check (points > 0),
  status text not null check (status in ('counted','pending','rejected')),
  earned_on date not null, created_at timestamptz not null default now(), reviewed_at timestamptz,
  unique(player_id,kind,source_key)
);
create index points_log_captain_month on public.points_log(captain_id,earned_on);
create index points_log_player_month on public.points_log(player_id,earned_on);
create table public.player_points (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  lifetime int not null default 0 check (lifetime >= 0), updated_at timestamptz not null default now()
);
alter table public.points_log enable row level security;
alter table public.player_points enable row level security;
revoke all on public.points_log,public.player_points from public,anon,authenticated,service_role;
grant select on public.points_log,public.player_points to authenticated;
create policy points_read on public.points_log for select to authenticated
  using (case when (select public.is_suspended()) then false
    else player_id=(select auth.uid()) or public.is_captain_of(player_id) end);
create policy points_read on public.player_points for select to authenticated
  using (case when (select public.is_suspended()) then false
    else player_id=(select auth.uid()) or public.is_captain_of(player_id) end);
create policy active_caller on public.points_log as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.player_points as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('plan_assigned','nutrition_updated','player_joined','player_inactive','join_requested',
   'workout_reminder','workout_feedback','sessions_used_up','captain_approved',
   'subscription_expiring','subscription_expired','rank_up','crown_taken','crown_lost'));

create function security_private.points_tier(p_total int) returns text
language sql immutable set search_path = '' as $$
  select case when p_total>=600 then 'legend' when p_total>=300 then 'elite'
    when p_total>=100 then 'champion' else 'beginner' end;
$$;
create function security_private.points_board(p_captain uuid,p_month date,p_extra public.points_log default null)
returns table(player_id uuid,monthly bigint,"position" bigint)
language sql stable security definer set search_path = '' as $$
  with ledger as (select * from public.points_log union all select (p_extra).* where (p_extra).id is not null)
  select c.player_id,coalesce(sum(l.points),0),row_number() over (
    order by coalesce(sum(l.points),0) desc,max(l.created_at) asc nulls last,c.player_id)
  from public.coach_clients c left join ledger l on l.player_id=c.player_id
    and l.captain_id=p_captain and l.status='counted'
    and l.earned_on>=date_trunc('month',p_month)::date
    and l.earned_on<(date_trunc('month',p_month)+interval '1 month')::date
  where c.captain_id=p_captain and c.archived_at is null group by c.player_id;
$$;
create function security_private.guard_points() returns trigger
language plpgsql security definer set search_path = '' as $$ begin
  if tg_op='UPDATE' then
    if old.status<>'pending' or new.status not in ('counted','rejected')
      or (to_jsonb(new)-'status'-'reviewed_at')<>(to_jsonb(old)-'status'-'reviewed_at') then
      raise exception 'immutable points history';
    end if;
  end if;
  perform pg_advisory_xact_lock(hashtext(new.captain_id::text));
  return new;
end $$;
create trigger points_a_guard before insert or update on public.points_log
  for each row execute function security_private.guard_points();
create function security_private.count_points() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_before uuid; v_after uuid; v_total int;
begin
  if new.status<>'counted' then return new; end if;
  if tg_op='INSERT' and exists(select 1 from public.points_log where player_id=new.player_id
    and kind=new.kind and source_key=new.source_key) then return new; end if;
  select b.player_id into v_before from security_private.points_board(new.captain_id,new.earned_on) b
    where b.position=1 and b.monthly>=20;
  insert into public.player_points(player_id,lifetime) values(new.player_id,new.points)
    on conflict(player_id) do update set lifetime=public.player_points.lifetime+excluded.lifetime,updated_at=now()
    returning lifetime into v_total;
  if security_private.points_tier(v_total)<>security_private.points_tier(v_total-new.points) then
    insert into public.notifications(user_id,type,payload) values(new.player_id,'rank_up',
      jsonb_build_object('tier',security_private.points_tier(v_total),'lifetime',v_total));
  end if;
  select b.player_id into v_after from security_private.points_board(new.captain_id,new.earned_on,new) b
    where b.position=1 and b.monthly>=20;
  if v_before is distinct from v_after then
    insert into public.notifications(user_id,type,payload)
      select recipient,kind,jsonb_build_object('captain_id',new.captain_id,'month',date_trunc('month',new.earned_on)::date)
      from (values(v_after,'crown_taken'),(v_before,'crown_lost')) n(recipient,kind) where recipient is not null;
  end if;
  return new;
end $$;
-- Run before each row so multi-row reviews compare successive crown holders, not the final batch.
create trigger points_z_count before insert or update on public.points_log
  for each row execute function security_private.count_points();
create function security_private.award_points(p_player uuid,p_kind text,p_source text,p_points smallint,p_status text,p_on date)
returns void language sql security definer set search_path = '' as $$
  insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
    select p_player,c.captain_id,p_kind,p_source,p_points,p_status,p_on from public.coach_clients c
    join public.profiles p on p.id=c.player_id and p.role='player' and p.suspended_at is null
    where c.player_id=p_player and c.archived_at is null and not c.pending and c.frozen_at is null
      and c.access_until>=(now() at time zone 'Africa/Cairo')::date
    on conflict(player_id,kind,source_key) do nothing;
$$;
create function security_private.award_perfect_week() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_date date; v_week date; v_days int;
begin
  if new.kind<>'workout' or new.status<>'counted' then return new; end if;
  select training_date into v_date from public.workout_sessions where id::text=new.source_key and player_id=new.player_id;
  if not found then return new; end if;
  v_week:=v_date-((extract(dow from v_date)::int+1)%7);
  select count(distinct d.weekday) into v_days from public.programs p join public.program_days d on d.program_id=p.id
    join public.coach_clients c on c.player_id=p.player_id and c.captain_id=p.captain_id and c.archived_at is null
    where p.player_id=new.player_id and p.captain_id=new.captain_id and p.status='active' and not p.is_template and not d.is_rest_day;
  if v_days>0 and (select count(distinct w.training_date) from public.workout_sessions w
    join public.points_log l on l.player_id=w.player_id and l.kind='workout' and l.source_key=w.id::text and l.status='counted'
    where w.player_id=new.player_id and w.completed_at is not null and w.training_date>=v_week and w.training_date<v_week+7)>=v_days then
    perform security_private.award_points(new.player_id,'perfect_week',v_week::text,10::smallint,'counted',new.earned_on);
  end if;
  return new;
end $$;
create trigger points_perfect_week after insert or update on public.points_log
  for each row execute function security_private.award_perfect_week();
create function security_private.award_session_points(p_session uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.workout_sessions; v_sets int; v_seconds numeric; v_status text; v_on date;
begin
  select * into s from public.workout_sessions where id=p_session for update;
  if s.completed_at is null then return; end if;
  select coalesce(sum(e.sets),0),coalesce(sum(e.sets*(e.rest_seconds+40)),0) into v_sets,v_seconds
    from public.program_exercises e where e.day_id=s.program_day_id;
  v_status:=case when extract(epoch from s.completed_at-s.started_at)<greatest(1200,v_seconds*0.5)
    or (select count(*) from public.set_logs l where l.session_id=s.id and l.player_id=s.player_id
      and l.deleted_at is null)<v_sets*0.6 then 'pending' else 'counted' end;
  v_on:=(s.completed_at at time zone 'Africa/Cairo')::date;
  perform security_private.award_points(s.player_id,'workout',s.id::text,3::smallint,v_status,v_on);
  -- Late offline sets can clear a shortage, but a captain's recorded decision is final.
  if v_status='counted' then
    update public.points_log set status='counted',reviewed_at=now() where player_id=s.player_id and status='pending'
      and reviewed_at is null and (kind='workout' and source_key=s.id::text or kind='pr' and source_key like s.id::text||':%');
  end if;
  select status into v_status from public.points_log where player_id=s.player_id and kind='workout' and source_key=s.id::text;
  if v_status is null or v_status='rejected' then return; end if;
  perform security_private.award_points(s.player_id,'pr',s.id::text||':'||b.exercise_id::text,1::smallint,v_status,v_on)
    from (select l.exercise_id,max(l.weight_kg*(1+l.reps/30.0)) best from public.set_logs l
      where l.session_id=s.id and l.player_id=s.player_id and l.deleted_at is null and l.reps between 1 and 12
        and l.weight_kg>0 group by l.exercise_id) b
    join lateral (select max(l.weight_kg*(1+l.reps/30.0)) best from public.set_logs l
      where l.player_id=s.player_id and l.exercise_id=b.exercise_id and l.session_id<>s.id
        and l.deleted_at is null and l.reps between 1 and 12 and l.weight_kg>0
        and l.completed_at<s.started_at) previous on b.best>previous.best
    where not exists(select 1 from public.points_log l where l.player_id=s.player_id and l.kind='pr'
      and l.source_key=s.id::text||':'||b.exercise_id::text)
    order by b.exercise_id limit greatest(0,3-(select count(*) from public.points_log l
      where l.player_id=s.player_id and l.kind='pr' and l.source_key like s.id::text||':%'));
end $$;
create function security_private.award_workout_points() returns trigger
language plpgsql security definer set search_path = '' as $$ begin
  if tg_table_name='set_logs' then
    if exists(select 1 from public.points_log where player_id=new.player_id and kind='workout' and source_key=new.session_id::text)
      then perform security_private.award_session_points(new.session_id); end if;
  elsif new.completed_at is not null then
    if tg_op='INSERT' then perform security_private.award_session_points(new.id);
    elsif old.completed_at is null then perform security_private.award_session_points(new.id); end if;
  end if;
  return new;
end $$;
create trigger points_workout after insert or update on public.workout_sessions
  for each row execute function security_private.award_workout_points();
create trigger points_sets after insert or update on public.set_logs
  for each row execute function security_private.award_workout_points();
create function security_private.award_inbody_points() returns trigger
language plpgsql security definer set search_path = '' as $$ begin
  if date_trunc('month',new.scan_date)=date_trunc('month',now() at time zone 'Africa/Cairo') then
    perform security_private.award_points(new.player_id,'inbody',to_char(new.scan_date,'YYYY-MM'),5::smallint,'counted',new.scan_date);
  end if;
  return new;
end $$;
create trigger points_inbody after insert on public.body_scans
  for each row execute function security_private.award_inbody_points();
create function public.award_meal_check() returns void
language plpgsql security definer set search_path = '' as $$
declare v_on date:=(now() at time zone 'Africa/Cairo')::date;
begin
  perform public.require_active_caller();
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='player')
    or not public.player_can_write() then raise exception 'active player required' using errcode='42501'; end if;
  perform security_private.award_points(auth.uid(),'meal_check',v_on::text,1::smallint,'counted',v_on);
end $$;
create function public.review_points(p_id uuid,p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.points_log;
begin
  perform public.require_active_caller();
  select * into r from public.points_log where id=p_id;
  if r.kind='pr' then
    select * into r from public.points_log where player_id=r.player_id and kind='workout'
      and source_key=split_part(r.source_key,':',1);
  end if;
  if r.id is null or not public.is_captain_of(r.player_id)
    or not exists(select 1 from public.profiles where id=auth.uid() and role='captain') then
    raise exception 'linked captain required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtext(r.captain_id::text));
  select * into r from public.points_log where id=r.id for update;
  if r.status<>'pending' or p_approve is null then raise exception 'pending points required' using errcode='22023'; end if;
  update public.points_log set status=case when p_approve then 'counted' else 'rejected' end,reviewed_at=now()
    where player_id=r.player_id and status='pending' and (id=r.id or (r.kind='workout' and kind='pr' and source_key like r.source_key||':%'));
end $$;
create function public.team_leaderboard(p_month date default (date_trunc('month',now() at time zone 'Africa/Cairo'))::date)
returns table(player_id uuid,display_name text,lifetime int,tier text,monthly bigint,is_crown boolean,"position" bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_captain uuid; v_role public.user_role;
begin
  perform public.require_active_caller();
  select p.role into v_role from public.profiles p where p.id=auth.uid();
  v_captain:=case when v_role='captain' then auth.uid() else public.my_captain_id() end;
  if auth.uid() is null or p_month is null then raise exception 'authenticated caller and month required' using errcode='42501'; end if;
  return query select case when v_role='captain' or b.player_id=auth.uid() then b.player_id end,
    case when v_role='captain' then p.full_name else split_part(btrim(p.full_name),' ',1) end,
    coalesce(pp.lifetime,0),security_private.points_tier(coalesce(pp.lifetime,0)),b.monthly,b.position=1 and b.monthly>=20,b.position
    from security_private.points_board(v_captain,p_month) b join public.profiles p on p.id=b.player_id
    left join public.player_points pp on pp.player_id=b.player_id order by b.position;
end $$;
create function public.my_points() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_total int; v_monthly bigint; v_position bigint; v_top bigint;
begin
  perform public.require_active_caller();
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='player') then
    raise exception 'player required' using errcode='42501'; end if;
  select lifetime into v_total from public.player_points where player_id=auth.uid();
  select monthly,b.position into v_monthly,v_position from security_private.points_board(public.my_captain_id(),
    (now() at time zone 'Africa/Cairo')::date) b where player_id=auth.uid();
  select monthly into v_top from security_private.points_board(public.my_captain_id(),
    (now() at time zone 'Africa/Cairo')::date) b where b.position=1;
  return jsonb_build_object('lifetime',coalesce(v_total,0),'tier',security_private.points_tier(coalesce(v_total,0)),
    'monthly',coalesce(v_monthly,0),'month_position',v_position,'crown_gap',
    case when v_position=1 and v_monthly>=20 then 0 else greatest(20,coalesce(v_top,0)+1)-coalesce(v_monthly,0) end,
    'logs',coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at desc,l.id desc) from
      (select * from public.points_log where player_id=auth.uid() order by created_at desc,id desc limit 10) l),'[]'::jsonb));
end $$;
revoke all on function security_private.points_tier(int),security_private.points_board(uuid,date,public.points_log),
  security_private.guard_points(),security_private.count_points(),security_private.award_perfect_week(),security_private.award_points(uuid,text,text,smallint,text,date),
  security_private.award_session_points(uuid),security_private.award_workout_points(),security_private.award_inbody_points() from public,anon,authenticated,service_role;
revoke all on function public.award_meal_check(),public.review_points(uuid,boolean),public.team_leaderboard(date),public.my_points() from public,anon;
grant execute on function public.award_meal_check(),public.review_points(uuid,boolean),public.team_leaderboard(date),public.my_points() to authenticated;
