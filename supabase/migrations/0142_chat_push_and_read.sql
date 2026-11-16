begin;

alter table public.profiles add column locale text
  check (locale in ('ar', 'en'));
grant update (locale) on public.profiles to authenticated;
grant select (id, locale, arabic_style, timezone) on public.profiles to service_role;
alter table public.notifications add column chat_push_claimed_id uuid;

create or replace function public.claim_chat_push(p_notification_id uuid, p_message_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.notifications set chat_push_claimed_id = p_message_id
    where id = p_notification_id and type = 'chat_message'
      and payload ->> 'message_id' = p_message_id::text
      and chat_push_claimed_id is distinct from p_message_id;
  return found;
end;
$$;
revoke all on function public.claim_chat_push(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_chat_push(uuid, uuid) to service_role;

create or replace function security_private.send_notification_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_config jsonb; v_key text; v_body jsonb;
begin
  if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then return new; end if;
  v_config := security_private.push_config();
  foreach v_key in array array['push_function_url','push_hook_secret','vapid_public_key','vapid_private_key','vapid_subject'] loop
    if nullif(v_config ->> v_key, '') is null then return new; end if;
  end loop;
  v_body := jsonb_build_object('notification_id', new.id);
  if new.type = 'chat_message' then
    v_body := v_body || jsonb_build_object('message_id', new.payload ->> 'message_id');
  end if;
  execute 'select net.http_post(url := $1, body := $2, headers := $3)'
    using v_config ->> 'push_function_url', v_body,
      jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_config ->> 'push_hook_secret');
  return new;
exception when others then
  return new;
end;
$$;

create or replace function public.read_chat_conversation(p_player_id uuid, p_captain_id uuid, p_read_at timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform public.require_active_caller();
  if (select auth.uid()) not in (p_player_id, p_captain_id) then
    raise exception 'not a conversation participant' using errcode = '42501';
  end if;
  -- Serialize with notification coalescing before taking the message snapshot.
  perform 1 from public.notifications where user_id = (select auth.uid())
    and type = 'chat_message' and payload ->> 'player_id' = p_player_id::text for update;
  update public.chat_messages set read_at = p_read_at
    where player_id = p_player_id and captain_id = p_captain_id
      and sender_id <> (select auth.uid()) and read_at is null;
  update public.notifications n set is_read = true
    where n.user_id = (select auth.uid()) and n.type = 'chat_message' and not n.is_read
      and n.payload ->> 'player_id' = p_player_id::text
      and (n.payload ->> 'captain_id' = p_captain_id::text or not (n.payload ? 'captain_id'))
      and not exists (select 1 from public.chat_messages m where m.player_id = p_player_id
        and m.captain_id = p_captain_id and m.sender_id <> (select auth.uid()) and m.read_at is null);
end;
$$;
revoke all on function public.read_chat_conversation(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.read_chat_conversation(uuid, uuid, timestamptz) to authenticated;

create or replace function security_private.notify_chat_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(user_id, type, payload)
    select case when new.sender_id = new.player_id then new.captain_id else new.player_id end,
      'chat_message', jsonb_build_object('name', p.full_name, 'player_id', new.player_id,
        'captain_id', new.captain_id, 'message_id', new.id)
    from public.profiles p where p.id = new.sender_id
    on conflict (user_id, (payload ->> 'player_id')) where type = 'chat_message' and not is_read
    do update set created_at = now(), payload = excluded.payload;
  return new;
end;
$$;

-- INSERT and UPDATE events are mutually exclusive for an upsert. Reading or editing
-- metadata must not enqueue another push for the same message.
create or replace trigger notifications_chat_push after update on public.notifications
  for each row when (new.type = 'chat_message' and not new.is_read
    and new.payload ->> 'message_id' is not null
    and new.payload ->> 'message_id' is distinct from old.payload ->> 'message_id')
  execute function security_private.send_notification_push();

create or replace function security_private.read_chat_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  recipient := case when new.sender_id = new.player_id then new.captain_id else new.player_id end;
  update public.notifications n set is_read = true
    where n.user_id = recipient and n.type = 'chat_message' and not n.is_read
      and n.payload ->> 'player_id' = new.player_id::text
      and (n.payload ->> 'captain_id' = new.captain_id::text or not (n.payload ? 'captain_id'))
      and not exists (select 1 from public.chat_messages m
        where m.player_id = new.player_id and m.captain_id = new.captain_id
          and m.sender_id = new.sender_id and m.read_at is null);
  return new;
end;
$$;
revoke all on function security_private.read_chat_notification() from public, anon, authenticated;
create or replace trigger chat_message_read after update of read_at on public.chat_messages
  for each row when (old.read_at is null and new.read_at is not null)
  execute function security_private.read_chat_notification();

create index chat_messages_thread_page on public.chat_messages(player_id, captain_id, created_at desc, id desc);
commit;
