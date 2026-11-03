alter table public.profiles add column role_confirmed boolean not null default false;

update public.profiles p set role_confirmed = true
from auth.users u where u.id = p.id and u.raw_user_meta_data ->> 'role' in ('captain', 'player');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, full_name, role_confirmed)
  values (new.id,
    case when new.raw_user_meta_data ->> 'role' = 'captain' then 'captain'::public.user_role
      else 'player'::public.user_role end,
    coalesce(left(new.raw_user_meta_data ->> 'full_name', 80), ''),
    coalesce(new.raw_user_meta_data ->> 'role' in ('captain', 'player'), false));
  return new;
end;
$$;

-- Only the definer RPC can change authorization columns. Client-editable JWT metadata cannot bypass this.
create or replace function public.guard_profile_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role or new.plan is distinct from old.plan
    or new.role_confirmed is distinct from old.role_confirmed
    or new.created_at is distinct from old.created_at then
    if current_user in ('anon', 'authenticated') then
      raise exception 'role and plan cannot be changed by the user' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create function public.confirm_role(p_role public.user_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set role = p_role, role_confirmed = true
  where id = (select auth.uid()) and not role_confirmed
    and created_at > now() - interval '1 hour' and p_role is not null;
  if not found then
    raise exception 'role confirmation not allowed' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.confirm_role(public.user_role) from public, anon;
grant execute on function public.confirm_role(public.user_role) to authenticated;

create function public.invite_preview(p_code text)
returns table (captain_name text, valid boolean)
language sql stable security definer set search_path = '' as $$
  select max(case when i.expires_at > now() and i.redeemed_at is null
      then split_part(trim(p.full_name), ' ', 1) end),
    coalesce(bool_or(i.expires_at > now() and i.redeemed_at is null), false)
  from public.coach_invites i join public.profiles p on p.id = i.captain_id
  where i.code = p_code;
$$;
revoke all on function public.invite_preview(text) from public;
grant execute on function public.invite_preview(text) to anon, authenticated;
