# T-177: Forms library and builder

**Phase:** Captain suite (owner approval 2026-11-11) · **Depends on:** T-176, T-175 (the Library nav) · **Status:** ready

## Goal
The design is screen 6 («مكتبة الفورمز») in `docs/mockups/captain-workspace/suite.html`.

Captains create and edit forms from ready templates. Each question shows where its answer goes: to the player file, a chart, or an alert. The route is `/captain/library/forms`, and it exists only when the flag is on.

## Files
- New route `src/app/[locale]/(captain)/captain/library/forms/page.tsx` (thin).
- Reviewer-approved scope exception: standard `loading.tsx` re-exports in `captain/library/` and `captain/library/forms/` only.
- New feature `src/features/forms/` (`index.ts`, `server.ts` if needed, `components/`, `hooks/`, `data/`, `templates.ts`, `messages.ts`, tests).
- `docs/ARCHITECTURE.md` (one line).
- This card.

## Requirements
1. **Templates (`templates.ts`, pure data):**
   - weekly check-in;
   - onboarding update;
   - monthly progress with photos;
   - injury report;
   - data update.

   The questions carry `maps_to` where it applies. «ابدأ من قالب جاهز» copies a template into a new form.
2. **List with metrics.** For the selected period (this month) show:
   - active forms;
   - requests sent;
   - response rate (answered ÷ sent, where both counts are computed in SQL);
   - average response time.

   Each template card shows its question count, recipients and response rate. A rate under 75% is shown as a warning.
3. **Builder:**
   - **Questions:** add, edit, reorder (move up/down buttons, keyboard accessible; no new drag-and-drop dependency) and delete.
   - **Fields:** type, required, options, `maps_to` and `alert_on`.
   - **Chips:** a lime «ملف اللاعب: …» chip when the question has `maps_to`, a danger «ينبّهك» chip when it has `alert_on`, and a «رسم بياني» chip for number and scale questions.
   - **Saving:** autosave is debounced, with a status indicator.
4. **Schedule editor:** every week or month, the day and hour (Africa/Cairo), and the reminder after N hours. The saved shape matches the T-176 `schedule` field.
5. **Preview.** «شوفه زي اللاعب» renders the form read-only exactly as the player will see it, using the shared question renderer that T-178 reuses. Build that renderer here as `components/question-field.tsx`.
6. **Validation:** a title is required, and the form needs at least one question. `maps_to` must match the question type (number facts need number questions). Use a pure validator, unit tested.

## Acceptance
- [x] Unit tests for the validator, the template copy (new ids, positions kept) and reorder.
- [x] A metrics query test with fixtures (PGlite).
- [x] Builder component tests: add, reorder, mapping chips.
- [x] A flag-off test proves the route returns not found and the nav is unchanged.
- [ ] All gates pass.

## Out of scope
- Sending and scheduling execution, and the player answer flow (T-178).
- Notifications.

## Implementation plan (T-177)
- [x] Test and implement pure templates, copying, validation, schedule and reorder helpers in `src/features/forms/`.
- [x] Test SQL-backed exact-count metrics against PGlite fixtures; implement scoped reads and serialized saves with existing RLS.
- [x] Test and implement the library, question editor, debounced autosave, schedule editor and reusable player question renderer.
- [x] Test the flag-off route and unchanged navigation; add the thin route and one architecture line.
- [x] Run every requested gate and record results. No commits, migrations, dependencies or navigation changes.

Review focus: Cairo month boundaries; zero sent requests; incompatible mappings; edits during an in-flight save; persisted question IDs referenced by answers.

## Implementation notes for reviewer
- Navigation is unchanged; the Library link lands with T-175. The route and server action both check `NEXT_PUBLIC_CAPTAIN_WORKSPACE` and authenticated approved captain access.
- SQL exact-count requests compute sent and answered totals for the Cairo calendar month. Paginated timestamps supply response durations and distinct recipients without depending on the API row limit.
- No migration or dependency was added. The existing REST operations cannot wrap a form/question save in one transaction: autosave serializes writes within this editor, preserves question IDs, rejects foreign IDs and deletion of answered questions, and retains failed drafts for retry/discard. Partial failures or simultaneous tabs may leave intermediate positions until a successful retry; a transactional save RPC would require separately authorized schema work.
- Read-only review found and verified fixes for foreign question IDs and multiline option editing. PGlite-backed save tests cover persistence, reorder, deletion, foreign IDs, answered questions and retry.
- Reviewer approved the two standard `loading.tsx` re-exports required by `src/ui/route-loading.test.ts`; both follow the existing captain route pattern exactly. No other scope expansion was approved or made.
- Windows sandbox: default Vitest fails with `spawn EPERM`; the supplied native-loader/thread-pool fallback runs. Release audit fails with `spawnSync git EPERM`; piping `git ls-files` into a temporary runner using the unchanged audit rules found **0 findings** across tracked files plus the new forms files. The temporary runner was removed.
- Standard build compiles, then fails with `spawn EPERM` during TypeScript worker startup. Compile-only fallback also compiles, then fails spawning page-data workers. The perf-budget fallback cannot validate stale `.next/diagnostics/route-bundle-stats.json` because its referenced chunks are absent. Budgets were not changed.

## Verification summary (2026-11-11)
- `npx tsc --noEmit -p .`: exit 0.
- `npx eslint .`: exit 0.
- `npm run check`: typecheck and lint passed; stopped at release audit's `spawnSync git EPERM`.
- `npm run audit:release`: blocked by `spawnSync git EPERM`; equivalent existing-rule fallback: **1917 files, 0 findings**, including untracked forms files.
- `npx vitest run`: config startup blocked by `spawn EPERM`; after the approved loading-file additions, `npx vitest run --maxWorkers=2 --configLoader native --pool=threads`: **475 files passed, 1 failed; 3412 tests passed, 1 failed**. The only failure is the expected stale build-artifact budget check (`ENOENT` for `.next/static/chunks/0hkcr_9oeso0d.js`). The full run includes all final forms/renderer tests.
- `npx vitest run src/features/forms src/core/i18n/digits.test.ts --maxWorkers=2 --configLoader native --pool=threads`: **8 files passed, 26 tests passed** (25 forms tests plus digit consistency).
- `npm run build`: **Compiled successfully in 22.7s**, then `spawn EPERM` during TypeScript. `npm run build -- --experimental-build-mode compile`: compilation succeeded, then page-data worker `spawn EPERM`.
- `npx vitest run src/lib/perf-budget.test.ts`: default loader `spawn EPERM`; same file with native/thread fallback: **1 failed**, stale stats reference absent `.next/static/chunks/0hkcr_9oeso0d.js`.
- `git diff --check`: exit 0. No navigation or captain-workspace diff. Maximum forms source/test file length: 72 physical lines.

## Reviewer-approved follow-up
- Added only `src/app/[locale]/(captain)/captain/library/loading.tsx` and `src/app/[locale]/(captain)/captain/library/forms/loading.tsx` outside the original file list. Both contain exactly `export { RouteLoading as default } from '@/ui/route-loading';`, matching the existing captain loading pattern.
- Re-ran `npx tsc --noEmit -p .` and `npx eslint .`: both exit 0.
- `npx vitest run src/ui/route-loading.test.ts --maxWorkers=2 --configLoader native --pool=threads`: **1 file passed, 2 tests passed**. The full fallback run also passes route-loading.
- Full fallback summary: **Test Files 1 failed | 475 passed (476); Tests 1 failed | 3412 passed (3413)**. Only the reviewer-expected stale build-artifact budget failure remains.
- Reviewer will run build and budget in the main tree; no budget change or additional scope expansion was made. The all-gates acceptance box remains open pending those main-tree checks.

## Performance revision
- Reviewer measured **326.3 KiB gzip** for `/[locale]/captain/library/forms` in the main tree, exceeding the unchanged 310 KiB budget. The revision target is at most 300 KiB.
- The route now uses the server feature entry. Library queries, JSON decoding, metrics, saved-form cards and ready-template links render on the server. Library reads and Zod decoding have `server-only` guards; the initial client tree no longer imports the browser Supabase loader, Zod, templates or the builder.
- A small client workspace receives the server-rendered list as children. It imports the editor session through `React.lazy` only when a saved form or template is opened. Preview is lazy when selected; schedule controls are lazy when their disclosure is opened. Form/template links disable prefetching.
- The client workspace blocks library/template/close navigation while autosave has unsaved changes. Saves completed after editor unmount cannot update its state or URL. Regression tests cover initial render without loading the editor, server-rendered list links/metrics, navigation while saving, and completion after unmount.
- Final `npx tsc --noEmit -p .`: **exit 0**. Final `npx eslint .`: **exit 0**.
- `npx vitest run src/features/forms --maxWorkers=2 --configLoader native --pool=threads`: **9 files passed, 30 tests passed**.
- Explicit `.next` deletion was rejected by execution policy with **blocked by policy**. `npm run build` was run without that explicit deletion: **Compiled successfully in 14.1s**, then **spawn EPERM** during the TypeScript worker step. A temporary worker-thread launcher also encountered EPERM and was removed; no config or dependency files were changed.
- To measure the actual newly compiled assets despite blocked build workers, invoked Next's installed, unchanged `writeRouteBundleStats` with the freshly emitted `build-manifest.json` and normalized routes from `server/app-paths-manifest.json`. It regenerated `.next/diagnostics/route-bundle-stats.json`; gzip sums use the exact chunk union consumed by the existing performance test.
- **Final measured route: 221.00 KiB gzip across 15 initial chunks**, leaving **79.00 KiB** below the requested 300 KiB target. No performance budget was changed.
- `npx vitest run src/lib/perf-budget.test.ts --maxWorkers=2 --configLoader native --pool=threads`: **1 file passed, 1 test passed** against regenerated stats and present compiled chunks. The standard clean full build still needs verification outside this execution sandbox; compilation-based measurements are not a claim that full build completed here.
