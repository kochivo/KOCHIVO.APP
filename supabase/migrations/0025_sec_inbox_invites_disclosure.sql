-- SEC-03: player submissions cannot arrive with a forged captain review.
create policy review_initially_empty on public.check_ins as restrictive
  for insert to authenticated
  with check (reviewed_at is null and captain_reply is null);
create policy review_initially_empty on public.form_checks as restrictive
  for insert to authenticated
  with check (reviewed_at is null and captain_reply is null);

-- SEC-04: enforce the role boundary even when the application is bypassed.
alter policy coach_invites_captain_insert on public.coach_invites
  with check (captain_id = (select auth.uid()) and not (select public.is_suspended())
    and exists (select 1 from public.profiles
      where id = (select auth.uid()) and role = 'captain' and role_confirmed));

-- SEC-05: owner-run admission must see the real tier, independent of the redeemer.
create schema security_private;
revoke all on schema security_private from public, anon, authenticated;

create function security_private.current_tier(p_captain uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select s.tier from public.captain_subscriptions s
    join public.plan_tiers t on t.tier = s.tier
    where s.captain_id = p_captain and s.starts_at <= now() and s.ends_at > now()
    order by t.position desc, s.ends_at desc, s.id limit 1), 'entry');
$$;
revoke all on function security_private.current_tier(uuid) from public, anon, authenticated;

-- CREATE OR REPLACE preserves the existing public EXECUTE grants.
create or replace function public.current_tier(p_captain uuid) returns text
language sql stable security definer set search_path = '' as $$
  select security_private.current_tier(p_captain)
  where p_captain = (select auth.uid()) or public.is_admin();
$$;

create or replace function public.plan_of_meal(p_meal uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select m.plan_id from public.meals m
  where m.id = p_meal and public.can_read_plan(m.plan_id);
$$;

create or replace function public.plan_of_item(p_item uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select m.plan_id from public.meal_items i join public.meals m on m.id = i.meal_id
  where i.id = p_item and public.can_read_plan(m.plan_id);
$$;

create or replace function public.enforce_player_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limit int;
  v_count int;
begin
  if new.archived_at is not null then return new; end if;
  -- Serialize inserts for a captain so concurrent requests cannot exceed the limit.
  perform 1 from public.profiles where id = new.captain_id for update;
  if not exists (select 1 from public.profiles
    where id = new.captain_id and role = 'captain' and role_confirmed) then
    raise exception 'confirmed captain required' using errcode = '42501';
  end if;
  -- A suspended captain's old invites must not keep adding players.
  if exists (select 1 from public.profiles where id = new.captain_id and suspended_at is not null) then
    raise exception 'captain is suspended' using errcode = '42501';
  end if;
  select player_limit into v_limit from public.plan_tiers where tier = security_private.current_tier(new.captain_id);
  select count(*) into v_count from public.coach_clients
    where captain_id = new.captain_id and archived_at is null;
  if v_count >= v_limit then
    raise exception 'plan allows % active players', v_limit using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- The other final tier call site is 0024's admin listing; retain its history fields.
create or replace function public.admin_captains(p_search text default null, p_limit int default 50, p_offset int default 0)
returns table (id uuid, full_name text, email text, email_confirmed boolean, created_at timestamptz,
  tier text, tier_ends_at timestamptz, active_players int, player_limit int, suspended boolean,
  last_paid_tier text, last_paid_ends_at timestamptz, over_limit boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_search text;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  v_search := '%' || replace(replace(replace(p_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  return query
    select p.id, p.full_name, u.email::text, u.email_confirmed_at is not null, p.created_at,
      t.tier, s.ends_at, players.active_players,
      t.player_limit, p.suspended_at is not null,
      paid.tier, paid.ends_at, players.active_players > t.player_limit
    from public.profiles p join auth.users u on u.id = p.id
    join public.plan_tiers t on t.tier = security_private.current_tier(p.id)
    left join lateral (select cs.ends_at from public.captain_subscriptions cs
      where cs.captain_id = p.id and cs.tier = t.tier and cs.starts_at <= now() and cs.ends_at > now()
      order by cs.ends_at desc, cs.id limit 1) s on true
    left join lateral (select cs.tier, cs.ends_at from public.captain_subscriptions cs
      where cs.captain_id = p.id and cs.tier <> 'entry'
      order by cs.ends_at desc, cs.id limit 1) paid on true
    cross join lateral (select count(*)::int as active_players from public.coach_clients c
      where c.captain_id = p.id and c.archived_at is null) players
    where p.role = 'captain' and (p_search is null or p.full_name ilike v_search or u.email ilike v_search)
    order by p.created_at desc, p.id
    limit least(greatest(coalesce(p_limit, 50), 0), 100) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
