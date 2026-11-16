# T-334 — Recipe ingredients and food sources show English in Arabic

**Source:** owner report on 2026-11-16: "the food recipes are written in English even when the site is in Arabic."

**Cause:** `src/features/meal-plans/components/library/food-facts.tsx` (lines 39–40) prints USDA text from `food.source_ref` as is:
- For a recipe food (`'ingredients' in ref`), each ingredient shows `item.description`, which is USDA English such as "Rice, white, long-grain, regular, enriched, cooked".
- For a single-source food (`'fdc_id' in ref`), `ref.description` is USDA English.

The seed has 124 recipe foods with 82 distinct ingredient `fdc_id`s, and 177 single-source foods. For 78 of the 82 ingredients, a seed food with the same `source_ref.fdc_id` already exists and has `name_ar` and `name_en` in `supabase/seed/source/foods-starter.json`. The 4 missing ones are "Egg, white, raw, fresh", "Jute, potherb, cooked, boiled, drained, without salt", "Beverages, water, tap, municipal" and "Spices, thyme, dried".

## Fix (no migration, no data writes)
1. **New file `src/features/meal-plans/data/ingredient-names.ts`.** It holds a static map `fdc_id → { ar, en }` for all 82 ingredient ids.
   - Take the names from the seed foods that share the `fdc_id`.
   - Add the 4 missing ones by hand. Use short, plain food names: «بياض بيض», «ملوخية مسلوقة», «مية», «زعتر ناشف».
   - Generate the map with a throwaway script; do not commit the script.
   - The file must stay under 250 lines. Split the data into a `.json` file if needed.
2. **`food-facts.tsx`:**
   - **Recipe ingredients:** show the ingredient name in the viewer's locale.
     - If `item.food_id` exists (captain recipes) and the description is already the captain's own food name, keep the current behaviour.
     - Otherwise look up `fdc_id` in the map and use `ar` for both Arabic styles and `en` for English.
     - Fall back to the stored description only when the map has no entry.
   - **Single-source foods:** in Arabic, do not show the English USDA description; the Arabic food name is already the heading. Keep the `fdc_id · dataset` line with `dir="ltr"`. In English, keep the description.
3. Check whether the same English ingredient or USDA text appears anywhere else in the UI (player nutrition screens, meal plan editor, recipe builder), and apply the same lookup there. List what you found.

## Tests
- A unit test that every ingredient `fdc_id` in `supabase/seed/source/foods-starter.json` has a non-empty `ar` and `en` entry in the map. This guards future seed changes.
- A render or unit test showing that, with an Arabic locale, a recipe food lists Arabic ingredient names and no USDA English text; English still shows English.

## Out of scope
- Changing the data stored in the database.
- Food names themselves, photos, and the `npm run seed` script.

## Gates
`npm run check` and `npm run build`.
