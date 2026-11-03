insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('captain-food-photos', 'captain-food-photos', true, 1048576, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy captain_food_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'captain-food-photos');
create policy captain_food_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'captain-food-photos'
    and starts_with(name, (select auth.uid())::text || '/')
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'captain'));
create policy captain_food_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'captain-food-photos'
    and starts_with(name, (select auth.uid())::text || '/')
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'captain'));
create policy active_caller_food_photos on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'captain-food-photos' or not (select public.is_suspended()))
  with check (bucket_id <> 'captain-food-photos' or not (select public.is_suspended()));

alter table public.foods add constraint custom_food_photo_owner check (
  owner_id is null or photo_path is null
  or starts_with(photo_path, 'captain-food-photos/' || owner_id::text || '/')
);
