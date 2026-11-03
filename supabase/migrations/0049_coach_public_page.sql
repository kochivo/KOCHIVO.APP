alter table public.profiles add column public_slug text unique;
alter table public.profiles add constraint profiles_public_slug_valid check (
  public_slug is null or (role = 'captain' and public_slug ~ '^[a-z0-9-]{3,30}$'
    and public_slug not in ('admin','api','login','logout','signup','auth','captain','player',
      'settings','support','help','about','pricing','www','kochivo','demo','offline','null','undefined'))
);
grant update (public_slug) on public.profiles to authenticated;

create function public.coach_public_profile(slug text)
returns table (id uuid, full_name text, bio text, location text, avatar_path text, social jsonb)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.bio, p.location, p.avatar_path, p.social
    from public.profiles p where p.public_slug = slug and p.role = 'captain'
      and p.role_confirmed and p.suspended_at is null and p.demo_expires_at is null;
$$;
revoke all on function public.coach_public_profile(text) from public;
grant execute on function public.coach_public_profile(text) to anon, authenticated;

create table public.coach_join_requests (
  id uuid primary key,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  check (captain_id <> player_id)
);
create unique index coach_join_requests_pending on public.coach_join_requests(captain_id,player_id) where status='pending';
create index coach_join_requests_player on public.coach_join_requests(player_id);
alter table public.coach_join_requests enable row level security;
revoke all on public.coach_join_requests from public, anon, authenticated;
grant select on public.coach_join_requests to authenticated;
grant insert (id,captain_id,player_id) on public.coach_join_requests to authenticated;
create policy active_caller on public.coach_join_requests as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy join_requests_read on public.coach_join_requests for select to authenticated
  using (player_id = (select auth.uid()) or captain_id = (select auth.uid()));
create policy join_requests_create on public.coach_join_requests for insert to authenticated
  with check (player_id = (select auth.uid()) and status = 'pending');

create function security_private.validate_join_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = new.player_id and p.role = 'player'
    and p.suspended_at is null and p.demo_expires_at is null and not security_private.is_anonymous_user(p.id))
    or not exists (select 1 from public.profiles p where p.id = new.captain_id and p.role = 'captain'
      and p.role_confirmed and p.public_slug is not null and p.suspended_at is null and p.demo_expires_at is null) then
    raise exception 'invalid join request' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger join_request_validate before insert on public.coach_join_requests
  for each row execute function security_private.validate_join_request();

-- Both invite redemption and request acceptance go through the same relationship insert,
-- including enforce_player_limit's captain lock, suspension check and subscription limit.
create function security_private.attach_coach_player(p_id uuid, p_captain uuid, p_player uuid, p_until date)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  insert into public.coach_clients(id,captain_id,player_id,access_until)
    values (p_id,p_captain,p_player,p_until);
  return p_id;
end;
$$;
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
  update public.coach_invites set redeemed_by = auth.uid(), redeemed_at = now() where id = v_invite.id;
  return v_id;
end;
$$;

create function public.resolve_coach_join_request(p_request uuid, p_status text, p_link_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_request public.coach_join_requests; v_today date;
begin
  perform public.require_active_caller();
  if p_status is null or p_status not in ('accepted','declined') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  select * into v_request from public.coach_join_requests
    where id=p_request and captain_id=auth.uid() and status='pending' for update;
  if not found then raise exception 'request not found' using errcode = '42501'; end if;
  if p_status='accepted' then
    if not exists (select 1 from public.profiles where id=v_request.player_id and role='player'
      and suspended_at is null and demo_expires_at is null) then
      raise exception 'player unavailable' using errcode = '42501';
    end if;
    select (now() at time zone timezone)::date into v_today from public.profiles where id=auth.uid();
    perform security_private.attach_coach_player(p_link_id,v_request.captain_id,v_request.player_id,v_today + 30);
  end if;
  update public.coach_join_requests set status=p_status where id=p_request;
end;
$$;
revoke all on function public.resolve_coach_join_request(uuid,text,uuid) from public, anon;
grant execute on function public.resolve_coach_join_request(uuid,text,uuid) to authenticated;
revoke all on function security_private.attach_coach_player(uuid,uuid,uuid,date),
  security_private.validate_join_request() from public, anon, authenticated;

create function public.pending_coach_join_requests()
returns table (id uuid, full_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_active_caller();
  return query select r.id,p.full_name,r.created_at from public.coach_join_requests r
    join public.profiles p on p.id=r.player_id
    where r.captain_id=auth.uid() and r.status='pending' order by r.created_at,r.id;
end;
$$;
revoke all on function public.pending_coach_join_requests() from public, anon;
grant execute on function public.pending_coach_join_requests() to authenticated;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('plan_assigned','nutrition_updated','player_joined','player_inactive','join_requested'));
create function security_private.notify_join_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(id,user_id,type,payload)
    select new.id,new.captain_id,'join_requested',jsonb_build_object('name',p.full_name)
    from public.profiles p where p.id=new.player_id;
  return new;
end;
$$;
create trigger join_request_notify after insert on public.coach_join_requests
  for each row execute function security_private.notify_join_request();
revoke all on function security_private.notify_join_request() from public, anon, authenticated;
