# T-296: one logical workout takes at most one PT credit (audit DB-03)

## Problem
`sync_workout_sessions` resolves conflicts on `id` only. Read its final definition: `supabase/migrations/0059_session_feedback.sql:10,16`, plus later patches such as the one in 0097. The PT deduction is deduplicated per session uuid (`0064_package_rules.sql:118,120`, later patched in `0097:81`).

So two different session ids for the same `(player_id, program_day_id, training_date)` create two sessions and take two credits. In PGlite, the balance went from 3 to 1.

The normal client uses `stableId`, so this needs a non-standard client or a direct RPC call. Production has 0 such duplicates today.

## Fix
New migration `supabase/migrations/0116_pt_credit_logical_dedupe.sql`. Additive: `create or replace` of the deduction function or trigger.
- Before deducting, skip if another completed session already took a deduction for the same player, the same `program_day_id` (not null) and the same `training_date`.
- Keep the existing uuid-based `on conflict do nothing`.
- Do not add a unique index. Orphan history rows have a NULL day, and old data must not fail.
- Keep the same security, search_path and grants as the final definition.

## Files
- The migration above.
- New test `supabase/tests/pt-credit-logical-dedupe.test.ts`, which must fail before the fix:
  - two ids for one day and date leave one deduction and a balance of 2;
  - two different days on the same date leave two deductions;
  - a retry with the same id still leaves one deduction.

## Out of scope
Old migrations, app code, other findings. Never apply anything to a hosted database.

## Gates
The new test, the existing PT, package and workout-sync tests in supabase/tests, then `npm run typecheck`, `npm run lint`.
