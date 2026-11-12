# T-193: Training plans, meal plans and foods libraries (mockup v6-rest)

**Phase:** Captain workspace v6 (owner: "100% UI/UX and backend") · **Depends on:** T-189, T-190 · **Status:** ready
**Migration:** none expected. **Flag:** behind `captainWorkspaceEnabled()`; flag off byte-identical.

Read first: `docs/mockups/captain-workspace/v6-rest.html` (screens «خطط التمارين», «الأنظمة الغذائية», «مكتبة الأكلات») and `docs/mockups/captain-workspace/v6-spec.md`. Reuse the shared UI from `src/ui/` (T-188) and the editors from T-189 (training) and T-190 (nutrition).

## Files
- `src/features/templates/` (training plans library) and tests.
- `src/features/meal-plans/` library page for plan templates (new route `src/app/[locale]/(captain)/captain/library/meal-plans/page.tsx`, thin) and the foods library components.
- `src/features/roster/nav.ts` only to point «الأنظمة الغذائية» at the new route.
- Messages (`ar`/`en` only). This card.

## Requirements
1. **خطط التمارين:** header, subline, primary «خطة جديدة»; level chips (الكل، مبتدئ، متوسط، متقدم) and search; cards (level pill, title, «{days} أيام · {minutes} دقيقة · {place}», «مع {n} لاعيبة» / «مش مستخدمة», «افتح»). Opening a plan uses the same training editor as the player file (T-189) in template mode. Keep existing actions (duplicate, archive, assign to player) in a ⋯ menu.
2. **الأنظمة الغذائية:** header, subline, primary «نظام جديد»; one row per plan template (icon, title, «{meals} وجبات · {protein} بروتين · …», «مع {n} لاعيبة» / «مش مستخدم», chevron). Opening uses the T-190 editor in template mode. Empty: one line «لسه معملتش نظام» + the primary button. Fix the duplicated «نظام جديد» cards for good. Assigning a template to a player copies it into that player's plan.
3. **مكتبة الأكلات:** chips الكل/أكلاتي/العامة with counts, search (Arabic or English); table header «الأكلة · لكل 100 جم», سعرات، بروتين، كارب، دهون، وحدات (shown only when present, e.g. «معلقة · 10 جم»), في أنظمة (count). Keep add/edit/delete of own foods and units.
4. Feature inventory per `v6-spec.md` for all three screens.
5. Copy every Arabic string from the mockup exactly. `ar` + `en` only.

## Acceptance
- [ ] Matches the three mockup screens at 1440×900 and 390×844 (differences listed).
- [ ] Feature inventory, nothing dropped.
- [ ] Unit tests: filters, search (Arabic/English normalisation), usage counts in one query, template → player copy.
- [ ] Flag off byte-identical; all gates pass; budgets unchanged.

## Feature inventory

| Current screen feature | v6 destination |
|---|---|
| Training/nutrition type switch | Separate training and meal library destinations; legacy switch retained flag off |
| Personal and KOCHIVO starter templates, counts, starter protection | Combined library cards/rows with starter badges; protected starter actions remain copy/preview/assign |
| Blank creation and program generator | Single primary creation button; generator in secondary disclosure |
| Preview with ordered days/exercises or meals/calories | Overflow menu preview sheet, unchanged |
| Assignment: roster, multi-select/select all, per-player success/error, empty roster link | Overflow assign action and existing assignment sheet/RPC |
| Duplicate, rename, delete, edit | Overflow menu; open action; destructive confirmation and errors retained |
| Optimistic copy/rename/delete, pending locks, rollback, retries | Existing mutation flow retained |
| Empty personal/starter lists, loading and errors | Single library empty line, skeleton and retry; legacy sections retained flag off |
| Food Arabic/English search, all/mine/global counts, cursor pagination | Filter/search row and pagination below table |
| Food names, ownership, photos, four macros, units and usage | Responsive table with per-100g heading once |
| Food drawer: own add/edit/delete, global copy/read-only, photos, duplicate/energy warnings | Existing lazy drawer retained |
| Unit add/edit/remove and delete usage guard including alternatives | Existing drawer/units and server guard retained |
| Food optimistic updates/reconciliation, pending/error/input retention | Existing resource mutation flow retained |
| T-189 day chips, day rename/add, rest days, exercise steppers/reps/rest/remove, inline search, suggestions and drag/arrow reorder | Same `TrainingEditor` / `DayExercises` in template mode; no rebuilt editor |
| T-189 quiet autosave, status/error/retry and editable plan title | Same `useTrainingAutosave` queue; template save flushes it without player activation |
| Existing advanced program builder and its additional controls | Secondary existing «صور وإعدادات التمرين» link from the shared editor |
| Player facts, program history, new-program choices and send | Player-file mode unchanged; template mode has no player facts/history/send |
| Meal template title, save/retry/autosave, totals and manual macro targets | Shared T-190 editor header, target tiles and secondary targets disclosure |
| Meal names, add/delete/reorder, training/rest/all day type, training-to-rest copy | Shared meal cards, their existing details editor and template copy button |
| Food picker, custom food creation, quantities/units, item reorder/remove and alternatives | Inline food rows/search; existing full meal/item editor remains in each meal's details |

## Implementation plan

1. Add deterministic library filter/search/metadata tests and grouped usage query tests.
2. Add flag-gated training cards and meal rows, reusing existing template actions and sheets.
3. Add thin meal library route and navigation; reuse editors through public entries where available.
4. Match foods layout/copy while retaining drawer, units, pagination and errors.
5. Run all requested gates and report browser/backend limitations explicitly.

## Backend findings

- Both plan tables have `source_template_id`; existing assignment RPCs deep-copy templates into player-owned drafts.
- Training level, duration and place have no dedicated columns. Do not infer values from titles or fabricate defaults; inspect existing settings where available and omit unknown metadata.
- Reviewer approved the training scope extension. A server-only template entry validates persisted `is_template`, `is_starter` and `player_id` before passing a draft to the lazy editor; program reads go through `programs/server.ts`.
- Food usage now counts distinct plan IDs across main items and alternatives in the page query, rather than counting item references.
- Foods retain the existing global-copy drawer, own-food CRUD, photo/units editor and deletion guard. The former foods/forms local nav is represented by the captain sidebar's existing forms destination.

## Verification / differences

- T-190 player editor now also accepts templates: editable title, template save, same targets/meal cards, training/rest copy and manual targets; player-only facts, send and adherence are omitted in template mode.
- Training creation and open now navigate to `/captain/templates?plan=<id>`, rendered by the same lazy T-189 editor in template mode. Starter templates remain read-only preview with copy/assign actions. Advanced builder URLs remain secondary links. Flag-off creation/open retains its original destinations.
- Unknown training level/minutes/equipment are omitted instead of fabricated; templates created by current builders generally do not store these fields.
- Mobile foods use stacked table rows with macro labels to prevent page overflow; desktop keeps the approved column order.
- Browser verification at 1440×900 / 390×844 was attempted: bundled Chromium is absent; installed Edge fails to launch with `spawn EPERM`. Mockup markup was read in full for the three screens; visual parity is unverified.
- `npm run build`: compilation succeeded; Next's TypeScript worker then failed with `spawn EPERM`. Standalone TypeScript passed. A complete build and fresh budget measurements remain required.
- `npm run audit:release`: `spawnSync git EPERM`; equivalent scanner fed by shell `git ls-files` reported `Release audit fallback: 2406 tracked files, 0 findings`.
- Default Vitest (including the requested standalone perf command) fails at config loading with `spawn EPERM`; fallback is `npx vitest run --maxWorkers=2 --configLoader native --pool=threads`.
- Standard Arabic parity tests need reviewer reconciliation for the new roster `mealPlans` key. No `arStd` or `standard/` files were edited.
- Reviewer authorized navigation test changes: exact labels, grouping and destination expectations now include meal plans; bilingual active-state assertions were added. Original flag-off assertions remain intact.
- The new route includes the standard one-line loading boundary required by the route-loading gate.
- Latest scoped verification: `Test Files 45 passed (45)`, `Tests 257 passed (257)` (templates, meal-plans and route-loading); standalone `npx tsc --noEmit -p .`, `npx eslint .` and `git diff --check` pass.
- Full fallback run before the loading/unit-message corrections: `Test Files 5 failed | 608 passed (613)`, `Tests 7 failed | 3911 passed (3918)`. Targeted reruns confirm loading and food dictionary parity are fixed; roster navigation expectations (2), roster standard parity (2), and incomplete-build perf artifacts (1) remain red.
- Perf fallback fails with `ENOENT` for `.next/static/chunks/32al0u947fwh-.js`; no budget value was changed and no fresh budget pass is claimed.
- Final audit fallback also included untracked additions: `Release audit fallback: 2424 tracked and new files, 0 findings`.

## Approved training extension (reviewer follow-up)

- Scope includes `captain-workspace/training/`, its server-only public export, templates route query dispatch and the roster navigation test expectations.
- `training-editor.tsx`: explicit template mode has no player ID, no start/send/history controls, and a template save action; shared day/exercise controls and quiet autosave are unchanged.
- `training/template-entry.tsx`: server-only validation and read through `programs/server.ts`; lazy `TrainingEditorEntry` receives loading text as a prop. No static client import was added to the workspace server entry.
- `templates/editor-href.ts` and the library controller: create/open use the template editor query destination only with the workspace flag on.
- New tests cover template edit/save without activation, server identity/flag checks, retry, lazy-entry props and flag-off route parity. Existing player-file training tests are retained unchanged apart from added template-mode assertions.

## Continuation review

- Reviewed the existing implementation against all of `v6-spec.md`, the three library mockup sections, and the reviewer decision. Retained the shared template editor, server-only reads, lazy loading and corrected roster navigation expectations.
- Added explicit enabled meal-template creation navigation coverage alongside training-template creation and legacy flag-off navigation tests.
- Fresh scoped run (templates, meal-plans, training and roster navigation): `Test Files 50 passed (50)`, `Tests 283 passed (283)`.
- Fresh standalone TypeScript and ESLint pass. `npm run check` reaches the release audit and stops on `spawnSync git EPERM`; the same release audit rules with shell-provided tracked/new file paths report `Release audit fallback: 2430 tracked and new files, 0 findings`.
- Fresh build reports `Compiled successfully in 15.9s`, then fails launching the Next TypeScript worker with `spawn EPERM`. Standalone TypeScript is the available alternative, not a complete-build substitute.
- Fresh Playwright Edge launch fails with `spawn EPERM`, before either requested viewport can be checked. Visual parity remains unverified.
- Default full/standalone-perf Vitest config loading fails with `spawn EPERM`. The standalone perf thread fallback fails on the missing `.next/static/chunks/32al0u947fwh-.js` artifact; budgets remain unchanged and require a complete build to measure.
- Fresh complete fallback: `Test Files 3 failed | 616 passed (619)`, `Tests 3 failed | 3938 passed (3941)`. The failures are exclusively roster standard Arabic coverage/dictionary parity (missing `mealPlans`, reserved for reviewer reconciliation) and the missing build chunk in `perf-budget.test.ts`. Roster navigation expectations and all scoped training/template/meal-plan tests pass. No tests were weakened or skipped.
- Final standalone TypeScript, ESLint and `git diff --check` pass after the added navigation test. No dependencies, budgets, standard Arabic dictionaries, migrations or commits were changed.
