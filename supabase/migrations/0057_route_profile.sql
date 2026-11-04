-- Routing must see the caller's suspension even when active_caller hides other data.
create function public.my_route_profile()
returns table (role public.user_role, role_confirmed boolean, suspended_at timestamptz, is_admin boolean)
language sql stable security definer set search_path = '' as $$
  select p.role, p.role_confirmed, p.suspended_at, public.is_admin()
  from public.profiles p
  where p.id = (select auth.uid());
$$;

revoke all on function public.my_route_profile() from public, anon;
grant execute on function public.my_route_profile() to authenticated;
