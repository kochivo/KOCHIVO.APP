-- 0009 storage buckets. Private media path convention: <player_id>/<uuid>.<ext>
-- so the first folder identifies the owner for RLS. Media access goes through core/storage
-- (signed URLs) so the backend can later move to Cloudflare R2 without touching features.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('checkin-photos', 'checkin-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('form-videos', 'form-videos', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm']),
  ('exercise-media', 'exercise-media', true, 1048576, array['image/gif', 'image/webp']),
  ('food-media', 'food-media', true, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create function public.storage_owner(p_name text)
returns uuid language sql immutable set search_path = ''
as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9a-f-]{36}$' then split_part(p_name, '/', 1)::uuid end;
$$;

create policy private_media_player_insert on storage.objects for insert to authenticated
  with check (
    bucket_id in ('checkin-photos', 'form-videos')
    and public.storage_owner(name) = (select auth.uid())
    and public.player_can_write()
  );

create policy private_media_read on storage.objects for select to authenticated
  using (
    bucket_id in ('checkin-photos', 'form-videos')
    and (public.storage_owner(name) = (select auth.uid()) or public.is_captain_of(public.storage_owner(name)))
  );

-- exercise-media / food-media are public-read buckets, written only by the seed script (service role).
