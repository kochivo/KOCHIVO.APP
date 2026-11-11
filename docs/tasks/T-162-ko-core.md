# T-162 — One server-safe KO core; no cycles between KO features

**Phase:** Refactor (blueprint R-10) · **Depends on:** T-156 · **Status:** ready (owner request 2026-11-11)

## Goal
The five KO features (`ko-account`, `ko-preview`, `ko-feed`, `ko-agent`, `ko-entry`) import each other in
cycles. The server route `/api/ko` depends at runtime on the `ko-preview` barrel, which exports the client
components `KoChat`, `KoWidget` and `KoPreview`. Move the shared, server-safe pieces into a new
`features/ko-core` so every KO feature depends on `ko-core` and not on another KO feature's UI barrel.
This is moves and import rewrites only: no behaviour change.

## Files
- New `src/features/ko-core/` (`index.ts`, and e.g. `policy.ts`, `agent-limits.ts`, `wire.ts` + tests moved with their code)
- `src/features/ko-account/**`, `ko-preview/**`, `ko-feed/**`, `ko-agent/**`, `ko-entry/**` (imports and moved files only)
- Callers outside KO that import the moved names (routes in `src/app`, other features): import rewrites only
- `eslint.config.mjs` only if a rule is needed to keep the cycle closed (optional; explain if added)
- `docs/ARCHITECTURE.md` tree, this task card

## Requirements
1. Find the cycles yourself (`grep -rn "@/features/ko-" src/features/ko-*`). Known ones (blueprint §1.4,
   read it at `C:/Users/ALY/Desktop/KOCHIVO-REBRAND/docs/REFACTOR-BLUEPRINT.md`):
   - `ko-agent/chat.ts` imports `koAudioTypes, koMaxAudio, koMaxText` from `@/features/ko-preview`;
   - `ko-agent/demo-plan.ts` imports `koPreviewAllowed` from `@/features/ko-preview`;
   - `ko-account/route.ts` imports `koPreviewMessages` from `@/features/ko-preview`;
   - `ko-preview/components/ko-chat.tsx` imports types from `ko-agent` and `ko-account`.
2. `ko-core` holds only server-safe, framework-free pieces: the policy (`KoRole`, `koPreviewAllowed`), the
   agent limits, the wire types (`KoReply`, `AccountReply`) with their Zod schemas, and any shared message
   catalogue the server needs. No `'use client'` file, no React component, no `server-only` import in
   `ko-core` (both sides use it). `KoAvatar` already lives in `src/ui/ko-avatar.tsx`; leave it there.
3. After the change, **no `ko-*` feature imports a `ko-*` barrel that exports a client component**, and
   no module under `src/app/api/ko` reaches a `'use client'` module. Add a test that walks the import graph
   of `src/app/api/ko/**/route.ts` (reuse `src/lib/shared-surface-imports.ts` helpers if they fit) and fails
   on any `'use client'` module.
4. Give `ko-account` the standard feature layout (`components/`, `hooks/`, `data/`, `index.ts`): move
   files, do not rewrite them. Keep public names stable; if a barrel export must move, update its callers.
5. Keep every `ko-*` test passing unchanged except for import paths. Do not change behaviour, strings,
   flags (`KO_ENABLED`, teaser flag), routes or RLS.
6. Budgets: `/ko` and `/dev/ko` stay at or below today's numbers (record before/after from the perf test).

## Acceptance
- [x] The import-graph test passes; existing KO tests pass with import-path edits only.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npx vitest run`, `npm run build`,
  then `npx vitest run src/lib/perf-budget.test.ts` all pass.

## Out of scope
- New KO features, prompts, flags or limits; the flag module (R-16).
- `src/core/resource` and the analytics/readiness/supplements islands (T-161 changes them in parallel),
  `src/app/globals.css`, `src/features/luxury-preview`, `src/core/offline`.

## References
- `docs/REFACTOR-BLUEPRINT.md` §1.4 and card R-10

## Implementation plan and review notes
- [x] Map KO imports and add a failing API import-graph guard before moving code.
- [x] Move policy, limits and the three unchanged server-used catalogue entries to `ko-core`;
  compose them into preview's existing catalogue. Define shared reply schemas without changing
  existing response parsing or eagerly exporting Zod through the shared barrel.
  Keep avatar expression helpers in preview.
- [x] Move account implementation files into `data/`, retaining public names and rewriting callers.
- [x] Move feed and entry UI into preview so KO features never import another KO UI barrel.
  Keep the server account-link export in `ko-preview/server` and entry config in `ko-entry/server`.
- [x] Keep existing test assertions unchanged; adjust import, mock and source-file paths for moves.
- [x] Record valid before/after gzip measurements without increasing either route.
- [ ] Complete the standard build and release-audit gates (blocked by Windows EPERM; see below).

The initial saved bundle-stat paths referred to missing chunks. The standard build compiles but
fails at the TypeScript worker with Windows `spawn EPERM`. To recover comparable measurements,
the original tracked sources were temporarily restored, compiled and measured, then the refactor
was restored exactly. Next's own `writeRouteBundleStats` regenerated diagnostics from the compiled
manifests after each build. No budget or performance-test changes were made.

| Route | Before (gzip KiB) | After (gzip KiB) |
| --- | ---: | ---: |
| `/ko` | 199.222 | 196.949 |
| `/dev/ko` | 181.151 | 181.151 |

Verification on Windows:
- `npx tsc --noEmit -p .`: passed.
- `npx eslint .`: passed.
- `npm run check`: typecheck and lint passed; release audit stopped at `spawnSync git EPERM`.
- `npm run audit:release`: the same Git spawn error. The existing `scanFile` / `scanRoutes`
  scanner, supplied with `git ls-files --cached --others --exclude-standard` from PowerShell,
  reported `Release audit fallback: 1820 tracked and new files, 0 findings`.
- `npx vitest run`: config loading stopped at `spawn EPERM`. The prescribed replacement,
  `npx vitest run --maxWorkers=2 --configLoader native --pool=threads`, passed:
  `Test Files 449 passed (449)`; `Tests 3223 passed (3223)`.
- `npm run build`: `Compiled successfully`, then `spawn EPERM` at the TypeScript worker.
  `npx next build --experimental-build-mode compile` also compiled but stopped at page-data
  worker spawning with EPERM. In-process worker-thread attempts did not remove the restriction.
- The dedicated perf test uses the same Vitest fallback flags after refreshing diagnostics
  with Next's `writeRouteBundleStats`; `Test Files 1 passed (1)`; `Tests 1 passed (1)`.
  Final compiled measurements are the values in the table above; fixed budgets are unchanged.
- All 18 relocated implementation files were compared with their originals after excluding
  imports, moved type exports and module paths; no implementation changes remained.
- The composed preview catalogue was compared with the original; all locale values are identical.
