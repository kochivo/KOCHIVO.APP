-- Auth creates the profile before verification; only submitted requests belong in review.
create or replace function public.admin_pending_captains()
returns table (id uuid, email text, full_name text, created_at timestamptz,
  whatsapp text, instagram text, captain_intake jsonb)
language plpgsql stable security definer set search_path = '' as $$ begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  return query select p.id, u.email::text, p.full_name, p.created_at,
    p.social->>'whatsapp', p.social->>'instagram', p.captain_intake
    from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'captain' and p.captain_status = 'pending'
      and p.role_confirmed and u.email_confirmed_at is not null
      and p.captain_intake is not null
      and not exists (select 1 from public.admins a where a.user_id = p.id)
    order by p.created_at, p.id;
end;
$$;

-- Preserve approved legacy accounts without requiring the newer intake retroactively.
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
    where p.role = 'captain' and p.captain_status = 'approved'
      and not exists (select 1 from public.admins a where a.user_id = p.id)
      and (p_search is null or p.full_name ilike v_search or u.email ilike v_search)
    order by p.created_at desc, p.id
    limit least(greatest(coalesce(p_limit, 50), 0), 100) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.admin_pending_captains(), public.admin_captains(text,int,int) from public, anon;
grant execute on function public.admin_pending_captains(), public.admin_captains(text,int,int) to authenticated;
