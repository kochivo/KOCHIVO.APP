-- T-183. Additive: no stored rows are changed and existing ACLs are retained.
begin;

create or replace function public.safe_timezone(p_user uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare zone text;
begin
  select p.timezone into zone from public.profiles p where p.id=p_user;
  zone := coalesce(zone,'Africa/Cairo');
  -- Validate using the cast itself rather than enumerating every timezone per row.
  perform pg_catalog.timezone(zone,now());
  return zone;
exception when invalid_parameter_value then return 'Africa/Cairo';
end;
$$;
create or replace function public.user_today(p_user uuid) returns date
language plpgsql stable security definer set search_path = '' as $$
declare today date;
begin
  -- Replan the clock read: a replaced SQL now() must not remain inlined in a
  -- cached helper plan. Parameters keep timezone data out of executable SQL.
  execute 'select (pg_catalog.now() at time zone $1)::date'
    into today using public.safe_timezone(p_user);
  return today;
end;
$$;
revoke all on function public.safe_timezone(uuid), public.user_today(uuid) from public, anon;
grant execute on function public.safe_timezone(uuid), public.user_today(uuid) to authenticated, service_role;

-- Same-zone boards retain their training-day membership. Cross-zone boards use
-- the ledger's captain date, so completions and points always share a month.
-- Date-only scan/meal eligibility stays player-local; new cross-zone awards use
-- the captain's current day. Stored ledger dates are never rewritten.
-- Cairo-player inactivity preserves 0065's captain-day threshold and Cairo
-- access gate, as required by the unchanged compatibility tests. Other players
-- use their own inactivity day and their captain's access day.
-- Expiry reminders retain their public Cairo-date argument as an anchor; the
-- per-captain day offset translates it without changing Cairo callers.
-- Re-emit catalog definitions, including the weekly-copy extensions from 0050.
-- Guard every fragment so unexpected schema drift aborts the entire transaction.
-- CREATE OR REPLACE retains OIDs, signatures, return types, security modes and grants.
do $migration$
declare patch record; definition text; object_id oid;
begin
  -- pg_get_functiondef normalizes argument defaults separately from the body.
  for patch in select * from (values
    ('public.captain_dropout_radar', 'p_today', 'NULL::date'),
    ('public.queue_workout_reminders', 'p_today', 'NULL::date'),
    ('public.queue_crown_reminders', 'p_today', 'NULL::date'),
    ('public.team_leaderboard', 'p_month',
      $default$date_trunc('month',public.user_today(coalesce(public.my_captain_id(),auth.uid())))::date$default$)
  ) as defaults(name, argument, expression)
  loop
    select p.oid into strict object_id from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      where n.nspname||'.'||p.proname=patch.name;
    definition := pg_catalog.pg_get_functiondef(object_id);
    if definition !~ (patch.argument||' date DEFAULT ') then raise exception 'timezone default drift: %',patch.name; end if;
    execute regexp_replace(definition,patch.argument||' date DEFAULT [^\n]+',
      patch.argument||' date DEFAULT '||patch.expression||')');
  end loop;
  for patch in select * from (values
    ('public.player_can_read', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(captain_id)$new$),
    ('public.player_can_read_from', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(captain_id)$new$),
    ('public.player_can_write', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(captain_id)$new$),
    ('public.renew_player', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(auth.uid())$new$),
    ('public.activate_player', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(auth.uid())$new$),
    ('public.create_player_invite', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(auth.uid())$new$),
    ('public.resolve_coach_join_request', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(r.captain_id)$new$),
    ('security_private.attach_pending_player', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(new.captain_id)$new$),
    ('security_private.notify_workout_feedback', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(c.captain_id)$new$),
    ('security_private.award_points', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(c.captain_id)$new$),
    ('public.award_meal_check', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(auth.uid())$new$),
    ('public.activate_program', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(v_player)$new$),
    ('public.save_weekly_program', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today((p_draft ->> 'player_id')::uuid)$new$),
    ('public.assign_program_template', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(p_player)$new$),
    ('public.create_demo_workspace', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(captain)$new$),
    ('public.create_demo_player_workspace', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(player)$new$),
    ('security_private.demo_history', $old$stamp at time zone 'Africa/Cairo'$old$, $new$stamp at time zone public.safe_timezone(p_player)$new$),
    ('security_private.demo_meal_logs', $old$stamp at time zone 'Africa/Cairo'$old$, $new$stamp at time zone public.safe_timezone(p_player)$new$),
    ('security_private.deduct_pt_session', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(captain_id)$new$),
    ('security_private.deduct_pt_session', $old$billing_started_at at time zone 'Africa/Cairo'$old$, $new$billing_started_at at time zone public.safe_timezone(new.player_id)$new$),
    ('public.captain_since', $old$c.started_on::timestamp at time zone 'Africa/Cairo'$old$, $new$c.started_on::timestamp at time zone public.safe_timezone(c.captain_id)$new$),
    ('public.refresh_inactive_alerts', $old$(now() at time zone p.timezone)::date$old$, $new$public.user_today(v_captain)$new$),
    ('public.refresh_inactive_alerts', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(case when public.safe_timezone(c.player_id)='Africa/Cairo' then null else c.captain_id end)$new$),
    ('public.refresh_inactive_alerts', $old$c.started_on <= v_today - 3$old$, $new$c.started_on <= (case when public.safe_timezone(c.player_id)='Africa/Cairo' then v_today else public.user_today(c.player_id) end) - 3$new$),
    ('public.refresh_inactive_alerts', $old$s.training_date > v_today - 3$old$, $new$s.training_date > (case when public.safe_timezone(c.player_id)='Africa/Cairo' then v_today else public.user_today(c.player_id) end) - 3$new$),
    ('public.captain_dropout_radar', $old$c.started_on,$old$, $new$c.started_on, coalesce(p_today,public.user_today(c.player_id)) as today,$new$),
    ('public.captain_dropout_radar', $old$p_today -$old$, $new$today -$new$),
    ('public.send_custom_form_request', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(c.captain_id)$new$),
    ('public.remind_custom_form_request', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(c.captain_id)$new$),
    ('public.queue_form_reminders', $old$(p_now at time zone 'Africa/Cairo')::date$old$, $new$(p_now at time zone public.safe_timezone(c.captain_id))::date$new$),
    ('security_private.award_session_points', $old$s.completed_at at time zone 'Africa/Cairo'$old$, $new$s.completed_at at time zone public.safe_timezone((select captain_id from public.coach_clients where player_id=s.player_id and archived_at is null))$new$),
    ('security_private.award_inbody_points', $old$now() at time zone 'Africa/Cairo'$old$, $new$public.user_today(new.player_id)$new$),
    ('public.my_points', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(public.my_captain_id())$new$),
    ('ko_private.workout_reminder', $old$v_today date := (now() at time zone 'Africa/Cairo')::date;$old$, $new$v_today date;$new$),
    ('ko_private.workout_reminder', $old$begin
  if v_action$old$, $new$begin
  v_today := public.user_today(p_player);
  if v_action$new$),
    ('ko_private.workout_reminder', $old$c.access_until >= v_today$old$, $new$c.access_until >= public.user_today(c.captain_id)$new$),
    ('public.queue_workout_reminders', $old$c.access_until >= p_today$old$, $new$c.access_until >= public.user_today(c.captain_id)$new$),
    ('public.queue_expiry_reminders', $old$p_today then$old$, $new$(p_today+(public.user_today(c.captain_id)-public.user_today(null))) then$new$),
    ('public.queue_expiry_reminders', $old$c.access_until-p_today$old$, $new$c.access_until-(p_today+(public.user_today(c.captain_id)-public.user_today(null)))$new$),
    ('public.queue_expiry_reminders', $old$(p_today,p_today+3)$old$, $new$(p_today+(public.user_today(c.captain_id)-public.user_today(null)),p_today+(public.user_today(c.captain_id)-public.user_today(null))+3)$new$),
    ('public.ko_feed', $old$(now() at time zone 'Africa/Cairo')::date$old$, $new$public.user_today(auth.uid())$new$),
    ('public.ko_feed', $old$now() at time zone 'Africa/Cairo'$old$, $new$now() at time zone public.safe_timezone(auth.uid())$new$),
    ('public.ko_feed', $old$p.full_name, t.today, t.time, t.caller,$old$, $new$p.full_name, public.user_today(c.captain_id) as today,
      public.user_today(c.player_id) as player_today,
      (now() at time zone public.safe_timezone(c.player_id))::time as time, t.caller,$new$),
    ('public.ko_feed', $old$m.log_date=l.today$old$, $new$m.log_date=l.player_today$new$),
    ('public.ko_feed', $old$from l.today$old$, $new$from l.player_today$new$),
    ('public.ko_feed', $old$w.training_date=l.today$old$, $new$w.training_date=l.player_today$new$),
    ('public.ko_feed', $old$'day_id',d.id),l.today$old$, $new$'day_id',d.id),l.player_today$new$),
    ('public.ko_feed', $old$'captain_id',l.captain_id), l.today$old$, $new$'captain_id',l.captain_id), case when rules.kind='log_meal' then l.player_today else l.today end$new$),
    ('public.queue_workout_reminders', $old$'training_date', p_today$old$, $new$'training_date', coalesce(p_today,public.user_today(p.player_id))$new$),
    ('public.queue_workout_reminders', $old$from p_today$old$, $new$from coalesce(p_today,public.user_today(p.player_id))$new$),
    ('public.queue_workout_reminders', $old$s.training_date = p_today$old$, $new$s.training_date = coalesce(p_today,public.user_today(p.player_id))$new$),
    ('public.queue_form_schedules', $old$d date := (p_now at time zone 'Africa/Cairo')::date;
  h integer := extract(hour from p_now at time zone 'Africa/Cairo'); period_start date;$old$, $new$d date; h integer; period_start date;$new$),
    ('public.queue_form_schedules', $old$    if h < (f.schedule->>'hour')::integer then continue; end if;
    if f.schedule->>'every'='week' then
      if extract(dow from d) <> coalesce((f.schedule->>'weekday')::integer,0) then continue; end if;
      period_start := date_trunc('week',d)::date;
    else
      if extract(day from d) <> least(coalesce((f.schedule->>'day')::integer,1),
        extract(day from date_trunc('month',d)+interval '1 month - 1 day')::integer) then continue; end if;
      period_start := date_trunc('month',d)::date;
    end if;
    for c in select links.player_id from public.coach_clients links
      join public.profiles p on p.id=links.player_id and p.role='player' and p.suspended_at is null
      where links.captain_id=f.captain_id and links.archived_at is null and not links.pending
        and links.frozen_at is null and links.access_until>=d
        and (links.sessions_left is null or links.sessions_left>0)
    loop
$old$, $new$    for c in select links.player_id from public.coach_clients links
      join public.profiles p on p.id=links.player_id and p.role='player' and p.suspended_at is null
      where links.captain_id=f.captain_id and links.archived_at is null and not links.pending
        and links.frozen_at is null
        and links.access_until >= (p_now at time zone public.safe_timezone(links.captain_id))::date
        and (links.sessions_left is null or links.sessions_left>0)
    loop
      d := (p_now at time zone public.safe_timezone(c.player_id))::date;
      h := extract(hour from p_now at time zone public.safe_timezone(c.player_id));
      if h < (f.schedule->>'hour')::integer then continue; end if;
      if f.schedule->>'every'='week' then
        if extract(dow from d) <> coalesce((f.schedule->>'weekday')::integer,0) then continue; end if;
        period_start := date_trunc('week',d)::date;
      else
        if extract(day from d) <> least(coalesce((f.schedule->>'day')::integer,1),
          extract(day from date_trunc('month',d)+interval '1 month - 1 day')::integer) then continue; end if;
        period_start := date_trunc('month',d)::date;
      end if;
$new$),
    ('public.queue_form_schedules', $old$r.sent_at at time zone 'Africa/Cairo'$old$, $new$r.sent_at at time zone public.safe_timezone(c.player_id)$new$),
    ('public.queue_crown_reminders', $old$if p_today is null or p_today <> (v_month + interval '1 month - 3 days')::date then return; end if;$old$, $new$-- Each captain owns a board calendar; explicit dates remain deterministic overrides.$new$),
    ('public.queue_crown_reminders', $old$c.access_until>=p_today$old$, $new$c.access_until>=coalesce(p_today,public.user_today(c.captain_id))$new$),
    ('public.queue_crown_reminders', $old$  loop
    with board$old$, $new$  loop
    v_month := date_trunc('month',coalesce(p_today,public.user_today(v_captain)))::date;
    if coalesce(p_today,public.user_today(v_captain)) <> (v_month + interval '1 month - 3 days')::date
      then continue; end if;
    with board$new$),
    ('security_private.freeze_crown_winners', $old$date_trunc('month', now() at time zone 'Africa/Cairo')::date$old$, $new$coalesce((select max(date_trunc('month',public.user_today(id))::date)
      from public.profiles where role='captain'),date_trunc('month',public.user_today(null))::date)$new$),
    ('security_private.freeze_crown_winners', $old$where p.role = 'captain' and b.position$old$, $new$where p.role = 'captain' and p_month < date_trunc('month',public.user_today(p.id))::date
      and b.position$new$),
    ('security_private.attach_coach_player', $old$coach_clients(id,captain_id,player_id,access_until)$old$, $new$coach_clients(id,captain_id,player_id,access_until,started_on)$new$),
    ('security_private.attach_coach_player', $old$values (p_id,p_captain,p_player,p_until)$old$, $new$values (p_id,p_captain,p_player,p_until,public.user_today(p_captain))$new$)
    ,
    ('security_private.deduct_pt_session', $old$new.training_date between (billing_started_at at time zone public.safe_timezone(new.player_id))::date and access_until$old$, $new$new.training_date >= (billing_started_at at time zone public.safe_timezone(new.player_id))::date
    and new.training_date <= (((access_until+1)::timestamp at time zone public.safe_timezone(captain_id)
      - interval '1 microsecond') at time zone public.safe_timezone(new.player_id))::date$new$),
    ('security_private.points_board', $old$count(distinct s.training_date)$old$, $new$count(distinct (case when public.safe_timezone(s.player_id)=public.safe_timezone(p_captain) then s.training_date else l.earned_on end))$new$),
    ('security_private.points_board', $old$s.training_date>=date_trunc('month',p_month)::date$old$, $new$(case when public.safe_timezone(s.player_id)=public.safe_timezone(p_captain) then s.training_date else l.earned_on end)>=date_trunc('month',p_month)::date$new$),
    ('security_private.points_board', $old$s.training_date<(date_trunc('month',p_month)+interval '1 month')::date$old$, $new$(case when public.safe_timezone(s.player_id)=public.safe_timezone(p_captain) then s.training_date else l.earned_on end)<(date_trunc('month',p_month)+interval '1 month')::date$new$),
    ('security_private.award_inbody_points', $old$to_char(new.scan_date,'YYYY-MM')$old$, $new$to_char(public.user_today((select captain_id from public.coach_clients where player_id=new.player_id and archived_at is null)),'YYYY-MM')$new$),
    ('security_private.award_points', $old$p_status,p_on from public.coach_clients c$old$, $new$p_status,case when p_kind in ('inbody','meal_check')
      and public.safe_timezone(p_player)<>public.safe_timezone(c.captain_id)
      then public.user_today(c.captain_id) else p_on end from public.coach_clients c$new$)
    ,
    ('security_private.attach_pending_player', $old$coach_clients(id,captain_id,player_id,access_until,pending)$old$, $new$coach_clients(id,captain_id,player_id,access_until,pending,started_on)$new$),
    ('security_private.attach_pending_player', $old$values (new.id,new.captain_id,new.player_id,public.user_today(new.captain_id),true)$old$, $new$values (new.id,new.captain_id,new.player_id,public.user_today(new.captain_id),true,public.user_today(new.captain_id))$new$),
    ('public.create_demo_workspace', $old$set demo_expires_at = now() + interval '24 hours' where id = player;$old$, $new$set timezone=public.safe_timezone(captain), demo_expires_at = now() + interval '24 hours' where id = player;$new$),
    ('public.create_demo_player_workspace', $old$update public.profiles set role='captain',role_confirmed=true,captain_status='approved',$old$, $new$update public.profiles set timezone=public.safe_timezone(player),role='captain',role_confirmed=true,captain_status='approved',$new$)
  ) as patches(name, old_sql, new_sql)
  loop
    select p.oid into strict object_id from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      where n.nspname||'.'||p.proname=patch.name;
    definition := pg_catalog.pg_get_functiondef(object_id);
    if position(patch.old_sql in definition)=0 then
      raise exception 'timezone source drift: % / %', patch.name, patch.old_sql;
    end if;
    execute replace(definition,patch.old_sql,patch.new_sql);
  end loop;
end $migration$;

alter table public.coach_clients alter column started_on set default public.user_today(auth.uid());
alter policy workout_sessions_captain_select on public.workout_sessions using (
  training_date >= (public.captain_since(player_id) at time zone public.safe_timezone(player_id))::date);

-- Sets inherit the training date, including offline sets uploaded after a move.
alter policy set_logs_captain_select on public.set_logs using (
  exists (select 1 from public.workout_sessions s where s.id = session_id
    and s.player_id = set_logs.player_id
    and s.training_date >= (public.captain_since(set_logs.player_id) at time zone public.safe_timezone(set_logs.player_id))::date));

alter policy meal_logs_captain_select on public.meal_logs using (
  log_date >= (public.captain_since(player_id) at time zone public.safe_timezone(player_id))::date);
alter policy supplement_logs_read on public.supplement_logs using (
  player_id = (select auth.uid())
  or log_date >= (public.captain_since(player_id) at time zone public.safe_timezone(player_id))::date);
alter policy daily_checks_read on public.daily_checks using (
  player_id = (select auth.uid())
  or log_date >= (public.captain_since(player_id) at time zone public.safe_timezone(player_id))::date);
alter policy body_scans_coach on public.body_scans using (
  scan_date >= (public.captain_since(player_id) at time zone public.safe_timezone(player_id))::date);
alter policy readiness_decisions_read on public.readiness_decisions using (
  player_id = (select auth.uid())
  or (captain_id = (select auth.uid())
    and decision_date >= (public.captain_since(player_id) at time zone public.safe_timezone(player_id))::date));

-- A player joining mid-week still owes that week's check-in, so compare the week's last day.
alter policy check_ins_captain_select on public.check_ins using (
  captain_id = (select auth.uid())
  and week_start + 6 >= (public.captain_since(player_id) at time zone public.safe_timezone(player_id))::date);
alter policy form_checks_captain_select on public.form_checks using (
  captain_id = (select auth.uid()) and created_at >= public.captain_since(player_id));

-- A known object path must not bypass the corresponding log's RLS boundary.
alter policy body_scans_read on storage.objects using (
  bucket_id = 'body-scans' and (public.storage_owner(name) = (select auth.uid())
    or exists (select 1 from public.body_scans s where s.file_path = name
      and s.player_id = public.storage_owner(name)
      and s.scan_date >= (public.captain_since(s.player_id) at time zone public.safe_timezone(s.player_id))::date)));
alter policy private_media_read on storage.objects using (
  bucket_id in ('checkin-photos', 'form-videos')
  and (public.storage_owner(name) = (select auth.uid())
    or (bucket_id = 'checkin-photos' and exists (
      select 1 from public.check_ins c where name = any(c.photo_paths)
        and c.player_id = public.storage_owner(name)
        and c.week_start + 6 >= (public.captain_since(c.player_id) at time zone public.safe_timezone(c.player_id))::date))
    or (bucket_id = 'form-videos' and exists (
      select 1 from public.form_checks f where f.video_path = name
        and f.player_id = public.storage_owner(name)
        and f.created_at >= public.captain_since(f.player_id)))));

alter policy captain_prizes on public.crown_prizes
  using (captain_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'captain')
    and month >= date_trunc('month', public.user_today(captain_id))::date
    and month <= (date_trunc('month', public.user_today(captain_id)) + interval '1 month')::date)
  with check (captain_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'captain')
    and month >= date_trunc('month', public.user_today(captain_id))::date
    and month <= (date_trunc('month', public.user_today(captain_id)) + interval '1 month')::date);

alter policy form_requests_send on public.form_requests with check (
  captain_id = (select auth.uid()) and exists (select 1 from public.forms f
    where f.id = form_id and f.captain_id = (select auth.uid()) and f.archived_at is null)
  and exists (select 1 from public.coach_clients c where c.captain_id = (select auth.uid())
    and c.player_id = form_requests.player_id and c.archived_at is null and not c.pending and c.frozen_at is null
    and c.access_until >= public.user_today(c.captain_id)));

-- Workout/expiry retain their daily schedules. Each run uses each owner's date
-- and the existing unique notification keys make retries safe per day/expiry.
-- Keep both existing crown reminder slots without a Cairo-only hour filter.
-- Both slots use per-captain days; the unique month key makes retries harmless.
-- Winner freezing still dispatches hourly at each captain's month boundary.
do $jobs$
begin
  if exists(select 1 from pg_catalog.pg_namespace where nspname='cron') then
    execute $cron$select cron.schedule('crown-month-end-reminders','0 4,5 * * *',
      'select public.queue_crown_reminders()')$cron$;
    execute $cron$select cron.schedule('freeze-crown-winners','10 * * * *',
      $job$select security_private.freeze_crown_winners(m.month)
        from (select distinct (date_trunc('month',public.user_today(p.id))-interval '1 month')::date as month
          from public.profiles p where p.role='captain'
            and extract(day from public.user_today(p.id))=1
            and extract(hour from now() at time zone public.safe_timezone(p.id))=0) m$job$)$cron$;
  end if;
end $jobs$;

commit;
