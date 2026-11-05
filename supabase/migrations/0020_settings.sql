alter table public.profiles
  add column invite_message text check (char_length(invite_message) <= 500),
  add column deletion_requested_at timestamptz;

create or replace function public.guard_profile_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role or new.plan is distinct from old.plan
    or new.role_confirmed is distinct from old.role_confirmed
    or new.suspended_at is distinct from old.suspended_at
    or new.deletion_requested_at is distinct from old.deletion_requested_at
    or new.created_at is distinct from old.created_at then
    if current_user in ('anon', 'authenticated') then
      raise exception 'role and plan cannot be changed by the user' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create function public.request_account_deletion() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare v_due timestamptz;
begin
  update public.profiles set deletion_requested_at = coalesce(deletion_requested_at, now())
    where id = (select auth.uid())
    returning deletion_requested_at + interval '7 days' into v_due;
  if v_due is null then raise exception 'authentication required' using errcode = '42501'; end if;
  return v_due;
end;
$$;

create function public.cancel_account_deletion() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set deletion_requested_at = null where id = (select auth.uid());
  if not found then raise exception 'authentication required' using errcode = '42501'; end if;
end;
$$;

create function public.purge_deleted_accounts() returns int
language plpgsql security definer set search_path = '' as $$
declare v_count int;
begin
  -- Admins are skipped: admin_audit_log and captain_subscriptions.activated_by keep a
  -- non-cascading reference to them, and one blocked row would abort the whole purge.
  delete from auth.users where id in
    (select p.id from public.profiles p where p.deletion_requested_at < now() - interval '7 days'
      and not exists (select 1 from public.admins a where a.user_id = p.id));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.request_account_deletion(), public.cancel_account_deletion(),
  public.purge_deleted_accounts() from public, anon, authenticated;
grant execute on function public.request_account_deletion(), public.cancel_account_deletion() to authenticated;

-- Owner setup: select cron.schedule('purge-deleted-accounts', '0 2 * * *', 'select public.purge_deleted_accounts()');
