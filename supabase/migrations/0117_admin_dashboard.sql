-- Internal, unpaginated captain facts; activity uses sign-in, sent chat and plan updates.
-- to_jsonb supports auth stubs without last_sign_in_at without changing auth's schema.
-- A cutoff allows the previous activity window to include repeat chat senders.
-- Auth and plans retain only their latest timestamps, so overwritten history is unavailable.
create function security_private.admin_dashboard_captains(p_before timestamptz default null)
returns table (id uuid, created_at timestamptz, tier text, state text,
  over_limit boolean, last_active_at timestamptz, expiring_soon boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  return query
  select p.id, p.created_at, t.tier,
    case when p.suspended_at is not null then 'suspended'
      when u.email_confirmed_at is null then 'unconfirmed'
      when t.tier = 'entry' and paid.ends_at is not null then 'expired'
      when t.tier = 'entry' then 'free' else 'paid' end,
    (select count(*) from public.coach_clients c where c.captain_id=p.id and c.archived_at is null) > t.player_limit,
    (select max(events.at) from (
      select (to_jsonb(u)->>'last_sign_in_at')::timestamptz as at
      union all select m.created_at from public.chat_messages m where m.sender_id=p.id
      union all select pr.updated_at from public.programs pr where pr.captain_id=p.id
      union all select n.updated_at from public.nutrition_plans n where n.captain_id=p.id
    ) events where p_before is null or events.at<p_before),
    coalesce(paid.ends_at > now() and paid.ends_at <= now()+interval '7 days', false)
  from public.profiles p join auth.users u on u.id=p.id
  join public.plan_tiers t on t.tier=security_private.current_tier(p.id)
  left join lateral (select max(s.ends_at) ends_at from public.captain_subscriptions s
    where s.captain_id=p.id and s.tier <> 'entry') paid on true
  where p.role='captain' and p.captain_status='approved'
    and not exists(select 1 from public.admins a where a.user_id=p.id);
end;
$$;
revoke all on function security_private.admin_dashboard_captains(timestamptz) from public, anon, authenticated;

create function public.admin_captain_activity(p_ids uuid[])
returns table (id uuid, "lastActiveAt" timestamptz, "expiringSoon" boolean, quiet boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if cardinality(p_ids)>100 then raise exception 'at most 100 ids' using errcode = '22023'; end if;
  return query select c.id, c.last_active_at, c.expiring_soon,
    c.last_active_at is null or c.last_active_at < now()-interval '7 days'
    from security_private.admin_dashboard_captains() c where c.id=any(p_ids);
end;
$$;

create function public.admin_dashboard() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_jobs int := 0; v_failures int := 0; v_result jsonb;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if to_regclass('cron.job') is not null then
    execute 'select count(*) from cron.job' into v_jobs;
  end if;
  if to_regclass('cron.job_run_details') is not null then
    execute 'select count(*) from cron.job_run_details where status = ''failed'' and start_time >= now()-interval ''24 hours''' into v_failures;
  end if;
  with captains as materialized (select * from security_private.admin_dashboard_captains()),
  -- Monthly equivalent uses rounded 30-day months, minimum one, for discounted payments too.
  periods as (select s.*, s.amount_egp / greatest(1,round(extract(epoch from (s.ends_at-s.starts_at))/2592000)) monthly
    from public.captain_subscriptions s join captains c on c.id=s.captain_id where s.tier<>'entry'),
  players as (select p.* from public.profiles p where p.role='player'),
  days as (select ((now() at time zone 'Africa/Cairo')::date - i) as day from generate_series(29,0,-1) i)
  select jsonb_build_object(
    'actions', jsonb_build_object('pendingCaptains',(select count(*) from public.admin_pending_captains()),
      'expiringSoon',count(*) filter(where c.expiring_soon), 'overLimit',count(*) filter(where c.over_limit),
      'quietPaid',count(*) filter(where c.tier<>'entry' and (c.last_active_at is null or c.last_active_at<now()-interval '7 days'))),
    'captains',jsonb_build_object('value',count(*),'previous',count(*) filter(where c.created_at<=now()-interval '7 days')),
    'players',jsonb_build_object('value',(select count(*) from players where created_at<=now()),
      'previous',(select count(*) from players where created_at<=now()-interval '7 days')),
    'paidCaptains',jsonb_build_object('value',(select count(distinct captain_id) from periods where starts_at<=now() and ends_at>now()),
      'previous',(select count(distinct s.captain_id) from periods s join captains cp on cp.id=s.captain_id
        where s.starts_at<=now()-interval '7 days' and s.ends_at>now()-interval '7 days' and cp.created_at<=now()-interval '7 days')),
    'mrr',jsonb_build_object('value',coalesce((select sum(monthly) from periods where starts_at<=now() and ends_at>now()),0),
      'previous',coalesce((select sum(monthly) from periods where starts_at<=now()-interval '30 days' and ends_at>now()-interval '30 days'),0)),
    'activeCaptains',jsonb_build_object('value',count(*) filter(where c.last_active_at>=now()-interval '7 days' and c.last_active_at<=now()),
      'previous',(select count(*) from security_private.admin_dashboard_captains(now()-interval '7 days') prior
        where prior.last_active_at>=now()-interval '14 days')),
    'signups',(select jsonb_agg(jsonb_build_object('day',d.day::text,
      'captains',(select count(*) from public.profiles p where p.role='captain' and (p.created_at at time zone 'Africa/Cairo')::date=d.day
        and not exists(select 1 from public.admins a where a.user_id=p.id)),
      'players',(select count(*) from players p where (p.created_at at time zone 'Africa/Cairo')::date=d.day)) order by d.day) from days d),
    'planMix',(select jsonb_agg(jsonb_build_object('tier',t.tier,'captains',(select count(*) from captains cp where cp.tier=t.tier)) order by t.position) from public.plan_tiers t),
    'stateCounts',jsonb_build_object('all',count(*),'paid',count(*) filter(where c.state='paid'),
      'free',count(*) filter(where c.state='free'),'expired',count(*) filter(where c.state='expired'),
      'unconfirmed',count(*) filter(where c.state='unconfirmed'),'suspended',count(*) filter(where c.state='suspended'),
      'expiringSoon',count(*) filter(where c.expiring_soon)),
    'health',jsonb_build_object('cronJobs',v_jobs,'cronFailures24h',v_failures,
      'pendingDeletions',(select count(*) from public.profiles p where p.deletion_requested_at<now()-interval '7 days'
        and not exists(select 1 from public.admins a where a.user_id=p.id)))) into v_result from captains c;
  return v_result;
end;
$$;

create function public.admin_captain_detail(p_captain uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  return (select jsonb_build_object('id',p.id,
    'phone',coalesce(p.phone,nullif(p.social->>'whatsapp','')),
    'players',(select count(*) from public.coach_clients c where c.captain_id=p.id and c.archived_at is null),
    'trainedThisWeek',(select count(distinct c.player_id) from public.coach_clients c
      join public.workout_sessions w on w.player_id=c.player_id
      where c.captain_id=p.id and c.archived_at is null and w.completed_at>=now()-interval '7 days' and w.completed_at<=now()),
    'totalPaidEgp',coalesce((select sum(s.amount_egp) from public.captain_subscriptions s where s.captain_id=p.id),0),
    'history',coalesce((select jsonb_agg(jsonb_build_object('tier',s.tier,
      'months',greatest(1,round(extract(epoch from (s.ends_at-s.starts_at))/2592000)),
      'amountEgp',s.amount_egp,'startsAt',s.starts_at,'endsAt',s.ends_at,'paymentRef',s.payment_ref) order by s.starts_at desc,s.id desc)
      from (select * from public.captain_subscriptions where captain_id=p.id order by starts_at desc,id desc limit 24) s),'[]'::jsonb))
    from public.profiles p where p.id=p_captain and p.role='captain'
      and not exists(select 1 from public.admins a where a.user_id=p.id));
end;
$$;

revoke all on function public.admin_dashboard(), public.admin_captain_activity(uuid[]), public.admin_captain_detail(uuid) from public, anon;
grant execute on function public.admin_dashboard(), public.admin_captain_activity(uuid[]), public.admin_captain_detail(uuid) to authenticated;
