# T-027h — Player routes under the JS budget

**Phase:** 4 · **Depends on:** T-027g (merged) · **Status:** ready

## Goal
After T-027g, player routes load 325–345 kB gzip of first-load JS against a 300 kB target, and
captain preview loads 351 kB against 310. `docs/PERFORMANCE.md` names the cause: the Supabase client
(~66 kB), Dexie (~32 kB) and Zod (~30 kB) all load eagerly on every player route. Bring every player
route to **≤ 300 kB** and captain preview to **≤ 310 kB** with **no behavior change**.

## Files
Create or modify only these:
- `src/core/config/env.ts`: client-side env validation must not pull Zod into the browser bundle.
  Keep the same `publicEnv()` API, the same errors for missing/invalid values, and the lazy cache.
- `src/core/offline/**`, `src/core/supabase/**`: lazy loading of Dexie and the Supabase client
  (dynamic `import()` behind the existing async APIs) where the first paint does not need them.
- `src/features/player-shell/**`, `src/features/player-home/**`, `src/features/workout/**`,
  `src/features/nutrition/**`, `src/features/progress/**`, `src/features/onboarding/**`,
  `src/features/player-preview/**`: move Zod parsing of server data to the server side or to
  lazily-imported modules; keep validation itself.
- `src/lib/perf-budget.test.ts`: lower the guards to the achieved numbers (rounded up to the next 5 kB).
- `docs/PERFORMANCE.md`: add a T-027h section with before/after per route.
- Tests next to anything you change.

## Requirements
1. Measure exactly as `src/lib/perf-budget.test.ts` does (`.next/diagnostics/route-bundle-stats.json`, gzip).
2. Offline must keep working exactly as now: a player who opens a cached route offline still sees the
   last snapshot and can log sets and meals, and the queue still syncs. Do not change `saveAndQueue()` semantics.
3. Validation stays: anything parsed with Zod today is still validated (server side, or in a lazy chunk).
   Do not replace validation with unchecked casts.
4. No new dependency. Do not touch `supabase/**`, messages, copy, tokens or layout.
5. Captain routes and marketing must not grow.

## Acceptance
- [ ] Every `/[locale]/player/**` route ≤ 300 kB, captain preview ≤ 310 kB, or each miss explained with the remaining modules.
- [ ] Existing offline tests pass unchanged (you may add tests, not weaken them).
- [ ] `npm run check` and `npm run build` pass; perf budget test passes after build.

## Out of scope
- Sentry initialization timing. Server-only code size. UI changes.
