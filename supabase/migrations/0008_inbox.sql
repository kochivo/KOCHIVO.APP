-- 0008 unified inbox: weekly check-ins and form-check videos. The player writes the item;
-- the captain may only set the review fields (enforced by guard_review_update).

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  captain_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  body_weight_kg numeric(5, 1) check (body_weight_kg between 20 and 400),
  waist_cm numeric(5, 1) check (waist_cm between 30 and 300),
  notes text check (char_length(notes) <= 1000),
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  captain_reply text check (char_length(captain_reply) <= 1000),
  unique (player_id, week_start)
);

create table public.form_checks (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  captain_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  set_log_id uuid references public.set_logs (id) on delete set null,
  video_path text not null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  captain_reply text check (char_length(captain_reply) <= 1000)
);

create index check_ins_captain_open on public.check_ins (captain_id, created_at desc) where reviewed_at is null;
create index form_checks_captain_open on public.form_checks (captain_id, created_at desc) where reviewed_at is null;

-- captain_id always comes from the active relationship, never from the client.
create function public.set_inbox_captain()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.captain_id := (select captain_id from public.coach_clients where player_id = new.player_id and archived_at is null);
  if new.captain_id is null then
    raise exception 'no active captain' using errcode = 'P0002';
  end if;
  return new;
end;
$$;

create function public.guard_review_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'reviewed_at' - 'captain_reply') is distinct from (to_jsonb(old) - 'reviewed_at' - 'captain_reply') then
    raise exception 'only review fields can change' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger check_ins_captain before insert on public.check_ins for each row execute function public.set_inbox_captain();
create trigger form_checks_captain before insert on public.form_checks for each row execute function public.set_inbox_captain();
create trigger check_ins_review before update on public.check_ins for each row execute function public.guard_review_update();
create trigger form_checks_review before update on public.form_checks for each row execute function public.guard_review_update();

alter table public.check_ins enable row level security;
alter table public.form_checks enable row level security;
grant select, insert, update on public.check_ins, public.form_checks to authenticated;

create policy check_ins_player_select on public.check_ins for select to authenticated using (player_id = (select auth.uid()));
create policy check_ins_player_insert on public.check_ins for insert to authenticated
  with check (player_id = (select auth.uid()) and public.player_can_write());
create policy check_ins_captain_select on public.check_ins for select to authenticated using (captain_id = (select auth.uid()));
create policy check_ins_captain_review on public.check_ins for update to authenticated
  using (captain_id = (select auth.uid())) with check (captain_id = (select auth.uid()));

create policy form_checks_player_select on public.form_checks for select to authenticated using (player_id = (select auth.uid()));
create policy form_checks_player_insert on public.form_checks for insert to authenticated
  with check (player_id = (select auth.uid()) and public.player_can_write());
create policy form_checks_captain_select on public.form_checks for select to authenticated using (captain_id = (select auth.uid()));
create policy form_checks_captain_review on public.form_checks for update to authenticated
  using (captain_id = (select auth.uid())) with check (captain_id = (select auth.uid()));

-- One list for the captain's inbox screen. security_invoker keeps the tables' RLS in force.
create view public.inbox_items with (security_invoker = true) as
  select id, 'check_in'::text as kind, player_id, captain_id, created_at, reviewed_at from public.check_ins
  union all
  select id, 'form_check'::text, player_id, captain_id, created_at, reviewed_at from public.form_checks;

grant select on public.inbox_items to authenticated;
