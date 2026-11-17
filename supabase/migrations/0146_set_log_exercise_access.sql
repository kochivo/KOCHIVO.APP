begin;

-- Definer reads avoid recursive set-log RLS and retain access to historical plans.
create function public.can_log_exercise(p_exercise uuid, p_session uuid, p_item uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    exists (select 1 from public.exercises e where e.id=p_exercise and (
      (e.owner_id is null and e.orphaned_at is null)
      or e.owner_id=public.my_captain_id()
      or e.owner_id in (
        select p.captain_id from public.workout_sessions s
        join public.program_days d on d.id=s.program_day_id
        join public.programs p on p.id=d.program_id
        where s.id=p_session and s.player_id=(select auth.uid())
      )
    ))
    or exists (select 1 from public.program_exercises e
      join public.program_days d on d.id=e.day_id join public.programs p on p.id=d.program_id
      where e.id=p_item and p.player_id=(select auth.uid())
        and (e.exercise_id=p_exercise or e.alternatives @> array[p_exercise]))
    or exists (select 1 from public.set_logs l
      where l.player_id=(select auth.uid()) and l.exercise_id=p_exercise)
  );
$$;
revoke all on function public.can_log_exercise(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.can_log_exercise(uuid,uuid,uuid) to authenticated;

alter policy set_logs_player_insert on public.set_logs with check (
  player_id=(select auth.uid()) and public.player_can_write() and public.owns_session(session_id)
  and (program_exercise_id is null or public.owns_program_exercise(program_exercise_id))
  and public.can_log_exercise(exercise_id,session_id,program_exercise_id)
);
alter policy set_logs_player_update on public.set_logs with check (
  player_id=(select auth.uid()) and public.player_can_write() and public.owns_session(session_id)
  and (program_exercise_id is null or public.owns_program_exercise(program_exercise_id))
  and public.can_log_exercise(exercise_id,session_id,program_exercise_id)
);

do $migration$
declare definition text; anchor text := '    -- Id-based retries also work after a plan was deleted and the FK became null.';
begin
  definition := pg_catalog.pg_get_functiondef('public.sync_set_logs(jsonb)'::regprocedure);
  if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 then
    raise exception 'Set log exercise access source drift';
  end if;
  execute replace(definition,anchor,$patch$    -- Stale retries cannot write, even if their former exercise is no longer available.
    -- Blocked players skip this shortcut so RLS still rejects them loudly.
    if public.player_can_write() and (exists(select 1 from public.set_logs where id=r.id and client_updated_at>=r.client_updated_at)
      or (not exists(select 1 from public.set_logs where id=r.id) and exists(
        select 1 from public.set_logs where session_id=r.session_id and program_exercise_id=plan_id
          and set_index=r.set_index and drop_index=coalesce(r.drop_index,0)
          and client_updated_at>=r.client_updated_at))) then
      continue;
    end if;
    if not public.can_log_exercise(r.exercise_id,r.session_id,r.program_exercise_id) then
      raise exception 'exercise not available' using errcode='42501';
    end if;
    -- Id-based retries also work after a plan was deleted and the FK became null.$patch$);
end $migration$;

commit;
