alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('plan_assigned','nutrition_updated','player_joined','player_inactive','join_requested',
   'workout_reminder','workout_feedback','sessions_used_up','captain_approved',
   'subscription_expiring','subscription_expired'));

-- Include the recipient because every link generates a captain and a player notice.
create unique index notifications_subscription_expiry on public.notifications
  (user_id, type, (payload ->> 'link_id'), (payload ->> 'access_until'))
  where type in ('subscription_expiring','subscription_expired');

create function public.queue_expiry_reminders(
  p_today date default (now() at time zone 'Africa/Cairo')::date)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications(id,user_id,type,payload)
  select security_private.starter_uuidv7(), recipient.user_id,
    case when c.access_until=p_today then 'subscription_expired' else 'subscription_expiring' end,
    jsonb_build_object('link_id',c.id,'access_until',c.access_until,'days_left',c.access_until-p_today)
      || recipient.details
  from public.coach_clients c
  join public.profiles captain on captain.id=c.captain_id and captain.role='captain'
    and captain.captain_status='approved' and captain.suspended_at is null and captain.demo_expires_at is null
  join public.profiles player on player.id=c.player_id and player.role='player' and player.suspended_at is null
  cross join lateral (values
    (c.captain_id, jsonb_build_object('player_id',c.player_id,'name',player.full_name)),
    (c.player_id, jsonb_build_object('captain_name',captain.full_name))
  ) as recipient(user_id,details)
  where c.archived_at is null and not c.pending and c.frozen_at is null
    and (c.sessions_left is null or c.sessions_left > 0)
    and c.access_until in (p_today,p_today+3)
  on conflict (user_id,type,(payload ->> 'link_id'),(payload ->> 'access_until'))
    where type in ('subscription_expiring','subscription_expired') do nothing;
$$;
revoke all on function public.queue_expiry_reminders(date) from public,anon,authenticated;
grant execute on function public.queue_expiry_reminders(date) to service_role,postgres;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    execute $cron$select cron.schedule('expiry-reminders', '5 6 * * *',
      'select public.queue_expiry_reminders()')$cron$;
  end if;
end $$;
