# T-344 — Nutrition sync, form edits, and the captain meal view

**Migration:** `0143_form_question_snapshot.sql`, only if needed.

## Items
1. **(Audit #10)** `src/features/nutrition/data/refresh-nutrition.ts` and `hooks/use-meal-logs.ts`: when online, fetch the player's meal logs for the relevant days and merge them into IndexedDB.
   - Never overwrite rows that have pending outbox edits. Follow how the supplement refresh does it.
   - A second device must show eaten meals and the correct macros.
2. **(Audit #11)** Editing a form must not change requests that were already answered.
   - Answered or reviewed requests show only the questions that existed when the request was sent, or that have answers.
   - Choose the smallest correct design. A migration that adds a snapshot column is allowed.
   - The completion logic (`complete_custom_form_request`) must not count questions added after the request.
3. **(Audit #12)** `src/features/captain-workspace/player-file/load-activity.ts:14` and `nutrition-summary.tsx`:
   - load the meal `day_type`;
   - pick today's meals with the same training-day/rest-day rule the player uses;
   - base the fallback macro targets on that day's meals only.

## Out of scope
Progress check-in (T-341), notifications (T-343), billing.

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
