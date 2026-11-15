begin;
do $migration$
declare expression text;
begin
  select pg_get_constraintdef(oid) into expression from pg_constraint
    where conrelid='public.notifications'::regclass and conname='notifications_type_check';
  if expression is null then raise exception 'Missing notifications_type_check'; end if;
  alter table public.notifications drop constraint notifications_type_check;
  execute 'alter table public.notifications add constraint notifications_type_check check (' ||
    substring(expression from 7) || ' or type = ''ramadan_soon'')';
end $migration$;
create unique index notifications_ramadan_soon_year on public.notifications(user_id,(payload->>'year'))
  where type='ramadan_soon';

create function security_private.queue_ramadan_soon(p_now timestamptz default now()) returns void
language sql security definer set search_path='' as $$
  insert into public.notifications(user_id,type,payload)
    select p.id,'ramadan_soon',jsonb_build_object('year',r.year)
    from public.profiles p cross join (values
      (2027,date '2027-02-08'),(2028,date '2028-01-28'),(2029,date '2029-01-16'),(2030,date '2030-01-05')
    ) r(year,starts_on)
    where p.role='captain' and p.captain_status='approved' and p.suspended_at is null
      and (p_now at time zone public.safe_timezone(p.id))::date=r.starts_on-14
    on conflict(user_id,(payload->>'year')) where type='ramadan_soon' do nothing;
$$;
revoke all on function security_private.queue_ramadan_soon(timestamptz) from public,anon,authenticated;

alter table public.profiles
  add column ramadan_mode boolean not null default false,
  add column ramadan_training text not null default 'after_iftar_2h'
    check (ramadan_training in ('before_iftar_1h','after_iftar_2h','after_taraweeh','before_suhoor')),
  add column ramadan_intensity text not null default 'lighter_20'
    check (ramadan_intensity in ('same','lighter_20','maintenance')),
  add column ramadan_water_ml integer not null default 3000 check (ramadan_water_ml between 1000 and 6000),
  add column prayer_city text;
alter table public.meals add column ramadan_slot text check (ramadan_slot in ('iftar','post_workout','suhoor'));
grant update(ramadan_mode,ramadan_training,ramadan_intensity,ramadan_water_ml,prayer_city) on public.profiles to authenticated;

create table public.ramadan_exempt (
  captain_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(captain_id,player_id)
);
create index ramadan_exempt_player on public.ramadan_exempt(player_id);
alter table public.ramadan_exempt enable row level security;
revoke all on public.ramadan_exempt from public, anon, authenticated;
grant select,insert,update,delete on public.ramadan_exempt to authenticated;
create policy active_caller on public.ramadan_exempt as restrictive for all to authenticated
  using (public.require_active_caller()) with check (public.require_active_caller());
create policy captain_manage on public.ramadan_exempt for all to authenticated
  using (captain_id=(select auth.uid()) and public.is_captain_of(player_id))
  with check (captain_id=(select auth.uid()) and public.is_captain_of(player_id));
create policy player_read on public.ramadan_exempt for select to authenticated
  using (player_id=(select auth.uid()));

create table security_private.prayer_cities (
  code text primary key, lat double precision not null, lng double precision not null, timezone text not null
);
alter table security_private.prayer_cities enable row level security;
revoke all on security_private.prayer_cities from public,anon,authenticated;
insert into security_private.prayer_cities values
  ('cairo',30.0444,31.2357,'Africa/Cairo'),('alexandria',31.2001,29.9187,'Africa/Cairo'),
  ('giza',30.0131,31.2089,'Africa/Cairo'),('banha',30.4667,31.1833,'Africa/Cairo'),
  ('tanta',30.7865,31.0004,'Africa/Cairo'),('mansoura',31.0409,31.3785,'Africa/Cairo'),
  ('zagazig',30.5877,31.502,'Africa/Cairo'),('damanhur',31.0341,30.4682,'Africa/Cairo'),
  ('shebin-el-kom',30.5595,31.009,'Africa/Cairo'),('kafr-el-sheikh',31.1107,30.9388,'Africa/Cairo'),
  ('damietta',31.4175,31.8144,'Africa/Cairo'),('port-said',31.2653,32.3019,'Africa/Cairo'),
  ('ismailia',30.5965,32.2715,'Africa/Cairo'),('suez',29.9668,32.5498,'Africa/Cairo'),
  ('arish',31.1321,33.8033,'Africa/Cairo'),('el-tor',28.2417,33.6222,'Africa/Cairo'),
  ('hurghada',27.2579,33.8116,'Africa/Cairo'),('marsa-matruh',31.3543,27.2373,'Africa/Cairo'),
  ('faiyum',29.3084,30.8428,'Africa/Cairo'),('beni-suef',29.0661,31.0994,'Africa/Cairo'),
  ('minya',28.1099,30.7503,'Africa/Cairo'),('asyut',27.1809,31.1837,'Africa/Cairo'),
  ('sohag',26.5569,31.6948,'Africa/Cairo'),('qena',26.1551,32.716,'Africa/Cairo'),
  ('luxor',25.6872,32.6396,'Africa/Cairo'),('aswan',24.0889,32.8998,'Africa/Cairo'),
  ('kharga',25.439,30.5586,'Africa/Cairo'),('riyadh',24.7136,46.6753,'Asia/Riyadh'),
  ('jeddah',21.4858,39.1925,'Asia/Riyadh'),('dubai',25.2048,55.2708,'Asia/Dubai'),
  ('kuwait',29.3759,47.9774,'Asia/Kuwait'),('doha',25.2854,51.531,'Asia/Qatar'),
  ('amman',31.9454,35.9284,'Asia/Amman'),('london',51.5074,-0.1278,'Europe/London');
alter table public.profiles add constraint profiles_prayer_city_fkey foreign key(prayer_city) references security_private.prayer_cities(code);

create function public.save_ramadan(p_preferences jsonb,p_exempt uuid[]) returns void
language plpgsql security invoker set search_path='' as $$
begin
  perform public.require_active_caller();
  perform 1 from public.profiles where id=auth.uid() and role='captain' for update;
  if not found then raise exception 'captain required' using errcode='42501'; end if;
  if exists(select 1 from unnest(p_exempt) player where not public.is_captain_of(player)) then
    raise exception 'not your player' using errcode='42501';
  end if;
  update public.profiles set ramadan_mode=(p_preferences->>'ramadan_mode')::boolean,
    ramadan_training=p_preferences->>'ramadan_training',ramadan_intensity=p_preferences->>'ramadan_intensity',
    ramadan_water_ml=(p_preferences->>'ramadan_water_ml')::integer where id=auth.uid();
  delete from public.ramadan_exempt where captain_id=auth.uid() and not (player_id=any(p_exempt));
  insert into public.ramadan_exempt(captain_id,player_id) select auth.uid(),player from unnest(p_exempt) player
    on conflict do nothing;
end $$;
revoke all on function public.save_ramadan(jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.save_ramadan(jsonb,uuid[]) to authenticated;

do $$ declare source text;
begin
  source := pg_get_functiondef('public.save_nutrition_plan(uuid,jsonb)'::regprocedure);
  if position('insert into public.meals (id, plan_id, name, position)' in source)=0 then raise exception 'meal saver source drift'; end if;
  source := replace(source,'insert into public.meals (id, plan_id, name, position)',
    'insert into public.meals (id, plan_id, name, position, ramadan_slot)');
  source := replace(source,$old$v_meal->>'name', v_position)$old$,$new$v_meal->>'name', v_position, v_meal->>'ramadanSlot')$new$);
  source := replace(source,'position = excluded.position','position = excluded.position, ramadan_slot = excluded.ramadan_slot');
  execute source;
end $$;

create function security_private.ramadan_date(d date) returns boolean
language sql immutable set search_path='' as $$
  select d between date '2027-02-08' and date '2027-03-09'
    or d between date '2028-01-28' and date '2028-02-25'
    or d between date '2029-01-16' and date '2029-02-13'
    or d between date '2030-01-05' and date '2030-02-03';
$$;
create function security_private.ramadan_active(p_player uuid,d date) returns boolean
language sql stable security definer set search_path='' as $$
  select security_private.ramadan_date(d) and exists (
    select 1 from public.coach_clients c join public.profiles p on p.id=c.captain_id
    where c.player_id=p_player and c.archived_at is null and not c.pending
      and c.frozen_at is null and c.access_until>=public.user_today(c.captain_id)
      and (c.sessions_left is null or c.sessions_left>0) and p.ramadan_mode
      and p.suspended_at is null and not exists (select 1 from public.ramadan_exempt e
        where e.captain_id=c.captain_id and e.player_id=p_player));
$$;
create function public.my_ramadan() returns table(active boolean,training text,intensity text,water_ml integer)
language plpgsql stable security definer set search_path='' as $$
begin
  perform public.require_active_caller();
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  return query select security_private.ramadan_active(auth.uid(),public.user_today(auth.uid())),
    coalesce(p.ramadan_training,'after_iftar_2h'),coalesce(p.ramadan_intensity,'lighter_20'),coalesce(p.ramadan_water_ml,3000)
    from (select 1) seed left join public.coach_clients c on c.player_id=auth.uid() and c.archived_at is null
    left join public.profiles p on p.id=c.captain_id;
end $$;
revoke all on function public.my_ramadan() from public,anon,authenticated;
grant execute on function public.my_ramadan() to authenticated;

-- Same NOAA fractional-year approximation as src/lib/prayer-times.ts, in UTC.
create function security_private.solar_utc(d date,lat double precision,lng double precision,zenith double precision,evening boolean)
returns timestamptz language plpgsql immutable set search_path='' as $$
declare g double precision; eq double precision; dec double precision; h double precision; minutes double precision;
begin
  g := 2*pi()/365*(extract(doy from d)-1);
  eq := 229.18*(0.000075+0.001868*cos(g)-0.032077*sin(g)-0.014615*cos(2*g)-0.040849*sin(2*g));
  dec := 0.006918-0.399912*cos(g)+0.070257*sin(g)-0.006758*cos(2*g)+0.000907*sin(2*g)-0.002697*cos(3*g)+0.00148*sin(3*g);
  h := (cos(radians(zenith))/cos(radians(lat))-tan(radians(lat))*sin(dec))/cos(dec);
  if h < -1 or h > 1 then return null; end if;
  minutes := 720-4*lng-eq + (case when evening then 4 else -4 end)*degrees(acos(h));
  return (d::timestamp at time zone 'UTC')+minutes*interval '1 minute';
end $$;
create function security_private.sunset_utc(d date,lat double precision,lng double precision) returns timestamptz
language sql immutable set search_path='' as $$
  select security_private.solar_utc(d,lat,lng,90.833,true)+interval '1 minute';
$$;
create function security_private.queue_ramadan_reminders(p_now timestamptz default now()) returns void
language sql security definer set search_path='' as $$
  with players as (
    select c.player_id,p.ramadan_training,city.lat,city.lng,dates.d from public.coach_clients c
    join public.profiles p on p.id=c.captain_id
    join public.profiles u on u.id=c.player_id and u.suspended_at is null
    cross join lateral (select coalesce(u.prayer_city,(select code from security_private.prayer_cities
      where timezone=public.safe_timezone(u.id) order by case when code in ('cairo','riyadh') then 0 else 1 end,code limit 1),'cairo') code) chosen
    join security_private.prayer_cities city on city.code=chosen.code
    cross join lateral (select (p_now at time zone city.timezone)::date + n as d from generate_series(-1,1) n) dates
    where c.archived_at is null and security_private.ramadan_active(c.player_id,dates.d)
  ), times as (
    select *,case ramadan_training
      when 'before_iftar_1h' then security_private.sunset_utc(d,lat,lng)-interval '1 hour'
      when 'after_iftar_2h' then security_private.sunset_utc(d,lat,lng)+interval '2 hours'
      when 'after_taraweeh' then security_private.sunset_utc(d,lat,lng)+interval '150 minutes'
      else security_private.solar_utc(d+1,lat,lng,109.5,false)-interval '90 minutes' end as training_at
    from players
  ) insert into public.notifications(user_id,type,payload)
    select distinct on (t.player_id,t.d) t.player_id,'workout_reminder',
      jsonb_build_object('training_date',t.d,'program_id',p.id,'day_title',p.title)
    from times t join public.programs p on p.player_id=t.player_id and p.status='active' and not p.is_template
    where p_now>=t.training_at-interval '30 minutes' and p_now<t.training_at+interval '30 minutes'
      and exists(select 1 from public.program_days d where d.program_id=p.id and not d.is_rest_day
        and d.weekday=(extract(dow from t.d)::integer+1)%7)
      and not exists(select 1 from public.workout_sessions s where s.player_id=t.player_id and s.training_date=t.d)
    order by t.player_id,t.d,p.created_at desc,p.id
    on conflict(user_id,(payload->>'training_date')) where type='workout_reminder' do nothing;
$$;
revoke all on function security_private.ramadan_date(date),security_private.ramadan_active(uuid,date),
  security_private.solar_utc(date,double precision,double precision,double precision,boolean),
  security_private.sunset_utc(date,double precision,double precision),security_private.queue_ramadan_reminders(timestamptz)
  from public,anon,authenticated;

-- Preserve the existing daily schedule and its eligibility checks.
do $$ declare definition text;
begin
  definition := pg_get_functiondef('public.queue_workout_reminders(date)'::regprocedure);
  if position('where p.status' in definition)=0 then raise exception 'workout reminder source drift'; end if;
  execute replace(definition,'where p.status',
    'where not security_private.ramadan_active(p.player_id,coalesce(p_today,public.user_today(p.player_id))) and p.status');
  if exists(select 1 from pg_namespace where nspname='cron') then
    execute $cron$select cron.schedule('ramadan-reminders','0 * * * *','select security_private.queue_ramadan_reminders()')$cron$;
    execute $cron$select cron.schedule('ramadan-soon','0 6 * * *','select security_private.queue_ramadan_soon()')$cron$;
  end if;
end $$;
commit;
