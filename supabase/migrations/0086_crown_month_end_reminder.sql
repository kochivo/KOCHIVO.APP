begin;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('plan_assigned','nutrition_updated','player_joined','player_inactive','join_requested',
   'workout_reminder','workout_feedback','sessions_used_up','captain_approved',
   'subscription_expiring','subscription_expired','rank_up','crown_taken','crown_lost',
   'crown_close','crown_defend'));

create unique index notifications_crown_reminder_month on public.notifications
  (user_id,type,(payload ->> 'month')) where type in ('crown_close','crown_defend');

create function public.queue_crown_reminders(
  p_today date default (now() at time zone 'Africa/Cairo')::date)
returns void language plpgsql security definer set search_path = '' as $$
declare v_month date := date_trunc('month',p_today)::date; v_captain uuid;
begin
  if p_today is null or p_today <> (v_month + interval '1 month - 3 days')::date then return; end if;
  for v_captain in
    select c.captain_id from public.coach_clients c
    join public.profiles captain on captain.id=c.captain_id and captain.role='captain'
      and captain.captain_status='approved' and captain.suspended_at is null
      and captain.demo_expires_at is null
    join public.profiles player on player.id=c.player_id and player.role='player' and player.suspended_at is null
    where c.archived_at is null and not c.pending and c.frozen_at is null
      and c.access_until>=p_today and (c.sessions_left is null or c.sessions_left>0)
    group by c.captain_id having count(*)>=2
  loop
    with board as materialized (
      select * from security_private.points_board(v_captain,v_month)
    )
    insert into public.notifications(id,user_id,type,payload)
    select security_private.starter_uuidv7(), b.player_id,
      case when b.position=1 and b.done>=4 and b.adherence>0 then 'crown_defend' else 'crown_close' end,
      jsonb_build_object('captain_id',v_captain,'month',v_month)
        || case when b.position=1 and b.done>=4 and b.adherence>0 then '{}'::jsonb else jsonb_build_object(
          'needs_workouts',greatest(0,4-b.done),
          'gap',case when b.position=1 then 0 else (select monthly from board where position=1)+1-b.monthly end) end
    from board b
    join public.coach_clients c on c.captain_id=v_captain and c.player_id=b.player_id
    join public.profiles p on p.id=b.player_id and p.suspended_at is null and p.role='player'
    where c.archived_at is null and not c.pending and c.frozen_at is null
      and c.access_until>=p_today and (c.sessions_left is null or c.sessions_left>0)
      and (b.position=1 and b.done>=4 and b.adherence>0
        or b.position between 1 and 3 and greatest(0,4-b.done)<=3)
    on conflict (user_id,type,(payload ->> 'month'))
      where type in ('crown_close','crown_defend') do nothing;
  end loop;
end $$;
revoke all on function public.queue_crown_reminders(date) from public,anon,authenticated,service_role;

do $$ begin
  if exists(select 1 from pg_namespace where nspname='cron') then
    -- Cairo 07:00 is 05:00 UTC in winter and 04:00 UTC during daylight saving.
    -- Both UTC slots are scheduled; only the matching Cairo hour queues notices.
    execute $cron$select cron.schedule('crown-month-end-reminders','0 4,5 * * *',
      'select public.queue_crown_reminders() where extract(hour from now() at time zone ''Africa/Cairo'')=7')$cron$;
  end if;
end $$;

commit;
