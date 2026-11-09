create table public.ko_action_receipts (
  captain_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  action_id uuid not null,
  primary key (captain_id, action_id)
);
alter table public.ko_action_receipts enable row level security;
revoke all on public.ko_action_receipts from public, anon, authenticated;
create policy active_caller on public.ko_action_receipts as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));

create table security_private.ko_approval_config (
  singleton boolean primary key default true check (singleton),
  signing_key text not null check (length(signing_key) >= 32)
);
alter table security_private.ko_approval_config enable row level security;
revoke all on security_private.ko_approval_config from public, anon, authenticated;

create schema ko_private;
revoke all on schema ko_private from public, anon, authenticated;
grant usage on schema ko_private to authenticated;

create function ko_private.verified_approval(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_body text := split_part(p_token, '.', 1);
  v_mac text := split_part(p_token, '.', 2);
  v_secret text;
  v_action jsonb;
begin
  select signing_key into v_secret from security_private.ko_approval_config where singleton;
  if auth.uid() is null or v_secret is null or p_token is null or length(p_token) > 65000
    or p_token !~ '^[A-Za-z0-9_-]+\.[a-f0-9]{64}$'
    or extensions.hmac(decode(v_mac, 'hex'), convert_to(v_secret, 'UTF8'), 'sha256')
       <> extensions.hmac(extensions.hmac(convert_to(v_body, 'UTF8'), convert_to(v_secret, 'UTF8'), 'sha256'),
          convert_to(v_secret, 'UTF8'), 'sha256') then
    raise exception 'valid KO approval required' using errcode = '42501';
  end if;
  v_action := convert_from(decode(translate(v_body, '-_', '+/') || repeat('=', (4 - length(v_body) % 4) % 4), 'base64'), 'UTF8')::jsonb;
  if v_action ->> 'actor' is distinct from auth.uid()::text
    or coalesce((v_action ->> 'expires')::bigint, 0) < extract(epoch from now()) * 1000 then
    raise exception 'valid KO approval required' using errcode = '42501';
  end if;
  return v_action;
end;
$$;
revoke all on function ko_private.verified_approval(text) from public, anon, authenticated;
grant execute on function ko_private.verified_approval(text) to authenticated;

create function ko_private.record_receipt(p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_action jsonb := ko_private.verified_approval(p_token);
begin
  perform public.require_active_caller();
  if not exists (select 1 from public.my_approval_route_profile() p
    where p.role = 'captain' and p.role_confirmed and p.captain_status = 'approved' and not p.is_admin) then
    raise exception 'approved captain required' using errcode = '42501';
  end if;
  insert into public.ko_action_receipts(captain_id, action_id)
    values (auth.uid(), (v_action ->> 'id')::uuid) on conflict do nothing;
  return found;
end;
$$;
revoke all on function ko_private.record_receipt(text) from public, anon, authenticated;
grant execute on function ko_private.record_receipt(text) to authenticated;

create function ko_private.workout_reminder(p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Africa/Cairo')::date;
  v_action jsonb := ko_private.verified_approval(p_token);
  p_player uuid := (v_action ->> 'player')::uuid;
begin
  if v_action ->> 'kind' is distinct from 'reminder'
      or (v_action -> 'payload' ->> 'date')::date is distinct from v_today then
    raise exception 'valid workout reminder approval required' using errcode = '42501';
  end if;
  perform public.require_active_caller();
  if not exists (select 1 from public.my_approval_route_profile() p
    where p.role = 'captain' and p.role_confirmed and p.captain_status = 'approved' and not p.is_admin) then
    raise exception 'approved captain required' using errcode = '42501';
  end if;
  insert into public.notifications(user_id, type, payload)
    select p.player_id, 'workout_reminder',
      jsonb_build_object('program_id', p.id, 'name', coalesce(d.title, p.title),
        'day_title', coalesce(d.title, p.title), 'training_date', v_today)
    from public.programs p
    join public.coach_clients c on c.captain_id = p.captain_id and c.player_id = p.player_id
    join public.profiles player on player.id = p.player_id
    left join public.program_days d on d.program_id = p.id and not d.is_rest_day
      and d.weekday = (extract(dow from v_today)::integer + 1) % 7
    where p.captain_id = (select auth.uid()) and p.player_id = p_player and p.status = 'active'
      and not p.is_template and c.archived_at is null and c.frozen_at is null and not c.pending
      and c.access_until >= v_today and player.suspended_at is null
    on conflict (user_id, (payload ->> 'training_date')) where type = 'workout_reminder' do nothing;
  return found;
end;
$$;
revoke all on function ko_private.workout_reminder(text) from public, anon, authenticated;
grant execute on function ko_private.workout_reminder(text) to authenticated;

create function public.ko_apply_action(p_token text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_action jsonb := ko_private.verified_approval(p_token);
  p_player uuid := (v_action ->> 'player')::uuid;
  p_kind text := v_action ->> 'kind';
  p_payload jsonb := v_action -> 'payload';
  v_link public.coach_clients;
  v_exercise public.program_exercises;
  v_id uuid;
  v_until date;
  v_sets smallint;
  v_reps smallint;
begin
  perform public.require_active_caller();
  if not exists (select 1 from public.my_approval_route_profile() p
    where p.role = 'captain' and p.role_confirmed and p.captain_status = 'approved' and not p.is_admin) then
    raise exception 'approved captain required' using errcode = '42501';
  end if;
  select * into v_link from public.coach_clients c
    where c.captain_id = v_actor and c.player_id = p_player and c.archived_at is null for update;
  if not found then raise exception 'active relationship required' using errcode = '42501'; end if;

  if not ko_private.record_receipt(p_token) then return jsonb_build_object('replayed', true); end if;

  case p_kind
    when 'exercise' then
      v_sets := (p_payload ->> 'sets')::smallint;
      v_reps := (p_payload ->> 'reps')::smallint;
      if (v_sets is null and v_reps is null) or v_sets not between 1 and 20 or v_reps not between 1 and 100 then
        raise exception 'invalid prescription' using errcode = '22023';
      end if;
      select e.* into v_exercise from public.program_exercises e
        join public.program_days d on d.id = e.day_id
        join public.programs p on p.id = d.program_id
        where e.id = (p_payload ->> 'id')::uuid and p.player_id = p_player and p.captain_id = v_actor
          and p.status = 'active' and not p.is_template
        for update of e, p;
      if not found or v_exercise.sets is distinct from (p_payload ->> 'previousSets')::smallint
          or v_exercise.reps_min is distinct from (p_payload ->> 'previousReps')::smallint
          or v_exercise.reps_max is distinct from (p_payload ->> 'previousMax')::smallint then
        raise exception 'prescription changed' using errcode = '40001';
      end if;
      update public.program_exercises e set sets = coalesce(v_sets, e.sets), reps_min = coalesce(v_reps, e.reps_min),
        reps_max = case when v_reps is null then e.reps_max else null end
        where e.id = v_exercise.id returning * into v_exercise;
      if not found then raise exception 'exercise unavailable' using errcode = '42501'; end if;
      return jsonb_build_object('sets', v_exercise.sets, 'reps', v_exercise.reps_min, 'max', v_exercise.reps_max);
    when 'training' then
      v_id := (p_payload ->> 'id')::uuid;
      insert into public.programs(id, captain_id, player_id, title, status, is_template)
        values (v_id, v_actor, p_player, p_payload ->> 'title', 'draft', false);
      perform public.save_weekly_program(p_payload || jsonb_build_object('player_id', p_player));
      return jsonb_build_object('id', v_id);
    when 'nutrition' then
      v_id := (p_payload ->> 'id')::uuid;
      insert into public.nutrition_plans(id, captain_id, player_id, title, status, is_template)
        values (v_id, v_actor, p_player, p_payload ->> 'title', 'draft', false);
      perform public.save_nutrition_plan(v_id, p_payload);
      return jsonb_build_object('id', v_id);
    when 'renew' then
      if v_link.sessions_left is not null or v_link.access_until is distinct from (p_payload ->> 'previous')::date then
        raise exception 'subscription changed or uses sessions' using errcode = '40001';
      end if;
      v_until := public.renew_player(p_player, (p_payload ->> 'days')::int);
      return jsonb_build_object('until', v_until);
    when 'reminder' then
      return jsonb_build_object('sent', ko_private.workout_reminder(p_token));
    else
      raise exception 'unknown KO action' using errcode = '22023';
  end case;
end;
$$;
revoke all on function public.ko_apply_action(text) from public, anon, authenticated;
grant execute on function public.ko_apply_action(text) to authenticated;
