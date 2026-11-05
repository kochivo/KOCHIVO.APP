create index if not exists meal_items_meal_id on public.meal_items (meal_id);
create index if not exists meal_item_alternatives_meal_item_id on public.meal_item_alternatives (meal_item_id);
create index if not exists meal_logs_meal_id on public.meal_logs (meal_id);
create index if not exists set_logs_program_exercise_id on public.set_logs (program_exercise_id);
create index if not exists workout_sessions_program_day_id on public.workout_sessions (program_day_id);
create index if not exists coach_invites_captain_id on public.coach_invites (captain_id);
create index if not exists form_checks_player_id on public.form_checks (player_id);
create index if not exists nutrition_plans_captain_id on public.nutrition_plans (captain_id);
create index if not exists programs_source_template_id on public.programs (source_template_id);
create index if not exists nutrition_plans_source_template_id on public.nutrition_plans (source_template_id);

create function public.captain_last_payments()
returns table (id uuid, player_id uuid, captain_id uuid, amount_egp int, days int,
  period_start date, period_end date, created_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select distinct on (p.player_id) p.id, p.player_id, p.captain_id, p.amount_egp, p.days,
    p.period_start, p.period_end, p.created_at
  from public.player_payments p
  where p.captain_id = (select auth.uid())
  order by p.player_id, p.created_at desc, p.id;
$$;
revoke all on function public.captain_last_payments() from public, anon;
grant execute on function public.captain_last_payments() to authenticated;
