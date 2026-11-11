alter table public.profiles add column timezone_auto boolean not null default true;
grant update (timezone_auto) on public.profiles to authenticated;

-- Player RLS hides captain profiles; package labels need only this single safe field.
create function public.my_captain_timezone() returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'signed-in caller required' using errcode = '42501';
  end if;
  perform public.require_active_caller();
  return (select p.timezone from public.profiles p where p.id = public.my_captain_id());
end;
$$;
revoke all on function public.my_captain_timezone() from public, anon;
grant execute on function public.my_captain_timezone() to authenticated;
