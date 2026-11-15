begin;

alter table public.set_logs add column drop_index smallint not null default 0
  check (drop_index between 0 and 3);

-- The installed migrations have only id uniqueness on the server. The device's
-- logical key also becomes a server constraint, including each drop separately.
create unique index set_logs_logical_set on public.set_logs
  (session_id, program_exercise_id, set_index, drop_index);

create function security_private.valid_drop_config(d jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(d) is distinct from 'object' then return false; end if;
  if (d ?& array['count','percent','mode']
    and d - array['count','percent','mode','reps'] = '{}'::jsonb
    and jsonb_typeof(d->'count')='number' and (d->>'count') ~ '^[0-9]+$'
    and jsonb_typeof(d->'percent')='number' and (d->>'percent') ~ '^[0-9]+$'
    and d->>'mode' in ('failure','reps')) is not true then return false; end if;
  if not ((d->>'count')::numeric between 1 and 3 and (d->>'percent')::numeric between 10 and 40)
    then return false; end if;
  if d->>'mode'='reps' or (d ? 'reps' and d->'reps'<>'null'::jsonb) then
    if (jsonb_typeof(d->'reps')='number' and (d->>'reps') ~ '^[0-9]+$') is not true then return false; end if;
    if not ((d->>'reps')::numeric between 1 and 50) then return false; end if;
  end if;
  return true;
end $$;
revoke all on function security_private.valid_drop_config(jsonb) from public, anon, authenticated;

-- Retain the live alternatives and base-target checks, and fail on source drift.
do $migration$
declare definition text; patch record;
begin
  for patch in select * from (values
    ($old$item - array['reps_min','reps_max','rir']$old$,
     $new$item - array['reps_min','reps_max','rir','drop']$new$),
    ($old$for item in select value from jsonb_array_elements(new.set_plan) loop$old$,
     $new$for item in select value from jsonb_array_elements(new.set_plan) loop
      if item ? 'drop' and not security_private.valid_drop_config(item->'drop') then
        raise exception 'invalid drop config' using errcode='23514';
      end if;$new$)
  ) as patches(old_sql,new_sql) loop
    definition := pg_get_functiondef('security_private.validate_exercise_plan()'::regprocedure);
    if (length(definition)-length(replace(definition,patch.old_sql,'')))/length(patch.old_sql) <> 1 then
      raise exception 'Drop set plan source drift: %',patch.old_sql;
    end if;
    execute replace(definition,patch.old_sql,patch.new_sql);
  end loop;
end $migration$;

-- Drops add volume, but cannot satisfy main-set attendance or earn PR points.
do $migration$
declare definition text; anchor text := 'and l.deleted_at is null';
begin
  definition := pg_get_functiondef('security_private.award_session_points(uuid)'::regprocedure);
  if (length(definition)-length(replace(definition,anchor,'')))/length(anchor) <> 3 then
    raise exception 'Drop set records source drift';
  end if;
  execute replace(definition,anchor,anchor || ' and l.drop_index=0');
end $migration$;

create or replace function public.sync_set_logs(p_rows jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare r record; plan_id uuid;
begin
  for r in select * from jsonb_to_recordset(p_rows) as x(
    id uuid, session_id uuid, program_exercise_id uuid, exercise_id uuid, set_index smallint, drop_index smallint,
    weight_kg numeric, reps smallint, completed_at timestamptz, client_updated_at timestamptz, deleted_at timestamptz)
  loop
    plan_id := case when r.program_exercise_id is not null and public.owns_program_exercise(r.program_exercise_id)
      then r.program_exercise_id end;
    -- Id-based retries also work after a plan was deleted and the FK became null.
    if exists(select 1 from public.set_logs where id=r.id) then
      update public.set_logs set weight_kg=r.weight_kg,reps=r.reps,completed_at=r.completed_at,
        client_updated_at=r.client_updated_at,deleted_at=r.deleted_at,server_updated_at=now()
        where id=r.id and client_updated_at<r.client_updated_at;
    else
      insert into public.set_logs
        (id,session_id,program_exercise_id,exercise_id,set_index,drop_index,weight_kg,reps,completed_at,client_updated_at,deleted_at)
      values(r.id,r.session_id,plan_id,r.exercise_id,r.set_index,coalesce(r.drop_index,0),r.weight_kg,r.reps,
        r.completed_at,r.client_updated_at,r.deleted_at)
      on conflict(session_id,program_exercise_id,set_index,drop_index) do update set
        weight_kg=excluded.weight_kg,reps=excluded.reps,completed_at=excluded.completed_at,
        client_updated_at=excluded.client_updated_at,deleted_at=excluded.deleted_at,server_updated_at=now()
        where public.set_logs.client_updated_at<excluded.client_updated_at;
    end if;
  end loop;
end $$;

commit;
