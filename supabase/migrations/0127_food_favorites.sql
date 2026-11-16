create table public.food_favorites (
  captain_id uuid not null references public.profiles(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (captain_id, food_id)
);
alter table public.food_favorites enable row level security;
revoke all on public.food_favorites from public, anon;
grant select, insert, delete on public.food_favorites to authenticated;
create policy owner_only on public.food_favorites for all to authenticated
  using (captain_id = (select auth.uid()))
  with check (captain_id = (select auth.uid()) and exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'captain'
  ));
create policy active_caller on public.food_favorites as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
