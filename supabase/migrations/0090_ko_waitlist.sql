create table public.ko_waitlist (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now()
);

alter table public.ko_waitlist enable row level security;
revoke all on public.ko_waitlist from public, anon, authenticated;
grant select, insert on public.ko_waitlist to authenticated;

create policy active_caller on public.ko_waitlist as restrictive for all to authenticated
  using (not (select public.is_suspended()))
  with check (not (select public.is_suspended()));
create policy permanent_account on public.ko_waitlist as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'is_anonymous') is distinct from 'true')
  with check ((select auth.jwt() ->> 'is_anonymous') is distinct from 'true');

create policy read_waitlist on public.ko_waitlist for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- A profile lookup keeps role validation under RLS without a privileged RPC.
create policy join_waitlist on public.ko_waitlist for insert to authenticated
  with check (user_id = (select auth.uid()) and role = (
    select p.role from public.profiles p where p.id = (select auth.uid())
  ));
