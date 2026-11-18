begin;

create table public.ai_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client text not null check (client ~ '^(ko|mcp:[A-Za-z0-9._-]{1,80})$'),
  tool text not null check (tool ~ '^[a-z_]{2,60}$'),
  kind text not null check (kind in ('read', 'propose')),
  status text not null check (status in (
    'ok', 'unauthorized', 'forbidden', 'invalid_input', 'not_found',
    'rate_limited', 'timeout', 'unavailable'
  )),
  duration_ms int not null check (duration_ms between 0 and 600000),
  correlation_id uuid not null
);

create index ai_audit_log_user_created_idx on public.ai_audit_log (user_id, created_at desc);
alter table public.ai_audit_log enable row level security;
revoke all on public.ai_audit_log from public, anon, authenticated;
grant select on public.ai_audit_log to authenticated;

create policy read_own_audit on public.ai_audit_log for select to authenticated
  using (user_id = (select auth.uid()));
create policy active_caller on public.ai_audit_log as restrictive for all to authenticated
  using (not (select public.is_suspended()))
  with check (not (select public.is_suspended()));

create function public.ai_audit_write(
  p_client text, p_tool text, p_kind text, p_status text, p_duration_ms int, p_correlation uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  perform public.require_active_caller();
  insert into public.ai_audit_log (user_id, client, tool, kind, status, duration_ms, correlation_id)
  values (caller, p_client, p_tool, p_kind, p_status, p_duration_ms, p_correlation);
end;
$$;

revoke all on function public.ai_audit_write(text, text, text, text, int, uuid) from public, anon, authenticated, service_role;
grant execute on function public.ai_audit_write(text, text, text, text, int, uuid) to authenticated;

commit;
