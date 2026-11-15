-- Cycle details are owner-only; captains receive a boolean through a guarded RPC.
create table public.cycle_settings (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  asked_at timestamptz,
  avg_cycle_days smallint not null default 28 check (avg_cycle_days between 21 and 40),
  avg_period_days smallint not null default 5 check (avg_period_days between 2 and 10),
  light_days smallint not null default 2 check (light_days between 0 and 5),
  photos_captain boolean not null default true,
  photos_share boolean not null default false
);
create table public.cycle_logs (
  player_id uuid references public.profiles(id) on delete cascade,
  start_date date not null,
  primary key(player_id,start_date)
);
create table public.cycle_overrides (
  player_id uuid references public.profiles(id) on delete cascade,
  day date not null,
  primary key(player_id,day)
);
create function public.cycle_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.player_intake i join public.profiles p on p.id=i.player_id
    where i.player_id=(select auth.uid()) and i.sex='female' and p.role='player');
$$;
revoke all on function public.cycle_owner() from public, anon;
grant execute on function public.cycle_owner() to authenticated;

do $$ declare t text; begin
  foreach t in array array['cycle_settings','cycle_logs','cycle_overrides'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy owner_only on public.%I for all to authenticated
      using (player_id=(select auth.uid()))
      with check (player_id=(select auth.uid()) and public.cycle_owner())',t);
    execute format('create policy active_caller on public.%I as restrictive for all to authenticated
      using (not (select public.is_suspended())) with check (not (select public.is_suspended()))',t);
  end loop;
end $$;

create function public.player_light_day(p_player uuid,p_date date) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_active_caller();
  if auth.uid() is null or not (auth.uid()=p_player or public.is_captain_of(p_player)) then
    raise exception 'access denied' using errcode='42501';
  end if;
  return exists (
    select 1 from public.cycle_settings s join public.player_intake i on i.player_id=s.player_id
    where s.player_id=p_player and i.sex='female' and s.enabled
      and p_date-(select max(start_date) from public.cycle_logs where player_id=p_player and start_date<=p_date)
        between 0 and s.light_days-1
      and not exists(select 1 from public.cycle_overrides where player_id=p_player and day=p_date)
  );
end $$;
revoke all on function public.player_light_day(uuid,date) from public, anon;
grant execute on function public.player_light_day(uuid,date) to authenticated;

-- The helper returns only permission, bypassing owner-only cycle RLS without exposing rows.
create function public.cycle_photo_allowed(p_player uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_captain_of(p_player) and not exists (
    select 1 from public.cycle_settings s join public.player_intake i on i.player_id=s.player_id
    where s.player_id=p_player and i.sex='female' and not s.photos_captain
  );
$$;
revoke all on function public.cycle_photo_allowed(uuid) from public, anon;
grant execute on function public.cycle_photo_allowed(uuid) to authenticated;

alter table public.profiles add column coach_gender text check (coach_gender in ('male','female'));

drop policy private_media_read on storage.objects;
create policy private_media_read on storage.objects for select to authenticated using (
  bucket_id in ('checkin-photos','form-videos') and (
    public.storage_owner(name)=(select auth.uid())
    or (bucket_id='checkin-photos' and public.cycle_photo_allowed(public.storage_owner(name)) and exists (
      select 1 from public.check_ins c where name=any(c.photo_paths)
      and c.player_id=public.storage_owner(name)
      and c.week_start+6 >= (public.captain_since(c.player_id) at time zone public.safe_timezone(c.player_id))::date))
    or (bucket_id='form-videos' and exists (
      select 1 from public.form_checks f where f.video_path=name
      and f.player_id=public.storage_owner(name) and f.created_at>=public.captain_since(f.player_id)))
  )
);

-- Extend the existing public projection without adding an anonymous RPC.
drop function public.coach_public_page(text);
create function public.coach_public_page(slug text)
returns table(specialties text[], years_experience smallint, languages text[], show_public_stats boolean,
  spots_left bigint, accepting boolean, coach_gender text)
language sql stable security definer set search_path = '' as $$
  select p.specialties,p.years_experience,p.languages,p.show_public_stats,s.spots,s.spots>0,p.coach_gender
  from public.coach_public_profile(slug) eligible join public.profiles p on p.id=eligible.id
  cross join lateral (
    select greatest(0,t.player_limit-(select count(*) from public.coach_clients c
      join public.profiles player on player.id=c.player_id
      where c.captain_id=p.id and c.archived_at is null and player.demo_expires_at is null)) spots
    from public.plan_tiers t where t.tier=security_private.current_tier(p.id)
  ) s;
$$;
revoke all on function public.coach_public_page(text) from public;
grant execute on function public.coach_public_page(text) to anon,authenticated;
