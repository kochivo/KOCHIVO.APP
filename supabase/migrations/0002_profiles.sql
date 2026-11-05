-- 0002 profiles: one row per auth user. Role is chosen at sign-up and never changes.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null default '' check (char_length(full_name) <= 80),
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  timezone text not null default 'Africa/Cairo',
  plan public.captain_plan not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Sign-up passes { role: 'captain' | 'player', full_name } in user metadata. Default is player.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'captain' then 'captain'::public.user_role
         else 'player'::public.user_role end,
    coalesce(left(new.raw_user_meta_data ->> 'full_name', 80), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may edit their own name/phone/timezone, never role or plan (plan changes come from billing, server-side).
create function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role or new.plan is distinct from old.plan then
    if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
      raise exception 'role and plan cannot be changed by the user' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

alter table public.profiles enable row level security;
grant select, update on public.profiles to authenticated;

create policy profiles_select_self on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy profiles_update_self on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
