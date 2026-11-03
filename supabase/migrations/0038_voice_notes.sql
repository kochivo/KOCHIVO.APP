-- Voice notes: short captain recordings for one player, optionally about a form check or check-in.
-- Files follow the private media convention <player_id>/<uuid>.<ext>, so the player owns the folder
-- and the read policy below matches the other private buckets.

create table public.voice_notes (
  id uuid primary key,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  audio_path text not null unique check (split_part(audio_path, '/', 1) = player_id::text),
  duration_seconds int not null check (duration_seconds between 1 and 120),
  context_kind text check (context_kind in ('form', 'checkin')),
  context_id uuid,
  listened_at timestamptz,
  created_at timestamptz not null default now(),
  check ((context_kind is null) = (context_id is null))
);
create index voice_notes_player_created on public.voice_notes(player_id, created_at desc);
create index voice_notes_captain_created on public.voice_notes(captain_id, created_at desc);
create index voice_notes_context on public.voice_notes(context_id) where context_id is not null;
alter table public.voice_notes enable row level security;
revoke all on public.voice_notes from public, anon, authenticated;
grant select, insert, delete on public.voice_notes to authenticated;
grant update (listened_at) on public.voice_notes to authenticated;

create policy active_caller on public.voice_notes as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy voice_notes_captain_select on public.voice_notes for select to authenticated
  using (captain_id = (select auth.uid()));
create policy voice_notes_captain_insert on public.voice_notes for insert to authenticated
  with check (captain_id = (select auth.uid()) and public.is_captain_of(player_id));
create policy voice_notes_captain_delete on public.voice_notes for delete to authenticated
  using (captain_id = (select auth.uid()));
create policy voice_notes_player_select on public.voice_notes for select to authenticated
  using (player_id = (select auth.uid()));
create policy voice_notes_player_listened on public.voice_notes for update to authenticated
  using (player_id = (select auth.uid())) with check (player_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('voice-notes', 'voice-notes', false, 2097152, array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg'])
on conflict (id) do nothing;

create policy voice_notes_captain_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'voice-notes' and public.is_captain_of(public.storage_owner(name)));
create policy voice_notes_read on storage.objects for select to authenticated
  using (bucket_id = 'voice-notes'
    and (public.storage_owner(name) = (select auth.uid()) or public.is_captain_of(public.storage_owner(name))));
-- Only the captain who recorded a note may remove its file.
create policy voice_notes_captain_delete on storage.objects for delete to authenticated
  using (bucket_id = 'voice-notes' and exists (select 1 from public.voice_notes v
    where v.audio_path = name and v.captain_id = (select auth.uid())));
create policy active_caller_voice on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'voice-notes' or not (select public.is_suspended()))
  with check (bucket_id <> 'voice-notes' or not (select public.is_suspended()));
