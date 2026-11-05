-- Invites reserve a slot; only package activation grants player writes.
create or replace function public.redeem_invite(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_invite public.coach_invites; v_id uuid;
begin
  perform public.require_active_caller();
  if (select role from public.profiles where id = (select auth.uid())) <> 'player' then
    raise exception 'only players can redeem invites' using errcode = '42501';
  end if;
  select * into v_invite from public.coach_invites
    where code = p_code and redeemed_at is null and expires_at > now() for update;
  if not found then raise exception 'invite is invalid or expired' using errcode = 'P0002'; end if;
  v_id := security_private.attach_coach_player(gen_random_uuid(),v_invite.captain_id,auth.uid(),v_invite.access_until);
  update public.coach_clients set pending = true where id = v_id;
  update public.coach_invites set redeemed_by = auth.uid(), redeemed_at = now() where id = v_invite.id;
  return v_id;
end;
$$;

create or replace function public.refresh_inactive_alerts() returns void
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
    where c.captain_id = v_captain and c.archived_at is null
      and c.access_until >= (now() at time zone 'Africa/Cairo')::date
      and not c.pending and c.frozen_at is null
      and c.started_on <= v_today - 3 and p.suspended_at is null
      and not exists (select 1 from public.workout_sessions s
        where s.player_id = c.player_id and s.training_date > v_today - 3)
      and not exists (select 1 from public.notifications n
        where n.user_id = v_captain and n.type = 'player_inactive'
          and n.payload ->> 'player_id' = c.player_id::text and n.created_at > now() - interval '3 days');
end;
$$;

-- Keep owner history and deletion available after subscription access ends.
drop policy body_scans_owner on public.body_scans;
create policy body_scans_owner_read on public.body_scans for select to authenticated
  using (player_id = (select auth.uid()));
create policy body_scans_owner_delete on public.body_scans for delete to authenticated
  using (player_id = (select auth.uid()));
create policy body_scans_owner_insert on public.body_scans for insert to authenticated
  with check (player_id = (select auth.uid()) and (select public.player_can_write()));
create policy body_scans_owner_update on public.body_scans for update to authenticated
  using (player_id = (select auth.uid()) and (select public.player_can_write()))
  with check (player_id = (select auth.uid()) and (select public.player_can_write()));
alter policy body_scans_upload on storage.objects
  with check (bucket_id = 'body-scans' and public.storage_owner(name) = (select auth.uid())
    and (select public.player_can_write())
    and name ~ '^[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|webp|pdf)$');

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
  update public.coach_clients set billing_started_at=now(), access_until=v_end,
    sessions_left=case when pkg.kind='sessions' then coalesce(sessions_left,0)+pkg.sessions else null end where id=c.id;
  insert into public.player_payments(captain_id,player_id,amount_egp,days,period_start,period_end,price_egp,package_id)
    values (auth.uid(),p_player,p_amount,p_days,v_start,v_end,p_price,p_package);
  return v_end;
end; $$;

-- CREATE OR REPLACE retains the existing function signatures and execution grants.
