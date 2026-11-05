-- is_suspended() (0015) is a stable definer with an empty search_path. Its owner
-- bypasses profiles RLS; do not FORCE RLS on profiles or make it an invoker.
create policy active_caller on public.profiles as restrictive for select to authenticated
  using (id = (select auth.uid()) or not (select public.is_suspended()));
create policy active_caller_insert on public.profiles as restrictive for insert to authenticated
  with check (not (select public.is_suspended()));
create policy active_caller_delete on public.profiles as restrictive for delete to authenticated
  using (not (select public.is_suspended()));
create policy active_caller on public.coach_clients as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.coach_invites as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.exercises as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.programs as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.program_days as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.program_exercises as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.workout_sessions as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.set_logs as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.foods as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.nutrition_plans as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.meals as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.meal_items as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.meal_item_alternatives as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.meal_logs as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.check_ins as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.form_checks as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.player_intake as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.admins as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.plan_tiers as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.captain_subscriptions as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.admin_audit_log as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.player_payments as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on storage.objects as restrictive for all to authenticated
  using (bucket_id not in ('checkin-photos', 'form-videos') or not (select public.is_suspended()))
  with check (bucket_id not in ('checkin-photos', 'form-videos') or not (select public.is_suspended()));
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select not public.is_suspended() and exists (
    select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- Also used by RLS helpers; no table reads here apart from the non-recursive definer.
create function public.require_active_caller() returns boolean
language plpgsql stable security invoker set search_path = '' as $$ begin
  if public.is_suspended() then raise exception 'account suspended' using errcode = '42501'; end if;
  return true;
end;
$$;
revoke all on function public.require_active_caller() from public, anon;
grant execute on function public.require_active_caller() to authenticated;
-- Keep profile tampering an explicit 42501, rather than silently updating zero rows.
create policy active_caller_update on public.profiles as restrictive for update to authenticated
  using ((select public.require_active_caller())) with check (not (select public.is_suspended()));

-- CASE keeps the profile exception safe even when the planner evaluates permissive
-- policies before the restrictive predicate. Never call a rejecting helper here.
alter policy profiles_select_my_players on public.profiles using (
  case when public.is_suspended() then false else public.is_captain_of(id) end);
alter policy profiles_select_my_captain on public.profiles using (
  case when public.is_suspended() then false else id = public.my_captain_id() end);
create or replace function public.is_captain_of(p_player uuid)
returns boolean language plpgsql stable security definer set search_path = ''
as $$ begin
  perform public.require_active_caller();
  return (
  select exists (
    select 1 from public.coach_clients
    where captain_id = (select auth.uid()) and player_id = p_player and archived_at is null
  ));
end;
$$;
create or replace function public.player_can_write()
returns boolean language plpgsql stable security definer set search_path = ''
as $$ begin
  perform public.require_active_caller();
  return (
  select exists (
    select 1 from public.coach_clients
    where player_id = (select auth.uid()) and archived_at is null and current_date <= access_until
  ));
end;
$$;
create or replace function public.my_captain_id()
returns uuid language plpgsql stable security definer set search_path = ''
as $$ begin
  perform public.require_active_caller();
  return (
  select captain_id from public.coach_clients where player_id = (select auth.uid()) and archived_at is null);
end;
$$;
create or replace function public.redeem_invite(p_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_invite public.coach_invites;
  v_id uuid;
begin
  perform public.require_active_caller();
  if (select role from public.profiles where id = (select auth.uid())) <> 'player' then
    raise exception 'only players can redeem invites' using errcode = '42501';
  end if;
  select * into v_invite from public.coach_invites
    where code = p_code and redeemed_at is null and expires_at > now() for update;
  if not found then
    raise exception 'invite is invalid or expired' using errcode = 'P0002';
  end if;
  insert into public.coach_clients (captain_id, player_id, access_until)
    values (v_invite.captain_id, (select auth.uid()), v_invite.access_until)
    returning id into v_id;
  update public.coach_invites set redeemed_by = (select auth.uid()), redeemed_at = now() where id = v_invite.id;
  return v_id;
end;
$$;
create or replace function public.can_edit_program(p_program uuid)
returns boolean language plpgsql stable security definer set search_path = ''
as $$ begin
  perform public.require_active_caller();
  return (
  select exists (select 1 from public.programs where id = p_program and captain_id = (select auth.uid())));
end;
$$;
create or replace function public.can_edit_plan(p_plan uuid)
returns boolean language plpgsql stable security definer set search_path = ''
as $$ begin
  perform public.require_active_caller();
  return (
  select exists (select 1 from public.nutrition_plans where id = p_plan and captain_id = (select auth.uid())));
end;
$$;
create or replace function public.owns_meal(p_meal uuid)
returns boolean language plpgsql stable security definer set search_path = ''
as $$ begin
  perform public.require_active_caller();
  return (
  select exists (
    select 1 from public.meals m join public.nutrition_plans p on p.id = m.plan_id
    where m.id = p_meal and p.player_id = (select auth.uid())
  ));
end;
$$;
create or replace function public.owns_session(p_session uuid)
returns boolean language plpgsql stable security definer set search_path = ''
as $$ begin
  perform public.require_active_caller();
  return (
  select exists (select 1 from public.workout_sessions where id = p_session and player_id = (select auth.uid())));
end;
$$;
create or replace function public.owns_program_day(p_day uuid)
returns boolean language plpgsql stable security definer set search_path = ''
as $$ begin
  perform public.require_active_caller();
  return (
  select exists (
    select 1 from public.program_days d join public.programs p on p.id = d.program_id
    where d.id = p_day and p.player_id = (select auth.uid())
  ));
end;
$$;
create or replace function public.owns_program_exercise(p_item uuid)
returns boolean language plpgsql stable security definer set search_path = ''
as $$ begin
  perform public.require_active_caller();
  return (
  select exists (
    select 1 from public.program_exercises e
    join public.program_days d on d.id = e.day_id
    join public.programs p on p.id = d.program_id
    where e.id = p_item and p.player_id = (select auth.uid())
  ));
end;
$$;
create or replace function public.confirm_role(p_role public.user_role)
returns void language plpgsql security definer set search_path = '' as $$ begin
  perform public.require_active_caller();
  update public.profiles set role = p_role, role_confirmed = true
  where id = (select auth.uid()) and not role_confirmed
    and created_at > now() - interval '1 hour' and p_role is not null;
  if not found then
    raise exception 'role confirmation not allowed' using errcode = '42501';
  end if;
end;
$$;
create or replace function public.invite_preview(p_code text)
returns table (captain_name text, valid boolean)
language plpgsql stable security definer set search_path = '' as $$ begin
  perform public.require_active_caller();
  return query
  select max(case when i.expires_at > now() and i.redeemed_at is null
      then split_part(trim(p.full_name), ' ', 1) end),
    coalesce(bool_or(i.expires_at > now() and i.redeemed_at is null), false)
  from public.coach_invites i join public.profiles p on p.id = i.captain_id
  where i.code = p_code;
end;
$$;
create or replace function public.request_account_deletion() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare v_due timestamptz;
begin
  perform public.require_active_caller();
  update public.profiles set deletion_requested_at = coalesce(deletion_requested_at, now())
    where id = (select auth.uid())
    returning deletion_requested_at + interval '7 days' into v_due;
  if v_due is null then raise exception 'authentication required' using errcode = '42501'; end if;
  return v_due;
end;
$$;
create or replace function public.cancel_account_deletion() returns void
language plpgsql security definer set search_path = '' as $$ begin
  perform public.require_active_caller();
  update public.profiles set deletion_requested_at = null where id = (select auth.uid());
  if not found then raise exception 'authentication required' using errcode = '42501'; end if;
end;
$$;
