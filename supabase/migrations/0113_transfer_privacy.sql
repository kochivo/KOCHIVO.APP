begin;

-- Storage read policies consult these message tables; bypass that RLS cycle only
-- for an exact bucket/path lookup constrained to the caller's uploader identity.
create or replace function public.audio_attachment_owned(path text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_active_caller();
  return exists (select 1 from storage.objects o where o.bucket_id = 'voice-notes'
    and o.name = path and o.owner_id = (select auth.uid())::text);
end;
$$;
revoke all on function public.audio_attachment_owned(text) from public, anon, authenticated;
grant execute on function public.audio_attachment_owned(text) to authenticated;

drop policy if exists voice_notes_captain_insert on public.voice_notes;
create policy voice_notes_captain_insert on public.voice_notes for insert to authenticated
  with check (captain_id = (select auth.uid()) and public.is_captain_of(player_id)
    and public.audio_attachment_owned(audio_path));

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and (
    (captain_id = (select auth.uid()) and public.is_captain_of(player_id)) or
    (player_id = (select auth.uid()) and captain_id = (select public.chat_current_captain())))
    and (audio_path is null or public.audio_attachment_owned(audio_path)));

-- Column grants currently forbid path edits. Keep ownership enforced if grants change,
-- without rechecking the recipient's ownership when only a read/listened timestamp changes.
create or replace function public.guard_audio_attachment() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.audio_path is not null and not public.audio_attachment_owned(new.audio_path) then
    raise exception 'audio attachment must reference an existing own upload' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_audio_attachment() from public, anon, authenticated;
drop trigger if exists voice_notes_audio_guard on public.voice_notes;
create trigger voice_notes_audio_guard before update of audio_path on public.voice_notes
  for each row execute function public.guard_audio_attachment();
drop trigger if exists chat_messages_audio_guard on public.chat_messages;
create trigger chat_messages_audio_guard before update of audio_path on public.chat_messages
  for each row execute function public.guard_audio_attachment();

-- The policy checks owner_id on the candidate row so INSERT ... RETURNING works.
-- Bound this privileged reference lookup to a related player or an existing own upload.
create or replace function public.voice_audio_upload_readable(path text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_active_caller();
  return (public.storage_owner(path) = (select auth.uid())
    or public.is_captain_of(public.storage_owner(path))
    or exists (select 1 from storage.objects o where o.bucket_id = 'voice-notes'
      and o.name = path and to_jsonb(o)->>'owner_id' = (select auth.uid())::text))
    and security_private.chat_audio_unreferenced(path);
end;
$$;
revoke all on function public.voice_audio_upload_readable(text) from public, anon, authenticated;
grant execute on function public.voice_audio_upload_readable(text) to authenticated;

drop policy if exists voice_notes_read on storage.objects;
create policy voice_notes_read on storage.objects for select to authenticated using (
  bucket_id = 'voice-notes' and (
    public.storage_owner(name) = (select auth.uid())
    or exists (select 1 from public.chat_messages m
      where m.audio_path = name and m.captain_id = (select auth.uid()))
    or exists (select 1 from public.voice_notes v
      where v.audio_path = name and v.captain_id = (select auth.uid()))
    or (to_jsonb(objects)->>'owner_id' = (select auth.uid())::text
      and public.voice_audio_upload_readable(name))
  ));

-- The existing private helper is not directly executable by authenticated callers.
-- Keep its privileged reference check behind the active-caller wrapper.
create or replace function public.chat_audio_cleanup_allowed(path text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_active_caller();
  return split_part(path, '/', 2) = 'chat'
    and exists (select 1 from storage.objects o where o.bucket_id = 'voice-notes'
      and o.name = path and (public.storage_owner(path) = (select auth.uid())
        or to_jsonb(o)->>'owner_id' = (select auth.uid())::text))
    and security_private.chat_audio_unreferenced(path);
end;
$$;
drop policy if exists chat_voice_cleanup on storage.objects;
create policy chat_voice_cleanup on storage.objects for delete to authenticated using (
  bucket_id = 'voice-notes' and public.chat_audio_cleanup_allowed(name));

drop policy if exists form_answers_insert on public.form_answers;
create policy form_answers_insert on public.form_answers for insert to authenticated with check (exists (
  select 1 from public.form_requests r where r.id = request_id
    and r.player_id = (select auth.uid()) and r.reviewed_at is null
    and exists (select 1 from public.coach_clients c where c.player_id = r.player_id
      and c.captain_id = r.captain_id and c.archived_at is null and not c.pending)));

create or replace function public.guard_custom_form_answer() returns trigger language plpgsql
  security definer set search_path = '' as $$
declare r public.form_requests;
begin
  select * into r from public.form_requests where id = new.request_id for update;
  if r.id is null or r.player_id is distinct from (select auth.uid()) or r.reviewed_at is not null then
    raise exception 'request is not answerable' using errcode = '42501';
  end if;
  -- Hold the link lock until the answer commits, serializing archival with new writes.
  perform 1 from public.coach_clients c where c.player_id = r.player_id
    and c.captain_id = r.captain_id and c.archived_at is null and not c.pending for share;
  if not found then
    raise exception 'request is not answerable' using errcode = '42501';
  end if;
  if not exists (select 1 from public.form_questions q where q.id = new.question_id and q.form_id = r.form_id) then
    raise exception 'question belongs to another form' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(new.photo_paths) p where p is null
    or p not like 'forms/' || r.player_id::text || '/' || r.id::text || '/%') then
    raise exception 'invalid form photo path' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop policy if exists custom_forms_photo_upload on storage.objects;
create policy custom_forms_photo_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'checkin-photos' and split_part(name,'/',1) = 'forms'
  and split_part(name,'/',2) = (select auth.uid())::text and public.player_can_write()
  and exists (select 1 from public.form_requests r where r.id::text = split_part(name,'/',3)
    and r.player_id = (select auth.uid()) and r.reviewed_at is null
    and exists (select 1 from public.coach_clients c where c.player_id = r.player_id
      and c.captain_id = r.captain_id and c.archived_at is null and not c.pending)));

commit;
