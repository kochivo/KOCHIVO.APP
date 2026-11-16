# T-329 — Rotating programs: reminders and crown adherence; templates keep Ramadan slots

**Source:** `docs/AUDIT-2026-11-16-full.md`, findings 5 (DATA-03/BL-03), 6 (PERF-05/BL-05) and 7 (BL-02).

**Migration:** ONE new file, `supabase/migrations/0132_rotating_and_templates.sql`. It is additive: `create or replace function` only, with no data writes and no edits to older migrations. Each function must start from its **latest** definition; check which migration defined it last with grep. Do not apply it to any hosted database.

## Background: rotating programs
- A rotating program has `weekday = null` on every day.
- Which day comes next and which dates are training dates follows `src/core/offline/program-cycle.ts` and `src/features/player-home/next-day.ts`. Training dates come from the player's intake training days. T-320 already used this for the perfect-week bonus; find that SQL in `0128_audit_fixes.sql` and reuse the same helper or logic.

## 1. Templates keep `ramadan_slot` (DATA-03)
- **Where:** `nutrition_plan_to_template`, `assign_nutrition_template` and `copy_template`, last defined in 0118. The column comes from 0122.
- **Fix:** copy `ramadan_slot` in all three functions, next to `day_type` and `time_of_day`. Change nothing else.

## 2. Workout reminders for rotating programs (PERF-05 / BL-05)
- **Where:**
  - `public.queue_workout_reminders`: from 0064, latest patch in 0097, 0122 or later; use the latest.
  - `security_private.queue_ramadan_reminders` (0122:158). Its weekday filter is at :182, and it suppresses morning reminders at :197.
- **Bug:** both functions require `d.weekday = today`, so a rotating program gets zero reminders, in normal mode and in Ramadan.
- **Fix:** add a rotating branch.
  - Today counts as a training day when today's weekday is in the player's intake training days.
  - The reminded day is the program's next day by the same rotation rule player home uses. If that is too complex in SQL, remind with a generic "training today" message and no day name; say which one you chose.
  - Keep the dedup and timezone handling exactly as they are.
  - The weekly branch must be unchanged.

## 3. Crown adherence for rotating programs (BL-02)
- **Where:** `security_private.points_board`, from 0083; check for later patches, including 0128.
- **Bug:** with null weekdays the planned count falls back to the workouts done, so 8 of 12 sessions shows 100%.
- **Fix:** for rotating programs, the planned count is the number of dates in the month window whose weekday is in the intake training days. Use the same window the weekly branch uses. Weekly programs are unchanged.

## Tests (PGlite, full chain) — `supabase/tests/rotating-0132.test.ts`
- **Templates:** a plan with explicit suhoor/iftar keeps both slots through save-as-template, assign, and copy.
- **Reminders:**
  - A rotating program on a training weekday gets 1 reminder, and running the job again still gives 1.
  - On a non-training weekday it gets 0.
  - A weekly program still gets 1.
  - The same holds with Ramadan active, for the Ramadan job.
- **Crown:**
  - The audit fixture (training days Sat/Tue/Thu, November 2026 with 12 planned dates, 8 done) gives about 67%.
  - The weekly fixture is unchanged.
- **Also:** rerun the existing points, Ramadan, nutrition-template and reminder tests.

## Out of scope
- `pain_reports`, `safe_timezone` and the KO limit (T-328, migration 0131).
- Any `src/` UI.

## Gates
`npm run typecheck`, `npm run lint`, `npx vitest run supabase/tests/rotating-0132.test.ts`, and the existing related tests in `supabase/tests/`.
