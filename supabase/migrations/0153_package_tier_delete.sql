begin;

grant delete on public.captain_packages to authenticated;

-- Keep the existing owner and suspension policies, and limit the new grant to unused archived-tier durations.
create policy delete_archived_tier_duration on public.captain_packages as restrictive for delete to authenticated
  using (
    exists (select 1 from public.captain_package_tiers t
      where t.id = tier_id and t.captain_id = (select auth.uid()) and t.archived_at is not null)
    and not exists (select 1 from public.player_payments p where p.package_id = captain_packages.id)
  );

-- The legacy foreign key uses SET NULL. Recheck after the row lock even for a direct DELETE.
create function security_private.keep_paid_package_duration()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user = 'authenticated' and exists (select 1 from public.player_payments p where p.package_id = old.id) then
    raise exception 'duration has payment history' using errcode = '23503';
  end if;
  return old;
end;
$$;
revoke all on function security_private.keep_paid_package_duration() from public, anon, authenticated;
create trigger keep_paid_package_duration before delete on public.captain_packages
  for each row execute function security_private.keep_paid_package_duration();

create function public.package_tier_deletable(tier public.captain_package_tiers)
returns boolean language sql stable security invoker set search_path = '' as $$
  select coalesce(tier.captain_id = (select auth.uid()) and tier.archived_at is not null
    and not exists (select 1 from public.player_payments p where p.tier_id = tier.id)
    and not exists (
      select 1 from public.captain_packages d
      where d.tier_id = tier.id and (
        exists (select 1 from public.player_payments p where p.package_id = d.id)
        or exists (select 1 from public.coach_join_requests j where j.package_id = d.id)
        or exists (select 1 from public.player_renewal_requests r where r.package_id = d.id)
        or exists (select 1 from public.coach_invites i where i.package_id = d.id)
      )
    ), false);
$$;

create function public.delete_archived_package_tier(p_tier uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  tier public.captain_package_tiers;
begin
  perform public.require_active_caller();
  select * into tier from public.captain_package_tiers t
    where t.id = p_tier and t.captain_id = (select auth.uid()) and t.archived_at is not null
    for update;
  if not found then
    raise exception 'archived package unavailable' using errcode = '42501';
  end if;

  -- Foreign-key inserts need a key-share lock, so no new references can race the check.
  perform 1 from public.captain_packages d
    where d.tier_id = tier.id and d.captain_id = tier.captain_id order by d.id for update;
  if not public.package_tier_deletable(tier) then
    return false;
  end if;

  delete from public.captain_packages d where d.tier_id = tier.id and d.captain_id = tier.captain_id;
  delete from public.captain_package_tiers t where t.id = tier.id and t.captain_id = tier.captain_id;
  return found;
end;
$$;

revoke all on function public.package_tier_deletable(public.captain_package_tiers),
  public.delete_archived_package_tier(uuid) from public, anon, authenticated;
grant execute on function public.package_tier_deletable(public.captain_package_tiers),
  public.delete_archived_package_tier(uuid) to authenticated;

commit;
