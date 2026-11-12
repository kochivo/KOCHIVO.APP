begin;

create table public.assessment_schedules (
  id uuid primary key,
  form_id uuid not null,
  captain_id uuid not null references public.profiles(id),
  player_id uuid references public.profiles(id),
  kind text not null check (kind in ('once','week','month','days','on_join')),
  every_days integer,
  weekday integer,
  day integer,
  hour integer not null check (hour between 0 and 23),
  minute integer not null default 0 check (minute between 0 and 59),
  starts_on date not null,
  ends_on date check (ends_on >= starts_on),
  max_times integer check (max_times > 0),
  remind_after_hours integer check (remind_after_hours in (12,24)),
  paused_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (form_id,captain_id) references public.forms(id,captain_id),
  check ((kind='days' and every_days is not null and every_days between 2 and 60)
    or (kind<>'days' and every_days is null)),
  check ((kind='week' and weekday is not null and weekday between 0 and 6)
    or (kind<>'week' and weekday is null)),
  check ((kind='month' and day is not null and day between 1 and 31)
    or (kind<>'month' and day is null))
);
create index assessment_schedules_captain on public.assessment_schedules(captain_id);
create index assessment_schedules_player on public.assessment_schedules(player_id);
create index assessment_schedules_form on public.assessment_schedules(form_id,captain_id);
create trigger assessment_schedules_touch before update on public.assessment_schedules
  for each row execute function public.touch_updated_at();
alter table public.assessment_schedules enable row level security;
revoke all on public.assessment_schedules from public,anon,service_role;
grant select,insert,update,delete on public.assessment_schedules to authenticated;
create policy active_caller on public.assessment_schedules as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy assessment_schedule_owner on public.assessment_schedules for all to authenticated
  using (captain_id=(select auth.uid())) with check (
    captain_id=(select auth.uid())
    and exists(select 1 from public.profiles p where p.id=captain_id and p.role='captain'
      and p.captain_status='approved' and p.suspended_at is null)
    and exists(select 1 from public.forms f where f.id=form_id and f.captain_id=assessment_schedules.captain_id and f.archived_at is null)
    and (player_id is null or exists(select 1 from public.coach_clients c
      where c.captain_id=assessment_schedules.captain_id and c.player_id=assessment_schedules.player_id
        and c.archived_at is null and not c.pending)));
create policy assessment_schedule_player on public.assessment_schedules for select to authenticated
  using ((player_id=(select auth.uid()) or player_id is null) and exists (
    select 1 from public.coach_clients c where c.player_id=(select auth.uid())
      and c.captain_id=assessment_schedules.captain_id and c.archived_at is null and not c.pending));

-- Private receipts preserve request provenance without changing legacy tables.
create table security_private.assessment_deliveries (
  schedule_id uuid references public.assessment_schedules(id) on delete set null,
  player_id uuid not null references public.profiles(id),
  period date not null,
  request_id uuid primary key references public.form_requests(id),
  remind_after_hours integer,
  unique (schedule_id,player_id,period)
);
create index assessment_deliveries_request on security_private.assessment_deliveries(request_id);
create index assessment_deliveries_player on security_private.assessment_deliveries(player_id);
alter table security_private.assessment_deliveries enable row level security;
revoke all on security_private.assessment_deliveries from public,anon,authenticated,service_role;

-- The projection exposes only the caller's counts, never another captain's ledger.
create function public.assessment_schedule_counts()
returns table(schedule_id uuid,player_id uuid,sends integer)
language sql stable security definer set search_path = '' as $$
  select l.schedule_id,l.player_id,count(*)::integer
  from security_private.assessment_deliveries l
  join public.assessment_schedules s on s.id=l.schedule_id
  where s.captain_id=(select auth.uid()) and not (select public.is_suspended())
  group by l.schedule_id,l.player_id
$$;
revoke all on function public.assessment_schedule_counts() from public,anon,service_role;
grant execute on function public.assessment_schedule_counts() to authenticated;

-- Legacy reminders remain intact; only ledger-backed deliveries use their snapshot.
create function security_private.guard_assessment_reminder_time()
returns trigger language plpgsql security definer set search_path = '' as $$
declare delay integer; stopped boolean;
begin
  if old.reminded_at is null and new.reminded_at is not null and (select auth.uid()) is null then
    select l.remind_after_hours,(s.id is null or s.paused_at is not null) into delay,stopped
      from security_private.assessment_deliveries l left join public.assessment_schedules s on s.id=l.schedule_id
      where l.request_id=old.id;
    if found and (stopped or delay is null or new.reminded_at < old.sent_at + make_interval(hours=>delay)) then return old; end if;
  end if;
  return new;
end $$;
revoke all on function security_private.guard_assessment_reminder_time() from public,anon,authenticated,service_role;
create trigger assessment_reminder_time before update of reminded_at on public.form_requests
  for each row execute function security_private.guard_assessment_reminder_time();

create function security_private.guard_assessment_reminder_notice()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.type='form_requested' and not coalesce((new.payload->>'assessment_initial')::boolean,false)
    and (select auth.uid()) is null and exists (
      select 1 from security_private.assessment_deliveries l join public.form_requests r on r.id=l.request_id
      where l.request_id::text=new.payload->>'request_id' and r.reminded_at is null) then return null; end if;
  return new;
end $$;
revoke all on function security_private.guard_assessment_reminder_notice() from public,anon,authenticated,service_role;
create trigger assessment_reminder_notice before insert on public.notifications
  for each row execute function security_private.guard_assessment_reminder_notice();

create function public.queue_assessment_schedules(p_now timestamptz default now())
returns void language plpgsql security definer set search_path = '' as $$
declare s public.assessment_schedules; c record; d date; due date; wall timestamp;
  req uuid; total integer;
begin
  if p_now is null then return; end if;
  for s in select schedules.* from public.assessment_schedules schedules
    join public.forms f on f.id=schedules.form_id and f.archived_at is null
    join public.profiles p on p.id=schedules.captain_id and p.role='captain'
      and p.captain_status='approved' and p.suspended_at is null
    where schedules.paused_at is null order by schedules.form_id,schedules.id
    for update of schedules
  loop
    -- Serialize with the existing manual sender and legacy worker.
    perform 1 from public.forms where id=s.form_id for update;
    for c in select links.player_id,links.started_on,coalesce(p.timezone,'Africa/Cairo') as zone
      from public.coach_clients links join public.profiles p on p.id=links.player_id
        and p.role='player' and p.suspended_at is null
      where links.captain_id=s.captain_id and (s.player_id is null or links.player_id=s.player_id)
        and links.archived_at is null and not links.pending and links.frozen_at is null
        and links.access_until >= (p_now at time zone coalesce(p.timezone,'Africa/Cairo'))::date
        and (links.sessions_left is null or links.sessions_left>0)
    loop
      wall := p_now at time zone c.zone; d := wall::date; due := d;
      if d<s.starts_on or (s.ends_on is not null and d>s.ends_on) then continue; end if;
      if s.kind='once' then due := s.starts_on;
      elsif s.kind='on_join' then
        if c.started_on<s.starts_on then continue; end if;
        due := c.started_on;
      elsif s.kind='week' then
        if extract(dow from d)<>s.weekday then continue; end if;
      elsif s.kind='month' then
        if extract(day from d)<>least(s.day,extract(day from date_trunc('month',d)+interval '1 month - 1 day')::int) then continue; end if;
      elsif (d-s.starts_on)%s.every_days<>0 then continue;
      end if;
      if wall < due + make_time(s.hour,s.minute,0) then continue; end if;
      if exists(select 1 from security_private.assessment_deliveries l
        where l.schedule_id=s.id and l.player_id=c.player_id and l.period=due) then continue; end if;
      select count(*) into total from security_private.assessment_deliveries l
        where l.schedule_id=s.id and l.player_id=c.player_id;
      if s.max_times is not null and total>=s.max_times then continue; end if;
      if exists(select 1 from public.form_requests r where r.form_id=s.form_id and r.player_id=c.player_id
        and (r.answered_at is null or (r.sent_at at time zone c.zone)::date=due)) then continue; end if;
      req := security_private.starter_uuidv7();
      insert into public.form_requests(id,form_id,captain_id,player_id,sent_at)
        values(req,s.form_id,s.captain_id,c.player_id,p_now);
      insert into security_private.assessment_deliveries(schedule_id,player_id,period,request_id,remind_after_hours)
        values(s.id,c.player_id,due,req,s.remind_after_hours);
      insert into public.notifications(id,user_id,type,payload) values (
        security_private.starter_uuidv7(),c.player_id,'form_requested',
        jsonb_build_object('name',(select title from public.forms where id=s.form_id),'request_id',req,'form_id',s.form_id,'assessment_initial',true));
    end loop;
  end loop;
end $$;
revoke all on function public.queue_assessment_schedules(timestamptz) from public,anon,authenticated,service_role;

create function public.queue_assessment_reminders(p_now timestamptz default now())
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select requests.id,requests.player_id,requests.form_id,f.title
    from public.form_requests requests
    join security_private.assessment_deliveries l on l.request_id=requests.id
    join public.assessment_schedules s on s.id=l.schedule_id and s.paused_at is null
    join public.forms f on f.id=requests.form_id and f.archived_at is null
    join public.profiles p on p.id=requests.player_id and p.suspended_at is null
    join public.profiles captain on captain.id=requests.captain_id and captain.suspended_at is null and captain.captain_status='approved'
    join public.coach_clients c on c.player_id=requests.player_id and c.captain_id=requests.captain_id
      and c.archived_at is null and not c.pending and c.frozen_at is null
      and c.access_until >= (p_now at time zone coalesce(p.timezone,'Africa/Cairo'))::date
      and (c.sessions_left is null or c.sessions_left>0)
    where requests.answered_at is null and requests.reminded_at is null
      and requests.sent_at + make_interval(hours=>l.remind_after_hours)<=p_now
    order by requests.id for update of requests
  loop
    update public.form_requests set reminded_at=p_now where id=r.id;
    insert into public.notifications(id,user_id,type,payload) values (
      security_private.starter_uuidv7(),r.player_id,'form_requested',
      jsonb_build_object('name',r.title,'request_id',r.id,'form_id',r.form_id));
  end loop;
end $$;
revoke all on function public.queue_assessment_reminders(timestamptz) from public,anon,authenticated,service_role;

do $$ begin
  if exists(select 1 from pg_namespace where nspname='cron') then
    execute $cron$select cron.schedule('assessment-schedules','* * * * *',
      'select public.queue_assessment_schedules() where current_setting(''app.captain_workspace_enabled'',true)=''1''')$cron$;
    execute $cron$select cron.schedule('assessment-reminders','7,22,37,52 * * * *',
      'select public.queue_assessment_reminders() where current_setting(''app.captain_workspace_enabled'',true)=''1''')$cron$;
  end if;
end $$;
commit;
