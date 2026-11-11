# T-164 — Bound the reads that grow forever

**Phase:** Refactor (blueprint R-08) · **Depends on:** T-161 · **Status:** ready (owner request 2026-11-11)

## Goal
Some reads fetch a player's whole history and get slower every week: supplement logs (player refresh and
captain view), the inbox's open items, and gallery photos signed one by one. Bound each of them.

## Owner decision (2026-11-11)
The player screen keeps **7 days** of supplement history offline.

## Files
- `src/features/supplements/data/refresh.ts` (player) and `src/features/supplements/data/captain.ts` (captain)
- `src/features/inbox/data/inbox.ts` (open items)
- The gallery loader that signs photos one by one (`grep -rn "createSignedUrl" src/features/*/data`;
  `player-profile/data/profile.ts` or `progress`)
- Tests next to each changed loader
- This task card

## Requirements
1. **Supplements, 7-day window.** Both reads add `.gte('log_date', <today minus 6 days>)` using `localDate()`
   from `@/lib/dates` with an injected `now` (never `toISOString().slice(0,10)`). The player refresh must
   not delete local logs older than the window that still have a pending outbox entry; keep the existing
   pending-row protection in `refresh.ts` and add a test for it. Put the window size in one named constant.
2. **Inbox.** Add a `.limit(…)` and keyset paging (by `created_at` + `id`, newest first) to the open-items
   query. Keep the first page the same size the UI shows today, or 50 if the UI shows everything. Add a
   "load more" only if the existing UI already has a pattern for it; otherwise expose the cursor in the data
   layer and note the UI follow-up.
3. **Gallery.** Sign all photo paths of one load with one `createSignedUrls([...])` call instead of one call
   per photo. Keep the same expiry.
4. RLS stays the security boundary; no query loses its `player_id` / owner filter.
5. Tests with a fake client that records calls: `.gte('log_date', '<expected date>')` for both supplement
   reads at a fixed `now` (including a Cairo date boundary); `.limit` and the keyset filter for the inbox;
   exactly one storage signing call per gallery load.

## Acceptance
- [x] The tests above pass; existing supplements, inbox and gallery tests stay green.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npx vitest run`, `npm run build`,
  then `npx vitest run src/lib/perf-budget.test.ts` all pass.

## Out of scope
- `InboxScreen` UI split (R-15), polling (R-12), migrations or indexes (note any index you think is needed).
- `src/types/*` and `core/offline/tables.ts` (T-163), `src/app/globals.css`, `src/features/luxury-preview`.

## References
- `docs/REFACTOR-BLUEPRINT.md` card R-08

## Implementation plan and review notes
- Add recording-client regression tests before changing each loader, then run the scoped suites.
- Share one seven-day calendar cutoff between the player and captain supplement reads; prune only
  synced expired local logs inside the same transaction that checks pending outbox entries.
- Limit each open inbox source and the merged result to 50; accept a validated cursor and return
  `nextCursor` alongside `data`. Paging follows existing `created_at DESC, id ASC` ordering.
- The inbox has no load-more pattern. A UI follow-up should pass the returned cursor back to
  `listInbox` and append pages. A full final page may return a cursor followed by an empty page.
- The gallery loader is `load()` in `progress/components/player-gallery.tsx`, delegating to
  `progress/data/gallery.ts`; player-profile already batches its signing calls. The component change
  only passes the existing client to the batch loader and removes the single-photo signing import.
- Consider extending the existing partial inbox indexes to `(captain_id, created_at DESC, id ASC)`
  for open rows if query plans warrant it. No migration, index, dependency, or budget changes here.
- Run the requested typecheck, lint, release audit, full tests, build, and post-build performance test.

## Verification (2026-11-11, Windows sandbox)
- `npx tsc --noEmit -p .` and `npx eslint .`: passed.
- Scoped supplements, inbox, and progress suites with the fallback below: 16 files, 105 tests passed.
- Default Vitest config loading fails with `spawn EPERM`. Used
  `npx vitest run --maxWorkers=2 --configLoader native --pool=threads` instead, including for scoped
  suites and `src/lib/perf-budget.test.ts`.
- Final full fallback run: `Test Files 1 failed | 450 passed (451)`;
  `Tests 1 failed | 3228 passed (3229)`. The only failure is the missing performance artifact below.
- `npm run audit:release` and `npm run check`: blocked at `spawnSync git EPERM`. Separately executed
  the unchanged `scanFile`/`scanRoutes` rules with `git ls-files` supplied by PowerShell:
  `Release audit rules: 1800 tracked files, 0 findings`.
- `npm run build`: `Compiled successfully in 14.6s`, then `spawn EPERM` at `Running TypeScript`.
  The standalone TypeScript check above passed; a complete production build still needs review.
- Post-build performance test: the default command hits config-loader `EPERM`; the fallback runs but
  fails with `ENOENT` for `.next/static/chunks/32_3gydu4a76w.js`. Budget verification needs a complete build.
- Read-only review found a PostgreSQL microsecond ordering issue at the inbox page boundary; fixed
  with a regression test, then re-reviewed with no remaining concrete findings.
