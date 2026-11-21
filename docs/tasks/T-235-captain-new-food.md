# T-235 — Captain: full «أكلة جديدة» screen with macro check and units

**Phase:** captain v11 · **Depends on:** none · **Status:** ready

## Goal
Adding a custom food becomes a clear full screen. The captain types values per 100 g, sees right away if the calories don't match the macros, adds household units (صباع، طبق، معلقة) so players don't have to weigh every time, and sees how the food will look in a plan.

## Files
Create or modify only these:
- `src/app/[locale]/(captain)/captain/library/foods/new/page.tsx` and `.../foods/[foodId]/edit/page.tsx` (new, thin routes)
- `src/features/meal-plans/components/food-form.tsx` (new): the full-screen form
- `src/features/meal-plans/components/food-units-editor.tsx` (new)
- `src/features/meal-plans/components/food-preview.tsx` (new)
- `src/features/meal-plans/macro-check.ts` (new): pure helpers
- `src/features/meal-plans/components/library/food-drawer.tsx`: «أكلة جديدة» and «عدّل» open the new screen
- `src/features/meal-plans/messages.ts` (`ar`, `arStd`, `en`)
- `src/features/meal-plans/macro-check.test.ts`, `food-form.test.ts` (new)

## Requirements
1. **Reuse the existing save path.** Use `saveCustomFood` with `writeCustomFood`. Send `servingGrams: 100`, so the values the captain types are stored as-is per 100 g.
   - Fields: `name_ar` (required), `name_en`, photo (the existing `captain-food-photos` upload), kcal, protein, carbs and fat per 100 g, and `units`.
   - No migration.
2. **Macro check** (`macro-check.ts`):
   - `calc = protein*4 + carbs*4 + fat*9`;
   - if `|calc − kcal| > max(8% of kcal, 10)`, show the warn note «الماكروز بتطلع X سعر، وانت كاتب Y. راجع الأرقام»;
   - otherwise show the lime note «السعرات مظبوطة»;
   - the check warns but never blocks saving.
3. **Units editor:**
   - rows of name plus grams, with live kcal per unit beside each row;
   - «ضيف وحدة», max 20;
   - saved as the existing `units` shape `{ key, name_ar, name_en, grams }`: `key` is generated with `uuidv7()`, and `name_en` falls back to `name_ar`;
   - grams must be > 0.
4. **Preview card:** name, the first unit or 100 g, a macro split bar (protein `lime`, carbs `calm`, fat `warn` tokens), and kcal/P/C/F for that portion.
5. After saving, return to the caller (library or meal editor) with a toast «اتحفظت <name> في مكتبتك». In the meal editor, the new food is added to the meal that was open.
6. Editing a global food keeps today's «copy» behaviour (`copyFrom`). The captain never edits a global row.

## Acceptance
- [ ] Tests:
  - [ ] the macro check thresholds (ok, warn, zero values);
  - [ ] per-unit kcal;
  - [ ] the units shape and key generation;
  - [ ] the form sends `servingGrams: 100`;
  - [ ] the edit route only loads the captain's own food.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Filling values from a photo with KO. That feature doesn't exist yet, so don't add it.
- DB changes.
- The player app.

## References
- Mockup: `docs/mockups/captain-workspace/v11-prototype.html` → مكتبة الأكلات → «أكلة جديدة».
- Existing code: `src/features/meal-plans/data/custom-food.ts`, `components/custom-food-sheet.tsx`, `types.ts` (`customFoodSchema`).
- Tables: `0007_nutrition.sql`, `0039_captain_food_photos.sql`, `0092_meal_day_types_and_units.sql`.
