# T-189: Player training tab (mockup v6, screen ١)

**Phase:** Captain workspace v6 (owner approval 2026-11-12: "نفس الشكل 100%") · **Depends on:** T-188 · **Status:** implemented; visual and gate review pending
**Migration:** none. **Flag:** behind `captainWorkspaceEnabled()`; flag off byte-identical.

## Goal
The owner could not add exercises to a player directly; he had to pick a template. Rebuild the player file's التمرين tab to look and work exactly like mockup screen ١.

Read first: `docs/mockups/captain-workspace/v6-owner-review.html` (screen ١) and `docs/mockups/captain-workspace/v6-spec.md`. Use the shell, `underline-tabs`, `fact-row` and `save-status` from T-188.

## Files
- `src/features/captain-workspace/training/` (new) for the tab UI, and the training tab slot in the T-188 shell.
- `src/features/programs/` data and state hooks (reuse the existing draft/save/activate logic; add what is missing for inline add/remove/reorder) and tests.
- `src/features/programs/messages.ts` (`ar`/`en` only).
- This card.

## Requirements
1. **Layout:** 300px sticky «بياناته» panel (fact rows: الهدف، الوزن، الطول · السن، الخبرة، أيام التمرين، وقت التمرينة، إصابات in warn colour when present، المكان) + main column. Stacks on small screens.
2. **Start choice** (only when the player has no program yet, or when starting a new one): two cards «ابدأ من الصفر — ضيف الأيام والتمارين بنفسك» and «من خطة جاهزة — اختار خطة من خططك وعدّل عليها». Templates are optional, never forced.
3. **Days** as pill chips («اليوم ١ · صدر وضهر» …) plus «+ يوم». Rename a day inline.
4. **Exercises** in one card, each row: drag handle, English exercise name + small «muscle · equipment», sets stepper (− n +), reps range, «راحة {n}ث», remove ×. Reorder by drag and by keyboard.
5. **Add inline:** a search row at the bottom «دوّر على تمرين وضيفه… (bench, ضهر, كابل)» searching the existing exercise library (Arabic or English), plus suggestion pills «مقترح لـ{day}:» based on the day's muscles. No separate page or modal needed to add.
6. **Saving:** autosave, quiet. Header shows `save-status` («محفوظ»). No toasts on save.
7. **One primary action:** «ابعت للاعب» in the header (activates/sends the program with the existing activation logic and validation). Validation errors show inline.
8. Mobile (≤760px): rows collapse to name + sets + remove (as in the mockup CSS).
9. Copy every Arabic string from the mockup exactly. `ar` + `en` only.

## Acceptance
- [ ] Matches mockup ١ at 1440×900 and 390×844 (differences listed).
- [ ] A captain can build a full program from scratch for a player without opening a template.
- [x] Unit tests: add/remove/reorder, stepper bounds, suggestions per muscle, send validation.
- [ ] Flag off byte-identical; all gates pass; budgets unchanged.

## Out of scope
- The templates library page (only reuse its data for «من خطة جاهزة»).
- Database changes.

## Feature inventory
- Unified identity, subscription renewal, player preview and route tabs: retained in T-188 shell, untouched.
- Current active/draft program, title, weekly/rotation days, rest/empty days and exercise prescriptions: training editor; program history remains available as links to the existing builder.
- Exercise Arabic/English name, muscle, equipment, media and sets/reps: compact rows; media and advanced settings remain accessible in the existing builder link.
- Player current/target weight, goal progress, height, age, training weekdays, duration, injuries, medical conditions, allergies, notes, sourced answers and form change history: sticky fact card plus expandable existing player facts panel (per v6-spec).
- Current program summary and updated date: existing shell PlanContext, untouched.
- Loading/error/retry, no program/no days/no exercises states: inline cards per v6-spec.
- Mobile player facts sheet: facts now stack above editing; all its data remains in expandable facts.
- Mobile add/send placeholders: replaced with working inline search and send action. Empty fit-score/editing slots had no behavior.
- Legacy flag-off generator, creation, program list/status links and template entry: unchanged route branch; program list and advanced builder links also available in training tab.

## Implementation plan
1. Test draft add/remove/reorder, bounds, bilingual muscle suggestions and activation validation; reuse existing operations.
2. Add empty-program creation and template-list/clone actions using existing tables and RPC; no schema or dependency changes.
3. Add lazy training editor, sticky facts, inline search/day controls and serialized autosave. Route through public entry; leave shared shell untouched.
4. Run requested gates; inspect desktop/mobile if local browser/auth are available. Record exact limitations below.

## Backend findings
- Existing save_weekly_program and activate_program RPCs support rotation days and activation; no new backend is required.
- assign_program_template activates immediately, so optional template start must copy the loaded template into a new draft and use the existing save RPC; send remains explicit.
- No location/equipment field is exposed by the current profile intake or player-file loader. Location is explicitly unavailable; no data is invented.
- Existing weekly plans must keep exactly seven weekdays under save_weekly_program validation. The add-day chip is disabled with an explanation for those plans; new scratch plans use rotation days and support adding days freely.

## Notes for reviewer
- Shared player-file shell files are untouched. One public server export plugs the new training entry into its own route.
- The shared header has no action slot. Save status/send sit at the top of the training main column, below the shared header/tabs. Moving them into the shared header needs a shell change outside this card's authorized parallel-work scope.
- Extra expandable player facts/history and existing builder/history links preserve features not pictured in screen ١, using v6 card styling. Existing shell PlanContext remains below the tab.
- Browser launch through Playwright/Edge failed with spawn EPERM, so 1440×900 and 390×844 visual verification remains pending. Mockup markup was read.
- Standard Arabic dictionaries are deliberately untouched per owner instruction. New ar/en messages cause the standard-coverage gates to fail until the reviewer reconciles them.
- Existing captain-workspace/route.test.ts still expects the retired WorkspaceEntry rather than TrainingEntry. It is outside this card's allowed folders; the new training/route.test.ts verifies the new entry and byte-identical flag-off behavior.
- Narrow content columns also collapse exercise rows to avoid horizontal overflow; focused mobile rows expose up/down reorder buttons. Touch sizes stay at least 48px even where the mockup draws smaller controls.

## Verification
- `npx tsc --noEmit -p .`: exit 0.
- `npx eslint .`: exit 0.
- `npm run check`: typecheck/lint passed; stopped at `audit:release` with `spawnSync git EPERM`.
- `npm run audit:release`: blocked by `spawnSync git EPERM`. Fallback piped native `git ls-files --cached --others --exclude-standard` into the unchanged `scanFile`/`scanRoutes` rules via `node --input-type=module -e`: `Release audit fallback: 2379 files, 0 findings`.
- Default `npx vitest run` and default performance test: blocked loading config by `spawn EPERM`. Used `--maxWorkers=2 --configLoader native --pool=threads` instead.
- Programs/training tests: `Test Files 22 passed (22); Tests 130 passed (130)`.
- Whole-suite fallback: `Test Files 4 failed | 600 passed (604); Tests 4 failed | 3863 passed (3867)`. Failures are the two standard Arabic coverage/gating tests, the old workspace-entry route test, and the missing-chunk performance test described above. New training UI/route and program tests pass.
- `npm run build`: `Compiled successfully`; stopped at Next's TypeScript worker with `spawn EPERM`. Standalone tsc passes; no configuration workaround or budget change.
- Performance test with the Vitest fallback fails `ENOENT` for a missing `.next/static/chunks/32al0u947fwh-.js`; a complete build and fresh bundle statistics are required to verify budgets.

## Changed file map
- `training/training-entry.tsx`: shell composition and Suspense; `training-content.tsx`: cached player facts and newest active/draft load; `training-editor-entry.tsx`: lazy client boundary.
- `training/training-editor.tsx`: start/day/send orchestration and program links; `start-choice.tsx`: optional scratch/template choices; `training-facts.tsx`: sticky fact rows and retained source/history panel.
- `training/day-exercises.tsx`: list reorder and announcements; `exercise-row.tsx`: prescriptions, stepper, remove and keyboard/touch controls; `inline-search.tsx` and `data/library.ts`: bilingual inline search and batched muscle suggestions.
- `training/messages.ts`: ar/en copy only; `route.test.ts` and `training-ui.test.ts`: flag-off tree equality, flag-on entry, states and Arabic/English rendering.
- `programs/data/training-start.ts` and its test: empty drafts, optional independent template copies, ownership filters and failure cleanup.
- `programs/hooks/use-training-autosave.ts`, `autosave.ts` and its test: serialized quiet writes, retry and flushing the latest draft.
- `programs/inline-training.ts` and its test: muscle inference, suggestions and existing draft/activation operations; `data/library.ts`: opt-in metadata search and one-query muscle filtering; `index.ts`: public exports.
- Programs route and `captain-workspace/server.ts`: flag-gated training entry plumbing. No shared player-file shell implementation changes.
