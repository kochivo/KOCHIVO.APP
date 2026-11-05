# T-026a — Fix: a new workout never leaves loading, and focus mode keeps yesterday's date

**Phase:** 5 · **Depends on:** T-025 report (merged) · **Status:** ready · **Priority: highest**
**Delegate to:** Codex

Read `docs/CODE-HEALTH.md` CH-01 and CH-02 first.

## Bugs
1. **CH-01:** `src/features/workout/hooks/use-focus-session.ts` returns `loading: ... Boolean(day && (!session || !sets))`. For a day with no session yet, `readSession` resolves to `null`, so `!session` is true forever and focus mode shows the loading state. The session is only created by the first completed set, which the player can never reach. Loading must mean "the query has not answered yet" (`undefined`), never "answered with no row" (`null`).
2. **CH-02:** `src/features/workout/components/focus-screen.tsx` computes Cairo `today` on mount and on online/offline only. Re-compute it on `visibilitychange` (when it becomes visible) and on `focus`, like `home-screen.tsx` and `use-nutrition-snapshot.ts` do.
   - Midnight rule: a session that already has a logged set keeps its own `training_date` until it is completed (the player is mid-workout). A day with no logged set yet uses the new `today`. Put this decision in a small pure function in `src/features/workout/` with unit tests.

## Files
- `src/features/workout/hooks/use-focus-session.ts`, `src/features/workout/components/focus-screen.tsx`, a new pure helper file if needed, `src/features/workout/workout.test.ts` (or a new `workout-start.test.ts` if the old file would pass 250 lines).

## Tests (deterministic, injected clock, no real timers)
- the hook state for a day with no session: `loading === false`, controls enabled, and the first completion creates and queues both the session and the set with the injected timestamp and Cairo date
- the existing missing-session test must assert the returned hook state, not only the query
- the midnight rule: no-set day after midnight uses the new date; a session with sets keeps its date

## Requirements
1. Keep `saveAndQueue`, `stableId` and `localDate` usage as is. Files under 250 lines.

## Acceptance
- [ ] Tests pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Other CODE-HEALTH findings
- The English labels in workout components (another card)
