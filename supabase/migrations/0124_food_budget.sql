alter table public.player_intake add column food_budget_monthly_egp integer
  check (food_budget_monthly_egp between 300 and 100000);

create table public.food_prices (
  food_id uuid not null references public.foods(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete cascade,
  unit text not null check (unit in ('kg','piece','pack')),
  unit_grams numeric not null check (unit_grams > 0 and unit_grams <= 100000 and (unit <> 'kg' or unit_grams = 1000)),
  price_egp numeric(10,2) not null check (price_egp > 0 and price_egp <> 'NaN'::numeric),
  updated_at timestamptz not null default now(),
  check (owner_id is null or owner_id <> '00000000-0000-0000-0000-000000000000'::uuid)
);
create unique index food_prices_food_owner on public.food_prices
  (food_id, (coalesce(owner_id,'00000000-0000-0000-0000-000000000000'::uuid)));
create index food_prices_owner on public.food_prices(owner_id);
create trigger food_prices_touch before update on public.food_prices
  for each row execute function public.touch_updated_at();
alter table public.food_prices enable row level security;
create policy active_caller on public.food_prices as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
grant select, insert, update, delete on public.food_prices to authenticated;

create policy food_prices_read on public.food_prices for select to authenticated using (
  owner_id is null or owner_id = (select auth.uid()) or exists (
    select 1 from public.coach_clients c where c.captain_id = owner_id
      and c.player_id = (select auth.uid()) and c.archived_at is null
  )
);
create policy food_prices_write on public.food_prices for all to authenticated
using (
  (owner_id is null and (select public.is_admin())) or
  (owner_id = (select auth.uid()) and exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'captain'
  ))
) with check (
  (owner_id is null and (select public.is_admin())) or
  (owner_id = (select auth.uid()) and exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'captain'
  ))
);
