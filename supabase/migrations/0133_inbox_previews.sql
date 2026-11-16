begin;
create function public.inbox_previews()
returns table (
  player_id uuid, id uuid, kind text, body text, created_at timestamptz,
  sender_id uuid, duration_seconds integer, unread_count bigint
)
language sql stable security invoker set search_path = '' as $$
  select c.player_id, latest.id,
    case when latest.id is null then null
      when latest.audio_path is not null then 'voice' else 'text' end,
    latest.body, latest.created_at, latest.sender_id, latest.duration_seconds,
    (select count(*) from public.chat_messages unread
      where unread.captain_id = c.captain_id and unread.player_id = c.player_id
        and unread.sender_id <> (select auth.uid()) and unread.read_at is null)
  from public.coach_clients c
  left join lateral (
    select m.id, m.body, m.audio_path, m.created_at, m.sender_id, m.duration_seconds
    from public.chat_messages m
    where m.captain_id = c.captain_id and m.player_id = c.player_id
    order by m.created_at desc, m.id desc limit 1
  ) latest on true
  where c.captain_id = (select auth.uid()) and c.archived_at is null;
$$;
revoke all on function public.inbox_previews() from public, anon;
grant execute on function public.inbox_previews() to authenticated;
commit;
