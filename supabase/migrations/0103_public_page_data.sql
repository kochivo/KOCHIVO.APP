begin;

create function public.valid_public_specialties(items text[]) returns boolean
language sql immutable set search_path = '' as $$
  select cardinality(items) <= 6 and coalesce(array_ndims(items),1) = 1
    and not exists (select 1 from unnest(items) item where item is null or char_length(item) not between 2 and 30);
$$;
revoke all on function public.valid_public_specialties(text[]) from public, anon;
grant execute on function public.valid_public_specialties(text[]) to authenticated;

alter table public.profiles
  add column specialties text[] not null default '{}' check (public.valid_public_specialties(specialties)),
  add column years_experience smallint check (years_experience between 0 and 60),
  add column languages text[] not null default '{}' check (
    languages <@ array['ar','en']::text[] and array_position(languages,null) is null
    and coalesce(array_ndims(languages),1) = 1),
  add column show_public_stats boolean not null default false;
grant update (specialties,years_experience,languages,show_public_stats) on public.profiles to authenticated;

create function public.coach_public_page(slug text)
returns table(specialties text[], years_experience smallint, languages text[], show_public_stats boolean,
  spots_left bigint, accepting boolean)
language sql stable security definer set search_path = '' as $$
  -- Reuse the original projection as the eligibility gate without changing its contract.
  select p.specialties,p.years_experience,p.languages,p.show_public_stats,s.spots,s.spots>0
  from public.coach_public_profile(slug) eligible join public.profiles p on p.id=eligible.id
  cross join lateral (
    select greatest(0,t.player_limit-(select count(*) from public.coach_clients c
      join public.profiles player on player.id=c.player_id
      where c.captain_id=p.id and c.archived_at is null and player.demo_expires_at is null)) spots
    from public.plan_tiers t where t.tier=security_private.current_tier(p.id)
  ) s;
$$;

create function public.coach_public_stats(slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  with captain as (
    select p.id,p.created_at from public.coach_public_profile(slug) eligible
    join public.profiles p on p.id=eligible.id where p.show_public_stats
  ), roster as materialized (
    select c.player_id,c.started_on from public.coach_clients c
    join captain on captain.id=c.captain_id join public.profiles p on p.id=c.player_id
    where c.archived_at is null and p.demo_expires_at is null
  ), scheduled as (
    -- Weekdays use the app's Saturday=0 convention. Rest days and duplicate weekdays do not add sessions.
    select distinct r.player_id,calendar.day::date training_date
    from roster r join public.programs p on p.player_id=r.player_id
      and p.captain_id=(select id from captain) and p.status='active' and not p.is_template
    join public.program_days d on d.program_id=p.id and not d.is_rest_day
    cross join lateral generate_series((public.user_today(r.player_id)-6)::timestamp,
      public.user_today(r.player_id)::timestamp,interval '1 day') calendar(day)
    where calendar.day::date>=r.started_on
      and calendar.day::date>=(p.created_at at time zone public.safe_timezone(r.player_id))::date
      and d.weekday=(extract(dow from calendar.day)::int+1)%7
  ), adherence as (
    select count(*) planned,count(*) filter (where exists (
      select 1 from public.workout_sessions s where s.player_id=d.player_id
        and s.training_date=d.training_date and s.completed_at is not null)) done from scheduled d
  )
  select jsonb_build_object('players',(select count(*) from roster),
    'workouts_logged',(select count(*) from public.workout_sessions s join roster r on r.player_id=s.player_id
      where s.completed_at is not null),
    'adherence_pct',coalesce(round(100.0*a.done/nullif(a.planned,0)),0),
    'member_since',extract(year from c.created_at)::int)
  from captain c cross join adherence a where (select count(*) from roster)>=5;
$$;
revoke all on function public.coach_public_page(text),public.coach_public_stats(text) from public,anon,authenticated;
grant execute on function public.coach_public_page(text),public.coach_public_stats(text) to anon,authenticated;

create table public.coach_waitlist (
  id uuid primary key,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  check (captain_id<>player_id)
);
create unique index coach_waitlist_pending on public.coach_waitlist(captain_id,player_id) where notified_at is null;
create index coach_waitlist_captain on public.coach_waitlist(captain_id);
create index coach_waitlist_player on public.coach_waitlist(player_id);
alter table public.coach_waitlist enable row level security;
revoke all on public.coach_waitlist from public,anon,authenticated;
grant select,delete on public.coach_waitlist to authenticated;
grant insert(id,captain_id,player_id) on public.coach_waitlist to authenticated;

-- RLS must evaluate captain eligibility and capacity outside the caller's profile visibility.
create function public.can_join_coach_waitlist(p_captain uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
    where p.id=auth.uid() and p.role='player' and p.suspended_at is null
      and p.demo_expires_at is null and not security_private.is_anonymous_user(p.id))
    and exists (select 1 from public.profiles p
      cross join lateral public.coach_public_page(p.public_slug) page
      where p.id=p_captain and not page.accepting);
$$;
revoke all on function public.can_join_coach_waitlist(uuid) from public,anon,authenticated;
grant execute on function public.can_join_coach_waitlist(uuid) to authenticated;
create policy active_caller on public.coach_waitlist as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy permanent_account on public.coach_waitlist as restrictive for all to authenticated
  using ((select auth.jwt()->>'is_anonymous') is distinct from 'true')
  with check ((select auth.jwt()->>'is_anonymous') is distinct from 'true');
create policy coach_waitlist_read on public.coach_waitlist for select to authenticated
  using (captain_id=(select auth.uid()));
create policy coach_waitlist_insert on public.coach_waitlist for insert to authenticated
  with check (player_id=(select auth.uid()) and public.can_join_coach_waitlist(captain_id));
create policy coach_waitlist_delete on public.coach_waitlist for delete to authenticated
  using (player_id=(select auth.uid()) and public.can_join_coach_waitlist(captain_id));

-- A filtered DELETE requires SELECT visibility, which is deliberately captain-only.
create function public.leave_coach_waitlist(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_active_caller();
  delete from public.coach_waitlist w where w.id=p_id and w.player_id=auth.uid()
    and public.can_join_coach_waitlist(w.captain_id);
end;
$$;
revoke all on function public.leave_coach_waitlist(uuid) from public,anon,authenticated;
grant execute on function public.leave_coach_waitlist(uuid) to authenticated;

commit;
