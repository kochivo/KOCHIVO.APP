create table security_private.ko_usage_daily (
  user_id uuid not null,
  day date not null,
  messages int not null default 0 check (messages >= 0),
  photos int not null default 0 check (photos >= 0),
  primary key (user_id, day)
);

create table security_private.ko_usage_monthly (
  captain_id uuid not null,
  month date not null check (extract(day from month) = 1),
  calls int not null default 0 check (calls >= 0),
  credits int not null default 0 check (credits >= 0),
  primary key (captain_id, month)
);

alter table security_private.ko_usage_daily enable row level security;
alter table security_private.ko_usage_monthly enable row level security;
revoke all on security_private.ko_usage_daily, security_private.ko_usage_monthly from public, anon, authenticated;

create table security_private.ko_usage_warnings (
  captain_id uuid not null,
  month date not null,
  primary key (captain_id, month),
  foreign key (captain_id, month) references security_private.ko_usage_monthly on delete cascade
);
alter table security_private.ko_usage_warnings enable row level security;
revoke all on security_private.ko_usage_warnings from public, anon, authenticated;

create table security_private.ko_credit_approvals (
  captain_id uuid not null,
  action_id uuid not null,
  primary key (captain_id, action_id)
);
alter table security_private.ko_credit_approvals enable row level security;
revoke all on security_private.ko_credit_approvals from public, anon, authenticated;

create function security_private.ko_usage_owner(p_captain_only boolean) returns uuid
language plpgsql stable set search_path = '' as $$
declare
  caller uuid := auth.uid();
  caller_role text;
begin
  if caller is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'signed-in caller required' using errcode = '42501';
  end if;
  perform public.require_active_caller();
  select role into caller_role from public.profiles where id = caller and role_confirmed;
  if caller_role = 'captain' then return caller; end if;
  if caller_role = 'player' and not p_captain_only then return public.my_captain_id(); end if;
  raise exception 'captain required' using errcode = '42501';
end;
$$;

-- current_tier only exposes the caller's own subscription. Resolve the player's coach first.
create function public.ko_usage_tier() returns table(captain_id uuid, tier text)
language sql stable security definer set search_path = '' as $$
  select owner.id, security_private.current_tier(owner.id)
  from security_private.ko_usage_owner(false) as owner(id)
  where owner.id is not null;
$$;

create function public.ko_usage_take(p_day date, p_kind text, p_msg_cap int, p_photo_cap int, p_month_cap int)
returns text language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := security_private.ko_usage_owner(false);
  month_start date := date_trunc('month', now() at time zone 'Africa/Cairo')::date;
  call_count int;
begin
  if p_kind is null or p_kind not in ('message', 'photo')
    or p_day is null or p_day not between (now() at time zone 'UTC')::date - 1 and (now() at time zone 'UTC')::date + 1
    or (p_msg_cap between 1 and 100000 and p_photo_cap between 1 and 100000
      and p_month_cap between 1 and 100000) is not true then
    raise exception 'invalid usage parameters' using errcode = '22023';
  end if;
  if owner_id is null then return 'daily'; end if;

  -- Lock the shared month first so both counters advance together under concurrency.
  insert into security_private.ko_usage_monthly(captain_id, month)
    values (owner_id, month_start) on conflict do nothing;
  select calls into call_count from security_private.ko_usage_monthly
    where captain_id = owner_id and month = month_start for update;
  if call_count >= least(p_month_cap, 25000) then return 'monthly'; end if;

  insert into security_private.ko_usage_daily as daily(user_id, day, messages, photos)
    values (auth.uid(), p_day, (p_kind = 'message')::int, (p_kind = 'photo')::int)
    on conflict (user_id, day) do update
      set messages = daily.messages + excluded.messages, photos = daily.photos + excluded.photos
      where (p_kind = 'message' and daily.messages < least(p_msg_cap, case when owner_id = auth.uid() then 40 else 10 end))
         or (p_kind = 'photo' and daily.photos < least(p_photo_cap, 2));
  if not found then return 'daily'; end if;
  update security_private.ko_usage_monthly set calls = calls + 1
    where captain_id = owner_id and month = month_start;
  return 'ok';
end;
$$;

create function public.ko_credit_take(p_month date, p_cap int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := security_private.ko_usage_owner(true);
begin
  if p_month is distinct from date_trunc('month', now() at time zone 'Africa/Cairo')::date
    or (p_cap between 1 and 100000) is not true then
    raise exception 'invalid credit parameters' using errcode = '22023';
  end if;
  insert into security_private.ko_usage_monthly as usage(captain_id, month, credits)
    values (owner_id, p_month, 1)
    on conflict (captain_id, month) do update set credits = usage.credits + 1
      where usage.credits < least(p_cap, 750);
  return found;
end;
$$;

-- The signed approval is the idempotency key, including when two devices confirm at once.
create function public.ko_credit_take(p_month date, p_cap int, p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := security_private.ko_usage_owner(true);
  approved jsonb := ko_private.verified_approval(p_token);
  approval_id uuid := (approved->>'id')::uuid;
begin
  if p_month is distinct from date_trunc('month', now() at time zone 'Africa/Cairo')::date
    or (p_cap between 1 and 100000) is not true then
    raise exception 'invalid credit parameters' using errcode = '22023';
  end if;
  if (approved->>'kind' in ('training', 'nutrition')) is not true then
    raise exception 'big action approval required' using errcode = '42501';
  end if;
  if exists (select 1 from ko_private.ko_action_receipts where captain_id = owner_id and action_id = approval_id) then
    return true;
  end if;
  insert into security_private.ko_credit_approvals(captain_id, action_id)
    values (owner_id, approval_id) on conflict do nothing;
  if not found then return true; end if;
  if public.ko_credit_take(p_month, p_cap) then return true; end if;
  delete from security_private.ko_credit_approvals where captain_id = owner_id and action_id = approval_id;
  return false;
end;
$$;

-- Share the warning claim across server instances without changing ko_usage_take's statuses.
create function public.ko_usage_claim_warning(p_month_cap int, p_proof text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := security_private.ko_usage_owner(false);
  month_start date := date_trunc('month', now() at time zone 'Africa/Cairo')::date;
  signing_secret text;
begin
  if (p_month_cap between 1 and 100000) is not true then
    raise exception 'invalid usage cap' using errcode = '22023';
  end if;
  select signing_key into signing_secret from security_private.ko_approval_config where singleton;
  if signing_secret is null or p_proof is distinct from encode(extensions.hmac(
    'ko-usage-warning:' || owner_id::text || ':' || month_start::text || ':' || p_month_cap::text,
    signing_secret, 'sha256'), 'hex') then
    return false;
  end if;
  insert into security_private.ko_usage_warnings(captain_id, month)
    select captain_id, month from security_private.ko_usage_monthly
    where captain_id = owner_id and month = month_start and calls >= least(p_month_cap, 25000)
    on conflict do nothing;
  return found;
end;
$$;

create function public.ko_usage_summary() returns table(credits_used int, credits_cap int, month date)
language sql stable security definer set search_path = '' as $$
  select coalesce(usage.credits, 0),
    case security_private.current_tier(owner.id)
      when 'entry' then 10
      when 'champion' then 100
      when 'legend' then 250
      when 'empire' then 750
      else 10
    end,
    period.first_day
  from security_private.ko_usage_owner(true) as owner(id)
  cross join (select date_trunc('month', now() at time zone 'Africa/Cairo')::date as first_day) as period
  left join security_private.ko_usage_monthly usage
    on usage.captain_id = owner.id and usage.month = period.first_day;
$$;

revoke all on function security_private.ko_usage_owner(boolean) from public, anon, authenticated;
revoke all on function public.ko_usage_tier(), public.ko_usage_take(date, text, int, int, int),
  public.ko_credit_take(date, int), public.ko_credit_take(date, int, text),
  public.ko_usage_summary(), public.ko_usage_claim_warning(int, text) from public, anon, authenticated;
grant execute on function public.ko_usage_tier(), public.ko_usage_take(date, text, int, int, int),
  public.ko_credit_take(date, int), public.ko_credit_take(date, int, text),
  public.ko_usage_summary(), public.ko_usage_claim_warning(int, text) to authenticated;
