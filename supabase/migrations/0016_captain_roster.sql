create function public.captain_roster()
returns table (
  player_id uuid, full_name text, access_until date, started_on date,
  last_training_date date, program_title text, open_tasks int
)
language sql stable security invoker set search_path = ''
as $$
  select c.player_id, p.full_name, c.access_until, c.started_on,
    (select max(s.training_date) from public.workout_sessions s where s.player_id = c.player_id),
    (select pr.title from public.programs pr
      where pr.player_id = c.player_id and pr.captain_id = c.captain_id and pr.status = 'active'
      order by pr.updated_at desc, pr.id limit 1),
    ((select count(*) from public.check_ins ci
      where ci.player_id = c.player_id and ci.captain_id = c.captain_id and ci.reviewed_at is null)
    + (select count(*) from public.form_checks fc
      where fc.player_id = c.player_id and fc.captain_id = c.captain_id and fc.reviewed_at is null))::int
  from public.coach_clients c
  join public.profiles p on p.id = c.player_id
  where c.captain_id = (select auth.uid()) and c.archived_at is null
  order by p.full_name;
$$;

revoke execute on function public.captain_roster() from public, anon;
grant execute on function public.captain_roster() to authenticated;
