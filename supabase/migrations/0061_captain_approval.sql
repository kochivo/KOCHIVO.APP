alter table public.profiles
  add column captain_status text not null default 'approved'
    check (captain_status in ('pending', 'approved', 'rejected')),
  add column captain_reviewed_at timestamptz;

-- Password signup metadata can confirm the role in handle_new_user (0013),
-- bypassing confirm_role entirely. OAuth confirmation still uses that RPC.
create function security_private.pending_new_captain() returns trigger
language plpgsql set search_path = '' as $$ begin
  if new.role = 'captain' then new.captain_status := 'pending'; end if;
  return new;
end;
$$;
revoke all on function security_private.pending_new_captain() from public, anon, authenticated;
create trigger profiles_pending_captain before insert on public.profiles
  for each row execute function security_private.pending_new_captain();

-- Suspension remains distinct for profile editing, push registration and routing.
create function public.is_account_suspended() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and suspended_at is not null);
$$;
revoke all on function public.is_account_suspended() from public, anon;
grant execute on function public.is_account_suspended() to authenticated;

-- A new RPC keeps my_route_profile()'s 0057 return signature intact.
create function public.my_approval_route_profile()
returns table (role public.user_role, role_confirmed boolean, suspended_at timestamptz,
  is_admin boolean, captain_status text)
language sql stable security definer set search_path = '' as $$
  select p.role, p.role_confirmed, p.suspended_at, public.is_admin(), p.captain_status
    from public.profiles p where p.id = (select auth.uid());
$$;
revoke all on function public.my_approval_route_profile() from public, anon;
grant execute on function public.my_approval_route_profile() to authenticated;

create or replace function public.is_suspended() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and (p.suspended_at is not null or (p.role = 'captain' and p.captain_status <> 'approved'
      and not exists (select 1 from public.admins a where a.user_id = p.id))));
$$;

create or replace function public.confirm_role(p_role public.user_role)
returns void language plpgsql security definer set search_path = '' as $$ begin
  perform public.require_active_caller();
  update public.profiles set role = p_role, role_confirmed = true,
    captain_status = case when p_role = 'captain' and not public.is_admin() then 'pending' else 'approved' end
  where id = (select auth.uid()) and not role_confirmed
    and created_at > now() - interval '1 hour' and p_role is not null;
  if not found then
    raise exception 'role confirmation not allowed' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.guard_profile_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role or new.plan is distinct from old.plan
    or new.role_confirmed is distinct from old.role_confirmed
    or new.suspended_at is distinct from old.suspended_at
    or new.deletion_requested_at is distinct from old.deletion_requested_at
    or new.captain_status is distinct from old.captain_status
    or new.captain_reviewed_at is distinct from old.captain_reviewed_at
    or new.created_at is distinct from old.created_at then
    if current_user in ('anon', 'authenticated') then
      raise exception 'role and plan cannot be changed by the user' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- Preserve the explicit error for actually suspended callers (0026).
create function public.require_profile_caller() returns boolean
language plpgsql stable security invoker set search_path = '' as $$ begin
  if public.is_account_suspended() then
    raise exception 'account suspended' using errcode = '42501';
  end if;
  return true;
end;
$$;
revoke all on function public.require_profile_caller() from public, anon;
grant execute on function public.require_profile_caller() to authenticated;
alter policy active_caller_update on public.profiles
  using (id = (select auth.uid()) and (select public.require_profile_caller()))
  with check (id = (select auth.uid()) and not (select public.is_account_suspended()));
alter policy active_caller on public.push_subscriptions
  using (user_id = (select auth.uid()) and not (select public.is_account_suspended()))
  with check (user_id = (select auth.uid()) and not (select public.is_account_suspended()));

-- Definer invitation redemptions must also reject an unapproved target captain.
create function security_private.guard_captain_approval() returns trigger
language plpgsql security definer set search_path = '' as $$ begin
  if exists (select 1 from public.profiles p where p.id = new.captain_id
    and p.captain_status <> 'approved' and not exists
      (select 1 from public.admins a where a.user_id = p.id)) then
    raise exception 'captain approval required' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function security_private.guard_captain_approval() from public, anon, authenticated;
create trigger coach_clients_captain_approval before insert on public.coach_clients
  for each row execute function security_private.guard_captain_approval();

alter table public.admin_audit_log drop constraint admin_audit_log_action_check;
alter table public.admin_audit_log add constraint admin_audit_log_action_check
  check (action in ('activate_plan','suspend','unsuspend','approve_captain','reject_captain'));
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('plan_assigned','nutrition_updated','player_joined','player_inactive','join_requested',
    'workout_reminder','workout_feedback','sessions_used_up','captain_approved'));

create function public.admin_pending_captains()
returns table (id uuid, email text, full_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$ begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  return query select p.id, u.email::text, p.full_name, p.created_at
    from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'captain' and p.captain_status = 'pending'
      and not exists (select 1 from public.admins a where a.user_id = p.id)
    order by p.created_at, p.id;
end;
$$;

create function public.admin_review_captain(p_captain uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_previous text;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('approved','rejected') then
    raise exception 'invalid review status' using errcode = '22023';
  end if;
  select p.captain_status into v_previous from public.profiles p
    where p.id = p_captain and p.role = 'captain'
      and not exists (select 1 from public.admins a where a.user_id = p.id) for update;
  if not found or v_previous = 'approved' or v_previous = p_status then
    raise exception 'captain is not awaiting review' using errcode = '22023';
  end if;
  update public.profiles set captain_status = p_status, captain_reviewed_at = now() where id = p_captain;
  insert into public.admin_audit_log(id,admin_id,action,target_id,details)
    values (security_private.starter_uuidv7(), auth.uid(), case when p_status = 'approved' then 'approve_captain' else 'reject_captain' end,
      p_captain, jsonb_build_object('previous_status', v_previous, 'status', p_status));
  if p_status = 'approved' then
    insert into public.notifications(id,user_id,type)
      values (security_private.starter_uuidv7(),p_captain,'captain_approved');
  end if;
end;
$$;
revoke all on function public.admin_pending_captains(), public.admin_review_captain(uuid,text) from public, anon;
grant execute on function public.admin_pending_captains(), public.admin_review_captain(uuid,text) to authenticated;
