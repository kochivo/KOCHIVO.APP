# T-161 — One shared resource hook for captain client islands

**Phase:** Refactor (blueprint R-09) · **Depends on:** T-160 · **Status:** implemented; verification notes below (2026-11-11)

## Goal
About 30 captain client islands fetch in `useEffect`, each with hand-rolled cancellation (`let active`) and
retry counters, and none shares a cache. Add one small in-house primitive, `useResource`, generalised from
the module store already used in `ko-feed/hooks/use-ko-feed.ts`, and move the first three islands onto it.
Switching profile tabs and coming back then renders from the cache with a background revalidate.

## Files
- New `src/core/resource/store.ts`, `src/core/resource/use-resource.ts`, `src/core/resource/index.ts`
- New `src/core/resource/resource.test.ts`
- `src/features/muscle-analytics/components/analytics-tab.tsx` (+ a new `muscle-analytics/data/load-analytics.ts`)
- `src/features/readiness/components/readiness-tab.tsx` (+ a loader in `readiness/data/` if needed)
- `src/features/supplements/components/captain-supplements.tsx` (+ a loader in `supplements/data/` if needed)
- The sign-out flow in `src/features/auth` (one call to clear the store, requirement 5)
- `docs/ARCHITECTURE.md`: a short paragraph on when to use `useResource`
- This task card

## Requirements
1. **API** (blueprint §3.3; read it at `C:/Users/ALY/Desktop/KOCHIVO-REBRAND/docs/REFACTOR-BLUEPRINT.md`):
   `useResource<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>, { pollMs?, staleMs = 15_000 })`
   returns `{ data, error, status: 'idle' | 'loading' | 'ready' | 'error', retry, mutate }`. Built on
   `useSyncExternalStore`; `key === null` means "do nothing". No new dependency, about 80–120 lines of store.
2. **Store behaviour:**
   - keyed cache in module memory only (never localStorage/IndexedDB);
   - single-flight: concurrent subscribers of one key share one request;
   - `AbortSignal` passed to `load`, aborted when the last subscriber of a key unsubscribes;
   - a newer response always wins; a late response for an aborted or superseded request is dropped
     (version guard, as in `use-ko-feed.ts`);
   - stale-while-revalidate: a cached value renders at once; revalidate in the background if older than `staleMs`;
   - one revalidate per tab return: `focus` and `visibilitychange` firing together trigger one request;
   - `pollMs` optional, paused while `document.hidden`;
   - `mutate(next, commit)`: apply `next` optimistically, run `commit`, roll back to the previous value and
     set `error` if it rejects; resolve `true`/`false`.
3. **Injectable for tests:** `now`, `document`/visibility and timers are injectable (a `createResourceStore({ now, doc, setTimeout })`
   factory with a default instance is fine). Tests use no real timers and no network.
4. **Migrate three islands** (`AnalyticsTab`, `ReadinessTab`, `CaptainSupplements`): remove their `useEffect`
   fetching and `active`/`cancelled` flags; move the data loading into the feature's `data/` folder; keep
   every rendered state (loading, error with translated retry, empty, ready) and every string exactly as today.
   Keys must include every input that changes the result (player id, date, locale if used).
5. **Account safety:** the cache must never show one account's data to another. Export `clearResources()`
   from `@/core/resource` and call it in the sign-out flow before navigation. Note in the card any other
   place where the signed-in user can change without a reload.
6. **Budget:** captain route first-load JS must not grow by more than 2 KiB (check
   `src/lib/perf-budget.test.ts` output before and after; record both numbers in the notes).
7. **Tests** (`resource.test.ts`, deterministic): single-flight; abort on last unsubscribe; late response
   dropped; no fetch while hidden and no poll while hidden; one revalidate for a focus+visibility pair;
   cached value returned on resubscribe (tab switch-back) with a background revalidate after `staleMs`;
   `mutate` rollback on a failed commit; `clearResources()` empties every key. Keep the existing tests of
   the three islands green (update them only where they assert the removed `useEffect` internals).

## Acceptance
- [x] The tests above pass; the three islands render exactly as before.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npx vitest run`, `npm run build`,
  then `npx vitest run src/lib/perf-budget.test.ts` all pass.

## Out of scope
- Any other island, polling hooks (`use-my-captain`, `use-notifications`, `use-ko-feed`, `approval-watcher`:
  R-12), optimistic roster/join requests (R-11), `InboxScreen` (R-15).
- Every `ko-*` feature (T-162 changes them in parallel), `src/app/globals.css`, `src/features/luxury-preview`,
  `src/core/offline`.

## References
- `docs/REFACTOR-BLUEPRINT.md` §3.1–3.3 and card R-09; precedent `src/features/ko-feed/hooks/use-ko-feed.ts`

## Implementation and reviewer notes

- Plan followed: deterministic store tests first; module store and `useSyncExternalStore` adapter;
  feature data loaders and the three islands; sign-out clearing; architecture note and gates.
- Store, hook and public entry total fewer than 150 production lines; no persistence or dependency added.
  Loaders check the supplied signal before/after existing feature reads. Those existing query helpers
  do not accept a signal, so cancellation drops their results rather than cancelling the HTTP transport.
- `sign-out-button.tsx` clears all resources before navigation, including requests and pending mutations.
  Other identity changes without a guaranteed reload: password recovery in `forgot-password-flow.tsx`
  calls `updatePassword` (OTP/session exchange, then sign-out) and uses `router.push`/`router.refresh`;
  `nutrition/hooks/use-nutrition-snapshot.ts` and `supplements/hooks/use-supplement-player.ts`
  observe auth changes in place. `core/offline/use-local-user.ts` forces a reload on sign-out,
  identity changes, and cross-tab remembered-user changes where mounted. These paths are unchanged
  in this card. Regular sign-in, signup, OAuth and reset-password forms
  navigate with `window.location.assign`; OAuth callbacks also reload the document.
- The supplements editor test now mocks the shared resource instead of relying solely on its removed
  fetch effect being stubbed; its lazy-load, Add, close and draft-prop assertions are unchanged.
- Both builds compiled successfully, then stopped at TypeScript worker startup with `spawn EPERM`.
  Existing route stats referenced missing chunks, so Next's own `writeRouteBundleStats` was invoked
  directly against each build's emitted manifests to refresh the ignored `.next/diagnostics` output.
  The unchanged performance-budget test then passed with the native-config/thread-pool fallback.
  Measurements are gzip KiB, before → after:

  | Captain route (locale prefix omitted) | Before | After |
  |---|---:|---:|
  | `/captain` | 223.453 | 223.453 |
  | `/captain/players/[playerId]/programs` | 291.609 | 292.539 |
  | `/captain/programs/[programId]` | 277.010 | 277.010 |
  | `/captain/players/[playerId]/preview` | 277.640 | 278.497 |
  | `/captain/nutrition/[planId]` | 270.089 | 270.089 |
  | `/captain/players/[playerId]/nutrition` | 270.089 | 270.089 |
  | `/captain/templates` | 260.193 | 260.193 |
  | `/captain/pending` | 256.997 | 257.853 |
  | `/captain/players/[playerId]` | 232.386 | 233.308 |
  | `/captain/inbox` | 232.140 | 232.140 |
  | `/captain/settings` | 229.069 | 230.069 |
  | `/captain/leaderboard` | 225.025 | 225.025 |
  | `/captain/players` | 223.875 | 223.875 |
  | `/captain/billing` | 217.790 | 217.790 |

  Maximum captain growth: 1.000 KiB (limit 2 KiB). No budget changed.
- Gate results: `npx tsc --noEmit -p .` passed; `npx eslint .` passed (two initial test-helper
  warnings were subsequently removed; targeted lint also passed). `npm run check` reached its audit
  step after typecheck/lint, then failed because `npm run audit:release` cannot spawn Git
  (`spawnSync git EPERM`). As a substitute, Git paths were supplied from PowerShell to the same
  `scanFile`/`scanRoutes` audit functions: `Release audit fallback: 1800 tracked/new files, 0 findings`.
  `npx vitest run` and `npx vitest run src/lib/perf-budget.test.ts` both hit config-loader
  `spawn EPERM`; use `--maxWorkers=2 --configLoader native --pool=threads` instead.
  The performance test passed, as did the three features plus resource suite (15 files, 108 tests).
  After regenerating stats, the fresh full fallback run passed:
  `Test Files 448 passed (448)` / `Tests 3213 passed (3213)` (299.22s).
  The reviewer must rerun the original gates.
