-- A new relationship must not restore access to a previous captain's content.
create function public.player_can_read_from(p_captain uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.coach_clients
    where player_id = (select auth.uid()) and captain_id = p_captain
      and archived_at is null and current_date <= access_until + 3
  );
$$;

revoke all on function public.player_can_read_from(uuid) from public, anon;
grant execute on function public.player_can_read_from(uuid) to authenticated;

alter policy programs_player_select on public.programs
  using (player_id = (select auth.uid()) and status = 'active'
    and public.player_can_read_from(captain_id));

alter policy nutrition_plans_player_select on public.nutrition_plans
  using (player_id = (select auth.uid()) and status = 'active'
    and public.player_can_read_from(captain_id));

-- Child policies use these definers, so the parent policies alone are insufficient.
create or replace function public.can_read_program(p_program uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.programs p
    where p.id = p_program
      and (p.captain_id = (select auth.uid())
           or (p.player_id = (select auth.uid()) and p.status = 'active'
               and public.player_can_read_from(p.captain_id)))
  );
$$;

create or replace function public.can_read_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.nutrition_plans p
    where p.id = p_plan
      and (p.captain_id = (select auth.uid())
           or (p.player_id = (select auth.uid()) and p.status = 'active'
               and public.player_can_read_from(p.captain_id)))
  );
$$;
