create function public.valid_captain_intake(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) <> 'object' then false else
    coalesce(value ?& array['current_tool','main_challenge','players_range']
      and (value - array['current_tool','main_challenge','players_range']) = '{}'::jsonb
      and value->>'current_tool' in ('whatsapp_excel','other_app','just_starting')
      and value->>'main_challenge' in ('time_on_tables','tracking_progress','unprofessional_look')
      and value->>'players_range' in ('1-10','11-50','50+'), false)
  end;
$$;
revoke all on function public.valid_captain_intake(jsonb) from public, anon;
grant execute on function public.valid_captain_intake(jsonb) to authenticated, service_role;

alter table public.profiles add column captain_intake jsonb
  check (captain_intake is null or public.valid_captain_intake(captain_intake));
grant update (captain_intake) on public.profiles to authenticated;

drop function public.admin_pending_captains();
create function public.admin_pending_captains()
returns table (id uuid, email text, full_name text, created_at timestamptz,
  whatsapp text, instagram text, captain_intake jsonb)
language plpgsql stable security definer set search_path = '' as $$ begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  return query select p.id, u.email::text, p.full_name, p.created_at,
    p.social->>'whatsapp', p.social->>'instagram', p.captain_intake
    from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'captain' and p.captain_status = 'pending'
      and not exists (select 1 from public.admins a where a.user_id = p.id)
    order by p.created_at, p.id;
end;
$$;
revoke all on function public.admin_pending_captains() from public, anon;
grant execute on function public.admin_pending_captains() to authenticated;
