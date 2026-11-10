# T-156 — Guards against feature code leaking into shared bundles

**Phase:** Refactor (blueprint R-01 + R-02) · **Depends on:** T-155 · **Status:** implemented (reviewer decision 2026-11-11)

## Goal
T-155 fixed, case by case, client screens that leaked into every route's first-load bundle. Nothing
structural stops that from recurring. Close the two holes: relative imports that go around the ESLint
deep-import rule, and shared surfaces (layouts, shells) that import client components through a barrel.

## Files
- `eslint.config.mjs`
- The 7 offending imports:
  - `src/app/[locale]/(captain)/captain/layout.tsx` (`PlanSidebar`, `fetchPlanSummary`)
  - `src/app/[locale]/(captain)/captain/page.tsx` (`fetchDues`, `fetchPlanSummary`)
  - `src/app/[locale]/(captain)/captain/billing/page.tsx` (`BillingScreen`, `fetchBilling`)
  - `src/app/[locale]/(captain)/captain/players/page.tsx` (`RosterScreen`)
- `src/features/billing/index.ts`, `src/features/roster/index.ts`, and new `*-entry.tsx` wrappers next to
  the components they wrap, only where needed.
- `src/lib/shared-surface-imports.test.ts` (new), plus a small pure helper module beside it if the scan
  logic needs one.
- `AGENTS.md` §2 (two bullets), `docs/ARCHITECTURE.md` §3 (bring the tree in line with the real one).
- This task card.
- Reviewer-approved scope (2026-11-11): `src/features/billing/server.ts`, billing's
  `data/billing.ts` and `data/billing-internal.ts` to move the existing loader out of the action file;
  auth/notifications `index.ts` and `components/sign-out-button-entry.tsx` /
  `components/notification-bell-entry.tsx`. Shell/layout consumers retain their public import names.

## Requirements
1. **Rule S1 (ESLint).** Relative paths into a feature are restricted the same way `@/features/<x>/<y>` is:
   add `'**/features/*/**'` to the restricted patterns for `src/app/**`, and `'**/features/**'` for
   `src/core/**`, `src/ui/**`, `src/lib/**`. Imports inside one feature (`../data/x`) stay legal.
2. **Fix the 7 imports** so they go through `@/features/billing` and `@/features/roster`. Export what is
   missing from the barrels. The reviewer-approved second public entry `@/features/billing/server`
   exports the loaders. Server loaders (`fetchDues`, `fetchPlanSummary`, `fetchBilling`) must not drag
   client components into a server module or the reverse; if the barrel would mix them in a way that grows
   a bundle, expose client screens as `-entry.tsx` wrappers built on `next/dynamic` (pattern:
   `src/features/ranks/components/rank-entry.tsx`).
3. **Rule S2 (test).** `src/lib/shared-surface-imports.test.ts` scans the shared surfaces by static source
   reading (no build): every `layout.tsx` and `template.tsx` under `src/app`, every `opengraph-image.tsx`,
   `src/app/global-error.tsx`, `src/features/player-shell/components/player-shell.tsx` and
   `src/features/roster/components/captain-shell.tsx`. A value import from `@/features/<x>` in one of them
   must resolve, through that feature's `index.ts`, to a module that does not start with `'use client'`, or
   to a `*-entry.tsx` / `*-loader.tsx` wrapper. Type-only imports are always allowed. Imports already
   wrapped in `next/dynamic` / `React.lazy` inside the surface are allowed. The failure message names the
   surface, the export and the fix.
4. The test includes a negative fixture (an in-memory source string, not a file in `src/app`) proving it
   fails when a layout imports a static client component from a barrel.
5. **AGENTS.md §2**, two short bullets: client components that other features or layouts render are
   exported from the barrel as `-entry.tsx` wrappers; inside `core/` and `ui/`, server or shared code
   imports the leaf module, not the barrel.
6. No behavior change. No route may exceed its first-load budget; no budget or exception changes.
7. Reviewer decision: allow the exact `@/features/<name>/server` entry wherever the root feature API is
   allowed, retaining all other deep-import restrictions (including relative paths). Every feature
   `server.ts` only re-exports modules that explicitly import `server-only`; it is never a `use server`
   action bridge. S2 treats this public entry as server-safe. Auth/notification entries reserve the
   controls' dimensions with empty, aria-hidden loading placeholders and retain default SSR.

## Acceptance
- [x] `npx eslint .` passes, and fails when `'../../features/x/y'` is reintroduced in a file under `src/app`
  (prove it with the ESLint API in a test or state the manual check in the notes).
- [x] The new test passes on this tree and its negative fixture fails as designed.
- [x] `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npx vitest run`, `npm run build`,
  then `npx vitest run src/lib/perf-budget.test.ts` all pass.

## Out of scope
- Converting other barrels' static client exports that only pages import.
- Any change to `src/core/offline` (another card is editing it).

## Implementation notes

- S1 allows only the root feature API and exact `/server` public entry for app/feature consumers.
  Relative feature deep paths stay blocked; a feature's own `../data/...` imports remain legal.
  Manual ESLint API check: 36 cases passed (app/feature root and `/server` allowed; other alias deep
  paths, `/server.ts`, `/server/more` and relative deep paths blocked; all feature APIs blocked in
  core/ui/lib; intra-feature `../data/x` allowed). This keeps config loading out of the unit-test hot path.
- Billing loaders live behind a `server-only` entry, separate from the client-consumed index.
  `fetchBilling` moved unchanged from the existing action module to `billing-internal.ts`, retaining
  its current-date call into the tested `fetchBillingAt`; no loader action bridge was introduced.
- BillingScreen/RosterScreen use dynamic entries with default SSR and existing loading variants.
  SignOutButton/NotificationBell use React.lazy/Suspense entries to preserve streaming SSR even in
  standalone render fixtures; their empty aria-hidden placeholders reserve
  `min-h-12 w-full` and `min-h-12 min-w-12` respectively. Real controls keep their existing touch targets.
- S2 parses source with the installed TypeScript dependency and an injected reader. Fixtures cover
  static clients, renamed/chained/star exports, types, wrappers, namespaces/defaults, and dynamic/lazy
  imports. A separate scan checks every feature `server.ts`, rejecting unmarked modules, client
  modules, action modules and inline implementations. All 12 focused guard tests pass.
- Final verification: TypeScript and ESLint pass; release audit reports **1773 tracked files,
  0 findings**. `npm run check -- -- --configLoader native --pool threads --maxWorkers=2` passed:
  **440 test files, 3161 tests passed; 1 pre-build performance test skipped**. The full suite ran
  after removing `.next` and before the production build. Build exited 0; the subsequent performance
  guard passed **1 test**, covering all diagnostic routes without budget/exception changes.
- Standard Vitest (including direct `npx vitest run --maxWorkers=2`) hits the documented Windows
  config-loader `spawn EPERM`; the native-loader/thread fallback above succeeds. Audit uses the
  unchanged script with shell-captured `git ls-files -z` input because Node cannot spawn git here.
  Build uses a temporary process preload for worker threads and the TypeScript API checker, with
  type checking enabled. No repository config or environment files changed; temporary helpers removed.
