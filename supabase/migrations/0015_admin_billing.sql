-- Owner SQL editor: insert into public.admins (user_id) values ('<profile-uuid>');
-- captain_plan and profiles.plan are superseded by captain_subscriptions; removal is deferred.
create table public.admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from public, anon, authenticated;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

create table public.plan_tiers (
  tier text primary key,
  price_egp int not null check (price_egp >= 0),
  player_limit int not null check (player_limit > 0),
  position smallint not null unique
);
insert into public.plan_tiers values
  ('entry', 0, 5, 0), ('champion', 399, 20, 1), ('legend', 699, 40, 2), ('empire', 1499, 100, 3);
alter table public.plan_tiers enable row level security;
revoke all on public.plan_tiers from public, anon, authenticated;
grant select on public.plan_tiers to authenticated;
create policy plan_tiers_select on public.plan_tiers for select to authenticated using (true);

create table public.captain_subscriptions (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid not null references public.profiles(id) on delete cascade,
  tier text not null references public.plan_tiers(tier),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  payment_ref text check (char_length(payment_ref) <= 80),
  amount_egp int not null,
  activated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index captain_subscriptions_captain_end on public.captain_subscriptions(captain_id, ends_at desc);
alter table public.captain_subscriptions enable row level security;
revoke all on public.captain_subscriptions from public, anon, authenticated;
grant select on public.captain_subscriptions to authenticated;
create policy captain_subscriptions_select on public.captain_subscriptions for select to authenticated
  using (captain_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'captain'));

create function public.current_tier(p_captain uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select s.tier from public.captain_subscriptions s
    join public.plan_tiers t on t.tier = s.tier
    where s.captain_id = p_captain and s.starts_at <= now() and s.ends_at > now()
    order by t.position desc, s.ends_at desc, s.id limit 1), 'entry');
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
  -- A suspended captain's old invites must not keep adding players.
  if exists (select 1 from public.profiles where id = new.captain_id and suspended_at is not null) then
    raise exception 'captain is suspended' using errcode = '42501';
  end if;
  select player_limit into v_limit from public.plan_tiers where tier = public.current_tier(new.captain_id);
  select count(*) into v_count from public.coach_clients
    where captain_id = new.captain_id and archived_at is null;
  if v_count >= v_limit then
    raise exception 'plan allows % active players', v_limit using errcode = 'P0001';
  end if;
  return new;
end;
$$;

alter table public.profiles add column suspended_at timestamptz;
create or replace function public.guard_profile_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role or new.plan is distinct from old.plan
    or new.role_confirmed is distinct from old.role_confirmed
    or new.suspended_at is distinct from old.suspended_at
    or new.created_at is distinct from old.created_at then
    if current_user in ('anon', 'authenticated') then
      raise exception 'role and plan cannot be changed by the user' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create function public.is_suspended() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and suspended_at is not null);
$$;
drop policy coach_invites_captain on public.coach_invites;
create policy coach_invites_captain_select on public.coach_invites for select to authenticated
  using (captain_id = (select auth.uid()));
create policy coach_invites_captain_delete on public.coach_invites for delete to authenticated
  using (captain_id = (select auth.uid()));
create policy coach_invites_captain_insert on public.coach_invites for insert to authenticated
  with check (captain_id = (select auth.uid()) and not (select public.is_suspended()));

create table public.admin_audit_log (
  id uuid primary key,
  admin_id uuid not null references public.profiles(id),
  action text not null check (action in ('activate_plan', 'suspend', 'unsuspend')),
  target_id uuid not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from public, anon, authenticated;
grant select on public.admin_audit_log to authenticated;
create policy admin_audit_log_select on public.admin_audit_log for select to authenticated
  using ((select public.is_admin()));

create function public.admin_activate_plan(p_captain uuid, p_tier text, p_months int, p_payment_ref text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_start timestamptz;
  v_price int;
  v_id uuid;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if p_months is null or p_months not between 1 and 12 then
    raise exception 'months must be between 1 and 12' using errcode = '22023';
  end if;
  -- Lock the captain before reading the renewal queue, including scheduled renewals.
  perform 1 from public.profiles where id = p_captain and role = 'captain' for update;
  if not found then raise exception 'target must be a captain' using errcode = '22023'; end if;
  select price_egp into v_price from public.plan_tiers where tier = p_tier;
  if not found then raise exception 'unknown tier' using errcode = '22023'; end if;
  select greatest(now(), max(ends_at)) into v_start from public.captain_subscriptions
    where captain_id = p_captain and ends_at > now();
  insert into public.captain_subscriptions
    (captain_id, tier, starts_at, ends_at, payment_ref, amount_egp, activated_by)
    values (p_captain, p_tier, v_start, v_start + make_interval(months => p_months),
      p_payment_ref, v_price * p_months, auth.uid()) returning id into v_id;
  insert into public.admin_audit_log (id, admin_id, action, target_id, details)
    values (gen_random_uuid(), auth.uid(), 'activate_plan', p_captain,
      jsonb_build_object('subscription_id', v_id, 'tier', p_tier, 'months', p_months,
        'payment_ref', p_payment_ref, 'amount_egp', v_price * p_months));
  return v_id;
end;
$$;

create function public.admin_set_suspended(p_user uuid, p_suspended boolean, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if p_suspended and p_user = auth.uid() then
    raise exception 'cannot suspend yourself' using errcode = '42501';
  end if;
  if p_suspended is null then raise exception 'suspended is required' using errcode = '22023'; end if;
  update public.profiles set suspended_at = case when p_suspended then now() else null end where id = p_user;
  if not found then raise exception 'unknown user' using errcode = '22023'; end if;
  insert into public.admin_audit_log (id, admin_id, action, target_id, details)
    values (gen_random_uuid(), auth.uid(), case when p_suspended then 'suspend' else 'unsuspend' end,
      p_user, jsonb_build_object('reason', p_reason));
end;
$$;

create function public.admin_captains(p_search text default null, p_limit int default 50, p_offset int default 0)
returns table (id uuid, full_name text, email text, email_confirmed boolean, created_at timestamptz,
  tier text, tier_ends_at timestamptz, active_players int, player_limit int, suspended boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_search text;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  v_search := '%' || replace(replace(replace(p_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  return query
    select p.id, p.full_name, u.email::text, u.email_confirmed_at is not null, p.created_at,
      t.tier, s.ends_at,
      (select count(*)::int from public.coach_clients c where c.captain_id = p.id and c.archived_at is null),
      t.player_limit, p.suspended_at is not null
    from public.profiles p join auth.users u on u.id = p.id
    join public.plan_tiers t on t.tier = public.current_tier(p.id)
    left join lateral (select cs.ends_at from public.captain_subscriptions cs
      where cs.captain_id = p.id and cs.tier = t.tier and cs.starts_at <= now() and cs.ends_at > now()
      order by cs.ends_at desc, cs.id limit 1) s on true
    where p.role = 'captain' and (p_search is null or p.full_name ilike v_search or u.email ilike v_search)
    order by p.created_at desc, p.id
    limit least(greatest(coalesce(p_limit, 50), 0), 100) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.is_admin(), public.is_suspended(), public.current_tier(uuid),
  public.admin_activate_plan(uuid, text, int, text), public.admin_set_suspended(uuid, boolean, text),
  public.admin_captains(text, int, int) from public, anon, authenticated;
grant execute on function public.is_admin(), public.is_suspended(), public.current_tier(uuid),
  public.admin_activate_plan(uuid, text, int, text), public.admin_set_suspended(uuid, boolean, text),
  public.admin_captains(text, int, int) to authenticated;
revoke all on function public.enforce_player_limit(), public.guard_profile_update() from public, anon, authenticated;

-- Players join a captain only through redeem_invite (definer), so a captain can never attach a
-- player who did not accept. Captains may still archive a player or change access_until; the
-- relationship itself (who, since when) and un-archiving are fixed, which also closes the
-- plan-limit bypass of re-activating archived rows.
drop policy coach_clients_captain on public.coach_clients;
revoke insert on public.coach_clients from authenticated;
create policy coach_clients_captain_select on public.coach_clients for select to authenticated
  using (captain_id = (select auth.uid()));
create policy coach_clients_captain_update on public.coach_clients for update to authenticated
  using (captain_id = (select auth.uid())) with check (captain_id = (select auth.uid()));

create function public.guard_coach_client_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') and (
    new.captain_id is distinct from old.captain_id or new.player_id is distinct from old.player_id
    or new.started_on is distinct from old.started_on or new.created_at is distinct from old.created_at
    or (old.archived_at is not null and new.archived_at is distinct from old.archived_at)) then
    raise exception 'only access_until and archiving can change' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_coach_client_update() from public, anon, authenticated;
create trigger coach_clients_guard before update on public.coach_clients
  for each row execute function public.guard_coach_client_update();
