# T-155 — Bring every route back within its first-load JavaScript budget

**Phase:** Release blocker · **Depends on:** T-120 to T-154 · **Status:** ready (owner request 2026-11-10)

## Goal
The staging Checks run fails on `src/lib/perf-budget.test.ts`, so the release is not promoted to production.
Since the published commit `65fac628`, several features made Supabase (≈64 KiB gzip) and Zod (≈31 KiB gzip)
load eagerly on routes that used to load them lazily or not at all, and new shells pull more client code.
Bring every route within its budget **without changing behavior** and without raising any budget.

## Measurements (gzip KiB, after commit c6789daf; budget from perf-budget.test.ts)

| Route | Published | Now | Budget |
| --- | ---: | ---: | ---: |
| `/admin` | 194.6 | 262.4 | 200 |
| `/c/[slug]` | 197.7 | 202.4 | 200 |
| `/login`, `/forgot-password`, `/reset-password`, `/i/[code]`, `/suspended` | 198.4 | 201.0 | 200 |
| `/captain/players/[playerId]/programs` | 237.2 | 415.9 | 310 |
| `/captain/programs/[programId]` | 237.2 | 349.7 | 310 |
| `/captain/nutrition/[planId]`, `/captain/players/[playerId]/nutrition` | 225.4 | 342.4 | 310 |
| `/captain/templates` | 216.7 | 334.2 | 310 |
| `/captain/players/[playerId]` | 310.0 | 315.0 | 310 |
| `/captain/players/[playerId]/preview` | 271.4 | 313.0 | 310 |
| `/player`, `/player/rank` | 269.1 / new | 319.5 | 300 |
| `/player/progress` | 278.5 | 329.4 | 300 |
| `/player/captain` | 273.8 | 324.6 | 300 |
| `/player/settings` | 283.9 | 325.7 | 300 |
| `/ko` | new | 328.6 | 200 |
| `/dev/ko` | new | 253.1 | 200 |

Leads found in review (verify, do not trust):
- The 64 KiB chunk containing the Supabase client (`GoTrue`, `realtime`) is now first-load on `/admin` and on the
  captain builder routes (programs, templates, nutrition).
- The Zod chunk (31 KiB) is now first-load on the player home group and on captain player pages.
- `src/app/[locale]/(player)/player/layout.tsx` now imports `SignOutButton` from the whole `@/features/auth`
  barrel and renders `KoAccountLink`.
- The +2.7 KiB on every auth route comes from the shared `[locale]` layout or auth page chunks.
- Barrel imports from a `'use client'` module pull every export of that barrel; a type-only import does not.

How to find a cause: in `.next/server/app/<route>/page_client-reference-manifest.js`, `entryJSFiles` lists the chunks
of each segment (layout, loading, page, opengraph-image). Grep a chunk for library names or unique message strings,
then trace the static import chain from the segment file.

## Files
Any `src/` file needed to defer code (`next/dynamic`, `React.lazy`, `import()` inside handlers or effects, moving a
light helper into its own module, or importing types with `import type`), plus tests and `docs/PERFORMANCE.md`.
Keep feature boundaries from AGENTS.md: features import other features only through `index.ts`; if a light helper
must be shared, move it to `src/ui`, `src/lib` or `src/core`.

## Requirements
1. `npx vitest run src/lib/perf-budget.test.ts` passes after `npm run build`, for every route.
2. **No budget changes.** Do not edit the budgets or the `exceptions` map in `perf-budget.test.ts`. The only
   permitted exception is `/dev/ko` (a dev-only route, locked in production) if it cannot be reduced without
   behavior change; document its measured ceiling in `docs/PERFORMANCE.md`. If any other route cannot reach its
   budget without a behavior change, stop and report the numbers and the blocking modules instead.
3. No behavior change: same screens, same data, same offline writes through `saveAndQueue()`. Deferred UI shows the
   existing loading state (or nothing, for floating entry points) and never blocks a gym control.
4. No new dependencies, no migration, no `.env` change.
5. Update `docs/PERFORMANCE.md` with the before/after table for these routes.

## Acceptance
- [x] `npm run build` then `npx vitest run src/lib/perf-budget.test.ts` passes.
- [x] `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npx vitest run` pass.
- [x] Each deferral has a test or an existing test still covering the screen.

## Out of scope
- Sentry chunk, fonts, images, server code size, new features.

## Implementation notes

- Preserved feature public APIs with small lazy client entries for auth, coach
  controls, program generation, intake, progress, supplements, ranking, and KO.
  This prevents server barrel imports from adding unrelated client screens to
  first-load manifests. Screen entries retain SSR where supported and use the
  existing loading state; floating widget loading remains empty.
- Admin waitlist and generator candidate queries await the existing lazy
  Supabase singleton and check effect cleanup before querying. Rank/feed Zod
  schemas moved unchanged to modules loaded only when their data is requested.
  Digest chunk failures retain the optional-data fallback.
- Added a deterministic lazy-validation regression test and verified that an
  eager schema import makes it fail. Existing screen/data tests remain in use.
- Completed-build measurements for every route in the card are recorded in
  `docs/PERFORMANCE.md`. All routes pass their original budgets, including
  `/dev/ko`; no exception or budget was changed.
- Local verification uses temporary worker-thread/API-checker and native Vitest
  loader settings because Windows subprocess creation is denied. No config,
  dependency, migration, environment file, commit, or branch changes were made.
- Verification: combined check passed TypeScript, ESLint, release audit
  (**1747 tracked files, 0 findings**), and **437 test files / 3142 tests**.
  Vitest used `--configLoader native --pool threads --maxWorkers 2`; the audit's
  tracked-file list was captured by the shell to avoid Node's denied git spawn.
