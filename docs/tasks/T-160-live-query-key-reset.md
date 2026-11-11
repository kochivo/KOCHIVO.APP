# T-160 — A new local query never shows the previous query's rows

**Phase:** Refactor (blueprint R-06) · **Depends on:** T-158 · **Status:** ready (owner request 2026-11-11)

## Goal
`useLiveQuery` (`src/core/offline/use-live-query.ts`) keeps the previous query's value after the query
changes, so for a moment a screen can show rows that belong to another key (for example another account's
snapshot). Callers guard against it by hand (`use-program-snapshot.ts`, `player-supplements.tsx`). Make the
hook itself return `undefined` until the new query emits.

## Files
- `src/core/offline/use-live-query.ts`
- A new `src/core/offline/use-live-query.test.ts`
- Any caller that passes an unstable query function (see requirement 2)
- This task card

## Requirements
1. Store the value together with the query it came from, and return it only while that query is still the
   current one (blueprint §3.4):
   ```ts
   const [state, setState] = useState<{ query: typeof query; value?: T }>({ query });
   // next: value => setState({ query, value })
   return state.query === query ? state.value : undefined;
   ```
   A change of `retryKey` alone (same query) must keep showing the last value while it resubscribes.
2. **Audit every caller** (there are about 28; `grep -rn "useLiveQuery(" src`). Today an unstable query
   function (an inline arrow, or one recreated every render without `useCallback`/`useMemo`) only causes a
   resubscribe; after this change it would make the hook return `undefined` for ever. For each caller,
   confirm the query is a module-level constant or memoized with the right dependencies, and fix any that
   is not. List every caller and its verdict in the notes.
3. Keep the hand guards in `use-program-snapshot.ts` and `player-supplements.tsx` for one release as
   defence in depth. Do not remove them.
4. Do not change the hook's signature or its error callback behaviour.
5. Tests (React Testing Library or `renderHook` as the repo already uses; Dexie through `fake-indexeddb` as
   the other offline tests do; no real timers):
   - after the query changes, the hook returns `undefined` until the new query emits, then the new value;
   - it never returns the old query's value after the change, even if the old subscription emits late;
   - a `retryKey` change keeps the last value;
   - unmount unsubscribes.

## Acceptance
- [ ] The tests above pass and the existing offline and player suites stay green.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npx vitest run`, `npm run build`,
  then `npx vitest run src/lib/perf-budget.test.ts` all pass.

## Out of scope
- Returning errors from the hook, `useResource` (R-09), removing the hand guards (a later card).
- Billing, roster and server loaders (T-159 is changing them in parallel), `src/app/globals.css`,
  `src/features/luxury-preview`.

## References
- `docs/REFACTOR-BLUEPRINT.md` §3.1 (player side), §3.4 and card R-06

## Implementation notes

The hook tags each emitted value with its query identity. A different query
returns `undefined` immediately; changing only `retryKey` preserves the value.
The signature, error forwarding, and both required hand guards are unchanged.

### Caller audit

Re-audited all 28 production calls in 19 files after review. Two query dependency
lists in `use-focus-session.ts` needed primitive keys instead of emitted objects.
The other callers need no changes. Module constants capture no render values.
Paths below are relative to `src/features/`. Each query is listed separately.

| Caller | Query | Verdict |
| --- | --- | --- |
| `install/hooks/use-install-prompt.ts` | `countFinished` | Stable module constant |
| `nutrition/hooks/use-meal-logs.ts` | `read` | `[today]`: date string; stable across meal-log emissions |
| `nutrition/hooks/use-nutrition-snapshot.ts` | `read` | `[playerId]`: account ID string from auth state; snapshot objects are read inside the query |
| `nutrition/hooks/use-nutrition-snapshot.ts` | `readPending` | Stable module constant |
| `nutrition/hooks/use-nutrition-snapshot.ts` | `readParked` | Stable module constant |
| `player-home/components/home-screen.tsx` | `readPending` | Stable module constant |
| `player-home/components/home-screen.tsx` | `readParked` | Stable module constant |
| `player-home/components/home-screen.tsx` | `readSessions` | Stable module constant |
| `player-home/hooks/use-program-snapshot.ts` | `readSnapshot` | `[playerId]`: account ID string; no snapshot object dependency; hand guard retained |
| `player-home/hooks/use-rest-mood.ts` | `readSnapshot` | Stable module constant |
| `player-home/hooks/use-rest-mood.ts` | `readSessions` | Stable module constant |
| `player-home/hooks/use-streak-sessions.ts` | `query` | `[today, playerId, warn]`: date/ID strings; `warn` is `useCallback([])` over a stable ref, not a recreated function. Fetched history is read from a ref; `revision` is only the retry key |
| `player-home/hooks/use-week-sessions.ts` | `query` | `[today]`: date string; week array is constructed inside the query |
| `progress/components/progress-screen.tsx` | `query` | `[locale]`: locale string; fetched snapshot and strength objects are not dependencies |
| `readiness/hooks/use-daily-check.ts` | `query` | `[key, playerId, today]`: derived string and ID/date strings; emitted row/outbox objects are not dependencies |
| `supplements/components/player-supplements.tsx` | `read` | `[playerId]`: ID string from `useSupplementPlayer`; supplement/log arrays are read inside the query; hand guard retained |
| `workout/components/focus-screen.tsx` | `readPlan` | Stable module constant |
| `workout/components/media-status.tsx` | `readPending` | Stable module constant |
| `workout/components/offline-workout.tsx` | `readSnapshot` | Stable module constant |
| `workout/hooks/use-bodyweight.ts` | `read` | `[exerciseId]`: exercise ID string; emitted stored object is not a dependency |
| `workout/hooks/use-focus-session.ts` | `readCached` | Stable module constant |
| `workout/hooks/use-focus-session.ts` | `readPending` | Stable module constant |
| `workout/hooks/use-focus-session.ts` | `readSession` | Fixed `[day, today]` to `[sessionDayId, today]`: `day` ultimately comes from an emitted snapshot and is recreated despite `useMemo`; query only needs `day?.id` and the date |
| `workout/hooks/use-focus-session.ts` | `readSets` | Fixed `[session]` to `[sessionId]`: Dexie re-emits cloned session objects on saves; query only needs `session?.id` |
| `workout/hooks/use-focus-session.ts` | `readParked` | Stable module constant |
| `workout/hooks/use-last-session.ts` | `read` | `[exerciseId, sessionId, key]`: two ID strings and their derived string; local/remote result objects are not dependencies |
| `workout/hooks/use-workout-history.ts` | `readSnapshot` | Stable module constant |
| `workout/hooks/use-workout-history.ts` | `read` | `[ownerId]`: primitive string extracted from player ID or snapshot; fetched arrays and snapshot object are not dependencies |

Tests follow the existing node-only hook harness because this repository has no
React Testing Library, DOM environment, or React test renderer dependency. They
use real Dexie with `fake-indexeddb` and fake timeout scheduling. The late-emission
case captures the real subscription observer and explicitly delivers an obsolete
callback, including after the replacement query has emitted.

`src/features/workout/live-query-dependencies.test.ts` exercises the real
`useFocusSession` and `useLiveQuery` with memo/effect/state slots in the node-only
harness and real Dexie/fake-indexeddb subscriptions. Both regression tests failed
before the dependency fixes: a cloned session emptied `doneSets`, and a cloned
snapshot day reset `session` to `undefined`. They now preserve the logged set,
the second-set position, and the loaded state on the first render after re-emission.

### Initial verification notes (Windows sandbox)

- `npx tsc --noEmit -p .` and `npx eslint .`: passed.
- Focused regression suite: 1 file / 4 tests passed; the two query-switch tests
  failed against the old implementation before the fix.
- Offline and affected player suites: 74 files / 374 tests passed.
- Default Vitest and `--maxWorkers=2` both hit config-loading `spawn EPERM`.
  Working fallback: `--maxWorkers=2 --configLoader native --pool=threads`.
  `--configLoader runner` was also attempted but failed with `require is not defined`.
- `npm run audit:release` and therefore `npm run check` hit `spawnSync git EPERM`.
  Running the unchanged audit with `git ls-files` supplied on stdin instead of
  spawning Git returned `Release audit: 1785 tracked files, 0 findings`.
- `npm run build`: compilation succeeded, then Next's TypeScript worker hit
  `spawn EPERM`. No build configuration was changed to bypass this gate.
- Post-build `src/lib/perf-budget.test.ts`, with the working Vitest fallback:
  failed with `ENOENT` for `.next/static/chunks/3l1vhm192b9qo.js` referenced by
  generated bundle stats. No budget changes were made.
- The full-suite fallback reported the performance-budget failure but produced
  no summary after more than five minutes and was stopped. A second run with
  `--exclude 'supabase/**'` also reported that failure and stalled without a
  summary. Full-suite acceptance remains unverified; only the separate affected
  suites have a complete passing summary.
- The card's referenced `docs/REFACTOR-BLUEPRINT.md` is absent in this checkout;
  implementation follows the explicit requirements in this card.

### Review follow-up verification

- `npx tsc --noEmit -p .`: passed (exit 0).
- `npx eslint .`: passed (exit 0), after replacing an inline import type in the
  new test with a top-level `import type`.
- Both new workout dependency regressions failed before the primitive-key fixes
  and passed afterward (1 file / 2 tests).
- The requested `npx vitest run src/core/offline src/features/workout
  src/features/player-home src/features/nutrition src/features/readiness
  src/features/progress src/features/supplements --maxWorkers=2` hit config-loading
  `spawn EPERM`. The identical suites with `--configLoader native --pool=threads`
  added passed: `Test Files 75 passed (75)`, `Tests 376 passed (376)`.
