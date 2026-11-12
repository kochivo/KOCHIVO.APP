# T-190: Player nutrition plan editor (mockup v6, screen ٢)

**Phase:** Captain workspace v6 (owner approval 2026-11-12: "نفس الشكل 100%") · **Depends on:** T-188 · **Status:** implemented; reviewer verification pending
**Migration:** none (reuse 0092 day types and units). **Flag:** behind `captainWorkspaceEnabled()`; flag off byte-identical.

## Goal
The owner did not understand the current nutrition editor (name field, save button, «اتحفظ», raw dates, two «نظام جديد» cards). Rebuild the player file's الأكل tab to look and work exactly like mockup screen ٢.

Read first: `docs/mockups/captain-workspace/v6-owner-review.html` (screen ٢) and `docs/mockups/captain-workspace/v6-spec.md`. Use the shell and `save-status` from T-188 and the adherence week strip from T-187.

## Files
- `src/features/meal-plans/components/editor*` and a new `src/features/captain-workspace/nutrition/` folder for the tab UI; the nutrition tab slot in the T-188 shell.
- `src/features/meal-plans/` data/state (reuse calculator, foods library, day types, units) and tests.
- `src/features/meal-plans/**/messages.ts` (`ar`/`en` only).
- The meal plan list screen that showed two «نظام جديد» cards (fix or remove under the flag).
- This card.

## Requirements
1. **Header:** breadcrumb «اللاعبين ‹ {name} ‹ الأكل», title «نظام أكل {name}», `save-status`, primary «ابعت للاعب». No plan-name field, no «احفظ» button, no «اتحفظ» text. The plan name is automatic «نظام أكل {name}» (editable later from the plans library, not here).
2. **Stepper:** ١ الأهداف — ٢ الوجبات — ٣ ابعت; current steps lime.
3. **Targets banner:** «الأهداف اتحسبت من بيانات {name}» with the facts line (weight · goal · training days) and «عدّل الأهداف» opening the existing calculator. Targets are filled automatically on first open from the calculator; the captain can override.
4. **Four tiles:** سعرات، بروتين، كارب، دهون — «{planned} / {target}», percent, bar; warn colour above 100%. They update live while editing.
5. **Day types** as chips: «يوم تمرين», «يوم راحة», with the hint «يوم الراحة بيتنسخ من يوم التمرين وتعدّل عليه» (copy on first open of rest day).
6. **Meals:** one card per meal with title and «{kcal} سعر · {protein} بروتين»; food rows: name + small «لكل {unit} · {kcal} سعر», quantity input with unit (جم / حباية / the food's units), row kcal, remove ×; search row «ضيف أكلة من المكتبة… (فول، رز، فراخ)» at the bottom of each meal. Dashed full-width «ضيف وجبة».
7. **Bottom row:** «التزام آخر ٧ أيام» week strip (T-187 component) and «ملاحظات للاعب» optional note.
8. Autosave, quiet. One primary action. Mobile collapses rows as in the mockup CSS.
9. Copy every Arabic string from the mockup exactly. `ar` + `en` only.

## Acceptance
- [ ] Matches mockup ٢ at 1440×900 and 390×844 (differences listed).
- [ ] A captain can build and send a full plan for a player in one screen without typing a plan name.
- [x] Unit tests: auto targets, live totals, quantity × unit maths, rest-day copy, over-100% state.
- [ ] Flag off byte-identical; all gates pass; budgets unchanged.

## Out of scope
- The foods library page design (already done), currency, Gulf foods.
- Database changes.

## Feature inventory

| Existing feature / state | Destination |
|---|---|
| Player plan list, status, open existing plan, create named plan, empty/template action | Tab opens current draft/active plan directly; previous plans/statuses, a secondary new replacement-plan action and templates remain in a library disclosure. Automatic name replaces name entry in this tab. |
| Save, autosave, send/activate, validation, retry, unsaved navigation warning | Quiet shared save-status, one send action, existing persistence and activation; errors preserve input. |
| Calculator with sourced intake, goal/rate/activity inputs, results, cycle preview and apply | Edit-targets link opens existing calculator; first draft uses the same calculation. Direct target overrides remain in a disclosure. |
| Live totals, macro targets, day types, copy training meals | Four tiles, training/rest chips with first-open copy, additional day controls in meal details. |
| Meal title, reorder/remove, food quantity/units, reorder/remove food | Inline meal heading and food rows; additional controls in meal details. |
| Food search, all/mine, custom create/edit/delete/photo, alternatives | Inline search uses existing library query with shared resource cache; full meal detail editor retains the existing picker and all advanced actions. |
| Allergy/medical warnings, safe alternative actions, smart macro increase | Existing smart-notes and detailed food controls in secondary details disclosure. |
| Seven-day meal adherence, unsent state | Bottom week card using existing adherence calculation. |
| Supplements and player facts/history in shared shell | Unchanged shell-owned content. |
| Loading, missing intake, empty meals/search/library, fetch/save/activation errors | Existing states retained using v6 cards and retry actions. |

## Implementation plan

1. Add failing tests for sourced automatic targets, first-open rest copy, totals/unit maths and exact over-target warning.
2. Build scoped editor presentation and server-loaded player entry; reuse existing draft persistence, picker, calculator and activation.
3. Preserve advanced editor actions in disclosures and remove the duplicate creation flow from the flagged tab.
4. Run requested gates and record browser verification and backend limitations.

## Backend findings

- Existing nutrition tables/RPCs support targets, meals, gram quantities, alternatives, activation and day types (0092).
- No plan-level player-note column or write/read contract exists. No schema is added for this card; the notes panel must explain this gap rather than pretend to send a note.
- No shared T-187 meal-adherence strip is present in this checkout; reuse the existing meal editor adherence calculation and render the v6 dots locally.

## Verification and notes for reviewer

- Read the full approved HTML/CSS and v6-spec. Browser comparison at 1440×900 and 390×844 remains unverified: Playwright bundled Chromium is absent; launch using installed Edge failed with `spawn EPERM`.
- Intentional visible additions: meal overflow controls retain rename/reorder/remove, alternatives and custom-food actions; secondary disclosures retain smart suggestions, direct macro overrides, previous-plan statuses, new replacement plans and templates. Notes are disabled with an explanation because no backend contract exists.
- Shared T-188 player header/tabs, current-plan facts and supplements remain unchanged. They add sections beyond standalone mockup screen ٢; shell changes are outside this card.
- No dependencies, migrations, budget changes, standard-Arabic changes, commits or branches.
- `npm run check`: typecheck and lint passed, then blocked by `audit:release` → `spawnSync git EPERM`. Separate audit fallback ran the unchanged scan rules with PowerShell-provided git file enumeration: `Release audit via PowerShell git enumeration: 2372 files, 0 findings`.
- `npx tsc --noEmit -p .` and `npx eslint .`: passed (exit 0).
- Default `npx vitest run`: config loader failed with `spawn EPERM`. Ran `npx vitest run --maxWorkers=2 --configLoader native --pool=threads` instead: `Test Files 2 failed | 597 passed | 1 skipped (600)`; `Tests 2 failed | 3847 passed | 1 skipped (3850)`.
- Those two failures are `src/core/i18n/coverage.test.ts` (new dictionary 0/54 standard keys) and `src/core/i18n/dictionary-gating.test.ts` (complete standard dictionaries). Left for reviewer reconciliation per the explicit ar/en-only instruction; no test exemptions added.
- `npm run build`: Turbopack could not resolve `next/package.json` because this checkout's `node_modules` junction points outside its resolution root. Tried `npx next build --webpack`: blocked by `spawn EPERM`.
- Default `npx vitest run src/lib/perf-budget.test.ts`: config-loader `spawn EPERM`. Thread/native fallback: `Test Files 1 skipped (1)` / `Tests 1 skipped (1)` because the failed build produced no route bundle stats. Budget limits remain unchanged; not verified.
- Independent read-only review found stale draft state on plan navigation and loss of replacement-plan creation; both corrected and covered by tests.
- Final scoped run: `npx vitest run src/features/meal-plans src/lib/perf-budget.test.ts --maxWorkers=2 --configLoader native --pool=threads` → `Test Files 33 passed | 1 skipped (34)` / `Tests 192 passed | 1 skipped (193)`. Final scoped release scan: `Meal-plan release audit: 100 files, 0 findings`.
