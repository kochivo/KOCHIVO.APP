# T-247 — Captain v11: meal plans, plan editor and foods list

**Phase:** captain v11 fidelity · **Depends on:** T-238 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first. It is part of this card.

## Goal
These pages match the mockup exactly:
- `/captain/library/meal-plans` matches `plans`;
- the plan editor (`/captain/nutrition/[planId]`) matches `planEdit`;
- `/captain/library/foods` matches `foods`.

## Files
- `src/features/meal-plans/components/*` (library, editor). New files are allowed.
- `src/features/meal-plans/messages.ts`
- tests in `src/features/meal-plans/`

## Requirements
1. **Plans list.**
   - Header «الأنظمة الغذائية», with a glass «ادّي نظام للاعب» button and a lime «نظام جديد» button.
   - Plan cards (`g3`):
     - a calories ring;
     - the name;
     - the protein, carbs and fat legend in grams;
     - «<n> لاعبين عليه · يوم تمرين ويوم راحة».
   - The last card is «نظام جديد», with «حط الهدف والسعرات، وضيف الأكلات».
2. **Plan editor.**
   - The bar: back, name, «<n> لاعبين عليه», and a lime «احفظ».
   - Tabs: «يوم تمرين» and «يوم راحة».
   - A macros card: a ring with the total and «من <target> سعر · فاضل <n>», or «زيادة» in warn; then protein, carbs and fat bars against the targets.
   - A card per meal:
     - the name, the time, and its calories;
     - food rows with quantity and macros, and a remove icon;
     - «ضيف أكلة», with «هتتضاف هنا» on the selected meal.
   - On desktop, a food picker on the side:
     - search;
     - chips for بروتين، كارب، دهون، أكلاتي;
     - rows with a plus button that adds to the selected meal.
3. **Foods list.**
   - Header «مكتبة الأكلات», with a lime «أكلة جديدة» button (the T-235 page).
   - Tabs: الكل، بروتين، كارب، دهون، خضار وفاكهة، أكلات مصرية، أكلاتي.
   - A table with these columns:
     - food, with its photo;
     - unit;
     - calories;
     - protein;
     - carbs, hidden on mobile;
     - fat, hidden on mobile;
     - an edit button, which only applies to the captain's own foods.
4. If no category field exists for a tab, leave that tab out and report it.

## Acceptance
- [ ] All three screens match the mockup at desktop and at 390px.
- [ ] There are tests for the macro totals, the over-target state and the tab filters.
- [ ] `npm run check` and `npm run build` pass, and the routes stay within 310 KiB.

## Out of scope
- The new-food form (done in T-235).
