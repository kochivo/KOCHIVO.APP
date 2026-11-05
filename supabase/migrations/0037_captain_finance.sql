-- Captain finance: price packages for players, renewals paid in installments, and dues.
-- Money changes hands outside the app (cash, InstaPay, wallets); the captain records it here.

create table public.captain_packages (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  price_egp int not null check (price_egp between 0 and 100000),
  days int not null check (days between 1 and 365),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index captain_packages_captain on public.captain_packages(captain_id, created_at);
alter table public.captain_packages enable row level security;
revoke all on public.captain_packages from public, anon, authenticated;
grant select, insert, update (name, price_egp, days, archived_at) on public.captain_packages to authenticated;
-- Archived, never deleted: old renewals keep pointing at the package they were sold as.
create policy captain_packages_owner on public.captain_packages for all to authenticated
  using (captain_id = (select auth.uid()))
  with check (captain_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'captain'));

create policy active_caller on public.captain_packages as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));

-- price_egp is what the renewal costs; amount_egp stays what was paid on the day. Null price means
-- an older renewal with no price recorded, which owes nothing.
alter table public.player_payments
  add column package_id uuid references public.captain_packages(id) on delete set null,
  add column price_egp int check (price_egp between 0 and 100000),
  add constraint player_payments_paid_within_price check (price_egp is null or coalesce(amount_egp, 0) <= price_egp);
create index player_payments_package on public.player_payments(package_id);

create table public.payment_collections (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.player_payments(id) on delete cascade,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  amount_egp int not null check (amount_egp between 1 and 100000),
  created_at timestamptz not null default now()
);
create index payment_collections_payment on public.payment_collections(payment_id);
create index payment_collections_captain_created on public.payment_collections(captain_id, created_at desc);
create index payment_collections_player on public.payment_collections(player_id);
alter table public.payment_collections enable row level security;
revoke all on public.payment_collections from public, anon, authenticated;
grant select on public.payment_collections to authenticated;
create policy active_caller on public.payment_collections as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy payment_collections_captain_select on public.payment_collections for select to authenticated
  using (captain_id = (select auth.uid()));
create policy payment_collections_player_select on public.payment_collections for select to authenticated
  using (player_id = (select auth.uid()));

create function security_private.payment_due(p_payment uuid) returns int
language sql stable security definer set search_path = '' as $$
  select greatest(0, coalesce(p.price_egp, 0) - coalesce(p.amount_egp, 0)
    - coalesce((select sum(c.amount_egp) from public.payment_collections c where c.payment_id = p.id), 0))::int
  from public.player_payments p where p.id = p_payment;
$$;
revoke all on function security_private.payment_due(uuid) from public, anon, authenticated;

drop function public.renew_player(uuid, int, int);
create function public.renew_player(p_player uuid, p_days int default null, p_amount int default null,
  p_price int default null, p_package uuid default null)
returns date language plpgsql security definer set search_path = '' as $$
declare
  v_relationship uuid;
  v_access date;
  v_start date;
  v_end date;
  v_package public.captain_packages;
begin
  if public.is_suspended() or not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'captain'
  ) then
    raise exception 'active captain required' using errcode = '42501';
  end if;
  select id, access_until into v_relationship, v_access from public.coach_clients
    where captain_id = (select auth.uid()) and player_id = p_player and archived_at is null
    for update;
  if not found then
    raise exception 'active captain relationship required' using errcode = '42501';
  end if;
  if p_package is not null then
    select * into v_package from public.captain_packages
      where id = p_package and captain_id = (select auth.uid()) and archived_at is null;
    if not found then raise exception 'package not found' using errcode = 'P0002'; end if;
    p_days := v_package.days;
    p_price := coalesce(p_price, v_package.price_egp);
  end if;
  if p_days is null or p_days not between 1 and 365
    or (p_amount is not null and p_amount not between 0 and 100000)
    or (p_price is not null and p_price not between 0 and 100000)
    or (p_price is not null and coalesce(p_amount, 0) > p_price) then
    raise exception 'invalid days or amount' using errcode = '22023';
  end if;
  v_start := greatest(v_access + 1, current_date);
  v_end := v_start + p_days - 1;
  update public.coach_clients set access_until = v_end where id = v_relationship;
  insert into public.player_payments (captain_id, player_id, amount_egp, days, period_start, period_end, price_egp, package_id)
    values (auth.uid(), p_player, p_amount, p_days, v_start, v_end, p_price, p_package);
  return v_end;
end;
$$;
revoke all on function public.renew_player(uuid, int, int, int, uuid) from public, anon, authenticated;
grant execute on function public.renew_player(uuid, int, int, int, uuid) to authenticated;

-- Pays off the oldest dues first and returns what the player still owes.
create function public.collect_player_payment(p_player uuid, p_amount int)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_left int := p_amount;
  v_payment record;
  v_take int;
  v_due int;
begin
  if public.is_suspended() or not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'captain'
  ) then
    raise exception 'active captain required' using errcode = '42501';
  end if;
  if p_amount is null or p_amount not between 1 and 100000 then
    raise exception 'invalid amount' using errcode = '22023';
  end if;
  perform 1 from public.coach_clients where captain_id = (select auth.uid()) and player_id = p_player for update;
  if not found then raise exception 'captain relationship required' using errcode = '42501'; end if;
  select coalesce(sum(security_private.payment_due(id)), 0) into v_due from public.player_payments
    where captain_id = (select auth.uid()) and player_id = p_player;
  if p_amount > v_due then raise exception 'more than the player owes' using errcode = '22023'; end if;
  for v_payment in select id from public.player_payments
    where captain_id = (select auth.uid()) and player_id = p_player and security_private.payment_due(id) > 0
    order by period_start, created_at, id loop
    exit when v_left = 0;
    v_take := least(v_left, security_private.payment_due(v_payment.id));
    insert into public.payment_collections (payment_id, captain_id, player_id, amount_egp)
      values (v_payment.id, (select auth.uid()), p_player, v_take);
    v_left := v_left - v_take;
  end loop;
  return v_due - p_amount;
end;
$$;
revoke all on function public.collect_player_payment(uuid, int) from public, anon, authenticated;
grant execute on function public.collect_player_payment(uuid, int) to authenticated;

create function public.captain_dues()
returns table (player_id uuid, due_egp int)
language sql stable security invoker set search_path = '' as $$
  select p.player_id, sum(greatest(0, coalesce(p.price_egp, 0) - coalesce(p.amount_egp, 0)
    - coalesce((select sum(c.amount_egp) from public.payment_collections c where c.payment_id = p.id), 0)))::int
  from public.player_payments p
  where p.captain_id = (select auth.uid()) and p.price_egp is not null
  group by p.player_id
  having sum(greatest(0, coalesce(p.price_egp, 0) - coalesce(p.amount_egp, 0)
    - coalesce((select sum(c.amount_egp) from public.payment_collections c where c.payment_id = p.id), 0))) > 0;
$$;
revoke all on function public.captain_dues() from public, anon;
grant execute on function public.captain_dues() to authenticated;
