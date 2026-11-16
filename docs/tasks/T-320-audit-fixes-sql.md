# T-320 — Audit fixes in SQL: migration `0128_audit_fixes.sql`

A read-only audit confirmed the bugs below. Put all of them in ONE new migration, `supabase/migrations/0128_audit_fixes.sql`.
- It must be additive and safe: replace functions with `create or replace`, or with the source-patch pattern used in 0121 and 0122, which fails loudly on drift.
- Never edit migrations 0001–0127.
- Every fix gets a PGlite regression test in `supabase/tests/audit-fixes.test.ts`. Write it first, show it failing, then fix.
- The owner must approve before this goes live. Do not connect to any hosted database.

## 1. `sync_set_logs` keeps the wrong exercise on conflict
- **Where:** `0120_drop_sets.sql`, around lines 74 and 83.
- **Bug:** both conflict update paths change weight and reps but not `exercise_id`. Two devices log the same planned set; one picked an alternative exercise. The server ends up storing bench press at the alternative's 30 kg.
- **Fix:** update `exercise_id` together with weight and reps, under the existing timestamp condition.

## 2. Crown adherence counts the wrong weekdays
- **Where:** `0083_crown_by_adherence.sql:13`, `security_private.points_board`.
- **Bug:** program weekdays use Saturday = 0, while the SQL uses Postgres `dow` with Sunday = 0. A Sat/Tue/Thu player who completes everything shows 92% instead of 100%.
- **Fix:** convert with `(extract(dow from d)::int + 1) % 7`.
- **Test:** the exact November 2026 example gives 12 planned days and 100%.

## 3. Rotating programs never get the perfect-week bonus
- **Where:** `0081_points_and_ranks.sql:112`, `security_private.award_perfect_week`.
- **Bug:** rotating programs have a null `program_days.weekday`, so `count(distinct weekday)` is 0 and the bonus is blocked.
- **Fix:** for rotating programs, take the weekly target from the player's training-day schedule (the same source the client uses in `src/features/player-home/next-day.ts`). Keep the current logic for weekly programs.

## 4. PT renewal lets offline workouts skip credit deduction
- **Where:** `0065_fleet_fixes.sql:89` (`renew_player`), `0116_pt_credit_logical_dedupe.sql:11` (`deduct_pt_session`), and the offer renewal path.
- **Bug:** adding credits to an active PT subscription resets `billing_started_at`. A workout done offline before the renewal then syncs after it and is never deducted (12 credits instead of 11).
- **Fix:** keep the existing billing start when credits are added to an active PT subscription. Move it only for a genuinely new subscription period.

## 5. Frozen and waiting subscriptions show as overdue debt
- **Where:** `0107_money_owed.sql:50`, `captain_money_owed`.
- **Fix:**
  - Exclude subscriptions with `frozen_at` set, and subscriptions still awaiting plans, from the expiry-based debt and the upcoming-expiry rows.
  - Keep real unpaid installments and pending receipt reviews visible.
  - Also fix the client label in `src/features/billing/data/money-owed-model.ts:23` so these rows are not marked "expiring soon".

## 6. Swaps ignore the player's other recorded injuries
- **Where:** `0089_swap_reasons.sql`, `request_exercise_swap` around line 28 and `decide_exercise_swap` around line 69.
- **Fix:** check the target exercise's stress tags against the union of `player_intake.injuries` and the request's injury, including requests made for discomfort, in both functions.

## 7. Temporary pain swaps permanently lose the approved alternative
- **Where:** `0100_exercise_alternatives_set_plan.sql:78`; `0123_pain_reports.sql:146` and `:182`.
- **Bug:** `answer_pain` with `swap_2w` goes through `decide_exercise_swap`, which empties `alternatives`. `expire_pain_swaps` restores the exercise but leaves `alternatives` empty.
- **Fix:**
  - Add a nullable column `pain_reports.swap_alternatives uuid[]` (additive) and store the previous alternatives in it when the swap is applied.
  - Restore them on expiry, but only while the row still has the swapped exercise, so later captain edits win. Respect the limit of 3 alternatives.

## Also update
- `src/types/app-database.ts`, only if a column or a function signature changes.
- Do not touch app code beyond `money-owed-model.ts`; T-319 is changing app code in parallel.

## Gates
npm run typecheck, npm run lint, and `supabase/tests` (the full PGlite suite must pass). The orchestrator runs build and check.
