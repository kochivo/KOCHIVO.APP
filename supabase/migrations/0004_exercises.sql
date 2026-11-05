-- 0004 exercise library. owner_id null = global (the GIF library seeded from supabase/seed/source/exercises-gif.json);
-- otherwise a captain's private custom exercise.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete cascade,
  dataset_id text unique,
  name_en text not null,
  name_ar text,
  body_part text not null,
  target text,
  equipment text,
  secondary_muscles text[] not null default '{}',
  instructions_ar text[],
  instructions_en text[] not null default '{}',
  media_path text,
  created_at timestamptz not null default now()
);

create index exercises_owner on public.exercises (owner_id);
create index exercises_body_part on public.exercises (body_part);

alter table public.exercises enable row level security;
grant select, insert, update, delete on public.exercises to authenticated;

-- Everyone signed in reads the global library; captains read their own; players read their captain's.
create policy exercises_select on public.exercises
  for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()) or owner_id = public.my_captain_id());

create policy exercises_owner_write on public.exercises
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select role from public.profiles where id = (select auth.uid())) = 'captain'
  );

create policy exercises_owner_update on public.exercises
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy exercises_owner_delete on public.exercises
  for delete to authenticated using (owner_id = (select auth.uid()));
