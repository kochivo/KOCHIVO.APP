# T-345 — Points and crown fairness

**Migration:** `0144_points_crown_fairness.sql`

## Items
1. **(Audit #15)** `src/features/workout/data/finish-cardio-session.ts` completes the session with `started_at = completed_at`. The under-20-minute rule (`0081_points_and_ranks.sql:132`, latest replacement) then keeps cardio-only points pending forever.
   - Record a real start time and the cardio duration.
   - Validate cardio-only completion on the server with a sensible rule, for example that the planned cardio minutes were logged.
   - A valid cardio-only workout must count toward points, crown adherence and perfect weeks.
2. **(Audit #16)** Crown selection must pick the highest-scoring ELIGIBLE player, not only check row 1.
   - Where: `0083_crown_by_adherence.sql:103`, `0087_crown_hall_of_fame.sql:35`, and their latest replacements.
   - Apply it to both the live crown and the month-end freeze.
3. **(Audit #17)** Perfect-week counting (`0081:115`, `0128_audit_fixes.sql:23`) must count only completions with the award's captain, during the current relationship.
4. **(Audit #25)** Offline workouts synced shortly after month end must still count toward the frozen crown winner.
   - Add a settlement window: freeze the previous month only after a grace period (for example 48h), or re-settle when late awards arrive for a frozen month.
   - Keep medals and the hall of fame consistent.
   - Never award a crown medal twice.

## Out of scope
- Workout logging and progress (T-341). You own `finish-cardio-session.ts`.
- Templates and reminders (T-342).
- Billing.

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
