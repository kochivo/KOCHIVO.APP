# T-342 — Program assignment, reminders and the captain preview

**Migration:** `0141_program_assign_reminders.sql`

## Items
1. **(Audit #5)** Reject assigning a template or program that has no exercise and no cardio on any non-rest day.
   - The check must run before the player's working program is archived and before the subscription clock starts.
   - See `0028_template_not_empty.sql`, `src/features/templates/data/templates.ts:59` and `0119_subscription_waits_for_plans.sql:45`. Use the latest definitions.
   - Show a translated error in the UI.
2. **(Audit #14)** The workout reminder functions must skip a non-repeating weekly program whose one week has ended.
   - Latest definition: `0132_rotating_and_templates.sql:130` (or later).
   - Use the same rule as `weeklyFinished()` on the client.
3. **(Audit #18)** `src/features/player-preview/data/preview.ts:33`: load the full program snapshot fields (weekday, is_rest_day, cardio, set plans), so the captain preview picks the same day as the player screen.

## Out of scope
Workout logging (T-341), ranks (T-345), nutrition, billing.

## Rules
- **Source:** on 2026-11-16 the owner asked to fix every item of the logic audit (`docs/tasks/AUDIT-2026-11-16.md`). The scenario for each item is there.
- **Verify first:** re-check each item in the code before fixing it. If an item turns out not to be a real bug, skip it and say why.
- **Database:**
  - All DB changes go in ONE new migration, with the exact number given above. Do not apply it.
  - The migration is additive: `create or replace` for functions, triggers and policies; new columns or tables only. No data rewrites or deletes.
  - Never edit old migrations.
- **Tests:** every fix gets a test. Use PGlite in `supabase/tests/` for SQL and vitest for TS. Tests must be deterministic.
- **UI:**
  - Every new string goes in ar, arStd and en.
  - Use tokens only and logical properties.
  - Touch targets are 48px or more.
  - Files are 250 lines or fewer.
- **Scope:** do not touch the out-of-scope features. Other cards are fixing them in parallel.
- **Gates:** `npm run check` and `npm run build`.
