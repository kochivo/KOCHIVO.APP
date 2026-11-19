begin;

create table public.ko_memories (
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('alias', 'preference', 'correction', 'note')),
  text text not null check (length(text) between 1 and 200),
  player_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index ko_memories_text_idx on public.ko_memories (user_id, lower(text));
create index ko_memories_newest_idx on public.ko_memories (user_id, created_at desc, id desc);
alter table public.ko_memories enable row level security;
revoke all on public.ko_memories from public, anon, authenticated;
grant select, insert, delete on public.ko_memories to authenticated;
create policy owner_only on public.ko_memories for all to authenticated
  using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid()) and (player_id is null or exists (
      select 1 from public.coach_clients c join public.profiles p on p.id = c.captain_id
      where c.captain_id = (select auth.uid()) and c.player_id = ko_memories.player_id
        and c.archived_at is null and p.role = 'captain'
    ))
  );
create policy active_caller on public.ko_memories as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));

create function security_private.ko_trim_memories() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 162));
  delete from public.ko_memories where id in (
    select id from public.ko_memories where user_id = new.user_id
    order by created_at desc, id desc offset 30
  );
  return null;
end;
$$;
revoke all on function security_private.ko_trim_memories() from public, anon, authenticated, service_role;
create trigger ko_trim_memories after insert on public.ko_memories
  for each row execute function security_private.ko_trim_memories();

create table public.ko_memory_settings (
  user_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  learning boolean not null default true
);
alter table public.ko_memory_settings enable row level security;
revoke all on public.ko_memory_settings from public, anon, authenticated;
grant select, insert, update on public.ko_memory_settings to authenticated;
create policy owner_only on public.ko_memory_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy active_caller on public.ko_memory_settings as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy learning_enabled on public.ko_memories as restrictive for insert to authenticated
  with check (not exists (
    select 1 from public.ko_memory_settings s where s.user_id = (select auth.uid()) and not s.learning
  ));

create table security_private.ko_feedback (
  id uuid primary key,
  created_at timestamptz not null default now(),
  role text not null check (role in ('captain', 'player')),
  helpful boolean not null,
  reason text check (reason in ('misunderstood', 'wrong', 'long')),
  intent text not null,
  sources text[] not null,
  question text not null check (length(question) <= 300),
  answer text not null check (length(answer) <= 700)
);
create index ko_feedback_created_idx on security_private.ko_feedback (created_at);
alter table security_private.ko_feedback enable row level security;
revoke all on security_private.ko_feedback from public, anon, authenticated, service_role;

-- Keep daily counters independent of the chat RPC's minute-window cleanup.
create table security_private.ko_feedback_hits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  hits integer not null check (hits between 1 and 60),
  primary key (user_id, day)
);
alter table security_private.ko_feedback_hits enable row level security;
revoke all on security_private.ko_feedback_hits from public, anon, authenticated, service_role;

create function public.ko_feedback_submit(
  p_id uuid, p_helpful boolean, p_reason text, p_intent text, p_sources text[], p_question text, p_answer text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  caller_role text;
  today date := (now() at time zone 'Africa/Cairo')::date;
  taken integer;
begin
  if caller is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform public.require_active_caller();
  select role::text into caller_role from public.profiles where id = caller;
  delete from security_private.ko_feedback where created_at < now() - interval '90 days';
  delete from security_private.ko_feedback_hits where user_id = caller and day < today;
  insert into security_private.ko_feedback_hits (user_id, day, hits) values (caller, today, 1)
    on conflict (user_id, day) do update set hits = ko_feedback_hits.hits + 1
    where ko_feedback_hits.hits < 60 returning hits into taken;
  if taken is null then return false; end if;
  insert into security_private.ko_feedback (id, role, helpful, reason, intent, sources, question, answer)
    values (p_id, caller_role, p_helpful, case when not p_helpful then p_reason end, p_intent,
      array(select source from unnest(p_sources) source where source not in ('me', 'memory')), p_question, p_answer)
    on conflict (id) do nothing;
  return true;
end;
$$;
revoke all on function public.ko_feedback_submit(uuid, boolean, text, text, text[], text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.ko_feedback_submit(uuid, boolean, text, text, text[], text, text) to authenticated;

commit;
