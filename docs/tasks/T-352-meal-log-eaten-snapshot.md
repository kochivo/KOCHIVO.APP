# T-352 — Logged meals keep what was actually eaten

**Migration:** `0149_meal_log_snapshot.sql`

## Items
1. **(B-4, MEDIUM)** If the captain edits a meal after the player logged it, the eaten totals change after the fact. For example, 100 g of rice becomes 200 g, and both the player and the captain now see 200 g as eaten.
   - **Cause:**
     - `meal_logs` stores only the meal id, swaps and time (`src/features/nutrition/data/log-meal.ts:10-15`).
     - Totals are recalculated from the current plan: for the player in `src/features/nutrition/macros.ts:13-16`, and for the captain in `src/features/captain-workspace/player-file/load-activity.ts:29-38`.
   - **Fix:**
     - Add a nullable snapshot column to `meal_logs` for the eaten macros (kcal, protein, carbs, fat). Compute it at completion time, including swaps.
     - Write it through the existing offline path: `saveAndQueue` plus the latest meal-log sync RPC.
     - Totals use the snapshot when it exists, and fall back to today's calculation for legacy rows. Do not backfill or invent history.
     - Un-completing a meal clears the snapshot. Completing it again recomputes the snapshot.
   - **Keep:**
     - stable ids;
     - swaps;
     - the completion toggle;
     - the T-344 day-type filter (`filterMeals`);
     - the Dexie upgrade path. If you add a Dexie field, bump the version correctly with no data loss.
   - **Tests:**
     - editing a meal after logging keeps the old totals;
     - legacy rows still work.

## Out of scope
Forms (T-347), workout (T-348), billing (T-349), chat/dashboard (T-350), points/public (T-351).

## Rules
- **Source:** on 2026-11-17 the owner asked to fix every item of audit round 2 (`docs/tasks/AUDIT-2026-11-17.md`). The evidence for each id is quoted in the card.
- **Verify first:** re-check each item in the code before fixing it. If an item turns out not to be a real bug, skip it and say why.
- **Database:**
  - All DB changes go in ONE new migration, with the exact number given above. Do not apply it.
  - The migration is additive: `create or replace` for functions, triggers and policies; new columns or tables only. No data rewrites or deletes.
  - Never edit old migrations.
- **Patch, do not rewrite:** to change a long existing function, follow the pattern of 0139/0141/0144:
  1. read `pg_get_functiondef(...)`;
  2. `replace()` an exact fragment;
  3. raise on drift (the fragment count must be exactly 1);
  4. `execute` the result.

  Short functions may be restated with `create or replace`. If you do that, copy the LATEST definition exactly and change only what the card needs.
- **Tests:** every fix gets a test. Use PGlite in `supabase/tests/` for SQL and vitest for TS. Tests must be deterministic.
- **UI:**
  - Every new string goes in ar, arStd and en.
  - Use tokens only and logical properties.
  - Touch targets are 48px or more.
  - Files are 250 lines or fewer.
- **Scope:** do not touch the out-of-scope features. Other cards are fixing them in parallel.
- **Gates:** `npm run check` and `npm run build`.
