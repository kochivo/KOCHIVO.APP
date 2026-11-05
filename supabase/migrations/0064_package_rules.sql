-- T-087: independent of reserved migration 0063.
alter table public.coach_clients add column billing_started_at timestamptz;
update public.coach_clients set billing_started_at=created_at;
alter table public.coach_clients alter column billing_started_at set default now(),
  alter column billing_started_at set not null;

alter policy programs_captain on public.programs
  using (captain_id = (select auth.uid()) and exists (select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'captain' and p.role_confirmed))
  with check (captain_id = (select auth.uid()) and exists (select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'captain' and p.role_confirmed)
    and (player_id is null or public.is_captain_of(player_id)));

alter policy nutrition_plans_captain on public.nutrition_plans
  using (captain_id = (select auth.uid()) and exists (select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'captain' and p.role_confirmed))
  with check (captain_id = (select auth.uid()) and exists (select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'captain' and p.role_confirmed)
    and (player_id is null or public.is_captain_of(player_id)));

create or replace function public.player_can_read()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.coach_clients where player_id=(select auth.uid())
    and archived_at is null and not pending and frozen_at is null and (now() at time zone 'Africa/Cairo')::date <= access_until + 3);
$$;

create or replace function public.player_can_read_from(p_captain uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.coach_clients where player_id=(select auth.uid()) and captain_id=p_captain
    and archived_at is null and not pending and frozen_at is null and (now() at time zone 'Africa/Cairo')::date <= access_until + 3);
$$;

create or replace function public.player_can_write()
returns boolean language plpgsql stable security definer set search_path = '' as $$ begin
  perform public.require_active_caller();
  return exists (select 1 from public.coach_clients where player_id=(select auth.uid())
    and archived_at is null and not pending and frozen_at is null and (now() at time zone 'Africa/Cairo')::date <= access_until);
end; $$;

create or replace function public.activate_player(p_link uuid, p_package uuid, p_kind text, p_quantity int,
  p_price_egp int, p_paid_egp int, p_free_trial boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.coach_clients; pkg public.captain_packages;
  d int; today date := (now() at time zone 'Africa/Cairo')::date;
begin
  perform public.require_active_caller();
  select * into c from public.coach_clients where id=p_link and captain_id=auth.uid() and archived_at is null for update;
  if not found or not exists (select 1 from public.profiles where id=auth.uid() and role='captain') then
    raise exception 'own captain link required' using errcode='42501';
  end if;
  if not c.pending then raise exception 'already activated; renew instead' using errcode='22023'; end if;
  if p_package is not null then
    select * into pkg from public.captain_packages where id=p_package and captain_id=auth.uid() and archived_at is null;
    if not found then raise exception 'package not found' using errcode='P0002'; end if;
    p_kind := pkg.kind; p_quantity := case when pkg.kind='sessions' then pkg.sessions else pkg.days end;
  end if;
  d := case when p_kind='days' then p_quantity else coalesce(pkg.days,60) end;
  if p_kind is null or p_kind not in ('days','sessions') or p_quantity is null or p_quantity < 1
    or p_quantity > (case when p_kind='sessions' then 200 else 365 end)
    or p_price_egp is null or p_price_egp not between 0 and 100000
    or p_paid_egp is null or p_paid_egp not between 0 and p_price_egp or p_free_trial is null then
    raise exception 'invalid activation' using errcode='22023';
  end if;
  if p_free_trial then p_price_egp := 0; p_paid_egp := 0; end if;
  update public.coach_clients set billing_started_at=now(), access_until=today+d, pending=false, frozen_at=null,
    sessions_left=case when p_kind='sessions' then p_quantity end where id=c.id;
  update public.coach_join_requests set status='accepted' where captain_id=c.captain_id and player_id=c.player_id and status='pending';
  -- Trials retain an auditable zero-value record, excluded naturally from revenue and dues.
  insert into public.player_payments(captain_id,player_id,days,period_start,period_end,price_egp,amount_egp,package_id,notes)
    values (auth.uid(),c.player_id,d,today,today+d,p_price_egp,p_paid_egp,p_package,
      case when p_free_trial then 'free_trial' end);
end; $$;

create or replace function public.renew_player(p_player uuid, p_days int default null, p_amount int default null,
  p_price int default null, p_package uuid default null)
returns date language plpgsql security definer set search_path = '' as $$
declare c public.coach_clients; pkg public.captain_packages; v_start date; v_end date;
  today date := (now() at time zone 'Africa/Cairo')::date;
begin
  perform public.require_active_caller();
  if not exists (select 1 from public.profiles where id=auth.uid() and role='captain') then
    raise exception 'active captain required' using errcode='42501';
  end if;
  select * into c from public.coach_clients where captain_id=auth.uid() and player_id=p_player and archived_at is null for update;
  if not found then raise exception 'active captain relationship required' using errcode='42501'; end if;
  if c.frozen_at is not null then raise exception 'unfreeze first' using errcode='22023'; end if;
  if c.pending then raise exception 'activate first' using errcode='22023'; end if;
  if p_package is not null then
    select * into pkg from public.captain_packages where id=p_package and captain_id=auth.uid() and archived_at is null;
    if not found then raise exception 'package not found' using errcode='P0002'; end if;
    p_days := pkg.days; p_price := coalesce(p_price,pkg.price_egp);
  end if;
  if p_days is null or p_days not between 1 and 365 or (p_amount is not null and p_amount not between 0 and 100000)
    or (p_price is not null and p_price not between 0 and 100000) or (p_price is not null and coalesce(p_amount,0)>p_price) then
    raise exception 'invalid days or amount' using errcode='22023';
  end if;
  v_start := greatest(c.access_until+1,today); v_end := v_start+p_days-1;
  if pkg.kind='sessions' then v_start := today; v_end := greatest(c.access_until,today+p_days); end if;
  update public.coach_clients set access_until=v_end,
    sessions_left=case when pkg.kind='sessions' then coalesce(sessions_left,0)+pkg.sessions else null end where id=c.id;
  insert into public.player_payments(captain_id,player_id,amount_egp,days,period_start,period_end,price_egp,package_id)
    values (auth.uid(),p_player,p_amount,p_days,v_start,v_end,p_price,p_package);
  return v_end;
end; $$;

create or replace function security_private.deduct_pt_session() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.coach_clients;
begin
  if new.completed_at is null then return new; end if;
  if tg_op='UPDATE' then if old.completed_at is not null then return new; end if; end if;
  select * into c from public.coach_clients where player_id=new.player_id and archived_at is null
    and not pending and frozen_at is null and access_until >= (now() at time zone 'Africa/Cairo')::date
    and coalesce(new.started_at,new.completed_at) >= billing_started_at
    and new.training_date between (billing_started_at at time zone 'Africa/Cairo')::date and access_until
    and sessions_left > 0 for update;
  if not found then return new; end if;
  insert into public.session_deductions(session_id,link_id) values (new.id,c.id) on conflict do nothing;
  if not found then return new; end if;
  update public.coach_clients set sessions_left=sessions_left-1 where id=c.id;
  if c.sessions_left=1 then
    insert into public.notifications(user_id,type,payload) values (c.captain_id,'sessions_used_up',
      jsonb_build_object('player_id',new.player_id,'session_id',new.id));
  end if;
  return new;
end; $$;

create or replace function public.coach_public_profile(slug text)
returns table (id uuid, full_name text, bio text, location text, avatar_path text, social jsonb)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.bio, p.location, p.avatar_path, p.social
    from public.profiles p where p.public_slug = slug and p.role = 'captain'
      and p.captain_status = 'approved' and p.role_confirmed and p.suspended_at is null and p.demo_expires_at is null
      and not exists (select 1 from public.admins a where a.user_id = p.id);
$$;

create or replace function security_private.validate_join_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = new.player_id and p.role = 'player'
    and p.suspended_at is null and p.demo_expires_at is null and not security_private.is_anonymous_user(p.id))
    or not exists (select 1 from public.profiles p where p.id = new.captain_id and p.role = 'captain'
      and p.captain_status = 'approved' and p.role_confirmed and p.public_slug is not null and p.suspended_at is null and p.demo_expires_at is null) then
    raise exception 'invalid join request' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.queue_workout_reminders(p_today date default (now() at time zone 'Africa/Cairo')::date)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications(user_id, type, payload)
    select distinct on (p.player_id) p.player_id, 'workout_reminder',
      jsonb_build_object('day_title', d.title, 'program_id', p.id, 'training_date', p_today)
    from public.programs p
    join public.profiles u on u.id = p.player_id and u.role = 'player' and u.suspended_at is null
    join public.program_days d on d.program_id = p.id
    where p.status = 'active' and not p.is_template and not d.is_rest_day
      and exists (select 1 from public.coach_clients c
        where c.player_id=p.player_id and c.captain_id=p.captain_id
          and c.archived_at is null and not c.pending and c.frozen_at is null and c.access_until >= p_today)
      and d.weekday = (extract(dow from p_today)::integer + 1) % 7
      and not exists (select 1 from public.workout_sessions s
        where s.player_id = p.player_id and s.training_date = p_today)
    order by p.player_id, p.created_at desc, p.id
    on conflict (user_id, (payload ->> 'training_date')) where type = 'workout_reminder' do nothing;
$$;
