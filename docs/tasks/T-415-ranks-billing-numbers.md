# T-415: Crown, streak, supplement and billing numbers are right

**Depends on:** none · **Status:** ready · **Source:** full audit 2026-11-19

## Problems
1. **The crown hint overstates the workouts needed.**
   - Example: 4 of 12 planned for the player, against 7 of 17 for the holder. Rank shows «2 more», but 1 more gives 42 > 41.
   - The gap between scores that are already rounded gets converted back into workouts and rounded up again: `supabase/migrations/0144_points_crown_fairness.sql:46`, with board scoring in `0132_rotating_and_templates.sql:242`. Shown in `ranks/components/rank-v6.tsx:25`.
2. **Streaks are capped at 120 days.** `player-home/hooks/use-streak-sessions.ts:32` fetches 120 days, and `player-home/streak.ts:30` also cuts at 120. Both the current and the best streak stop at 120.
3. **A supplement added today starts at 14% adherence.** `supplements/model.ts:22` uses a 7-day denominator from before the assignment date (`data/captain.ts:37`). Shown in `components/captain-supplements.tsx:53`.
4. **Billing counts a used-up session package as expiring soon.**
   - A package with `sessions_left = 0` and a validity date inside the window counts in «Expiring soon» and «Money owed» as «Ends tomorrow / Soon».
   - Files: `billing/components/workspace-billing-summary.ts:13`, `workspace-billing.tsx:52`, `billing/data/money-owed-model.ts:24`.
   - SQL already denies access at zero sessions. Use the existing «sessions ended» status.
5. **Mobile billing hides the expiry of a fully paid subscription.** `billing/components/workspace-billing-phone-player.tsx:24` shows elapsed days only inside the unpaid branch.

## Requirements
1. **Crown hint** = the smallest number of extra completed workouts that makes the player's score, under the board's real scoring and rounding, beat the holder's.
   - Compute it in SQL in a new migration `supabase/migrations/0160_crown_needs_exact.sql` (`create or replace`, same signature and grants).
   - Add a PGlite test for the 4/12 vs 7/17 case: the answer is 1.
2. **Streaks are correct past 120 days.**
   - Load enough history, for example by paging until the streak breaks, or a small count query.
   - The current and best values are exact for a 130-day run.
3. **Supplement adherence:** each supplement's denominator starts on its assignment date (in the player's timezone, via `localDate`). Taken 1 of 1 eligible day = 100%.
4. **Billing:** packages with zero sessions left are excluded from «expiring soon» and «money owed / soon», and appear as used up.
5. **Mobile billing:** expiry is shown separately from the payment status, so a paid but expired row shows that access ended.

## Notes
- Do not apply the migration. The reviewer applies it after the owner approves.
- No copy changes beyond what the fix needs. T-417 handles plurals.

## Out of scope
- Leaderboard design.
- Billing redesign.

## Tests
- PGlite crown case.
- A 130-day streak.
- A supplement assigned today and taken = 100%.
- A zero-session package is not expiring.
- A paid and expired phone row shows the expiry.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ranks src/features/player-home src/features/supplements src/features/billing src/features/captain-workspace`
- `npx vitest run src/features/ranks src/features/player-home src/features/supplements src/features/billing src/features/captain-workspace supabase/tests`
