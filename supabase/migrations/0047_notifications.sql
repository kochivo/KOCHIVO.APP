create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('plan_assigned', 'nutrition_updated', 'player_joined', 'player_inactive')),
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_created on public.notifications(user_id, created_at desc);
create index notifications_unread on public.notifications(user_id, created_at desc) where not is_read;
-- The unique predicate also coalesces concurrent target changes.
create unique index notifications_unread_nutrition on public.notifications(user_id, (payload ->> 'plan_id'))
  where type = 'nutrition_updated' and not is_read;
alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;
create policy active_caller on public.notifications as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_read on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function public.notify_program_assigned() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' and new.player_id is not null then
    if tg_op = 'INSERT' or old.status is distinct from new.status
      or old.player_id is distinct from new.player_id then
      insert into public.notifications(user_id, type, payload)
        values (new.player_id, 'plan_assigned', jsonb_build_object('plan_id', new.id, 'name', new.title));
    end if;
  end if;
  return new;
end;
$$;
create trigger programs_notify after insert or update on public.programs
  for each row execute function public.notify_program_assigned();

create function public.notify_nutrition_updated() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' and new.player_id is not null then
    if tg_op = 'INSERT' or old.status is distinct from new.status
      or old.player_id is distinct from new.player_id
      or row(old.target_kcal, old.target_protein, old.target_carbs, old.target_fat)
        is distinct from row(new.target_kcal, new.target_protein, new.target_carbs, new.target_fat) then
      insert into public.notifications(user_id, type, payload)
        values (new.player_id, 'nutrition_updated', jsonb_build_object('plan_id', new.id, 'name', new.title))
        on conflict (user_id, (payload ->> 'plan_id')) where type = 'nutrition_updated' and not is_read
        do update set payload = excluded.payload, created_at = excluded.created_at;
    end if;
  end if;
  return new;
end;
$$;
create trigger nutrition_notify after insert or update on public.nutrition_plans
  for each row execute function public.notify_nutrition_updated();

create function public.notify_player_joined() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(user_id, type, payload)
    select new.captain_id, 'player_joined', jsonb_build_object('player_id', new.player_id, 'name', p.full_name)
    from public.profiles p where p.id = new.player_id;
  return new;
end;
$$;
create trigger clients_notify after insert on public.coach_clients
  for each row execute function public.notify_player_joined();

create function public.refresh_inactive_alerts() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_captain uuid := auth.uid();
  v_today date;
begin
  perform public.require_active_caller();
  -- Lock one captain so two tabs cannot insert the same alert concurrently.
  select (now() at time zone p.timezone)::date into v_today
    from public.profiles p where p.id = v_captain and p.role = 'captain' for update;
  if not found then
    raise exception 'captain required' using errcode = '42501';
  end if;
  insert into public.notifications(user_id, type, payload)
    select v_captain, 'player_inactive', jsonb_build_object('player_id', c.player_id, 'name', p.full_name)
    from public.coach_clients c join public.profiles p on p.id = c.player_id
    where c.captain_id = v_captain and c.archived_at is null and c.access_until >= v_today
      and c.started_on <= v_today - 3 and p.suspended_at is null
      and not exists (select 1 from public.workout_sessions s
        where s.player_id = c.player_id and s.training_date > v_today - 3)
      and not exists (select 1 from public.notifications n
        where n.user_id = v_captain and n.type = 'player_inactive'
          and n.payload ->> 'player_id' = c.player_id::text and n.created_at > now() - interval '3 days');
end;
$$;
revoke execute on function public.notify_program_assigned(), public.notify_nutrition_updated(),
  public.notify_player_joined(), public.refresh_inactive_alerts() from public, anon, authenticated;
grant execute on function public.refresh_inactive_alerts() to authenticated;

-- Aggregate outside pagination and search, guarded by the same admin boundary as admin_captains.
create function public.admin_notification_kpis()
returns table (captains bigint, players bigint, paid_captains bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_active_caller();
  if not public.is_admin() then
    raise exception 'admin required' using errcode = '42501';
  end if;
  return query select count(*) filter (where p.role = 'captain'),
    count(*) filter (where p.role = 'player'),
    count(*) filter (where p.role = 'captain' and public.current_tier(p.id) <> 'entry')
    from public.profiles p
    -- Demo workspaces are throwaway accounts and would inflate the launch numbers.
    where p.demo_expires_at is null;
end;
$$;
revoke execute on function public.admin_notification_kpis() from public, anon;
grant execute on function public.admin_notification_kpis() to authenticated;
