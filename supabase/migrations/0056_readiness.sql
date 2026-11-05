create table public.daily_checks (
  id uuid primary key,
  player_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  log_date date not null,
  sleep_hours smallint check (sleep_hours between 4 and 9),
  soreness smallint check (soreness between 1 and 5),
  water_ml integer not null default 0 check (water_ml between 0 and 10000),
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  unique (player_id, log_date)
);
create index daily_checks_player_date on public.daily_checks(player_id, log_date);
alter table public.daily_checks enable row level security;
revoke all on public.daily_checks from public, anon, authenticated;
grant select, insert, delete on public.daily_checks to authenticated;
grant update (sleep_hours, soreness, water_ml, client_updated_at, deleted_at) on public.daily_checks to authenticated;
create policy active_caller on public.daily_checks as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy daily_checks_read on public.daily_checks for select to authenticated
  using (player_id = (select auth.uid()) or public.is_captain_of(player_id));
create policy daily_checks_insert on public.daily_checks for insert to authenticated
  with check (player_id = (select auth.uid()) and public.player_can_write());
create policy daily_checks_update on public.daily_checks for update to authenticated
  using (player_id = (select auth.uid()) and public.player_can_write())
  with check (player_id = (select auth.uid()) and public.player_can_write());
create policy daily_checks_delete on public.daily_checks for delete to authenticated
  using (player_id = (select auth.uid()) and public.player_can_write());

create function public.sync_daily_checks(p_rows jsonb) returns void
language sql security invoker set search_path = '' as $$
  insert into public.daily_checks (id, log_date, sleep_hours, soreness, water_ml, client_updated_at, deleted_at)
  select r.id, r.log_date, r.sleep_hours, r.soreness, r.water_ml, r.client_updated_at, r.deleted_at
  from jsonb_to_recordset(p_rows) as r(id uuid, log_date date, sleep_hours smallint,
    soreness smallint, water_ml integer, client_updated_at timestamptz, deleted_at timestamptz)
  on conflict (player_id, log_date) do update set
    sleep_hours = excluded.sleep_hours, soreness = excluded.soreness, water_ml = excluded.water_ml,
    client_updated_at = excluded.client_updated_at, deleted_at = excluded.deleted_at
  where public.daily_checks.client_updated_at < excluded.client_updated_at;
$$;
revoke all on function public.sync_daily_checks(jsonb) from public, anon;
grant execute on function public.sync_daily_checks(jsonb) to authenticated;

create table public.readiness_decisions (
  id uuid primary key,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  decision_date date not null,
  decision text not null check (decision in ('keep', 'reduce', 'rest')),
  created_at timestamptz not null default now(),
  unique (player_id, decision_date)
);
create index readiness_decisions_captain on public.readiness_decisions(captain_id);
alter table public.readiness_decisions enable row level security;
revoke all on public.readiness_decisions from public, anon, authenticated;
grant select, insert on public.readiness_decisions to authenticated;
grant update (id, captain_id, player_id, decision_date, decision, created_at) on public.readiness_decisions to authenticated;
create policy active_caller on public.readiness_decisions as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy readiness_decisions_read on public.readiness_decisions for select to authenticated
  using ((captain_id = (select auth.uid()) and public.is_captain_of(player_id))
    or (player_id = (select auth.uid()) and public.player_can_read_from(captain_id)));
create policy readiness_decisions_insert on public.readiness_decisions for insert to authenticated
  with check (captain_id = (select auth.uid()) and public.is_captain_of(player_id));
create policy readiness_decisions_update on public.readiness_decisions for update to authenticated
  using (captain_id = (select auth.uid()) and public.is_captain_of(player_id))
  with check (captain_id = (select auth.uid()) and public.is_captain_of(player_id));
