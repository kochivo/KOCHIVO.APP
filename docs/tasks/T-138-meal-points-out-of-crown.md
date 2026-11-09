# T-138 — Meal-check points do not count toward the crown

**Phase:** Gamification · **Depends on:** T-133 (landed) · **Status:** implemented (local gate limits below)

## Goal
Owner decision 2026-11-09: a player can call `award_meal_check()` directly, without a meal photo,
and earn +1 a day. That is up to about 30 points a month, above the crown minimum of 20, so the
crown could be won without training. Until meal analysis leaves a trusted server-side proof,
meal-check points stay in the lifetime total (rank) but are left out of the monthly crown race.

## Files
Create or modify only these:
- `supabase/migrations/0082_meal_points_out_of_crown.sql`: new. Do not edit 0081.
- `supabase/tests/points-crown-meals.test.ts`: new (`points-ranks.test.ts` is at the 250-line limit; do not grow it. Change an assertion there only if this card makes it wrong).
- `docs/tasks/T-133-points-and-ranks-db.md`: one line under the implementation notes pointing to this card.
- This task card.

## Requirements
1. `create or replace` `security_private.points_board` with the same signature, return type, ordering, `security definer` and `set search_path = ''`. The only change: rows with `kind = 'meal_check'` are not summed into `monthly`. This must hold for the `p_extra` row too, so a new meal-check row can never trigger `crown_taken` or `crown_lost`.
2. Because every monthly reader goes through `points_board`, `team_leaderboard().monthly`, `is_crown`, `position`, `my_points().monthly`, `month_position` and `crown_gap` all follow. Check each one in the tests; do not redefine those functions unless a test proves it is needed.
3. Lifetime is unchanged: a meal check still adds 1 to `player_points.lifetime` and can still cause `rank_up`.
4. `my_points().logs` still lists meal-check rows.
5. Keep the grants and revokes of 0081 intact after the replace (re-state the revoke if `create or replace` needs it).

## Acceptance
- [x] PGlite tests in the new file:
  - 25 meal checks in one month and nothing else: `monthly` is 0, no crown, no `crown_taken` notification, lifetime is 25.
  - Player A has 21 workout points; player B has 20 workout points plus 5 meal checks: A holds the crown and B's `monthly` is 20.
  - A meal check that takes lifetime from 99 to 100 still inserts `rank_up`.
  - A meal-check insert while another player holds the crown inserts no crown notification.
  - `my_points()` for a meal-only player: `monthly` 0, `crown_gap` 20, and the meal rows are in `logs`.
- [x] All of `supabase/tests` passes.
- [ ] `npm run check` and `npm run build` pass (sandbox fonts and the audit's git EPERM are known limits).

## Out of scope
- Closing the direct-call gap itself (a server-side proof of the meal analysis). Later card.
- Any UI or TypeScript change. `src/` stays untouched.

## Implementation notes
- 0082 replaces only `security_private.points_board`, excluding meal checks in the ledger join (including `p_extra`) so they cannot affect monthly totals or the earliest-total tie-break. Signature, ordering, security settings and existing permissions are preserved; `CREATE OR REPLACE` retains the ACL.
- Lifetime counting, rank-up notifications and recent meal history remain unchanged. No public RPC or trigger was redefined, and no production migration was applied.
- Added five deterministic PGlite tests using the shared fixed clock and fixtures; verified four fail against 0081 before implementation. Both points suites pass: 2 files / 27 tests. Updated the existing team-change assertion to expect zero monthly meal points.
- Required gates: typecheck and lint pass; `npm run check` stops at release audit with sandbox `spawnSync git EPERM`. `npm run build` fails only because Alexandria, Changa and Manrope cannot be fetched from Google Fonts.
- Full suite (`npm test -- --configLoader native --pool threads --maxWorkers 2`): 407 files / 2,900 tests passed, including all Supabase tests. One out-of-scope failure: `src/lib/perf-budget.test.ts` cannot open a missing `.next/static/chunks/421c_el12128q.js` after the font-blocked build. The earlier overlapping database-only run hit the demo rate-limit test timeout and was stopped; the completed full run passes that test. Stopped the redundant single-worker database run once the full result confirmed all Supabase tests pass.
