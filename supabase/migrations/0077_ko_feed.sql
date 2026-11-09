create table public.ko_dismissals (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  key text not null check (length(key) between 1 and 160),
  until timestamptz not null,
  primary key (user_id, key)
);
alter table public.ko_dismissals enable row level security;
revoke all on public.ko_dismissals from public, anon, authenticated;
grant select, insert, update on public.ko_dismissals to authenticated;
create policy owner_only on public.ko_dismissals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy active_caller on public.ko_dismissals as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));

create function public.ko_feed()
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
    select c.kind||':'||c.player_id::text||':'||c.today::text as key,
      c.kind,c.severity,c.player_id,c.player_name,c.data from candidates c
  )
  select k.* from keyed k where not exists (select 1 from public.ko_dismissals d
    where d.user_id=(select auth.uid()) and d.key=k.key and d.until>now())
  order by case k.severity when 'urgent' then 0 else 1 end,
    case k.kind when 'join_requested' then 0 when 'expired' then 1 when 'expiring' then 2
      when 'sessions_used_up' then 3 when 'today_workout' then 4 when 'my_expiring' then 5
      when 'inactive' then 6 when 'no_program' then 7 when 'no_nutrition' then 8 else 9 end, k.key
  limit 8;
$$;
revoke all on function public.ko_feed() from public, anon;
grant execute on function public.ko_feed() to authenticated;
