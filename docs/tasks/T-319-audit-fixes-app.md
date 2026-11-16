# T-319 — Audit fixes in app code (2026-11-16 night audit)

A read-only audit confirmed the bugs below by tracing the code. Fix each one with a failing test first. These are client and TypeScript changes only. The SQL side is T-320, which runs in parallel, so do not touch `supabase/`.

## 1. Cycle light days reduce an already-reduced weight
`src/features/workout/hooks/use-focus-session.ts` (around the `cycleLight` 0.85 factor) and `src/features/workout/data/last-performance.ts`.
- The last logged weight becomes the next suggestion's baseline, and the light-day factor is then applied again: 100 → 85 → 72.25 kg over consecutive light days.
- Choosing "usual" after a light workout suggests 85 instead of 100.
- **Fix:** when picking the baseline, skip sets logged on a light day. Use the cycle helpers to check whether that date was a light day for this player. If that is not possible offline, store nothing new: walk back to the most recent set whose date was not a light day. Apply 0.85 once, and use the unadjusted baseline for "usual".
- **Test:** two consecutive light days suggest 85 both times, and "usual" suggests 100.

## 2. Strength progress is empty on a new device
`src/features/progress/data/strength.ts` and `progress-screen.tsx`.
- The strength chart reads only the local Dexie sets, so synced history from other devices is missing.
- **Fix:** merge the remote sets (use the history screen's existing remote read, or a cheap query by player and exercise) with the local rows by id. The local unsynced row wins when the ids match.
- Keep it lazy and cheap. Do not add first-load JS to /player/progress beyond the budget.
- **Test:** the merge function, with remote-only rows, local-only rows, and the same id in both.

## 3. Shopping list uses intake training days instead of the assigned program
`src/features/nutrition/components/shopping-screen.tsx`, `src/features/meal-plans/data/food-prices.ts` and `src/features/nutrition/components/day-type.tsx`.
- **Fix:** derive training and rest days for the shopping week from the assigned program, with the same schedule logic the meal screen uses.
- **Test:** intake has 3 days and the program has 4; 200 g on training days and 100 g on rest days gives 1100 g a week.

## 4. KO swap options ignore the player's other injuries and the movement pattern
`src/features/ko-account/data/swap.ts`.
- The injury filter must use the union of `player_intake.injuries` and the injury in the request, including requests made for discomfort.
- The "machine busy" branch must require the same movement pattern as the source exercise and must exclude exercises that stress any recorded injury.
- **Test:** a player with a lower-back injury asks for a knee-safe swap and gets no deadlift. A cable pushdown never offers a biceps curl.

## 5. Workout reminder approval uses the captain's date
`src/features/ko-account/data/execute.ts` (around line 97).
- The approval signs the captain's local date, but the SQL checks the player's date. Use the player's timezone (`getPlayerTimezone(player.id)` or the existing helper) so the date matches `user_today(p_player)`.
- **Test:** a Cairo captain at 23:30 UTC with a New York player signs the player's date.

## Rules
AGENTS.md applies in full. Files stay under 250 lines. No new dependencies. Keep the perf budget. Use `localDate()` for dates.

## Gates
npm run typecheck, npm run lint, and the test files you touch. The orchestrator runs build and check.
