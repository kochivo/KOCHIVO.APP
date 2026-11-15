begin;
create table public.pain_reports (
  id uuid primary key,
  player_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.workout_sessions(id) on delete set null,
  exercise_id uuid references public.exercises(id),
  program_exercise_id uuid references public.program_exercises(id) on delete set null,
  set_index smallint check(set_index>0),
  area text not null check(area in ('neck','shoulder_l','shoulder_r','elbow_l','elbow_r','wrist_l','wrist_r',
    'upper_back','lower_back','chest','hip_l','hip_r','knee_l','knee_r','ankle_l','ankle_r','other')),
  side_view text not null check(side_view in ('front','back')),
  severity smallint not null check(severity between 1 and 5),
  kind text not null check(kind in ('sharp','strain','tired')),
  status text not null default 'open' check(status in ('open','answered')),
  reply text check(reply in ('swap_2w','reduce_20','rest_week','talk')),
  answered_at timestamptz, created_at timestamptz not null default now(),
  swap_original_id uuid references public.exercises(id), swap_to_id uuid references public.exercises(id), swap_until date,
  check((status='open' and reply is null and answered_at is null) or
    (status='answered' and reply is not null and answered_at is not null))
);
create index pain_reports_player_area on public.pain_reports(player_id,area,created_at);
create index pain_reports_captain_open on public.pain_reports(captain_id,created_at) where status='open';
create index pain_reports_session on public.pain_reports(session_id);
create index pain_reports_exercise on public.pain_reports(program_exercise_id);
create index pain_reports_swap_expiry on public.pain_reports(player_id,swap_until) where swap_until is not null;
alter table public.pain_reports enable row level security;
revoke all on public.pain_reports from public,anon,authenticated;
grant select,insert on public.pain_reports to authenticated;
create policy pain_read on public.pain_reports for select to authenticated using
  (player_id=(select auth.uid()) or (captain_id=(select auth.uid()) and public.is_captain_of(player_id)));
create policy pain_insert on public.pain_reports for insert to authenticated with check
  (player_id=(select auth.uid()) and captain_id=public.my_captain_id() and public.player_can_write()
    and status='open' and reply is null and answered_at is null and swap_until is null and swap_original_id is null and swap_to_id is null
    and (session_id is null or exists(select 1 from public.workout_sessions s where s.id=session_id and s.player_id=(select auth.uid())))
    and (program_exercise_id is null or exists(select 1 from public.program_exercises e
      join public.program_days d on d.id=e.day_id join public.programs p on p.id=d.program_id
      where e.id=program_exercise_id and p.player_id=(select auth.uid()) and p.captain_id=pain_reports.captain_id and p.status='active' and not p.is_template)));
create policy active_caller on public.pain_reports as restrictive for all to authenticated
  using(not (select public.is_suspended())) with check(not (select public.is_suspended()));

create table public.pain_load_hints (
  player_id uuid not null references public.profiles(id) on delete cascade,
  program_exercise_id uuid not null references public.program_exercises(id) on delete cascade,
  factor numeric not null check(factor in (0,0.8)), until date not null, since timestamptz not null default now(),
  primary key(player_id,program_exercise_id)
);
create index pain_load_hints_exercise on public.pain_load_hints(program_exercise_id);
alter table public.pain_load_hints enable row level security;
revoke all on public.pain_load_hints from public,anon,authenticated;
grant select on public.pain_load_hints to authenticated;
create policy pain_hint_read on public.pain_load_hints for select to authenticated
  using(player_id=(select auth.uid()) or public.is_captain_of(player_id));
create policy active_caller on public.pain_load_hints as restrictive for all to authenticated
  using(not (select public.is_suspended())) with check(not (select public.is_suspended()));

do $$ declare expression text; begin
  select pg_get_constraintdef(oid) into expression from pg_constraint
    where conrelid='public.notifications'::regclass and conname='notifications_type_check';
  if expression is null then raise exception 'Missing notifications_type_check'; end if;
  alter table public.notifications drop constraint notifications_type_check;
  execute 'alter table public.notifications add constraint notifications_type_check check (' ||
    substring(expression from 7) || ' or type in (''player_pain'',''pain_answered''))';
end $$;

create function public.pain_repeat_count(p_player uuid,p_area text) returns int
language sql stable security invoker set search_path='' as $$
  select count(*)::int from public.pain_reports where player_id=p_player and area=p_area
    and created_at>=now()-interval '30 days';
$$;
revoke all on function public.pain_repeat_count(uuid,text) from public,anon;
grant execute on function public.pain_repeat_count(uuid,text) to authenticated;

create function security_private.notify_pain() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  insert into public.notifications(user_id,type,payload) values(new.captain_id,'player_pain',
    jsonb_build_object('report_id',new.id,'player_id',new.player_id,'area',new.area,
      'display_name',(select full_name from public.profiles where id=new.player_id)));
  return new;
end $$;
revoke all on function security_private.notify_pain() from public,anon,authenticated;
create trigger notify_pain after insert on public.pain_reports for each row execute function security_private.notify_pain();

create function public.sync_pain_reports(p_rows jsonb) returns void
language plpgsql security invoker set search_path='' as $$ begin
  perform public.require_active_caller();
  insert into public.pain_reports(id,captain_id,session_id,exercise_id,program_exercise_id,set_index,area,side_view,severity,kind,created_at)
    select r.id,r.captain_id,r.session_id,r.exercise_id,r.program_exercise_id,r.set_index,r.area,r.side_view,r.severity,r.kind,
    least(r.created_at,now()) from jsonb_to_recordset(p_rows) as r(id uuid,captain_id uuid,session_id uuid,exercise_id uuid,
        program_exercise_id uuid,set_index smallint,area text,side_view text,severity smallint,kind text,created_at timestamptz)
    on conflict(id) do nothing;
end $$;
revoke all on function public.sync_pain_reports(jsonb) from public,anon;
grant execute on function public.sync_pain_reports(jsonb) to authenticated;

create function security_private.pain_blocked_parts(p_area text) returns text[]
language sql immutable set search_path='' as $$
  select case
    when p_area='other' then array['upper legs','lower legs','legs','waist','upper arms','lower arms','chest','back','shoulders','neck']
    when p_area like 'hip_%' or p_area like 'knee_%' or p_area like 'ankle_%' then array['upper legs','lower legs','legs','waist']
    when p_area='lower_back' then array['upper legs','lower legs','legs','waist','back']
    when p_area='chest' then array['chest','shoulders','upper arms']
    when p_area='upper_back' then array['upper arms','lower arms','chest','back','shoulders','waist']
    when p_area='neck' then array['upper arms','lower arms','chest','back','shoulders','neck']
    else array['upper arms','lower arms','chest','back','shoulders'] end;
$$;
revoke all on function security_private.pain_blocked_parts(text) from public,anon,authenticated;

create function public.answer_pain(p_report uuid,p_reply text) returns void
language plpgsql security definer set search_path='' as $$
declare r public.pain_reports; v record; v_swap uuid; v_injury text; v_to uuid;
begin
  perform public.require_active_caller();
  select * into r from public.pain_reports where id=p_report for update;
  if r.id is null or r.captain_id<>auth.uid() or not public.is_captain_of(r.player_id) then
    raise exception 'Captain required' using errcode='42501'; end if;
  if r.status<>'open' or p_reply is null or p_reply not in ('swap_2w','reduce_20','rest_week','talk') then
    raise exception 'Invalid reply' using errcode='22023'; end if;
  if p_reply<>'talk' then
    select e.*,x.body_part into v from public.program_exercises e join public.program_days d on d.id=e.day_id
      join public.programs p on p.id=d.program_id join public.exercises x on x.id=e.exercise_id
      where e.id=r.program_exercise_id and p.player_id=r.player_id and p.captain_id=r.captain_id
        and p.status='active' and not p.is_template for update of e;
    if not found then raise exception 'Active exercise required' using errcode='22023'; end if;
    if p_reply='swap_2w' then
      v_injury:=case when r.area like 'knee_%' then 'knee' when r.area like 'shoulder_%' then 'shoulder'
        when r.area='lower_back' then 'lower_back' end;
      select b.exercise_id into v_to from unnest(v.alternatives) with ordinality alt(id,n)
        join public.exercise_generator_tags b on b.exercise_id=alt.id
        join public.exercise_generator_tags a on a.exercise_id=v.exercise_id and a.pattern=b.pattern
        join public.exercises x on x.id=alt.id
        where alt.id<>v.exercise_id and alt.id<>coalesce(r.exercise_id,v.exercise_id) and (v_injury is null or not(v_injury=any(b.stress)))
          and lower(x.body_part)=any(array['upper legs','lower legs','legs','waist','upper arms','lower arms','chest','back','shoulders','neck'])
          and not(lower(x.body_part)=any(security_private.pain_blocked_parts(r.area)))
          and not exists(select 1 from public.pain_reports prior where prior.player_id=r.player_id
            and prior.program_exercise_id=r.program_exercise_id and prior.session_id is not distinct from r.session_id
            and prior.created_at>=now()-interval '30 days' and (prior.exercise_id=alt.id or
              lower(x.body_part)=any(security_private.pain_blocked_parts(prior.area)) or
              case when prior.area like 'knee_%' then 'knee' when prior.area like 'shoulder_%' then 'shoulder'
                when prior.area='lower_back' then 'lower_back' end=any(b.stress))) order by alt.n limit 1;
      if v_to is null then raise exception 'No safe alternative' using errcode='22023'; end if;
      delete from public.exercise_swap_requests where program_exercise_id=v.id and status='pending';
      insert into public.exercise_swap_requests(player_id,captain_id,program_exercise_id,from_exercise_id,to_exercise_id,injury,reason)
        values(r.player_id,r.captain_id,v.id,v.exercise_id,v_to,v_injury,case when v_injury is null then 'discomfort' else 'injury' end)
        returning id into v_swap;
      perform public.decide_exercise_swap(v_swap,true);
      update public.pain_reports set swap_original_id=coalesce((select old.swap_original_id from public.pain_reports old
        where old.program_exercise_id=v.id and old.player_id=r.player_id and old.swap_to_id=v.exercise_id
          and old.swap_until>=(now() at time zone 'Africa/Cairo')::date order by old.answered_at desc limit 1),v.exercise_id),swap_to_id=v_to,
        swap_until=(now() at time zone 'Africa/Cairo')::date+13 where id=r.id;
    else
      insert into public.pain_load_hints(player_id,program_exercise_id,factor,until)
        select r.player_id,e.id,case when p_reply='reduce_20' then 0.8 else 0 end,
          (now() at time zone 'Africa/Cairo')::date+case when p_reply='reduce_20' then 13 else 6 end
        from public.program_exercises e join public.program_days d on d.id=e.day_id
        join public.programs p on p.id=d.program_id join public.exercises x on x.id=e.exercise_id
        where p.player_id=r.player_id and p.captain_id=r.captain_id and p.status='active' and not p.is_template
          and ((p_reply='reduce_20' and e.id=v.id) or (p_reply='rest_week' and
            case when r.area='other' then lower(x.body_part)=lower(v.body_part)
              else lower(x.body_part)=any(security_private.pain_blocked_parts(r.area)) end))
        on conflict(player_id,program_exercise_id) do update set factor=excluded.factor,until=excluded.until,
          since=case when pain_load_hints.factor=excluded.factor and pain_load_hints.until>=(now() at time zone 'Africa/Cairo')::date
            then pain_load_hints.since else excluded.since end;
    end if;
  end if;
  update public.pain_reports set reply=p_reply,status='answered',answered_at=now() where id=r.id;
  insert into public.notifications(user_id,type,payload) values(r.player_id,'pain_answered',
    jsonb_build_object('report_id',r.id,'reply',p_reply));
end $$;
revoke all on function public.answer_pain(uuid,text) from public,anon;
grant execute on function public.answer_pain(uuid,text) to authenticated;

create function public.expire_pain_swaps() returns void
language plpgsql security definer set search_path='' as $$
declare r record;
begin
  perform public.require_active_caller();
  for r in select * from public.pain_reports where swap_until<(now() at time zone 'Africa/Cairo')::date
    and (player_id=auth.uid() or (captain_id=auth.uid() and public.is_captain_of(player_id)))
    order by created_at desc for update loop
    -- A later coach edit takes precedence over restoring an expired temporary swap.
    update public.program_exercises e set exercise_id=r.swap_original_id
      from public.program_days d,public.programs p
      where e.id=r.program_exercise_id and e.exercise_id=r.swap_to_id and d.id=e.day_id and p.id=d.program_id
        and p.player_id=r.player_id and p.captain_id=r.captain_id and not p.is_template;
    update public.pain_reports set swap_until=null where id=r.id;
  end loop;
end $$;
revoke all on function public.expire_pain_swaps() from public,anon;
grant execute on function public.expire_pain_swaps() to authenticated;
commit;
