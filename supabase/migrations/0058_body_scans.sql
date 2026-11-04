create table public.body_scans (
  id uuid primary key,
  player_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  scan_date date not null check (scan_date <= (now() at time zone 'Africa/Cairo')::date),
  weight_kg numeric(5,1) check (weight_kg between 20 and 400),
  muscle_kg numeric(4,1) check (muscle_kg between 5 and 150),
  fat_pct numeric(4,1) check (fat_pct between 3 and 70),
  file_path text check (length(file_path) <= 300 and starts_with(file_path, player_id::text || '/')),
  created_at timestamptz not null default now(),
  check (num_nonnulls(weight_kg, muscle_kg, fat_pct) >= 1),
  unique (player_id, scan_date)
);
alter table public.body_scans enable row level security;
revoke all on public.body_scans from public, anon, authenticated;
grant select, insert, update, delete on public.body_scans to authenticated;
create policy active_caller on public.body_scans as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy body_scans_owner on public.body_scans for all to authenticated
  using (player_id = (select auth.uid())) with check (player_id = (select auth.uid()));
create policy body_scans_coach on public.body_scans for select to authenticated
  using (public.is_captain_of(player_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('body-scans', 'body-scans', false, 5242880, array['image/jpeg','image/webp','application/pdf']);
create policy body_scans_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'body-scans' and public.storage_owner(name) = (select auth.uid())
    and name ~ '^[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|webp|pdf)$');
create policy body_scans_read on storage.objects for select to authenticated
  using (bucket_id = 'body-scans' and (public.storage_owner(name) = (select auth.uid())
    or public.is_captain_of(public.storage_owner(name))));
create policy body_scans_delete on storage.objects for delete to authenticated
  using (bucket_id = 'body-scans' and public.storage_owner(name) = (select auth.uid()));
create policy active_caller_body_scans on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'body-scans' or not (select public.is_suspended()))
  with check (bucket_id <> 'body-scans' or not (select public.is_suspended()));
