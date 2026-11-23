create table security_private.ko_usage_refunds (
  key uuid not null primary key,
  user_id uuid not null,
  day date not null,
  kind text not null check (kind in ('message', 'photo')),
  created_at timestamptz not null default now()
);
alter table security_private.ko_usage_refunds enable row level security;
revoke all on security_private.ko_usage_refunds from public, anon, authenticated;

-- Refund one taken KO message/photo. The key is the idempotency key: a second
-- call with the same key is a no-op. The key is recorded even when no counter
-- moves, so an unknown-key refund still applies exactly once (and the floor of
-- 0 keeps the counters from going negative); the route only refunds after
-- ko_usage_take returned 'ok', so in practice every refund balances a take.
create function public.ko_usage_refund(p_day date, p_kind text, p_key uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := security_private.ko_usage_owner(false);
  month_start date := date_trunc('month', now() at time zone 'Africa/Cairo')::date;
begin
  if p_key is null or p_kind is null or p_kind not in ('message', 'photo')
    or p_day is null or p_day not between (now() at time zone 'UTC')::date - 1 and (now() at time zone 'UTC')::date + 1 then
    raise exception 'invalid usage refund parameters' using errcode = '22023';
  end if;
  insert into security_private.ko_usage_refunds(key, user_id, day, kind)
    values (p_key, auth.uid(), p_day, p_kind) on conflict do nothing;
  if not found then return false; end if;
  if p_kind = 'message' then
    update security_private.ko_usage_daily set messages = greatest(messages - 1, 0)
      where user_id = auth.uid() and day = p_day;
  else
    update security_private.ko_usage_daily set photos = greatest(photos - 1, 0)
      where user_id = auth.uid() and day = p_day;
  end if;
  update security_private.ko_usage_monthly set calls = greatest(calls - 1, 0)
    where captain_id = owner_id and month = month_start;
  return true;
end;
$$;

-- Refund one taken big-action credit. Only when the action did not apply: a
-- receipt in ko_action_receipts means it did. A failed ko_apply_action rolls
-- its whole call back, receipt included, so an error such as 40001 (the
-- prescription changed before anything was written) leaves no receipt and
-- the credit is refunded; a replayed confirmation leaves the receipt behind
-- and is never refunded. Deleting the approval row makes the refund itself
-- idempotent and lets a later retry of the same token take a fresh credit.
create function public.ko_credit_refund(p_month date, p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := security_private.ko_usage_owner(true);
  approved jsonb := ko_private.verified_approval(p_token);
  approval_id uuid := (approved ->> 'id')::uuid;
begin
  if p_month is distinct from date_trunc('month', now() at time zone 'Africa/Cairo')::date then
    raise exception 'invalid credit refund parameters' using errcode = '22023';
  end if;
  if exists (select 1 from ko_private.ko_action_receipts
    where captain_id = owner_id and action_id = approval_id) then
    return false;
  end if;
  delete from security_private.ko_credit_approvals
    where captain_id = owner_id and action_id = approval_id;
  if not found then return false; end if;
  update security_private.ko_usage_monthly set credits = greatest(credits - 1, 0)
    where captain_id = owner_id and month = p_month;
  return true;
end;
$$;

revoke all on function public.ko_usage_refund(date, text, uuid),
  public.ko_credit_refund(date, text) from public, anon, authenticated;
grant execute on function public.ko_usage_refund(date, text, uuid),
  public.ko_credit_refund(date, text) to authenticated;
