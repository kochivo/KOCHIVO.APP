-- T-340: a paused subscription has no effective expiry until plans are ready.
begin;

create or replace function public.player_can_read()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.coach_clients where player_id=(select auth.uid())
    and archived_at is null and not pending and frozen_at is null
    and (awaiting_plans_at is not null or public.user_today(captain_id) <= access_until + 3));
$$;

create or replace function public.player_can_read_from(p_captain uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.coach_clients where player_id=(select auth.uid()) and captain_id=p_captain
    and archived_at is null and not pending and frozen_at is null
    and (awaiting_plans_at is not null or public.user_today(captain_id) <= access_until + 3));
$$;

create or replace function public.player_can_write()
returns boolean language plpgsql stable security definer set search_path = '' as $$ begin
  perform public.require_active_caller();
  return exists (select 1 from public.coach_clients where player_id=(select auth.uid())
    and archived_at is null and not pending and frozen_at is null
    and (awaiting_plans_at is not null or public.user_today(captain_id) <= access_until));
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
      and c.archived_at is null and not c.pending and c.frozen_at is null
      and (c.awaiting_plans_at is not null or c.access_until>=public.user_today(c.captain_id))
      and t.archived_at is null;
end; $$;

-- Retain the latest feed's unrelated rules and ACLs. Abort on definition drift.
do $migration$
declare patch record; definition text;
begin
  definition := pg_catalog.pg_get_functiondef('public.ko_feed()'::regprocedure);
  for patch in select * from (values
    ($old$'captain_id',l.captain_id)$old$, $new$'captain_id',l.captain_id,'sessions_left',l.sessions_left)$new$),
    ($old$l.access_until between l.today and l.today+7$old$,
      $new$l.awaiting_plans_at is null and l.access_until between l.today and l.today+7$new$),
    ($old$l.access_until between l.today-7 and l.today-1$old$,
      $new$l.awaiting_plans_at is null and l.access_until between l.today-7 and l.today-1$new$),
    ($old$l.access_until>=l.today and not l.program$old$,
      $new$(l.awaiting_plans_at is not null or l.access_until>=l.today) and not l.program$new$),
    ($old$l.access_until>=l.today and not l.nutrition$old$,
      $new$(l.awaiting_plans_at is not null or l.access_until>=l.today) and not l.nutrition$new$)
  ) as patches(old_text,new_text)
  loop
    if position(patch.old_text in definition)=0 then raise exception 'waiting access feed drift: %',patch.old_text; end if;
    definition := replace(definition,patch.old_text,patch.new_text);
  end loop;
  execute definition;
end;
$migration$;

commit;
