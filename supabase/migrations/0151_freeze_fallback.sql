begin;
create table public.captain_freeze_settings (
  captain_id uuid primary key references public.profiles(id) on delete cascade,
  default_days int check (default_days between 0 and 90),
  updated_at timestamptz not null default now()
);
alter table public.captain_freeze_settings enable row level security;
revoke all on public.captain_freeze_settings from public,anon,authenticated;
grant select,insert,update on public.captain_freeze_settings to authenticated;
create policy active_caller on public.captain_freeze_settings as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy freeze_settings_owner on public.captain_freeze_settings for all to authenticated
  using (captain_id=(select auth.uid()) and exists (
    select 1 from public.profiles where id=(select auth.uid()) and role='captain'))
  with check (captain_id=(select auth.uid()) and exists (
    select 1 from public.profiles where id=(select auth.uid()) and role='captain'));

create or replace function security_private.freeze_allowance(p_player uuid,p_captain uuid) returns int
language sql stable security definer set search_path='' as $$
  select greatest(0,coalesce(pkg.max_freeze_days,matched.max_freeze_days,settings.default_days,0)-coalesce((
    select sum(r.days)::int from public.freeze_requests r
    where r.player_id=p_player and r.captain_id=p_captain and r.status='approved'
      and (r.decided_at at time zone captain.timezone)::date between p.period_start and p.period_end
  ),0)) from public.profiles captain
  cross join lateral (select payment.* from public.player_payments payment
    where payment.player_id=p_player and payment.captain_id=p_captain
      and public.user_today(p_captain) between payment.period_start and payment.period_end
    order by payment.period_start desc,payment.created_at desc,payment.id desc limit 1) p
  left join public.captain_packages pkg on pkg.id=p.package_id and pkg.captain_id=p_captain
  left join lateral (
    select candidate.max_freeze_days from public.captain_packages candidate
    where candidate.captain_id=p_captain and candidate.archived_at is null
      and candidate.kind='days' and candidate.max_freeze_days is not null
      -- Payment days include offer bonuses (0099); match the paid duration only.
      and candidate.days=p.days-coalesce(p.bonus_days,0)
    order by candidate.created_at desc,candidate.id desc limit 1
  ) matched on true
  left join public.captain_freeze_settings settings on settings.captain_id=p_captain
  where captain.id=p_captain;
$$;
revoke all on function security_private.freeze_allowance(uuid,uuid) from public,anon,authenticated;
commit;
