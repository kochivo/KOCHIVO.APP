begin;

-- Player-written snapshot: keep it a small object so it cannot carry arbitrary payloads.
alter table public.meal_logs add column eaten_macros jsonb
  constraint meal_logs_eaten_macros_shape check (eaten_macros is null
    or (jsonb_typeof(eaten_macros)='object' and pg_column_size(eaten_macros)<=512));

-- Preserve the installed ownership checks, last-write-wins behavior and grants.
do $migration$
declare definition text; patch record;
begin
  definition := pg_catalog.pg_get_functiondef('public.sync_meal_logs(jsonb)'::regprocedure);
  for patch in select * from (values
    ('(id, meal_id, log_date, swaps, completed_at, client_updated_at, deleted_at)',
     '(id, meal_id, log_date, swaps, completed_at, client_updated_at, deleted_at, eaten_macros)'),
    ('r.log_date, coalesce(r.swaps, ''{}''), r.completed_at, r.client_updated_at, r.deleted_at',
     'r.log_date, coalesce(r.swaps, ''{}''), r.completed_at, r.client_updated_at, r.deleted_at,
         case when r.completed_at is not null then nullif(r.eaten_macros, ''null''::jsonb) end'),
    ('client_updated_at timestamptz, deleted_at timestamptz)',
     'client_updated_at timestamptz, deleted_at timestamptz, eaten_macros jsonb)'),
    ('swaps = excluded.swaps,', 'swaps = excluded.swaps,
    eaten_macros = excluded.eaten_macros,')
  ) as patches(old_sql,new_sql) loop
    if (length(definition)-length(replace(definition,patch.old_sql,'')))/length(patch.old_sql) <> 1 then
      raise exception 'Meal log snapshot source drift: %',patch.old_sql;
    end if;
    definition := replace(definition,patch.old_sql,patch.new_sql);
  end loop;
  execute definition;
end $migration$;

commit;
