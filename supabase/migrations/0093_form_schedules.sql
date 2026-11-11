begin;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('plan_assigned','nutrition_updated','player_joined','player_inactive','join_requested',
   'workout_reminder','workout_feedback','sessions_used_up','captain_approved',
   'subscription_expiring','subscription_expired','rank_up','crown_taken','crown_lost',
   'crown_close','crown_defend','form_requested'));

-- Owner-only workers use the existing hosted pg_cron mechanism. The deployment
-- flag is mirrored in app.captain_workspace_enabled before enabling these jobs.
create function public.queue_form_schedules(p_now timestamptz default now())
returns void language plpgsql security definer set search_path = '' as $$
declare f public.forms; c record; d date := (p_now at time zone 'Africa/Cairo')::date;
  h integer := extract(hour from p_now at time zone 'Africa/Cairo'); period_start date;
begin
  if p_now is null then return; end if;
  for f in select forms.* from public.forms forms
    join public.profiles p on p.id=forms.captain_id and p.role='captain'
      and p.captain_status='approved' and p.suspended_at is null
    where forms.archived_at is null and forms.schedule is not null
    order by forms.id for update of forms
  loop
    if h < (f.schedule->>'hour')::integer then continue; end if;
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
      if not exists(select 1 from public.form_requests r where r.form_id=f.id and r.player_id=c.player_id
        and (r.answered_at is null or (r.sent_at at time zone 'Africa/Cairo')::date>=period_start)) then
        insert into public.form_requests(id,form_id,captain_id,player_id,sent_at)
          values (security_private.starter_uuidv7(),f.id,f.captain_id,c.player_id,p_now)
          on conflict (form_id,player_id,sent_at) do nothing;
      end if;
    end loop;
  end loop;
end $$;
revoke all on function public.queue_form_schedules(timestamptz) from public,anon,authenticated,service_role;

-- Manual sends take the same form lock as the scheduler. Existing pending work
-- wins even when another device supplies a different request ID.
create function public.send_custom_form_request(p_id uuid,p_form uuid,p_player uuid,p_due timestamptz default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare existing uuid; caller uuid := (select auth.uid());
begin
  perform 1 from public.forms f where f.id=p_form and f.captain_id=caller and f.archived_at is null for update;
  if not found then raise exception 'form is not accessible' using errcode='42501'; end if;
  if not exists(select 1 from public.coach_clients c join public.profiles p on p.id=c.player_id and p.suspended_at is null
    where c.captain_id=caller and c.player_id=p_player and c.archived_at is null and not c.pending
      and c.frozen_at is null and c.access_until >= (now() at time zone 'Africa/Cairo')::date
      and (c.sessions_left is null or c.sessions_left>0)) then
    raise exception 'player is not active' using errcode='42501';
  end if;
  select id into existing from public.form_requests where id=p_id and captain_id=caller and form_id=p_form and player_id=p_player;
  if existing is not null then return existing; end if;
  select id into existing from public.form_requests where form_id=p_form and player_id=p_player and captain_id=caller
    and answered_at is null order by sent_at,id limit 1;
  if existing is not null then return existing; end if;
  insert into public.form_requests(id,form_id,player_id,captain_id,due_at) values (p_id,p_form,p_player,caller,p_due);
  return p_id;
end $$;
revoke all on function public.send_custom_form_request(uuid,uuid,uuid,timestamptz) from public,anon;
grant execute on function public.send_custom_form_request(uuid,uuid,uuid,timestamptz) to authenticated;

-- One notice per request. Row locking serializes the manual and scheduled paths.
create function public.remind_custom_form_request(p_request uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare r public.form_requests; title text;
begin
  select * into r from public.form_requests where id=p_request for update;
  if r.id is null or r.captain_id is distinct from (select auth.uid())
    or (select public.is_suspended()) then
    raise exception 'request is not accessible' using errcode='42501';
  end if;
  if r.answered_at is not null or r.reminded_at is not null then return false; end if;
  if not exists(select 1 from public.coach_clients c
    join public.profiles captain on captain.id=c.captain_id and captain.role='captain'
      and captain.captain_status='approved' and captain.suspended_at is null
    join public.profiles player on player.id=c.player_id and player.role='player' and player.suspended_at is null
    where c.captain_id=r.captain_id and c.player_id=r.player_id and c.archived_at is null and not c.pending
      and c.frozen_at is null and c.access_until >= (now() at time zone 'Africa/Cairo')::date
      and (c.sessions_left is null or c.sessions_left>0)) then return false; end if;
  select f.title into title from public.forms f where f.id=r.form_id and f.archived_at is null;
  if title is null then return false; end if;
  update public.form_requests set reminded_at=now() where id=r.id;
  insert into public.notifications(id,user_id,type,payload)
    values (security_private.starter_uuidv7(),r.player_id,'form_requested',
      jsonb_build_object('name',title,'request_id',r.id,'form_id',r.form_id));
  return true;
end $$;
revoke all on function public.remind_custom_form_request(uuid) from public,anon;
grant execute on function public.remind_custom_form_request(uuid) to authenticated;

create function public.queue_form_reminders(p_now timestamptz default now())
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select requests.id,requests.player_id,requests.form_id,forms.title from public.form_requests requests
    join public.forms forms on forms.id=requests.form_id and forms.archived_at is null
    join public.coach_clients c on c.captain_id=requests.captain_id and c.player_id=requests.player_id
      and c.archived_at is null and not c.pending and c.frozen_at is null
      and c.access_until >= (p_now at time zone 'Africa/Cairo')::date
      and (c.sessions_left is null or c.sessions_left>0)
    join public.profiles captain on captain.id=c.captain_id and captain.captain_status='approved' and captain.suspended_at is null
    join public.profiles player on player.id=c.player_id and player.suspended_at is null
    where requests.answered_at is null and requests.reminded_at is null and forms.remind_after_hours is not null
      and requests.sent_at + make_interval(hours=>forms.remind_after_hours) <= p_now
    order by requests.id for update of requests
  loop
    update public.form_requests set reminded_at=p_now where id=r.id;
    insert into public.notifications(id,user_id,type,payload)
      values (security_private.starter_uuidv7(),r.player_id,'form_requested',
        jsonb_build_object('name',r.title,'request_id',r.id,'form_id',r.form_id));
  end loop;
end $$;
revoke all on function public.queue_form_reminders(timestamptz) from public,anon,authenticated,service_role;

do $$ begin
  if exists(select 1 from pg_namespace where nspname='cron') then
    execute $cron$select cron.schedule('form-schedules','*/15 * * * *',
      'select public.queue_form_schedules() where current_setting(''app.captain_workspace_enabled'',true)=''1''')$cron$;
    execute $cron$select cron.schedule('form-reminders','7,22,37,52 * * * *',
      'select public.queue_form_reminders() where current_setting(''app.captain_workspace_enabled'',true)=''1''')$cron$;
  end if;
end $$;
commit;
