begin;
create table public.chat_messages (
  id uuid primary key,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null check (sender_id in (captain_id, player_id)),
  body text check (body = btrim(body) and char_length(body) between 1 and 1000),
  audio_path text unique check (split_part(audio_path, '/', 1) = player_id::text),
  duration_seconds int check (duration_seconds between 1 and 120),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check ((body is null) <> (audio_path is null)),
  check ((duration_seconds is null) = (audio_path is null))
);
create index chat_messages_player_created on public.chat_messages(player_id, created_at desc);
create index chat_messages_captain_created on public.chat_messages(captain_id, created_at desc);
create index chat_messages_unread on public.chat_messages(captain_id, player_id) where read_at is null;
alter table public.chat_messages enable row level security;
revoke all on public.chat_messages from public, anon, authenticated;
grant select, insert on public.chat_messages to authenticated;
grant update (read_at) on public.chat_messages to authenticated;

-- my_captain_id() predates pending memberships and cannot authorize player sends.
create function security_private.chat_captain_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select captain_id from public.coach_clients
  where player_id = (select auth.uid()) and archived_at is null and not pending;
$$;
revoke all on function security_private.chat_captain_id() from public, anon, authenticated;
create function public.chat_current_captain() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_active_caller();
  return security_private.chat_captain_id();
end;
$$;
revoke all on function public.chat_current_captain() from public, anon, authenticated;
grant execute on function public.chat_current_captain() to authenticated;
create policy active_caller on public.chat_messages as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy chat_messages_select on public.chat_messages for select to authenticated
  using ((select auth.uid()) in (captain_id, player_id));
create policy chat_messages_insert on public.chat_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and (
    (captain_id = (select auth.uid()) and public.is_captain_of(player_id)) or
    (player_id = (select auth.uid()) and captain_id = (select public.chat_current_captain()))));
create policy chat_messages_read on public.chat_messages for update to authenticated
  using ((select auth.uid()) in (captain_id, player_id) and sender_id <> (select auth.uid()))
  with check ((select auth.uid()) in (captain_id, player_id) and sender_id <> (select auth.uid()));

create policy chat_voice_player_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'voice-notes' and split_part(name, '/', 1) = (select auth.uid())::text
    and split_part(name, '/', 2) = 'chat');

-- An INSERT failure leaves no voice_notes row, so the old captain delete policy cannot clean up.
-- Check references as owner to prevent an unrelated hidden row from being mistaken for an orphan.
create function security_private.chat_audio_unreferenced(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.chat_messages where audio_path = path)
    and not exists (select 1 from public.voice_notes where audio_path = path);
$$;
revoke all on function security_private.chat_audio_unreferenced(text) from public, anon, authenticated;
create function public.chat_audio_cleanup_allowed(path text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_active_caller();
  return split_part(path, '/', 2) = 'chat'
    and (public.storage_owner(path) = (select auth.uid()) or public.is_captain_of(public.storage_owner(path)))
    and security_private.chat_audio_unreferenced(path);
end;
$$;
revoke all on function public.chat_audio_cleanup_allowed(text) from public, anon, authenticated;
grant execute on function public.chat_audio_cleanup_allowed(text) to authenticated;
create policy chat_voice_cleanup on storage.objects for delete to authenticated
  using (bucket_id = 'voice-notes' and split_part(name, '/', 2) = 'chat'
    and (public.storage_owner(name) = (select auth.uid()) or public.is_captain_of(public.storage_owner(name)))
    and public.chat_audio_cleanup_allowed(name));

do $migration$
declare definition text;
begin
  select pg_get_constraintdef(oid) into definition from pg_constraint
    where conrelid = 'public.notifications'::regclass and conname = 'notifications_type_check';
  if definition is null then raise exception 'notification constraint source drift'; end if;
  execute 'alter table public.notifications drop constraint notifications_type_check';
  execute 'alter table public.notifications add constraint notifications_type_check '
    || replace(definition, 'CHECK (', 'CHECK (type=''chat_message'' or ');
end $migration$;
create unique index notifications_unread_chat on public.notifications(user_id, (payload ->> 'player_id'))
  where type = 'chat_message' and not is_read;
create function security_private.notify_chat_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(user_id, type, payload)
    select case when new.sender_id = new.player_id then new.captain_id else new.player_id end,
      'chat_message', jsonb_build_object('name', p.full_name, 'player_id', new.player_id)
    from public.profiles p where p.id = new.sender_id
    on conflict (user_id, (payload ->> 'player_id')) where type = 'chat_message' and not is_read
    do update set created_at = now(), payload = excluded.payload;
  return new;
end;
$$;
revoke all on function security_private.notify_chat_message() from public, anon, authenticated;
create trigger chat_message_notify after insert on public.chat_messages
  for each row execute function security_private.notify_chat_message();
commit;
