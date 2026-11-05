do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end $$;

create table public.push_subscriptions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) <= 1000 and endpoint ~ '^https://[^/[:space:]]+'),
  p256dh text not null check (length(p256dh) > 0),
  auth text not null check (length(auth) > 0),
  user_agent text check (length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);
create index push_subscriptions_user on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public, anon, authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;
grant select, update, delete on public.push_subscriptions to service_role;
grant select on public.notifications to service_role;
create policy active_caller on public.push_subscriptions as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy push_owner_select on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_owner_insert on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy push_owner_delete on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

create function security_private.cap_push_subscriptions() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Serialize inserts across devices, including the first subscription.
  perform 1 from public.profiles where id = new.user_id for update;
  if (select count(*) from public.push_subscriptions where user_id = new.user_id) >= 10 then
    raise exception 'subscription limit reached' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function security_private.cap_push_subscriptions() from public, anon, authenticated;
create trigger push_subscription_cap before insert on public.push_subscriptions
  for each row execute function security_private.cap_push_subscriptions();

create function security_private.push_config() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_config jsonb;
begin
  if to_regclass('vault.decrypted_secrets') is null then return null; end if;
  execute 'select jsonb_object_agg(name, decrypted_secret) from vault.decrypted_secrets
    where name in (''push_function_url'', ''push_hook_secret'', ''vapid_public_key'',
      ''vapid_private_key'', ''vapid_subject'')' into v_config;
  return v_config;
end;
$$;
revoke all on function security_private.push_config() from public, anon, authenticated;
create function public.push_config() returns jsonb
language sql stable security definer set search_path = '' as $$
  select security_private.push_config();
$$;
revoke all on function public.push_config() from public, anon, authenticated;
grant execute on function public.push_config() to service_role;

create function security_private.send_notification_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_config jsonb; v_key text;
begin
  if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then return new; end if;
  v_config := security_private.push_config();
  foreach v_key in array array['push_function_url','push_hook_secret','vapid_public_key','vapid_private_key','vapid_subject'] loop
    if nullif(v_config ->> v_key, '') is null then return new; end if;
  end loop;
  execute 'select net.http_post(url := $1, body := $2, headers := $3)'
    using v_config ->> 'push_function_url', jsonb_build_object('notification_id', new.id),
      jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_config ->> 'push_hook_secret');
  return new;
exception when others then
  -- Push delivery must never roll back an in-app notification, including Vault/network failures.
  return new;
end;
$$;
revoke all on function security_private.send_notification_push() from public, anon, authenticated;
create trigger notifications_push after insert on public.notifications
  for each row execute function security_private.send_notification_push();

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('plan_assigned','nutrition_updated','player_joined','player_inactive','join_requested','workout_reminder'));
-- Store the injected calendar date, so reads and cron retries cannot duplicate a reminder.
create unique index notifications_workout_reminder_day on public.notifications(user_id, (payload ->> 'training_date'))
  where type = 'workout_reminder';

create function public.queue_workout_reminders(p_today date default (now() at time zone 'Africa/Cairo')::date)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications(user_id, type, payload)
    select distinct on (p.player_id) p.player_id, 'workout_reminder',
      jsonb_build_object('day_title', d.title, 'program_id', p.id, 'training_date', p_today)
    from public.programs p
    join public.profiles u on u.id = p.player_id and u.role = 'player' and u.suspended_at is null
    join public.program_days d on d.program_id = p.id
    where p.status = 'active' and not p.is_template and not d.is_rest_day
      and d.weekday = (extract(dow from p_today)::integer + 1) % 7
      and not exists (select 1 from public.workout_sessions s
        where s.player_id = p.player_id and s.training_date = p_today)
    order by p.player_id, p.created_at desc, p.id
    on conflict (user_id, (payload ->> 'training_date')) where type = 'workout_reminder' do nothing;
$$;
revoke all on function public.queue_workout_reminders(date) from public, anon, authenticated;
grant execute on function public.queue_workout_reminders(date) to service_role, postgres;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    execute $cron$select cron.schedule('workout-reminders', '0 6 * * *',
      'select public.queue_workout_reminders()')$cron$;
  end if;
end $$;
