alter table public.captain_packages
  add column kind text not null default 'days' check (kind in ('days','sessions')),
  add column sessions int check (sessions between 1 and 200),
  add constraint package_session_quantity check (kind <> 'sessions' or sessions is not null);
grant update (kind,sessions) on public.captain_packages to authenticated;
alter table public.coach_clients
  add column sessions_left int check (sessions_left >= 0),
  add column frozen_at timestamptz,
  add column pending boolean not null default false;
-- Existing column grants remain; the new balance/state columns are RPC-only.
revoke update on public.coach_clients from authenticated;
grant update (access_until,archived_at) on public.coach_clients to authenticated;
alter table public.player_payments add column notes text;

create or replace function public.player_can_read()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.coach_clients where player_id=(select auth.uid())
    and archived_at is null and not pending and frozen_at is null and current_date <= access_until + 3);
$$;
create or replace function public.player_can_read_from(p_captain uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.coach_clients where player_id=(select auth.uid()) and captain_id=p_captain
    and archived_at is null and not pending and frozen_at is null and current_date <= access_until + 3);
$$;
create or replace function public.player_can_write()
returns boolean language plpgsql stable security definer set search_path = '' as $$ begin
  perform public.require_active_caller();
  return exists (select 1 from public.coach_clients where player_id=(select auth.uid())
    and archived_at is null and not pending and frozen_at is null and current_date <= access_until);
end; $$;

create or replace function public.resolve_coach_join_request(p_request uuid, p_status text, p_link_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.coach_join_requests;
begin
  perform public.require_active_caller();
  if p_status is null or p_status not in ('accepted','declined') then
    raise exception 'invalid status' using errcode='22023';
  end if;
  select * into r from public.coach_join_requests where id=p_request and captain_id=auth.uid() and status='pending' for update;
  if not found then raise exception 'request not found' using errcode='42501'; end if;
  if p_status='accepted' then
    if not exists (select 1 from public.profiles where id=r.player_id and role='player'
      and suspended_at is null and demo_expires_at is null) then
      raise exception 'player unavailable' using errcode='42501';
    end if;
    if not exists (select 1 from public.coach_clients where id=r.id and pending and archived_at is null) then
      insert into public.coach_clients(id,captain_id,player_id,access_until,pending)
        values (p_link_id,r.captain_id,r.player_id,(now() at time zone 'Africa/Cairo')::date,true);
    end if;
  else
    update public.coach_clients set archived_at=now() where id=r.id and pending;
  end if;
  update public.coach_join_requests set status=p_status where id=p_request;
end; $$;

create function security_private.attach_pending_player() returns trigger
language plpgsql security definer set search_path = '' as $$ begin
  insert into public.coach_clients(id,captain_id,player_id,access_until,pending)
    values (new.id,new.captain_id,new.player_id,(now() at time zone 'Africa/Cairo')::date,true);
  return new;
end; $$;
revoke all on function security_private.attach_pending_player() from public,anon,authenticated;
create trigger join_request_attach after insert on public.coach_join_requests
  for each row execute function security_private.attach_pending_player();

create function public.activate_player(p_link uuid, p_package uuid, p_kind text, p_quantity int,
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
  update public.coach_clients set access_until=today+d, pending=false, frozen_at=null,
    sessions_left=case when p_kind='sessions' then p_quantity end where id=c.id;
  update public.coach_join_requests set status='accepted' where captain_id=c.captain_id and player_id=c.player_id and status='pending';
  -- Trials retain an auditable zero-value record, excluded naturally from revenue and dues.
  insert into public.player_payments(captain_id,player_id,days,period_start,period_end,price_egp,amount_egp,package_id,notes)
    values (auth.uid(),c.player_id,d,today,today+d,p_price_egp,p_paid_egp,p_package,
      case when p_free_trial then 'free_trial' end);
end; $$;

create function public.set_player_frozen(p_link uuid, p_frozen boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.coach_clients;
begin
  perform public.require_active_caller();
  select * into c from public.coach_clients where id=p_link and captain_id=auth.uid() and archived_at is null for update;
  if not found or not exists (select 1 from public.profiles where id=auth.uid() and role='captain') then
    raise exception 'own captain link required' using errcode='42501';
  end if;
  if p_frozen is null or c.pending then raise exception 'invalid freeze' using errcode='22023'; end if;
  if p_frozen then
    update public.coach_clients set frozen_at=coalesce(frozen_at,now()) where id=c.id;
  elsif c.frozen_at is not null then
    update public.coach_clients set access_until=access_until+greatest(0,floor(extract(epoch from (now()-c.frozen_at))/86400)::int),
      frozen_at=null where id=c.id;
  end if;
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
    sessions_left=case when pkg.kind='sessions' then coalesce(sessions_left,0)+pkg.sessions else sessions_left end where id=c.id;
  insert into public.player_payments(captain_id,player_id,amount_egp,days,period_start,period_end,price_egp,package_id)
    values (auth.uid(),p_player,p_amount,p_days,v_start,v_end,p_price,p_package);
  return v_end;
end; $$;

create table public.session_deductions (
  session_id uuid primary key,
  link_id uuid not null references public.coach_clients(id) on delete cascade
);
create index session_deductions_link on public.session_deductions(link_id);
alter table public.session_deductions enable row level security;
revoke all on public.session_deductions from public,anon,authenticated;
grant select on public.session_deductions to authenticated;
create policy active_caller on public.session_deductions as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy deductions_read on public.session_deductions for select to authenticated using (
  exists (select 1 from public.coach_clients c where c.id=link_id and (c.player_id=(select auth.uid()) or c.captain_id=(select auth.uid()))));
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('plan_assigned','nutrition_updated','player_joined','player_inactive','join_requested','workout_reminder','workout_feedback','sessions_used_up'));
create function security_private.deduct_pt_session() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.coach_clients;
begin
  if new.completed_at is null then return new; end if;
  if tg_op='UPDATE' then if old.completed_at is not null then return new; end if; end if;
  select * into c from public.coach_clients where player_id=new.player_id and archived_at is null
    and not pending and frozen_at is null and access_until >= (now() at time zone 'Africa/Cairo')::date
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
revoke all on function security_private.deduct_pt_session() from public,anon,authenticated;
create trigger pt_session_deduct after insert or update on public.workout_sessions
  for each row execute function security_private.deduct_pt_session();
revoke all on function public.activate_player(uuid,uuid,text,int,int,int,boolean),public.set_player_frozen(uuid,boolean) from public,anon,authenticated;
grant execute on function public.activate_player(uuid,uuid,text,int,int,int,boolean),public.set_player_frozen(uuid,boolean) to authenticated;
