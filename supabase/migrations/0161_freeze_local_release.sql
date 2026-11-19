begin;

-- Use the access date the release job will persist, including when the
-- original subscription end falls before the scheduled return.
create or replace function public.player_can_read()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.coach_clients where player_id=(select auth.uid())
    and archived_at is null and not pending
    and (frozen_at is null or frozen_until <= public.user_today(captain_id))
    and (awaiting_plans_at is not null or public.user_today(captain_id) <= access_until +
      case when frozen_at is not null then greatest(0,
        public.user_today(captain_id) - (frozen_at at time zone public.safe_timezone(captain_id))::date)
      else 0 end + 3));
$$;

create or replace function public.player_can_read_from(p_captain uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.coach_clients where player_id=(select auth.uid()) and captain_id=p_captain
    and archived_at is null and not pending
    and (frozen_at is null or frozen_until <= public.user_today(captain_id))
    and (awaiting_plans_at is not null or public.user_today(captain_id) <= access_until +
      case when frozen_at is not null then greatest(0,
        public.user_today(captain_id) - (frozen_at at time zone public.safe_timezone(captain_id))::date)
      else 0 end + 3));
$$;

create or replace function public.player_can_write()
returns boolean language plpgsql stable security definer set search_path = '' as $$ begin
  perform public.require_active_caller();
  return exists (select 1 from public.coach_clients where player_id=(select auth.uid())
    and archived_at is null and not pending
    and (frozen_at is null or frozen_until <= public.user_today(captain_id))
    and (subscription_starts_on is null or public.user_today(captain_id) >= subscription_starts_on)
    and (awaiting_plans_at is not null or public.user_today(captain_id) <= access_until +
      case when frozen_at is not null then greatest(0,
        public.user_today(captain_id) - (frozen_at at time zone public.safe_timezone(captain_id))::date)
      else 0 end));
end; $$;

create or replace function public.player_package_tier(p_player uuid) returns setof public.captain_package_tiers
language plpgsql stable security definer set search_path='' as $$ begin
  perform public.require_active_caller();
  return query select t.* from public.coach_clients c
    cross join lateral (select p.package_id from public.player_payments p where p.captain_id=c.captain_id
      and p.player_id=c.player_id and p.period_start<=public.user_today(c.captain_id)
      order by p.period_start desc,p.created_at desc,p.id desc limit 1) p
    join public.captain_packages pkg on pkg.id=p.package_id
    join public.captain_package_tiers t on t.id=pkg.tier_id
    where c.player_id=p_player and (c.player_id=auth.uid() or c.captain_id=auth.uid())
      and c.archived_at is null and not c.pending
      and (c.frozen_at is null or c.frozen_until <= public.user_today(c.captain_id))
      and (c.awaiting_plans_at is not null or public.user_today(c.captain_id) <= c.access_until +
        case when c.frozen_at is not null then greatest(0,
          public.user_today(c.captain_id) - (c.frozen_at at time zone public.safe_timezone(c.captain_id))::date)
        else 0 end)
      and t.archived_at is null;
end; $$;

commit;
