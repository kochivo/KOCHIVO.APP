create table public.supplements (
  id uuid primary key,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(name) between 1 and 60 and length(trim(name)) > 0),
  dose text not null default '' check (length(dose) <= 40),
  timing text not null check (timing in ('morning','pre_workout','post_workout','with_meal','before_bed','any')),
  notes text not null default '' check (length(notes) <= 300),
  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, player_id)
);
create index supplements_player_position on public.supplements(player_id, position);
create index supplements_captain on public.supplements(captain_id);
alter table public.supplements enable row level security;
revoke all on public.supplements from public, anon, authenticated;
grant select, insert, update on public.supplements to authenticated;
create policy active_caller on public.supplements as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy supplements_read on public.supplements for select to authenticated
  using ((captain_id = (select auth.uid()) and public.is_captain_of(player_id))
    or (player_id = (select auth.uid()) and public.player_can_read_from(captain_id)));
create policy supplements_insert on public.supplements for insert to authenticated
  with check (captain_id = (select auth.uid()) and public.is_captain_of(player_id));
create policy supplements_update on public.supplements for update to authenticated
  using (captain_id = (select auth.uid()) and public.is_captain_of(player_id))
  with check (captain_id = (select auth.uid()) and public.is_captain_of(player_id));

create table public.supplement_logs (
  id uuid primary key,
  supplement_id uuid not null,
  player_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  log_date date not null,
  taken_at timestamptz,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  foreign key (supplement_id, player_id) references public.supplements(id, player_id) on delete cascade,
  unique (supplement_id, log_date)
);
create index supplement_logs_player_date on public.supplement_logs(player_id, log_date);
alter table public.supplement_logs enable row level security;
revoke all on public.supplement_logs from public, anon, authenticated;
grant select, insert, delete on public.supplement_logs to authenticated;
grant update (taken_at, client_updated_at, deleted_at) on public.supplement_logs to authenticated;
create policy active_caller on public.supplement_logs as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy supplement_logs_read on public.supplement_logs for select to authenticated
  using (player_id = (select auth.uid()) or public.is_captain_of(player_id));
create policy supplement_logs_insert on public.supplement_logs for insert to authenticated
  with check (player_id = (select auth.uid()) and exists (
    select 1 from public.supplements s where s.id = supplement_id and s.player_id = (select auth.uid())
      and public.player_can_write()));
create policy supplement_logs_update on public.supplement_logs for update to authenticated
  using (player_id = (select auth.uid()) and public.player_can_write())
  with check (player_id = (select auth.uid()) and public.player_can_write());
create policy supplement_logs_delete on public.supplement_logs for delete to authenticated
  using (player_id = (select auth.uid()) and public.player_can_write());

create function public.sync_supplement_logs(p_rows jsonb) returns void
language sql security invoker set search_path = '' as $$
  insert into public.supplement_logs (id, supplement_id, log_date, taken_at, client_updated_at, deleted_at)
  select r.id, r.supplement_id, r.log_date, r.taken_at, r.client_updated_at, r.deleted_at
  from jsonb_to_recordset(p_rows) as r(id uuid, supplement_id uuid, log_date date,
    taken_at timestamptz, client_updated_at timestamptz, deleted_at timestamptz)
  on conflict (supplement_id, log_date) do update set
    taken_at = excluded.taken_at, client_updated_at = excluded.client_updated_at, deleted_at = excluded.deleted_at
  where public.supplement_logs.client_updated_at < excluded.client_updated_at;
$$;
revoke execute on function public.sync_supplement_logs(jsonb) from public, anon;
grant execute on function public.sync_supplement_logs(jsonb) to authenticated;
