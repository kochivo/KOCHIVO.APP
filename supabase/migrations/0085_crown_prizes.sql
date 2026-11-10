create table public.crown_prizes (
  captain_id uuid references public.profiles(id) on delete cascade,
  month date check (month = date_trunc('month', month)),
  prize text not null check (char_length(btrim(prize)) between 2 and 120),
  updated_at timestamptz not null default now(),
  primary key (captain_id, month)
);
alter table public.crown_prizes enable row level security;
create trigger crown_prizes_updated_at before update on public.crown_prizes
  for each row execute function public.touch_updated_at();
revoke all on public.crown_prizes from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.crown_prizes to authenticated;

create policy captain_prizes on public.crown_prizes for all to authenticated
  using (captain_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'captain')
    and month >= date_trunc('month', now() at time zone 'Africa/Cairo')::date
    and month <= (date_trunc('month', now() at time zone 'Africa/Cairo') + interval '1 month')::date)
  with check (captain_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'captain')
    and month >= date_trunc('month', now() at time zone 'Africa/Cairo')::date
    and month <= (date_trunc('month', now() at time zone 'Africa/Cairo') + interval '1 month')::date);
create policy player_prizes on public.crown_prizes for select to authenticated
  using (case when (select public.is_suspended()) then false
    else captain_id = (select public.my_captain_id()) end);
create policy active_caller on public.crown_prizes as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
