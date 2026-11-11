# T-159 — Load shared captain data once per request

**Phase:** Refactor (blueprint R-05) · **Depends on:** T-156 · **Status:** ready (owner request 2026-11-11)

## Goal
On `/captain` the layout and the page both call `fetchPlanSummary`, so one page view runs the claims check,
the profile role query, an RPC and two more queries twice. Other server loaders that several segments of
one request call (the captain client, the roster, the captain's first name) repeat work the same way. Wrap
them in React `cache()` so each runs once per server request.

## Files
- `src/features/billing/data/client.ts` (`captainClient`), `src/features/billing/data/plan-summary.ts`
- The roster loaders used by more than one segment of one request (`fetchRoster`, `fetchCaptainFirstName`;
  find their files under `src/features/roster/data/`)
- A new `src/core/supabase/claims.ts` exporting a cached `currentClaims()` if, and only if, at least two
  server loaders read `auth.getClaims()` in the same request; otherwise skip it and say so in the notes
- Tests next to the changed loaders
- This task card

## Requirements
1. Use `cache` from `react`. Wrap at the module level (`export const fetchPlanSummary = cache(async () => …)`)
   so every importer shares one memo per request. Keep each function's name, arguments and return type.
2. Only wrap **read** loaders that take no arguments or only primitive arguments. Never wrap a mutation or
   a server action, and never wrap a loader that a server action calls again after writing in the same
   request (a cached read would return the pre-write value). List every function you wrapped and why it is
   safe in the notes.
3. `captainClient` keeps its exact checks (claims `sub` present, profile role `captain`) and its error
   messages. A rejected promise being reused within the same request is fine.
4. No change to what any page renders, no change to the `'server-only'` boundary, no new public export
   unless a feature's `server.ts` needs it.
5. Tests (deterministic, no network): mock `@/core/supabase/server` with a counting fake client and show:
   - calling `fetchPlanSummary()` twice inside one `cache` scope makes one RPC and one profile query;
   - `captainClient()` called by two loaders in one scope runs `getClaims` once.
   If `cache()` is a pass-through in the vitest environment, test through React's
   server `cache` semantics the way `src/core/i18n/server.ts` or `coach-page/data/public-profile.ts`
   tests do; if neither has a test, explain in the notes how you proved the dedupe.

## Acceptance
- [ ] The tests above pass and the existing billing and roster tests stay green.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npx vitest run`, `npm run build`,
  then `npx vitest run src/lib/perf-budget.test.ts` all pass.

## Implementation plan
- Add counting-client regression tests using the installed React server cache and fresh request scopes.
- Cache the four read loaders at module level and share claims between billing and the captain name loader.
- Verify billing/roster regressions, run all acceptance gates, and record safety and verification notes here.

## Out of scope
- Client-side fetching, `useResource` (R-09), polling (R-12), the route-profile RPC (R-14).
- `src/core/offline` (T-160 is changing it in parallel), `src/app/globals.css`, `src/features/luxury-preview`.

## Notes for reviewer
- Reviewed and retained the previous implementer's module-level caches and counting-client tests.
- `fetchPlanSummary`: no arguments, reads tier, plan and client count only; called by the captain layout and page, with no post-write action caller.
- `captainClient`: no arguments, reads session claims and the profile role only. Billing actions call it before their writes and do not repeat it after writing; the claims-sub and captain-role checks and both errors are unchanged.
- `fetchRoster`: no arguments, reads the roster RPC, avatars and balances only. Its billing and template-player consumers do not reread it after writing in the same action.
- `fetchCaptainFirstName`: no arguments, reads claims and the profile name only; used by captain pages, with no post-write action caller.
- `currentClaims`: no arguments, reads authentication claims only. Kept because billing and the captain-name loader both run on `/captain`; sharing it avoids their duplicate `getClaims()` calls. No feature barrel exports were added.
- The tests load the installed React server build's real `cache` implementation and supply a fresh `getCacheForType` dispatcher store for each simulated request. They check concurrent promise reuse, query counts, cross-loader authentication reuse, fresh work in a second request, and unchanged authorization failures. React's cache itself is not replaced with a test memoizer. Execution results are recorded below; source review alone does not prove these assertions pass.

## Verification (2026-11-11)
- `npx tsc --noEmit -p .`: passed (exit 0).
- `npx eslint .`: passed (exit 0).
- `npm run audit:release`: blocked by `spawnSync git EPERM` before auditing; no substitute audit claimed.
- `npx vitest run`: blocked loading config by `spawn EPERM`; `npx vitest run --maxWorkers=2` failed at the same step. The two new loader suites also hit this startup failure, both normally and with `--maxWorkers=2`. An additional targeted attempt with `--configLoader runner` failed loading a CommonJS dependency (`require is not defined`). No test assertions ran.
- `npm run build`: `Compiled successfully in 19.8s`, then blocked by `spawn EPERM` at `Running TypeScript`; not a passing build.
- `npx vitest run src/lib/perf-budget.test.ts`: blocked loading config by `spawn EPERM`; retried with `--maxWorkers=2`, with the same result.
- `npm run check`: typecheck and lint passed, then stopped at the release audit's `spawnSync git EPERM`; tests were not reached.
- `git diff --check`: passed. Acceptance boxes remain unchecked until the blocked gates can run successfully.

## References
- `docs/REFACTOR-BLUEPRINT.md` §3.2 and card R-05
