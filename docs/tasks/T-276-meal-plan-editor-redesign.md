# T-276 — Meal plan editor redesign: add food inside the meal, meal time, portion macros

**Phase:** captain v11 fixes · **Depends on:** T-272 (primitives) · **Status:** ready
Approved look: `docs/mockups/captain-workspace/v13-editors.html`, section one (owner approved 2026-11-14). Read `docs/tasks/V11-FIDELITY.md` first, including "Clickable things must look clickable".

## Goal
The owner found the current editor unclear:
- To add a food, the captain must first make a meal "active", then press + in the library. The captain does not understand this.
- Every meal is called «وجبة جديدة» and has no time.
- Food rows show per-100 g values, not the portion.
- The quantity has no unit.
- There are no per-meal totals.
- Alternatives are hidden.
- The targets sit collapsed at the bottom.

Match the mockup 1:1.

## Files
- `supabase/migrations/0110_meal_time_and_unit.sql`, additive only:
  - `meals.time_of_day time` (nullable);
  - `meal_items.unit text` (nullable; a key from that food's `foods.units`, or null for grams);
  - a new `save_nutrition_plan` overload that also saves both fields. Keep every existing signature working unchanged.
- `supabase/tests/meal-time-unit.test.ts`: saving and reading both fields, RLS unchanged (another captain cannot write), and old drafts without the fields still save.
- `src/features/meal-plans/components/v11-*.tsx`, `src/features/meal-plans/components/editor/`, `src/features/meal-plans/data/`, their messages and tests. New files are allowed.

## Requirements
1. **Targets at the top.** Show the ring plus four target fields (calories, protein, carbs, fat), edited in place. Under them, one line: «فاضل X سعر · بروتين Y من Z».
2. **Meal header:**
   - the name, edited in place (`EditInPlace`);
   - a time chip that opens a time picker;
   - the meal's macro totals (calories, P, C, F);
   - a menu with rename, duplicate, move up/down and delete. Keep every action that exists today.
3. **«ضيف أكلة لـ<meal>» inside each meal.** It is a dashed lime add button. Pressing it opens a search field inside that meal, with results right below it. Each result shows the default portion and its calories and protein, plus a «ضيف» button. Remove the "active meal" concept completely.
4. **Food rows:**
   - quantity plus a unit select from `foods.units`, with grams as the fallback;
   - the macros for that portion, not per 100 g;
   - the row's calories;
   - «بدائل N», which opens the existing alternatives sheet;
   - a remove icon with a translated aria-label.
   The amount stays stored as grams: unit × the unit's grams. Never guess a unit's grams.
5. **Library panel on the side.** Its + opens a small menu «ضيف <food> لـ:» listing the meals of the current day. Drag and drop into a meal is optional. If you add it, it must work by keyboard too.
6. «ضيف وجبة» is a dashed add button at the end.
7. New meals get a default name by position («الفطار», «سناك», «الغدا», «العشا», then «وجبة N»). The captain can rename them. Do not overwrite names of existing meals.
8. Training day and rest day tabs stay as they are today (`day_type`).
9. **Offline and saving:**
   - Keep the current save path, optimistic and autosaving, exactly as it works today.
   - Use the new overload only when the new fields change. Old clients keep working.
10. **Perf:** the plan editor route stays inside its budget. Lazy-load the time picker and the menu if needed.

## Acceptance
- [ ] Adding a food takes one press on «ضيف أكلة» plus a choice, with no "active meal".
- [ ] Each meal shows its name, time and totals. The totals equal the sum of its rows (unit test).
- [ ] A unit change keeps the grams correct (unit test), and the portion macros are right.
- [ ] Every clickable part has a visible cue, `cursor-pointer`, a focus ring and a pressed state.
- [ ] Desktop and 390px match the mockup.
- [ ] No existing feature dropped. List anything that moved.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- New foods in the catalog.
- KO meal suggestions.
- The player's view of the plan. Only list in Notes what the player would need to see the meal time.
