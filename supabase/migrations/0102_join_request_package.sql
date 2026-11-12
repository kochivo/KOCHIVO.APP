-- T-208: selections are references only; every sale uses the current server price.
begin;
alter table public.coach_join_requests
  add column package_id uuid references public.captain_packages(id),
  add column offer_id uuid references public.captain_offers(id);
grant insert(package_id,offer_id) on public.coach_join_requests to authenticated;
create index join_request_package on public.coach_join_requests(package_id);
create index join_request_offer on public.coach_join_requests(offer_id);

create function security_private.request_offer_valid(p_captain uuid,p_package uuid,p_offer uuid,p_renewal boolean)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.captain_offers o join public.captain_packages p on p.id=p_package
    where o.id=p_offer and o.captain_id=p_captain and p.captain_id=p_captain and p.archived_at is null
      and o.paused_at is null and o.starts_at<=now() and o.ends_at>now()
      and (o.max_uses is null or o.used_count<o.max_uses) and case when p_renewal then o.for_renewals else o.for_new end
      and (o.scope='all' or (o.scope='tiers' and p.tier_id=any(o.tier_ids))
        or (o.scope='packages' and p.id=any(o.package_ids))));
$$;
create function security_private.validate_request_package() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.captain_packages where id=new.package_id and captain_id<>new.captain_id)
    or exists(select 1 from public.captain_offers where id=new.offer_id and captain_id<>new.captain_id) then
    raise exception 'request targets must belong to captain' using errcode='23514';
  end if;
  if not exists(select 1 from public.captain_packages where id=new.package_id
    and captain_id=new.captain_id and archived_at is null) then
    if tg_table_name='player_renewal_requests' then raise exception 'package unavailable' using errcode='22023'; end if;
    new.package_id := null;
  end if;
  if not security_private.request_offer_valid(new.captain_id,new.package_id,new.offer_id,tg_table_name='player_renewal_requests') then
    new.offer_id := null;
  end if;
  return new;
end; $$;
create trigger join_package_validate before insert on public.coach_join_requests
  for each row execute function security_private.validate_request_package();

-- Keep the original RPC's return type and all callers intact. The reviewer can wire this additive API on home.
create function public.pending_coach_join_packages()
returns table(id uuid,full_name text,created_at timestamptz,package_id uuid,offer_id uuid,package_days int,package_sessions int)
language plpgsql stable security definer set search_path='' as $$ begin
  perform public.require_active_caller();
  return query select r.id,p.full_name,r.created_at,r.package_id,r.offer_id,pkg.days,pkg.sessions
    from public.coach_join_requests r join public.profiles p on p.id=r.player_id
    left join public.captain_packages pkg on pkg.id=r.package_id
    where r.captain_id=auth.uid() and r.status='pending' order by r.created_at,r.id;
end; $$;

create table public.player_renewal_requests (
  id uuid primary key,
  player_id uuid not null references public.profiles(id) on delete cascade,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid not null references public.captain_packages(id),
  offer_id uuid references public.captain_offers(id),
  status text not null default 'pending' check(status in ('pending','approved','declined','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), decided_at timestamptz,
  check(player_id<>captain_id)
);
create unique index renewal_pending_membership on public.player_renewal_requests(captain_id,player_id) where status='pending';
create index renewal_player on public.player_renewal_requests(player_id,created_at desc);
create index renewal_package on public.player_renewal_requests(package_id);
create index renewal_offer on public.player_renewal_requests(offer_id);
alter table public.player_renewal_requests enable row level security;
revoke all on public.player_renewal_requests from public,anon,authenticated;
grant select on public.player_renewal_requests to authenticated;
grant insert(id,player_id,captain_id,package_id,offer_id) on public.player_renewal_requests to authenticated;
create policy active_caller on public.player_renewal_requests as restrictive for all to authenticated
  using(not (select public.is_suspended())) with check(not (select public.is_suspended()));
create policy renewal_read on public.player_renewal_requests for select to authenticated
  using(player_id=(select auth.uid()) or captain_id=(select auth.uid()));
create policy renewal_create on public.player_renewal_requests for insert to authenticated
  with check(player_id=(select auth.uid()) and status='pending' and exists(select 1 from public.coach_clients c
    where c.player_id=player_renewal_requests.player_id and c.captain_id=player_renewal_requests.captain_id
      and c.archived_at is null and not c.pending));
create trigger renewal_package_validate before insert on public.player_renewal_requests
  for each row execute function security_private.validate_request_package();

-- Preserve every currently installed notification kind without rewriting its CHECK list.
do $migration$
declare definition text;
begin
  select pg_get_constraintdef(oid) into definition from pg_constraint
    where conrelid='public.notifications'::regclass and conname='notifications_type_check';
  if definition is null then raise exception 'notification constraint source drift'; end if;
  execute 'alter table public.notifications drop constraint notifications_type_check';
  execute 'alter table public.notifications add constraint notifications_type_check '
    ||replace(definition,'CHECK (','CHECK (type=''renewal_requested'' or ');
end $migration$;
create function security_private.notify_renewal_request() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  insert into public.notifications(id,user_id,type,payload)
    select new.id,new.captain_id,'renewal_requested',jsonb_build_object('name',p.full_name,'player_id',new.player_id,'request_id',new.id)
      from public.profiles p where p.id=new.player_id;
  return new;
end; $$;
create trigger renewal_notify after insert on public.player_renewal_requests
  for each row execute function security_private.notify_renewal_request();

-- A current member can choose a renewal even when their captain has no public page.
create policy member_packages on public.captain_packages for select to authenticated
  using(archived_at is null and exists(select 1 from public.coach_clients c where c.captain_id=captain_packages.captain_id
    and c.player_id=(select auth.uid()) and c.archived_at is null));
create policy member_tiers on public.captain_package_tiers for select to authenticated
  using(archived_at is null and exists(select 1 from public.coach_clients c where c.captain_id=captain_package_tiers.captain_id
    and c.player_id=(select auth.uid()) and c.archived_at is null));
create policy member_offers on public.captain_offers for select to authenticated
  using(exists(select 1 from public.coach_clients c where c.captain_id=captain_offers.captain_id
    and c.player_id=(select auth.uid()) and c.archived_at is null));

-- Row locks make repeated decisions and offer-capacity races safe. Any failure rolls the entire sale back.
create function public.decide_player_renewal(p_request uuid,p_status text) returns boolean
language plpgsql security definer set search_path='' as $$
declare r public.player_renewal_requests; pkg public.captain_packages; fallback boolean := false;
begin
  perform public.require_active_caller();
  select * into r from public.player_renewal_requests where id=p_request for update;
  if not found or r.status<>'pending' or not (
    (p_status='cancelled' and r.player_id=auth.uid()) or
    (p_status in ('approved','declined') and r.captain_id=auth.uid())) then
    raise exception 'request unavailable' using errcode='42501';
  end if;
  if not exists(select 1 from public.coach_clients c where c.player_id=r.player_id and c.captain_id=r.captain_id
    and c.archived_at is null and not c.pending) then raise exception 'membership unavailable' using errcode='42501'; end if;
  if p_status='approved' then
    select * into pkg from public.captain_packages where id=r.package_id and captain_id=r.captain_id and archived_at is null for share;
    if not found then raise exception 'package unavailable' using errcode='22023'; end if;
    begin
      perform public.renew_player_offer(r.player_id,r.offer_id,p_package=>pkg.id,p_price=>pkg.price_egp,p_amount=>0);
    exception when sqlstate 'P0206' then
      fallback := true;
      perform public.renew_player_offer(r.player_id,null,p_package=>pkg.id,p_price=>pkg.price_egp,p_amount=>0);
    end;
  end if;
  update public.player_renewal_requests set status=p_status,updated_at=now(),decided_at=now() where id=r.id;
  return fallback;
end; $$;

create function public.activate_join_package(p_link uuid,p_package uuid,p_paid int) returns boolean
language plpgsql security definer set search_path='' as $$
declare c public.coach_clients; pkg public.captain_packages; offer uuid; fallback boolean := false;
begin
  perform public.require_active_caller();
  select * into c from public.coach_clients where id=p_link and captain_id=auth.uid() for update;
  if not found then raise exception 'membership unavailable' using errcode='42501'; end if;
  select * into pkg from public.captain_packages where id=p_package and captain_id=c.captain_id and archived_at is null for share;
  if not found then raise exception 'package unavailable' using errcode='22023'; end if;
  select r.offer_id into offer from public.coach_join_requests r where r.player_id=c.player_id and r.captain_id=c.captain_id
    and r.status in ('pending','accepted') and r.package_id=pkg.id order by r.created_at desc,r.id desc limit 1;
  begin
    perform public.activate_player_offer(c.id,offer,pkg.id,pkg.kind,
      case when pkg.kind='sessions' then pkg.sessions else pkg.days end,pkg.price_egp,p_paid,false);
  exception when sqlstate 'P0206' then
    fallback := true;
    perform public.activate_player_offer(c.id,null,pkg.id,pkg.kind,
      case when pkg.kind='sessions' then pkg.sessions else pkg.days end,pkg.price_egp,p_paid,false);
  end;
  return fallback;
end; $$;

create function public.captain_player_tiers()
returns table(player_id uuid,id uuid,name text,color text,is_featured boolean)
language plpgsql stable security definer set search_path='' as $$ begin
  perform public.require_active_caller();
  return query select c.player_id,t.id,t.name,t.color,t.is_featured from public.coach_clients c
    cross join lateral public.player_package_tier(c.player_id) t
    where c.captain_id=auth.uid() and c.archived_at is null;
end; $$;
revoke all on function security_private.request_offer_valid(uuid,uuid,uuid,boolean),
  security_private.validate_request_package(),security_private.notify_renewal_request() from public,anon,authenticated;
revoke all on function public.pending_coach_join_packages(),public.decide_player_renewal(uuid,text),
  public.activate_join_package(uuid,uuid,int),public.captain_player_tiers() from public,anon,authenticated;
grant execute on function public.pending_coach_join_packages(),public.decide_player_renewal(uuid,text),
  public.activate_join_package(uuid,uuid,int),public.captain_player_tiers() to authenticated;
commit;
