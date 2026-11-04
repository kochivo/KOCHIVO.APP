-- Replacing these functions preserves their signatures and existing EXECUTE grants.
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
    where p.role = 'captain'
      and not exists (select 1 from public.admins a where a.user_id = p.id)
      and (p_search is null or p.full_name ilike v_search or u.email ilike v_search)
    order by p.created_at desc, p.id
    limit least(greatest(coalesce(p_limit, 50), 0), 100) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_notification_kpis()
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
    where p.demo_expires_at is null
      and not exists (select 1 from public.admins a where a.user_id = p.id);
end;
$$;

create or replace function public.coach_public_profile(slug text)
returns table (id uuid, full_name text, bio text, location text, avatar_path text, social jsonb)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.bio, p.location, p.avatar_path, p.social
    from public.profiles p where p.public_slug = slug and p.role = 'captain'
      and p.role_confirmed and p.suspended_at is null and p.demo_expires_at is null
      and not exists (select 1 from public.admins a where a.user_id = p.id);
$$;
