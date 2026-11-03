-- 0012 player intake: private health data shared only with the active captain.
-- CHECK expressions cannot contain a subquery, so weekday uniqueness uses a pure helper.
create function public.valid_intake_training_days(days smallint[])
returns boolean language sql immutable set search_path = ''
as $$
  select coalesce(
    pg_catalog.array_ndims(days) = 1
    and pg_catalog.cardinality(days) between 1 and 7
    and days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    and pg_catalog.cardinality(days) = (
      select count(distinct day) from pg_catalog.unnest(days) as weekdays(day)
    ), false
  );
$$;

create table public.player_intake (
  player_id uuid primary key references public.profiles (id) on delete cascade,
  birth_year smallint not null check (birth_year between 1930 and extract(year from current_date)::int - 10),
  sex text not null check (sex in ('male', 'female')),
  height_cm numeric(5,1) not null check (height_cm between 100 and 250),
  weight_kg numeric(5,1) not null check (weight_kg between 25 and 300),
  target_weight_kg numeric(5,1) check (target_weight_kg between 25 and 300),
  training_days smallint[] not null check (public.valid_intake_training_days(training_days)),
  session_minutes smallint not null check (session_minutes in (30, 45, 60, 90)),
  experience text not null check (experience in ('new', 'under_1y', '1_3y', 'over_3y')),
  injuries text[] not null default '{}',
  allergies text[] not null default '{}',
  medical text[] not null default '{}',
  notes text check (char_length(notes) <= 500),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger player_intake_touch before update on public.player_intake
  for each row execute function public.touch_updated_at();

alter table public.player_intake enable row level security;
revoke all on public.player_intake from public, anon;
grant select, insert, update on public.player_intake to authenticated;

create policy player_intake_player_select on public.player_intake
  for select to authenticated using (player_id = (select auth.uid()));

create policy player_intake_player_insert on public.player_intake
  for insert to authenticated with check (player_id = (select auth.uid()));

create policy player_intake_player_update on public.player_intake
  for update to authenticated
  using (player_id = (select auth.uid()))
  with check (player_id = (select auth.uid()));

create policy player_intake_captain_select on public.player_intake
  for select to authenticated using (public.is_captain_of(player_id));
