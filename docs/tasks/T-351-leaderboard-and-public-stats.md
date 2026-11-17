# T-351 — Leaderboard after a one-week plan ends; public coach page stats

**Migration:** `0148_board_and_public_stats.sql`

## Items
1. **(E-1, MEDIUM)** Leaderboard after a one-week plan ends.
   - **Which plans:** non-repeating one-week plans, meaning `settings.repeatWeekly = false` with a `weeklyStartedOn` date.
   - **Problem:** the app ends these plans after 7 days (`src/core/offline/program-cycle.ts`). `security_private.points_board` (latest: `0132_rotating_and_templates.sql:198-218`) keeps counting their weekdays all month. This lowers the player's adherence and leaderboard position.
   - **Fix:** limit planned dates to `[weeklyStartedOn, weeklyStartedOn + 6]` for these plans. This is the same rule as the reminder guard in 0141.
   - **Keep:**
     - the minimum denominator;
     - rotating schedules;
     - timezone-aware counting.
   - **Apply it as a patch on the live function text, with a drift check.** 0144 also patched functions that call `points_board`; do not lose those patches.
2. **(E-2, MEDIUM)** Public coach page: workout count.
   - **Problem:** "Workouts logged" counts workouts the player did with previous captains (`0103_public_page_data.sql:61-62`).
   - **Fix:** count only sessions inside the current relationship, meaning `training_date >= started_on` of that `coach_clients` row.
   - Handle a null `program_day_id`.
3. **(E-3, MEDIUM)** Public coach page: adherence for rotating programs.
   - **Problem:** it shows 0% because it requires `program_days.weekday` (`0103:49-54`).
   - **Fix:** add the same rotating fallback as the leaderboard (`player_intake.training_days`).
   - **Keep:**
     - the rest-day exclusion;
     - the daily dedup;
     - the start boundaries.

Keep every public-page privacy gate: the opt-in, the 5-player minimum, and the excluded account types.

## Out of scope
Forms (T-347), workout client (T-348), billing (T-349), dashboard/chat (T-350), nutrition (T-352).

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
