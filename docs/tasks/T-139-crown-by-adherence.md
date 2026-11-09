# T-139 — The crown goes to the most committed player, not the busiest plan

**Phase:** Gamification · **Depends on:** T-133, T-138 (0082 must be landed first) · **Status:** ready (owner decision 2026-11-09: "نسبة التزام")

## Goal
Today the crown goes to the highest monthly points. A player on a 6-day plan earns about twice
what a player on a 3-day plan earns, even when both never miss a day. The owner decided the crown
race must be fair across plans: it is ranked by how much of their own plan each player completed.
Lifetime points and ranks do not change.

## The rule
For one player, one captain and one calendar month (Africa/Cairo):

- `done` = distinct `training_date` values in the month that have a workout row with status `counted`.
- `planned` = calendar days of the month whose weekday is a non-rest day in the player's active,
  non-template program with this captain. Count only days on or after the day the player joined
  this captain. Use the program as it is now for the whole month. Floor: `greatest(planned, 8)`,
  so a late joiner cannot reach 100% with two workouts.
- `adherence` = `least(100, round(100.0 * done / planned))`. No active program: 0.
- `crown score` = `adherence` + counted `pr` points + counted `inbody` points earned in the month.
  `perfect_week` and `meal_check` rows are not added (perfect week is already adherence; meals per T-138).
- Order: crown score desc, then raw monthly points desc, then earliest last award, then `player_id`.
- The crown holder is position 1 with `done >= 4`. This replaces the 20-point minimum.

## Files
Create or modify only these:
- `supabase/migrations/0083_crown_by_adherence.sql`: new. Do not edit 0081 or 0082.
- `supabase/tests/points-crown-adherence.test.ts`: new. Update assertions in the existing points test files only where this rule makes them wrong, and keep every file under 250 lines (split if needed).
- `src/features/ranks/types.ts`, `src/features/ranks/tiers.ts`, `src/features/ranks/data/load-leaderboard.ts`, `src/features/ranks/data/load-my-points.ts`, `src/features/ranks/ranks.test.ts`, `src/features/ranks/index.ts`: the new fields and the constant below only. No component changes.
- `src/types/database.ts`: RPC return types.
- `docs/tasks/T-133-points-and-ranks-db.md`: one line pointing to this card.
- This task card.

## Requirements
1. Replace `security_private.points_board` so `monthly` is the crown score above. Because the return type grows, drop and recreate it together with its dependents in one migration, keeping `security definer`, `set search_path = ''`, and the same grants and revokes as 0081. It returns `player_id, monthly, position, adherence, done, planned`.
2. `count_points()` keeps sending `crown_taken` and `crown_lost`, now with the `done >= 4` condition instead of `monthly >= 20`. The `p_extra` path must still work so the holder is compared before and after the new row.
3. `team_leaderboard(p_month)` adds `adherence int`, `done int`, `planned int`; `monthly` is the crown score; `is_crown` uses the new condition. The privacy rule stays: a player caller gets first names only and `player_id` only on their own row.
4. `my_points()` adds `adherence`, `done`, `planned`. `crown_gap` is in crown-score units: 0 for the holder, otherwise `greatest(1, top score + 1 - my score)`; add `crown_needs_workouts` = `greatest(0, 4 - done)`.
5. TypeScript: extend `LeaderboardRow` and `MyPoints` and the zod schemas with the new fields. Replace `CROWN_MIN_MONTHLY` with `CROWN_MIN_WORKOUTS = 4`; keep exporting `CROWN_MIN_MONTHLY` as a deprecated alias only if another file in the tree still imports it, and say so under "Notes for reviewer".
6. Past months: the same rule applies when `p_month` is in the past (the program as it is now is used; say so in a SQL comment).
7. Performance: one query per board, no per-player loops in plpgsql. A roster of 200 players must not run 200 sub-selects of `generate_series`; build the month's calendar once.

## Acceptance
- [ ] PGlite tests (inject the clock the way the existing points tests do):
  - A is on a 3-day plan and did every planned day; B is on a 6-day plan and did the same number of workouts: A is ahead, though B has equal raw points.
  - Both at 100%: the one with more PR points holds the crown; equal again: more raw monthly points.
  - `done = 3` at 100% of a small plan: nobody holds the crown; the fourth workout sends `crown_taken`.
  - A player who joined on the 25th and trained twice: `planned` is 8, adherence 25.
  - No active program: adherence 0, in the list, never the holder.
  - A pending or rejected workout does not count in `done`; approval raises the score and can move the crown (`crown_taken` and `crown_lost` each sent once).
  - A meal check and a perfect-week row do not change `monthly`.
  - `my_points()` returns the new fields; `crown_gap` and `crown_needs_workouts` for a chaser and for the holder.
  - A player caller still gets first names only and no other `player_id`.
- [ ] All of `supabase/tests` and `src/features/ranks` pass.
- [ ] `npm run check` and `npm run build` pass (sandbox fonts and the audit's git EPERM are known limits).

## Out of scope
- Screens. T-136 and T-137 show `monthly` as it comes; their wording changes in a later UI card.
- Notifications text, the captain review alert, the crown prize, stars above Legend, the share card.
- Closing the meal-check direct-call gap.

## Implementation notes
- 0083 replaces the board and dependent RPCs atomically; the calendar is materialized once per board.
- Current programs also determine past-month adherence. The denominator is always at least eight.
- No-program players cannot hold the crown, even with four counted training dates and bonus points.
- Meal checks remain excluded from raw crown tie-breaks and last-award time, preserving T-138.
- New exported progress properties are optional for existing consumers' fixtures; RPC schemas require them.
- `CROWN_MIN_MONTHLY` is a deprecated alias of `CROWN_MIN_WORKOUTS` for the unchanged crown UI.
- The acceptance example of three workouts at 100% conflicts with the eight-day floor; tests enforce 38% at three workouts and crown eligibility at four.
