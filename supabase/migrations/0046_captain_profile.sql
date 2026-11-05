create function public.valid_profile_social(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) <> 'object' then false else
    not exists (select 1 from jsonb_each(value) as entry(key, val)
      where key not in ('whatsapp','instagram','tiktok','facebook','youtube','x')
        or jsonb_typeof(val) <> 'string' or char_length(val #>> '{}') > 200)
    end;
$$;
revoke all on function public.valid_profile_social(jsonb) from public, anon;
grant execute on function public.valid_profile_social(jsonb) to authenticated, service_role;



alter table public.profiles
  add column bio text check (char_length(bio) <= 280),
  add column location text check (char_length(location) <= 80),
  add column units text not null default 'metric' check (units in ('metric','imperial')),
  add column avatar_path text,
  add column social jsonb not null default '{}' check (public.valid_profile_social(social));
grant update (bio, location, units, avatar_path, social) on public.profiles to authenticated;
-- The existing guard blocks protected columns by name, so new safe fields need no trigger change.
drop policy profiles_select_my_captain on public.profiles;

create function public.my_captain_profile()
returns table (full_name text, phone text, bio text, location text, avatar_path text, social jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_active_caller();
  return query select p.full_name, p.phone, p.bio, p.location, p.avatar_path, p.social
    from public.profiles p where p.id = public.my_captain_id();
end;
$$;
revoke all on function public.my_captain_profile() from public, anon;
grant execute on function public.my_captain_profile() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('captain-avatars','captain-avatars',true,524288,array['image/jpeg','image/webp']);
create policy captain_avatars_read on storage.objects for select to public
  using (bucket_id = 'captain-avatars');
create policy captain_avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'captain-avatars' and split_part(name,'/',1) = (select auth.uid())::text
    and position('/' in name) > 0 and (select public.require_active_caller()));
create policy captain_avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'captain-avatars' and split_part(name,'/',1) = (select auth.uid())::text
    and (select public.require_active_caller()))
  with check (bucket_id = 'captain-avatars' and split_part(name,'/',1) = (select auth.uid())::text);
create policy captain_avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'captain-avatars' and split_part(name,'/',1) = (select auth.uid())::text
    and (select public.require_active_caller()));
