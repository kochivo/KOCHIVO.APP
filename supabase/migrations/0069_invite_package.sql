alter table public.coach_invites
  add column player_name text check (char_length(btrim(player_name)) between 1 and 60),
  add column whatsapp text check (whatsapp ~ '^[0-9]{8,15}$'),
  add column package_id uuid references public.captain_packages(id),
  add column kind text check (kind in ('days','sessions')),
  add column quantity int,
  add column price_egp int,
  add column paid_egp int,
  add column free_trial boolean,
  add column starts_on date,
  add constraint invite_plan_complete check (
    (kind is null and quantity is null and price_egp is null and paid_egp is null
      and free_trial is null and starts_on is null and package_id is null)
    or (kind is not null and quantity is not null and price_egp is not null and paid_egp is not null
      and free_trial is not null and starts_on is not null and player_name is not null
      and quantity between 1 and case when kind='sessions' then 200 else 365 end
      and price_egp between 0 and 100000 and paid_egp between 0 and price_egp
      and (not free_trial or (price_egp=0 and paid_egp=0))));
create index coach_invites_package on public.coach_invites(package_id) where package_id is not null;

-- Preserve legacy inserts while making every new plan field RPC-only. RLS stays intact.
revoke insert on public.coach_invites from authenticated;
grant insert(id,captain_id,code,access_until,expires_at) on public.coach_invites to authenticated;

create function security_private.invite_plan_end(p_start date,p_kind text,p_quantity int,p_days int)
returns date language sql immutable set search_path = '' as $$
  -- Days include the start day; PT validity retains activate_player's start + days rule.
  select p_start + case when p_kind='days' then p_quantity-1 else coalesce(p_days,60) end;
$$;
revoke all on function security_private.invite_plan_end(date,text,int,int) from public,anon,authenticated;

create function public.create_player_invite(p_name text,p_whatsapp text,p_package uuid,p_kind text,p_quantity int,
  p_price_egp int,p_paid_egp int,p_free_trial boolean,p_starts_on date)
returns text language plpgsql security definer set search_path = '' as $$
declare pkg public.captain_packages; v_code text;
  today date := (now() at time zone 'Africa/Cairo')::date;
begin
  perform public.require_active_caller();
  if not exists (select 1 from public.profiles where id=auth.uid() and role='captain' and demo_expires_at is null) then
    raise exception 'non-demo captain required' using errcode='42501';
  end if;
  if p_package is not null then
    select * into pkg from public.captain_packages where id=p_package and captain_id=auth.uid() and archived_at is null;
    if not found then raise exception 'package not found' using errcode='P0002'; end if;
    p_kind := pkg.kind; p_quantity := case when pkg.kind='sessions' then pkg.sessions else pkg.days end;
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 60
    or (p_whatsapp is not null and p_whatsapp !~ '^[0-9]{8,15}$')
    or p_kind is null or p_kind not in ('days','sessions') or p_quantity is null
    or p_quantity not between 1 and (case when p_kind='sessions' then 200 else 365 end)
    or p_price_egp is null or p_price_egp not between 0 and 100000
    or p_paid_egp is null or p_paid_egp not between 0 and p_price_egp or p_free_trial is null
    or p_starts_on is null or p_starts_on not between today-30 and today+60 then
    raise exception 'invalid invite values' using errcode='22023';
  end if;
  if p_free_trial then p_price_egp := 0; p_paid_egp := 0; end if;
  insert into public.coach_invites(id,captain_id,player_name,whatsapp,package_id,kind,quantity,price_egp,paid_egp,free_trial,starts_on,access_until)
    values(security_private.starter_uuidv7(),auth.uid(),btrim(p_name),p_whatsapp,p_package,p_kind,p_quantity,p_price_egp,p_paid_egp,p_free_trial,p_starts_on,
      security_private.invite_plan_end(p_starts_on,p_kind,p_quantity,pkg.days)) returning code into v_code;
  return v_code;
end; $$;
revoke all on function public.create_player_invite(text,text,uuid,text,int,int,int,boolean,date) from public,anon,authenticated;
grant execute on function public.create_player_invite(text,text,uuid,text,int,int,int,boolean,date) to authenticated;

-- Trusted callers validate ownership and lock the link. Redemption uses the saved plan,
-- even when the captain later edits or archives its source package.
create function security_private.activate_player_plan(p_link uuid,p_package uuid,p_kind text,p_quantity int,
  p_price int,p_paid int,p_trial boolean,p_start date,p_end date,p_days int)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.coach_clients;
begin
  select * into strict c from public.coach_clients where id=p_link for update;
  if not c.pending then raise exception 'already activated; renew instead' using errcode='22023'; end if;
  update public.coach_clients set billing_started_at=now(),access_until=p_end,pending=false,frozen_at=null,
    sessions_left=case when p_kind='sessions' then p_quantity end where id=c.id;
  update public.coach_join_requests set status='accepted'
    where captain_id=c.captain_id and player_id=c.player_id and status='pending';
  insert into public.player_payments(id,captain_id,player_id,days,period_start,period_end,price_egp,amount_egp,package_id,notes)
    values(security_private.starter_uuidv7(),c.captain_id,c.player_id,p_days,p_start,p_end,case when p_trial then 0 else p_price end,
      case when p_trial then 0 else p_paid end,p_package,case when p_trial then 'free_trial' end);
end; $$;
revoke all on function security_private.activate_player_plan(uuid,uuid,text,int,int,int,boolean,date,date,int) from public,anon,authenticated;

create or replace function public.activate_player(p_link uuid,p_package uuid,p_kind text,p_quantity int,
  p_price_egp int,p_paid_egp int,p_free_trial boolean)
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
  -- Existing activation historically grants today + d (including the extra start day).
  -- Preserve that contract; newly dated invites count their start day in the quantity.
  perform security_private.activate_player_plan(c.id,p_package,p_kind,p_quantity,p_price_egp,p_paid_egp,p_free_trial,
    today,today+d,d);
end; $$;

create or replace function public.redeem_invite(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_invite public.coach_invites; v_id uuid; d int; v_captain public.profiles;
begin
  perform public.require_active_caller();
  if (select role from public.profiles where id = (select auth.uid())) <> 'player' then
    raise exception 'only players can redeem invites' using errcode = '42501';
  end if;
  select * into v_invite from public.coach_invites
    where code = p_code and redeemed_at is null and expires_at > now() for update;
  if not found then raise exception 'invite is invalid or expired' using errcode = 'P0002'; end if;
  if v_invite.kind is not null then
    -- A reserved link skips INSERT triggers, so repeat their target guards under
    -- the same captain lock. It already occupies a slot in the player limit.
    select * into strict v_captain from public.profiles where id=v_invite.captain_id for update;
    if v_captain.suspended_at is not null then
      raise exception 'captain is suspended' using errcode='42501';
    end if;
    if v_captain.captain_status <> 'approved' and not exists
      (select 1 from public.admins where user_id=v_captain.id) then
      raise exception 'captain approval required' using errcode='42501';
    end if;
    select id into v_id from public.coach_clients where captain_id=v_invite.captain_id
      and player_id=auth.uid() and archived_at is null and pending for update;
  end if;
  if v_id is null then
    v_id := security_private.attach_coach_player(security_private.starter_uuidv7(),v_invite.captain_id,auth.uid(),v_invite.access_until);
    update public.coach_clients set pending = true where id = v_id;
  end if;
  if v_invite.kind is not null then
    d := case when v_invite.kind='days' then v_invite.quantity else v_invite.access_until-v_invite.starts_on end;
    perform security_private.activate_player_plan(v_id,v_invite.package_id,v_invite.kind,v_invite.quantity,
      v_invite.price_egp,v_invite.paid_egp,v_invite.free_trial,v_invite.starts_on,v_invite.access_until,d);
  end if;
  update public.coach_invites set redeemed_by = auth.uid(), redeemed_at = now() where id = v_invite.id;
  return v_id;
end; $$;
