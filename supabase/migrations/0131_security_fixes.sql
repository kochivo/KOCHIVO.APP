begin;

alter table public.pain_reports
  drop constraint pain_reports_exercise_id_fkey,
  add constraint pain_reports_exercise_id_fkey foreign key (exercise_id)
    references public.exercises(id) on delete set null;

drop policy pain_insert on public.pain_reports;
create policy pain_insert on public.pain_reports for insert to authenticated with check
  (player_id=(select auth.uid()) and captain_id=public.my_captain_id() and public.player_can_write()
    and status='open' and reply is null and answered_at is null and swap_until is null and swap_original_id is null and swap_to_id is null
    and (session_id is null or exists(select 1 from public.workout_sessions s where s.id=session_id and s.player_id=(select auth.uid())))
    and (program_exercise_id is null or exists(select 1 from public.program_exercises e
      join public.program_days d on d.id=e.day_id join public.programs p on p.id=d.program_id
      where e.id=program_exercise_id and p.player_id=(select auth.uid()) and p.captain_id=pain_reports.captain_id and p.status='active' and not p.is_template))
    and (exercise_id is null or exists(select 1 from public.program_exercises e
      join public.program_days d on d.id=e.day_id join public.programs p on p.id=d.program_id
      -- A player may train a chosen alternative, so its id is valid for that program row too.
      where (e.exercise_id=pain_reports.exercise_id or pain_reports.exercise_id=any(e.alternatives))
        and (pain_reports.program_exercise_id is null or e.id=pain_reports.program_exercise_id)
        and p.player_id=(select auth.uid())
        and p.captain_id=pain_reports.captain_id and p.status='active' and not p.is_template)));

drop policy pain_hint_read on public.pain_load_hints;
create policy pain_hint_read on public.pain_load_hints for select to authenticated using
  (player_id=(select auth.uid()) or (
    public.is_captain_of(player_id) and since>=public.captain_since(player_id)
    and exists(select 1 from public.program_exercises e
      join public.program_days d on d.id=e.day_id join public.programs p on p.id=d.program_id
      where e.id=program_exercise_id and p.captain_id=(select auth.uid())
        and p.player_id=pain_load_hints.player_id and not p.is_template)));

-- SEC-04 is deferred under the card's caller-risk exception: changing only the
-- public wrapper would silently change internal cross-user timezone calculations.

create table security_private.ko_rate_hits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  window_start timestamptz not null,
  hits int not null check(hits>0),
  primary key(user_id,window_start)
);
alter table security_private.ko_rate_hits enable row level security;
revoke all on security_private.ko_rate_hits from public,anon,authenticated;

create function public.ko_rate_take(p_limit int,p_window_seconds int) returns boolean
language plpgsql security definer set search_path='' as $$
declare caller uuid := auth.uid(); stamp timestamptz; taken int;
begin
  if caller is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  perform public.require_active_caller();
  -- RPC callers must not reset the route's counter by choosing a different window.
  if p_limit is distinct from 12 or p_window_seconds is distinct from 60 then
    raise exception 'Invalid rate window' using errcode='22023';
  end if;
  stamp := pg_catalog.to_timestamp(floor(extract(epoch from now())/p_window_seconds)*p_window_seconds);
  delete from security_private.ko_rate_hits where user_id=caller and window_start<stamp;
  insert into security_private.ko_rate_hits(user_id,window_start,hits) values(caller,stamp,1)
    on conflict(user_id,window_start) do update set hits=ko_rate_hits.hits+1
    where ko_rate_hits.hits<p_limit returning hits into taken;
  return taken is not null;
end $$;
revoke all on function public.ko_rate_take(int,int) from public,anon,authenticated,service_role;
grant execute on function public.ko_rate_take(int,int) to authenticated;

commit;
