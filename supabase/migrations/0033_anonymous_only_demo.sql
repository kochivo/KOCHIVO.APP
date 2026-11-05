-- Anonymous sign-in exists only for the demo. Without these guards an anonymous account could
-- skip create_demo_workspace and become a real captain (confirm_role) or a real player
-- (redeem_invite) with no email, outside the demo rate limit and never purged.

create function security_private.is_anonymous_user(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_anonymous from auth.users where id = p_user), false);
$$;

create function security_private.guard_anonymous_profile() returns trigger
language plpgsql security definer set search_path = '' as $$ begin
  -- The demo workspace confirms its captain and sets the expiry in one update.
  if new.role_confirmed and new.demo_expires_at is null and security_private.is_anonymous_user(new.id) then
    raise exception 'anonymous accounts are demo only' using errcode = '42501';
  end if;
  return new;
end; $$;
create trigger profiles_anonymous_guard before insert or update of role_confirmed, demo_expires_at on public.profiles
  for each row execute function security_private.guard_anonymous_profile();

create function security_private.guard_anonymous_client() returns trigger
language plpgsql security definer set search_path = '' as $$ begin
  if security_private.is_anonymous_user(new.player_id) then
    raise exception 'anonymous accounts are demo only' using errcode = '42501';
  end if;
  return new;
end; $$;
create trigger coach_clients_anonymous_guard before insert on public.coach_clients
  for each row execute function security_private.guard_anonymous_client();

-- Also removes anonymous accounts that never got a workspace (demo full, tab closed) after a day.
create or replace function security_private.purge_demo_workspaces() returns int
language plpgsql security definer set search_path = '' as $$
declare workspace record; ids uuid[]; total int := 0;
begin
  for workspace in select w.captain_id, w.player_ids from security_private.demo_workspaces w
    where w.expires_at <= now() or w.captain_id in
      (select id from public.profiles where demo_expires_at <= now()) for update loop
    ids := array_prepend(workspace.captain_id, workspace.player_ids);
    -- No storage cleanup: hosted Supabase forbids direct DELETE on storage.objects, and demo
    -- accounts cannot upload (demo players never sign in; the captain has no upload flow).
    delete from auth.users where id = any(ids);
    delete from security_private.demo_workspaces where captain_id = workspace.captain_id;
    total := total + 1;
  end loop;
  delete from auth.users u where u.is_anonymous and u.created_at <= now() - interval '24 hours'
    and not exists (select 1 from security_private.demo_workspaces w where w.captain_id = u.id);
  return total;
end; $$;

revoke all on function security_private.is_anonymous_user(uuid), security_private.guard_anonymous_profile(),
  security_private.guard_anonymous_client(), security_private.purge_demo_workspaces()
  from public, anon, authenticated;
