create function public.captain_dropout_radar(p_today date default current_date)
returns table (player_id uuid, full_name text, phone text, reason text, days int)
language sql stable security invoker set search_path = ''
as $$
  with players as (
    select c.player_id, p.full_name, p.phone, c.started_on,
      (select max(s.training_date) from public.workout_sessions s
        where s.player_id = c.player_id) as last_training_date,
      exists (select 1 from public.programs pr
        where pr.player_id = c.player_id and pr.captain_id = c.captain_id
          and pr.status = 'active') as has_program
    from public.coach_clients c
    join public.profiles p on p.id = c.player_id
    where c.captain_id = (select auth.uid()) and c.archived_at is null
  ), radar as (
    select player_id, full_name, phone,
      case
        when has_program and p_today - last_training_date >= 3
          and p_today - started_on >= 3 then 'no_activity'
        when has_program and last_training_date is null
          and p_today - started_on >= 3 then 'never_started'
        when not has_program and p_today - started_on >= 2 then 'no_program'
      end as reason,
      p_today - coalesce(last_training_date, started_on) as days
    from players
  )
  select player_id, full_name, phone, reason, days from radar
  where reason is not null
  order by days desc, full_name;
$$;

revoke execute on function public.captain_dropout_radar(date) from public, anon;
grant execute on function public.captain_dropout_radar(date) to authenticated;
