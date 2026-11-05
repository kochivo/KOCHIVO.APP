-- The demo workspace has 8 sample players, more than Entry allows, so its plan card read
-- "8 of 5". Demo captains run on Champion without a subscription row, which keeps admin
-- billing history free of fake payments.
create or replace function security_private.current_tier(p_captain uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select s.tier from public.captain_subscriptions s
    join public.plan_tiers t on t.tier = s.tier
    where s.captain_id = p_captain and s.starts_at <= now() and s.ends_at > now()
    order by t.position desc, s.ends_at desc, s.id limit 1),
    (select 'champion' from public.profiles p where p.id = p_captain and p.demo_expires_at is not null),
    'entry');
$$;
revoke all on function security_private.current_tier(uuid) from public, anon, authenticated;
