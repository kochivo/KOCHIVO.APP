alter table public.program_days
  add column weekday smallint check (weekday between 0 and 6),
  add column is_rest_day boolean not null default false;
create unique index program_days_weekday on public.program_days(program_id, weekday) where weekday is not null;

create table public.program_cardio (
  -- UUIDv7 timestamp prefix and RFC variant, matching the client id format.
  id uuid primary key default ((lpad(to_hex(floor(extract(epoch from now()) * 1000)::bigint),12,'0')
    || '7' || substr(replace(gen_random_uuid()::text,'-',''),14))::uuid),
  day_id uuid not null references public.program_days(id) on delete cascade,
  position smallint not null,
  kind text not null check (char_length(kind) between 1 and 40),
  minutes smallint not null check (minutes between 1 and 300),
  intensity text not null check (intensity in ('low','moderate','high')),
  notes text not null default '' check (char_length(notes) <= 300),
  unique(day_id, position) deferrable initially deferred
);
alter table public.program_cardio enable row level security;
revoke all on public.program_cardio from anon, authenticated;
grant select, insert, update, delete on public.program_cardio to authenticated;
create policy active_caller on public.program_cardio as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy program_cardio_select on public.program_cardio for select to authenticated
  using (public.can_read_program((select d.program_id from public.program_days d where d.id = day_id)));
create policy program_cardio_write on public.program_cardio for all to authenticated
  using (public.can_edit_program((select d.program_id from public.program_days d where d.id = day_id)))
  with check (public.can_edit_program((select d.program_id from public.program_days d where d.id = day_id)));

-- Serialize exercise writes with rest toggles on the parent row, including concurrent requests.
create function security_private.guard_rest_exercise() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.program_days where id = new.day_id and not is_rest_day for update;
  if not found then raise exception 'rest day cannot have exercises' using errcode = '23514'; end if;
  return new;
end; $$;
create function security_private.guard_rest_day() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.is_rest_day and exists(select 1 from public.program_exercises where day_id = new.id) then
    raise exception 'rest day cannot have exercises' using errcode = '23514';
  end if;
  return new;
end; $$;
revoke all on function security_private.guard_rest_exercise(), security_private.guard_rest_day() from public, anon, authenticated;
create trigger program_exercises_rest_guard before insert or update on public.program_exercises
  for each row execute function security_private.guard_rest_exercise();
create trigger program_days_rest_guard before update on public.program_days
  for each row execute function security_private.guard_rest_day();

-- Cardio inherits the existing starter lock, including deletion and moving rows between days.
create function security_private.guard_starter_cardio() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op <> 'INSERT' and security_private.in_starter_template('program_exercises', to_jsonb(old)))
    or (tg_op <> 'DELETE' and security_private.in_starter_template('program_exercises', to_jsonb(new))) then
    raise exception 'starter templates are read-only' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end; $$;
revoke all on function security_private.guard_starter_cardio() from public, anon, authenticated;
create trigger program_cardio_starter_guard before insert or update or delete on public.program_cardio
  for each row execute function security_private.guard_starter_cardio();

create or replace function public.activate_program(p_program uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_player uuid;
begin
  select player_id into v_player from public.programs
    where id = p_program and captain_id = (select auth.uid()) for update;
  if not found then raise exception 'program not accessible' using errcode = '42501'; end if;
  if v_player is null then raise exception 'cannot activate template' using errcode = '22023'; end if;
  if not exists(select 1 from public.program_days d where d.program_id = p_program and not d.is_rest_day
    and (exists(select 1 from public.program_exercises e where e.day_id = d.id)
      or exists(select 1 from public.program_cardio c where c.day_id = d.id))) then
    raise exception 'program has no exercises or cardio' using errcode = '22023';
  end if;
  update public.programs set status = 'archived' where player_id = v_player and id <> p_program and status = 'active';
  update public.programs set status = 'active', settings = case
    when exists(select 1 from public.program_days where program_id = p_program and weekday is not null)
    then jsonb_build_object('repeatWeekly', true) || settings
      || jsonb_build_object('weeklyStartedOn', (now() at time zone 'Africa/Cairo')::date::text)
    else settings end where id = p_program;
end; $$;

-- Re-emit the existing function definitions with CREATE OR REPLACE. This retains all
-- ownership checks, grants, signatures and nutrition branches from previous migrations.
-- Assert each source fragment so a drifted definition fails migration instead of losing data.
do $migration$
declare signature text; definition text; alias text; target text; fragment text;
begin
  foreach signature in array array['public.assign_program_template(uuid,uuid)',
    'public.program_to_template(uuid,text)', 'public.copy_template(text,uuid,text)'] loop
    definition := pg_get_functiondef(signature::regprocedure);
    alias := case when signature like '%copy_template%' then 'v_child' else 'v_day' end;
    target := case when signature like '%copy_template%' then 'v_new_child' else 'v_new_day' end;
    fragment := alias || '.position, ' || alias || '.title)';
    if position(fragment in definition) = 0 then raise exception 'weekly copy source drift: %', signature; end if;
    definition := replace(definition, 'public.program_days (program_id, position, title)',
      'public.program_days (program_id, position, title, weekday, is_rest_day)');
    definition := replace(definition, fragment,
      alias || '.position, ' || alias || '.title, ' || alias || '.weekday, ' || alias || '.is_rest_day)');
    fragment := 'from public.program_exercises where day_id = ' || alias || '.id;';
    if position(fragment in definition) = 0 then raise exception 'weekly exercise source drift: %', signature; end if;
    definition := replace(definition, fragment, fragment || format(
      ' insert into public.program_cardio(day_id,position,kind,minutes,intensity,notes)
        select %s,position,kind,minutes,intensity,notes from public.program_cardio where day_id=%s.id;', target, alias));
    if signature like '%assign_program_template%' then
      definition := replace(definition, 'return v_program;',
        'if exists(select 1 from public.program_days where program_id=v_program and weekday is not null) then
           update public.programs set settings=jsonb_build_object(''repeatWeekly'',true) || settings ||
             jsonb_build_object(''weeklyStartedOn'',(now() at time zone ''Africa/Cairo'')::date::text) where id=v_program;
         end if; return v_program;');
    end if;
    execute definition;
  end loop;
end; $migration$;

-- Starter JSON may now carry weekly metadata and cardio; old payloads remain rotations.
do $migration$
declare definition text;
begin
  definition := pg_get_functiondef('security_private.copy_starter_templates(uuid)'::regprocedure);
  if position('values (child_id, parent_id, d.pos, d.p ->> ''title'');' in definition) = 0 then
    raise exception 'starter day source drift';
  end if;
  definition := replace(definition, 'public.programs (id, captain_id, is_template, title, notes)',
    'public.programs (id, captain_id, is_template, title, notes, settings)');
  definition := replace(definition, 't.p ->> ''notes'');',
    't.p ->> ''notes'', coalesce(t.p -> ''settings'', ''{}''::jsonb));');
  definition := replace(definition, 'public.program_days (id, program_id, position, title)',
    'public.program_days (id, program_id, position, title, weekday, is_rest_day)');
  definition := replace(definition, 'values (child_id, parent_id, d.pos, d.p ->> ''title'');',
    'values (child_id, parent_id, d.pos, d.p ->> ''title'', (d.p ->> ''weekday'')::smallint,
      coalesce((d.p ->> ''is_rest_day'')::boolean,false));
     insert into public.program_cardio(id,day_id,position,kind,minutes,intensity,notes)
       select security_private.starter_uuidv7(),child_id,x.pos,x.p ->> ''kind'',
         (x.p ->> ''minutes'')::smallint,x.p ->> ''intensity'',coalesce(x.p ->> ''notes'','''')
       from jsonb_array_elements(coalesce(d.p -> ''cardio'',''[]''::jsonb)) with ordinality as x(p,pos);');
  execute definition;
end; $migration$;
-- create_demo_workspace (0032) delegates to assign_program_template and the starter
-- copier above. Its signatures and seeded rotation programs intentionally stay unchanged.

-- Keep rest clearing, reordering and cardio replacement in one transaction. RLS
-- remains in force and existing child ids may only come from this same program.
create function public.save_weekly_program(p_draft jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  program uuid := (p_draft ->> 'id')::uuid;
  days jsonb := p_draft -> 'days';
  d jsonb; e jsonb; c jsonb; day_ids uuid[]; exercise_ids uuid[];
begin
  perform 1 from public.programs where id=program and captain_id=(select auth.uid())
    and player_id=(p_draft ->> 'player_id')::uuid for update;
  if not found then raise exception 'program not accessible' using errcode='42501'; end if;
  if jsonb_typeof(days) is distinct from 'array' then
    raise exception 'invalid days' using errcode='22023';
  end if;
  select coalesce(array_agg((x ->> 'id')::uuid),'{}') into day_ids from jsonb_array_elements(days) x;
  select coalesce(array_agg((x ->> 'id')::uuid),'{}') into exercise_ids
    from jsonb_array_elements(days) y cross join lateral jsonb_array_elements(y -> 'exercises') x;
  if exists(select 1 from public.program_days where id=any(day_ids) and program_id<>program)
    or exists(select 1 from public.program_exercises e join public.program_days d on d.id=e.day_id
      where e.id=any(exercise_ids) and d.program_id<>program)
    or exists(select 1 from public.program_cardio c join public.program_days d on d.id=c.day_id
      where c.id in(select (x ->> 'id')::uuid from jsonb_array_elements(days) y
        cross join lateral jsonb_array_elements(y -> 'cardio') x) and d.program_id<>program) then
    raise exception 'child belongs to another program' using errcode='42501';
  end if;
  update public.programs set title=p_draft ->> 'title', settings=case
    when exists(select 1 from jsonb_array_elements(days) x where x ->> 'weekday' is not null)
    then settings || jsonb_build_object('repeatWeekly',coalesce((p_draft ->> 'repeatWeekly')::boolean,true))
      || case when status='active' and settings ->> 'weeklyStartedOn' is null
        then jsonb_build_object('weeklyStartedOn',(now() at time zone 'Africa/Cairo')::date::text) else '{}'::jsonb end
    else settings end where id=program;
  delete from public.program_cardio where day_id in(select id from public.program_days where program_id=program);
  delete from public.program_exercises where day_id in(select id from public.program_days where program_id=program)
    and not(id=any(exercise_ids));
  delete from public.program_days where program_id=program and not(id=any(day_ids));
  for d in select value from jsonb_array_elements(days) loop
    if (d ->> 'program_id')::uuid is distinct from program then
      raise exception 'invalid day parent' using errcode='22023';
    end if;
    insert into public.program_days(id,program_id,position,title,weekday,is_rest_day)
      values((d ->> 'id')::uuid,program,(d ->> 'position')::smallint,d ->> 'title',(d ->> 'weekday')::smallint,
        coalesce((d ->> 'is_rest_day')::boolean,false) or (d ->> 'weekday' is not null
          and jsonb_array_length(d -> 'exercises')=0 and jsonb_array_length(d -> 'cardio')=0))
      on conflict(id) do update set position=excluded.position,title=excluded.title,
        weekday=excluded.weekday,is_rest_day=excluded.is_rest_day;
  end loop;
  for d in select value from jsonb_array_elements(days) loop
    for e in select value from jsonb_array_elements(d -> 'exercises') loop
      if (e ->> 'day_id')::uuid is distinct from (d ->> 'id')::uuid then
        raise exception 'invalid exercise parent' using errcode='22023';
      end if;
      insert into public.program_exercises(id,day_id,exercise_id,position,superset_group,sets,reps_min,reps_max,rest_seconds)
        values((e ->> 'id')::uuid,(d ->> 'id')::uuid,(e ->> 'exercise_id')::uuid,(e ->> 'position')::smallint,
          (e ->> 'superset_group')::smallint,(e ->> 'sets')::smallint,(e ->> 'reps_min')::smallint,
          (e ->> 'reps_max')::smallint,(e ->> 'rest_seconds')::smallint)
        on conflict(id) do update set day_id=excluded.day_id,exercise_id=excluded.exercise_id,position=excluded.position,
          superset_group=excluded.superset_group,sets=excluded.sets,reps_min=excluded.reps_min,
          reps_max=excluded.reps_max,rest_seconds=excluded.rest_seconds;
    end loop;
    for c in select value from jsonb_array_elements(d -> 'cardio') loop
      if (c ->> 'day_id')::uuid is distinct from (d ->> 'id')::uuid or (d ->> 'is_rest_day')::boolean then
        raise exception 'invalid cardio parent or rest day' using errcode='23514';
      end if;
      insert into public.program_cardio(id,day_id,position,kind,minutes,intensity,notes)
        values((c ->> 'id')::uuid,(d ->> 'id')::uuid,(c ->> 'position')::smallint,c ->> 'kind',
          (c ->> 'minutes')::smallint,c ->> 'intensity',coalesce(c ->> 'notes',''));
    end loop;
  end loop;
end; $$;
revoke all on function public.save_weekly_program(jsonb) from public, anon;
grant execute on function public.save_weekly_program(jsonb) to authenticated;
