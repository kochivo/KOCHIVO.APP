-- 0003 coach ↔ player relationship, subscription window and invites.
-- A player has at most ONE active captain. Access rules (PRD §7):
--   today <= access_until            → full access
--   today <= access_until + 3 days   → read-only (grace period)
--   later                            → training content hidden, history kept

create table public.coach_clients (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid not null references public.profiles (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  started_on date not null default current_date,
  access_until date not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_clients_not_self check (captain_id <> player_id)
);

create unique index coach_clients_one_active_captain on public.coach_clients (player_id) where archived_at is null;
create index coach_clients_captain on public.coach_clients (captain_id) where archived_at is null;

create trigger coach_clients_touch before update on public.coach_clients
  for each row execute function public.touch_updated_at();

create table public.coach_invites (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid not null references public.profiles (id) on delete cascade,
  -- 12 url-safe chars, short enough for a /i/<code> link or to read out loud
  code text not null unique default translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/', '-_'),
  access_until date not null,
  expires_at timestamptz not null default now() + interval '7 days',
  redeemed_by uuid references public.profiles (id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- access helpers (security definer: they read coach_clients regardless of the caller's RLS) ----------

create function public.is_captain_of(p_player uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.coach_clients
    where captain_id = (select auth.uid()) and player_id = p_player and archived_at is null
  );
$$;

create function public.player_can_read()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.coach_clients
    where player_id = (select auth.uid()) and archived_at is null and current_date <= access_until + 3
  );
$$;

create function public.player_can_write()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.coach_clients
    where player_id = (select auth.uid()) and archived_at is null and current_date <= access_until
  );
$$;

create function public.my_captain_id()
returns uuid language sql stable security definer set search_path = ''
as $$
  select captain_id from public.coach_clients where player_id = (select auth.uid()) and archived_at is null;
$$;

-- Free plan: up to 5 active players (PRD §8).
create function public.enforce_player_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_plan public.captain_plan;
  v_count int;
begin
  select plan into v_plan from public.profiles where id = new.captain_id;
  if v_plan = 'free' then
    select count(*) into v_count from public.coach_clients where captain_id = new.captain_id and archived_at is null;
    if v_count >= 5 then
      raise exception 'free plan allows 5 active players' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger coach_clients_limit before insert on public.coach_clients
  for each row execute function public.enforce_player_limit();

-- Player redeems an invite code → becomes the captain's client.
create function public.redeem_invite(p_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_invite public.coach_invites;
  v_id uuid;
begin
  if (select role from public.profiles where id = (select auth.uid())) <> 'player' then
    raise exception 'only players can redeem invites' using errcode = '42501';
  end if;
  select * into v_invite from public.coach_invites
    where code = p_code and redeemed_at is null and expires_at > now() for update;
  if not found then
    raise exception 'invite is invalid or expired' using errcode = 'P0002';
  end if;
  insert into public.coach_clients (captain_id, player_id, access_until)
    values (v_invite.captain_id, (select auth.uid()), v_invite.access_until)
    returning id into v_id;
  update public.coach_invites set redeemed_by = (select auth.uid()), redeemed_at = now() where id = v_invite.id;
  return v_id;
end;
$$;

-- ---------- RLS ----------

alter table public.coach_clients enable row level security;
alter table public.coach_invites enable row level security;
grant select, insert, update on public.coach_clients to authenticated;
grant select, insert, delete on public.coach_invites to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;

create policy coach_clients_captain on public.coach_clients
  for all to authenticated
  using (captain_id = (select auth.uid()))
  with check (captain_id = (select auth.uid()));

create policy coach_clients_player_select on public.coach_clients
  for select to authenticated using (player_id = (select auth.uid()));

create policy coach_invites_captain on public.coach_invites
  for all to authenticated
  using (captain_id = (select auth.uid()))
  with check (captain_id = (select auth.uid()));

-- Captains see their players' profiles; players see their captain's profile.
create policy profiles_select_my_players on public.profiles
  for select to authenticated using (public.is_captain_of(id));

create policy profiles_select_my_captain on public.profiles
  for select to authenticated using (id = public.my_captain_id());
