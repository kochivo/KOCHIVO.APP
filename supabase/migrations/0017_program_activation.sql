create unique index programs_one_active on public.programs (player_id)
  where status = 'active' and player_id is not null;

create function public.activate_program(p_program uuid)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v_player uuid;
begin
  select player_id into v_player from public.programs
    where id = p_program and captain_id = (select auth.uid()) for update;
  if not found then
    raise exception 'program not accessible' using errcode = '42501';
  end if;
  if v_player is null then
    raise exception 'cannot activate template' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.program_days d join public.program_exercises e on e.day_id = d.id
    where d.program_id = p_program
  ) then
    raise exception 'program has no exercises' using errcode = '22023';
  end if;
  update public.programs set status = 'archived'
    where player_id = v_player and id <> p_program and status = 'active';
  update public.programs set status = 'active' where id = p_program;
end;
$$;

revoke execute on function public.activate_program(uuid) from public, anon;
grant execute on function public.activate_program(uuid) to authenticated;

-- 0005 inserted the copy as active before archiving the old program, which now violates
-- programs_one_active. Same behaviour, archive first.
create or replace function public.assign_program_template(p_template uuid, p_player uuid)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  v_program uuid;
  v_day record;
  v_new_day uuid;
begin
  if not public.is_captain_of(p_player) then
    raise exception 'not your player' using errcode = '42501';
  end if;
  if not exists (select 1 from public.programs
    where id = p_template and is_template and captain_id = (select auth.uid())) then
    raise exception 'template not found' using errcode = 'P0002';
  end if;

  update public.programs set status = 'archived' where player_id = p_player and status = 'active';

  insert into public.programs (captain_id, player_id, is_template, source_template_id, title, notes, settings, status)
    select captain_id, p_player, false, id, title, notes, settings, 'active'
    from public.programs where id = p_template
    returning id into v_program;

  for v_day in select * from public.program_days where program_id = p_template order by position loop
    insert into public.program_days (program_id, position, title)
      values (v_program, v_day.position, v_day.title) returning id into v_new_day;
    insert into public.program_exercises
      (day_id, exercise_id, position, superset_group, sets, reps_min, reps_max, rest_seconds, rpe, tempo, notes)
      select v_new_day, exercise_id, position, superset_group, sets, reps_min, reps_max, rest_seconds, rpe, tempo, notes
      from public.program_exercises where day_id = v_day.id;
  end loop;

  return v_program;
end;
$$;
