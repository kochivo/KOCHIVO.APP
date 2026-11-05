-- A template has no player. Keep the same ownership check and row lock,
-- while comparing nullable player IDs without rejecting template saves.
do $migration$
declare definition text; fragment text := 'player_id=(p_draft ->> ''player_id'')::uuid';
begin
  definition := pg_get_functiondef('public.save_weekly_program(jsonb)'::regprocedure);
  if position(fragment in definition) = 0 then
    raise exception 'template save source drift';
  end if;
  execute replace(definition, fragment, 'player_id is not distinct from (p_draft ->> ''player_id'')::uuid');
end; $migration$;
