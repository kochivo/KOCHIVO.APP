alter table public.exercise_swap_requests
  alter column injury drop not null,
  add column reason text not null default 'injury' check (reason in ('injury','busy','discomfort')),
  add constraint exercise_swap_reason_injury check (
    (reason='injury' and injury is not null) or (reason<>'injury' and injury is null)
  );

-- Replace the signature rather than overload it, keeping old three-argument callers unambiguous.
drop function public.request_exercise_swap(uuid,uuid,text);
create function public.request_exercise_swap(
  p_program_exercise_id uuid, p_to_exercise_id uuid, p_injury text default null, p_reason text default 'injury'
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v record; v_id uuid;
begin
  perform public.require_active_caller();
  select e.exercise_id, p.player_id, p.captain_id into v
    from public.program_exercises e join public.program_days d on d.id=e.day_id
    join public.programs p on p.id=d.program_id
    where e.id=p_program_exercise_id and p.player_id=auth.uid() and p.status='active' and not p.is_template
      and exists (select 1 from public.profiles where id=auth.uid() and role='player')
      and p.captain_id=public.my_captain_id() and public.player_can_write()
    for update of e, d, p;
  if not found then raise exception 'own active program required' using errcode='42501'; end if;
  -- Busy alternatives are read-only and must never enter the approval pipeline.
  if p_reason is null or p_reason not in ('injury','discomfort')
    or (p_reason='injury' and (p_injury is null or p_injury not in ('knee','shoulder','lower_back')))
    or (p_reason='discomfort' and p_injury is not null) or p_to_exercise_id=v.exercise_id
    or not exists (select 1 from public.exercise_generator_tags a join public.exercise_generator_tags b
      on a.pattern=b.pattern where a.exercise_id=v.exercise_id and b.exercise_id=p_to_exercise_id
      and (p_reason='discomfort' or not (p_injury=any(b.stress)))) then
    raise exception 'safe same-pattern alternative required' using errcode='22023';
  end if;
  -- Keep the original lock ordering and pending-request replacement semantics.
  delete from public.exercise_swap_requests where program_exercise_id=p_program_exercise_id and status='pending';
  insert into public.exercise_swap_requests(player_id,captain_id,program_exercise_id,from_exercise_id,to_exercise_id,injury,reason)
    values (v.player_id,v.captain_id,p_program_exercise_id,v.exercise_id,p_to_exercise_id,p_injury,p_reason) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.request_exercise_swap(uuid,uuid,text,text) from public, anon;
grant execute on function public.request_exercise_swap(uuid,uuid,text,text) to authenticated;

create or replace function public.decide_exercise_swap(p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.exercise_swap_requests; v record;
begin
  perform public.require_active_caller();
  -- Match request_exercise_swap's exercise/day/program locks before locking the request.
  select e.exercise_id, p.player_id, p.captain_id, p.status, p.is_template into v
    from public.program_exercises e join public.program_days d on d.id=e.day_id
    join public.programs p on p.id=d.program_id
    where e.id=(select program_exercise_id from public.exercise_swap_requests where id=p_id)
    for update of e, d, p;
  select * into r from public.exercise_swap_requests where id=p_id for update;
  if r.id is null or r.captain_id<>auth.uid() or not public.is_captain_of(r.player_id)
    or not exists (select 1 from public.profiles where id=auth.uid() and role='captain') then
    raise exception 'linked captain required' using errcode='42501';
  end if;
  if r.status<>'pending' or p_approve is null or r.reason='busy' then
    raise exception 'already decided or invalid decision' using errcode='22023';
  end if;
  if v.player_id is distinct from r.player_id or v.captain_id is distinct from r.captain_id
    or v.status is distinct from 'active' or v.is_template is distinct from false then
    raise exception 'active ownership changed' using errcode='40001';
  end if;
  if p_approve then
    if v.exercise_id<>r.from_exercise_id or not exists (
      select 1 from public.exercise_generator_tags a join public.exercise_generator_tags b on a.pattern=b.pattern
      where a.exercise_id=r.from_exercise_id and b.exercise_id=r.to_exercise_id
        and (r.reason='discomfort' or not (r.injury=any(b.stress)))) then
      raise exception 'exercise or safety changed' using errcode='40001';
    end if;
    update public.program_exercises set exercise_id=r.to_exercise_id where id=r.program_exercise_id;
  end if;
  update public.exercise_swap_requests set status=case when p_approve then 'approved' else 'declined' end,
    decided_at=now() where id=p_id;
end;
$$;
revoke all on function public.decide_exercise_swap(uuid,boolean) from public, anon;
grant execute on function public.decide_exercise_swap(uuid,boolean) to authenticated;

create or replace function public.ko_feed()
returns table (key text, kind text, severity text, player_id uuid, player_name text, data jsonb)
language sql stable security invoker set search_path = '' as $$
  with clock as (
    select (now() at time zone 'Africa/Cairo')::date as today,
      (now() at time zone 'Africa/Cairo')::time as time,
      (select auth.uid()) as caller
    where not (select public.is_suspended())
  ), links as (
    select c.*, p.full_name, t.today, t.time, t.caller,
      exists (select 1 from public.programs r where r.player_id=c.player_id
        and r.captain_id=c.captain_id and r.status='active' and not r.is_template) as program,
      exists (select 1 from public.nutrition_plans n where n.player_id=c.player_id
        and n.captain_id=c.captain_id and n.status='active' and not n.is_template) as nutrition
    from public.coach_clients c join public.profiles p on p.id=c.player_id cross join clock t
    where (c.captain_id=t.caller or c.player_id=t.caller)
      and c.archived_at is null and not c.pending and c.frozen_at is null
  ), candidates as (
    select 'join_requested'::text as kind, 'urgent'::text as severity, r.player_id,
      p.full_name as player_name, jsonb_build_object('request_id',r.id) as data, t.today
    from public.coach_join_requests r join public.profiles p on p.id=r.player_id cross join clock t
    where r.captain_id=t.caller and r.status='pending'
    union all
    select 'swap_requested','urgent',r.player_id,p.full_name,
      jsonb_build_object('request_id',r.id,'from',jsonb_build_object('ar',a.name_ar,'en',a.name_en),
        'to',jsonb_build_object('ar',b.name_ar,'en',b.name_en),'injury',r.injury)
        || case when r.reason='injury' then '{}'::jsonb else jsonb_build_object('reason',r.reason) end,t.today
    from public.exercise_swap_requests r join public.profiles p on p.id=r.player_id
    join public.exercises a on a.id=r.from_exercise_id join public.exercises b on b.id=r.to_exercise_id cross join clock t
    where r.captain_id=t.caller and public.is_captain_of(r.player_id) and r.status='pending'
    union all
    select rules.kind, rules.severity, l.player_id, l.full_name,
      jsonb_build_object('link_id',l.id,'access_until',l.access_until,'captain_id',l.captain_id), l.today
    from links l cross join lateral (values
      ('expiring','urgent',l.captain_id=l.caller and l.access_until between l.today and l.today+3),
      ('expired','urgent',l.captain_id=l.caller and l.access_until between l.today-7 and l.today-1),
      ('sessions_used_up','urgent',l.captain_id=l.caller and l.sessions_left=0),
      ('inactive','urgent',l.captain_id=l.caller and l.access_until>=l.today and l.program
        and coalesce((select max(w.completed_at) from public.workout_sessions w
          where w.player_id=l.player_id and w.completed_at is not null),l.created_at)<=now()-interval '5 days'),
      ('no_program','generate',l.captain_id=l.caller and l.access_until>=l.today and not l.program),
      ('no_nutrition','generate',l.captain_id=l.caller and l.access_until>=l.today and not l.nutrition),
      ('my_expiring','urgent',l.player_id=l.caller and l.access_until between l.today and l.today+3),
      ('log_meal','generate',l.player_id=l.caller and l.access_until>=l.today and l.nutrition
        and not exists (select 1 from public.meal_logs m where m.player_id=l.player_id
          and m.log_date=l.today and m.completed_at is not null and m.deleted_at is null))
    ) rules(kind,severity,applies) where rules.applies
    union all
    select 'today_workout','urgent',l.player_id,l.full_name,jsonb_build_object('day_id',d.id),l.today
    from links l join public.programs p on p.player_id=l.player_id and p.captain_id=l.captain_id
      and p.status='active' and not p.is_template
    join public.program_days d on d.program_id=p.id
    where l.player_id=l.caller and l.access_until>=l.today and l.sessions_left is distinct from 0
      -- program_days.weekday starts on Saturday (0), matching lib/dates weeklyWeekday.
      and l.time>=time '18:00' and d.weekday=(extract(dow from l.today)::int+1)%7 and not d.is_rest_day
      and not exists (select 1 from public.workout_sessions w where w.player_id=l.player_id
        and w.program_day_id=d.id and w.training_date=l.today and w.completed_at is not null)
  ), keyed as (
    select c.kind||':'||c.player_id::text||':'||c.today::text||
      case when c.kind='swap_requested' then ':'||(c.data->>'request_id') else '' end as key,
      c.kind,c.severity,c.player_id,c.player_name,c.data from candidates c
  )
  select k.* from keyed k where not exists (select 1 from public.ko_dismissals d
    where d.user_id=(select auth.uid()) and d.key=k.key and d.until>now())
  order by case k.severity when 'urgent' then 0 else 1 end,
    case k.kind when 'swap_requested' then -1 when 'join_requested' then 0 when 'expired' then 1 when 'expiring' then 2
      when 'sessions_used_up' then 3 when 'today_workout' then 4 when 'my_expiring' then 5
      when 'inactive' then 6 when 'no_program' then 7 when 'no_nutrition' then 8 else 9 end, k.key
  limit 8;
$$;
revoke all on function public.ko_feed() from public, anon;
grant execute on function public.ko_feed() to authenticated;
