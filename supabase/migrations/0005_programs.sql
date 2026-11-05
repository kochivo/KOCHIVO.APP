-- 0005 training programs. A template (is_template) has no player; an assigned program is a full
-- copy made by assign_program_template(), so later template edits never change a player's plan.

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid not null references public.profiles (id) on delete cascade,
  player_id uuid references public.profiles (id) on delete cascade,
  is_template boolean not null default false,
  source_template_id uuid references public.programs (id) on delete set null,
  title text not null check (char_length(title) between 1 and 80),
  notes text,
  -- { "advanced": bool } → shows RPE / Tempo columns (progressive disclosure, PRD §5)
  settings jsonb not null default '{"advanced": false}',
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_template_xor_player check (is_template = (player_id is null))
);

create index programs_captain on public.programs (captain_id);
create index programs_player on public.programs (player_id) where status = 'active';

create table public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  position smallint not null,
  title text not null default '' check (char_length(title) <= 60),
  unique (program_id, position) deferrable initially deferred
);

create table public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.program_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position smallint not null,
  -- same number within a day = played back-to-back as a superset
  superset_group smallint,
  sets smallint not null check (sets between 1 and 20),
  reps_min smallint not null check (reps_min between 1 and 100),
  reps_max smallint check (reps_max is null or reps_max >= reps_min),
  rest_seconds smallint not null default 90 check (rest_seconds between 0 and 900),
  rpe numeric(3, 1) check (rpe is null or rpe between 1 and 10),
  tempo text check (tempo is null or tempo ~ '^[0-9X]{4}$'),
  notes text,
  unique (day_id, position) deferrable initially deferred
);

create trigger programs_touch before update on public.programs
  for each row execute function public.touch_updated_at();

-- Owner check used by the child tables' policies.
create function public.can_edit_program(p_program uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.programs where id = p_program and captain_id = (select auth.uid()));
$$;

create function public.can_read_program(p_program uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.programs p
    where p.id = p_program
      and (p.captain_id = (select auth.uid())
           or (p.player_id = (select auth.uid()) and p.status = 'active' and public.player_can_read()))
  );
$$;

alter table public.programs enable row level security;
alter table public.program_days enable row level security;
alter table public.program_exercises enable row level security;
grant select, insert, update, delete on public.programs, public.program_days, public.program_exercises to authenticated;

create policy programs_captain on public.programs
  for all to authenticated
  using (captain_id = (select auth.uid()))
  with check (captain_id = (select auth.uid()) and (player_id is null or public.is_captain_of(player_id)));

-- Players read their own active, non-template programs while in access or grace period. Never templates.
create policy programs_player_select on public.programs
  for select to authenticated
  using (player_id = (select auth.uid()) and status = 'active' and public.player_can_read());

create policy program_days_select on public.program_days
  for select to authenticated using (public.can_read_program(program_id));
create policy program_days_write on public.program_days
  for all to authenticated using (public.can_edit_program(program_id)) with check (public.can_edit_program(program_id));

create policy program_exercises_select on public.program_exercises
  for select to authenticated
  using (public.can_read_program((select d.program_id from public.program_days d where d.id = day_id)));
create policy program_exercises_write on public.program_exercises
  for all to authenticated
  using (public.can_edit_program((select d.program_id from public.program_days d where d.id = day_id)))
  with check (public.can_edit_program((select d.program_id from public.program_days d where d.id = day_id)));

-- Deep copy a template to a player in one transaction. Runs as the caller, so RLS enforces ownership.
create function public.assign_program_template(p_template uuid, p_player uuid)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  v_program uuid;
  v_day record;
  v_new_day uuid;
begin
  if not public.is_captain_of(p_player) then
    raise exception 'not your player' using errcode = '42501';
  end if;

  insert into public.programs (captain_id, player_id, is_template, source_template_id, title, notes, settings, status)
    select captain_id, p_player, false, id, title, notes, settings, 'active'
    from public.programs where id = p_template and is_template and captain_id = (select auth.uid())
    returning id into v_program;
  if v_program is null then
    raise exception 'template not found' using errcode = 'P0002';
  end if;

  -- The previous active program for this player is archived, so "today" is unambiguous.
  update public.programs set status = 'archived'
    where player_id = p_player and status = 'active' and id <> v_program;

  for v_day in select * from public.program_days where program_id = p_template order by position loop
    insert into public.program_days (program_id, position, title)
      values (v_program, v_day.position, v_day.title) returning id into v_new_day;
    insert into public.program_exercises
      (day_id, exercise_id, position, superset_group, sets, reps_min, reps_max, rest_seconds, rpe, tempo, notes)
      select v_new_day, exercise_id, position, superset_group, sets, reps_min, reps_max, rest_seconds, rpe, tempo, notes
      from public.program_exercises where day_id = v_day.id;
  end loop;

  return v_program;
end;
$$;

grant execute on function public.assign_program_template(uuid, uuid) to authenticated;
