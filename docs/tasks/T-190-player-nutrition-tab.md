# T-190: Player nutrition plan editor (mockup v6, screen ٢)

**Phase:** Captain workspace v6 (owner approval 2026-11-12: "نفس الشكل 100%") · **Depends on:** T-188 · **Status:** ready
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
- [ ] Unit tests: auto targets, live totals, quantity × unit maths, rest-day copy, over-100% state.
- [ ] Flag off byte-identical; all gates pass; budgets unchanged.

## Out of scope
- The foods library page design (already done), currency, Gulf foods.
- Database changes.
