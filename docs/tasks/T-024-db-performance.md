# T-024 — Database performance: hot foreign-key indexes and the billing N+1

**Phase:** 5 · **Depends on:** migrations 0001–0028 (merged) · **Status:** ready
**Delegate to:** Codex

## The gap
1. The Supabase performance advisor lists foreign keys without a covering index. Most are cold, but some sit on paths that RLS helpers or screens hit on every request.
2. `src/features/billing/data/billing.ts` `fetchBilling()` runs **one `player_payments` query per player** to get each player's latest payment. A LEGEND captain with 40 players makes 40 requests per page load.

## Files
- `supabase/migrations/0029_db_performance.sql` (new, exactly 0029):
  - Indexes, `create index if not exists`, named `<table>_<column>`, only on these columns (check first that no existing index already starts with the column; skip and say so if one does):
    - `meal_items(meal_id)`, `meal_item_alternatives(meal_item_id)`, `meal_logs(meal_id)`
    - `set_logs(program_exercise_id)`, `workout_sessions(program_day_id)`
    - `coach_invites(captain_id)`, `form_checks(player_id)`, `nutrition_plans(captain_id)`
    - `programs(source_template_id)`, `nutrition_plans(source_template_id)`
  - `public.captain_last_payments()`: **security invoker**, `stable`, empty `search_path`, returns the latest `player_payments` row per player for the calling captain (`captain_id = auth.uid()`), using `distinct on (player_id) ... order by player_id, created_at desc, id`. Columns: every column the billing screen reads today (read `billing.ts` and its types). RLS still applies because it is invoker. Revoke from `public, anon`; grant to `authenticated`.
  - Every new function must respect AGENTS/ARCHITECTURE rules from 0014 and 0026 (no new table, so no new `active_caller` policy is needed).
- `src/features/billing/data/billing.ts` and `client.ts`: replace the per-player loop with one `rpc('captain_last_payments')` call, then map rows by `player_id`. Keep the error mapping and the output shape identical.
- `src/features/billing/billing.test.ts`: assert one RPC call regardless of player count, and that players without a payment get `lastPayment: null`.
- `supabase/tests/rls-player-payments.test.ts`: the function returns only the caller's players, exactly one row per player (the latest, with a tie on `created_at` broken by `id`), and nothing for a player or a stranger.

## Requirements
1. Do not edit 0001–0028. No new dependency. Files under 250 lines.
2. Do not drop any index the advisor calls "unused" (the database has no traffic yet, so that signal is meaningless).

## Acceptance
- [ ] New and old tests pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Merging permissive policies
- Any other screen's queries
