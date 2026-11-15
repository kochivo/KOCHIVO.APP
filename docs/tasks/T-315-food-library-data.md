# T-315 — Food library data: about 300 foods with real sources

Owner decision 2026-11-16: KOCHIVO's food library must be the best in the market. Every number must be real. A food that has no real source is not added. The approved look is `docs/mockups/food/food-library-v2.html`; the UI work comes later in T-316. This card covers the schema and the data only.

## Goal
Grow the global catalog from 60 to about 300 foods. Every food carries:
- its source,
- whether it is raw or cooked,
- its region,
- fiber, sugar and sodium where the source has them,
- household units.

## 1. Schema: migration `0126_food_library_sources.sql` (additive only)
Add to `public.foods`, each nullable or with a safe default so existing rows and captain foods keep working:
- `region text not null default 'intl'`, check in `('eg','gulf','lev','na','intl')`.
- `fiber_per_100g`, `sugar_per_100g` (numeric(5,1)), and `sodium_mg_per_100g` (numeric(7,1)). All nullable and `>= 0`.
- `source_kind text`: null for captain foods, otherwise one of `'usda','recipe','proxy'`.
- `source_ref jsonb`: for usda and proxy rows, `{fdc_id, dataset, description}`. For recipe rows, `{ingredients:[{fdc_id, grams, description}], cooked_yield_g}`.
- `state text`: `'raw'`, `'cooked'` or null.

Rules for the migration:
- No new table, no policy change, no edit to old migrations.
- Add a PGlite test in `supabase/tests/` proving that existing rows survive, captain inserts still work without the new columns, and the checks reject bad values.
- Update `src/types/app-database.ts` and the food types to match.

## 2. Source data
- Use the USDA FoodData Central **SR Legacy** dataset, plus **Foundation Foods** where it is better. Both are public domain (CC0).
- Download the CSV bulk files from https://fdc.nal.usda.gov/download-datasets into a temp folder **outside the repo**. Never commit the raw dataset.
- Write a small reproducible script, `scripts/food-data/build-foods.ts`. It reads the CSVs from a path given as an argument and writes the repo JSON. Commit the script and the generated JSON only.
- Nutrient ids: energy kcal 1008 (or 2047/2048 for Foundation), protein 1003, carbs 1005, fat 1004, fiber 1079, total sugars 2000 (or 1063), sodium 1093.

## 3. Foods to add (about 240 new; final count can be ±20)
- **Basics (about 120).** Meats and cuts, poultry parts, common Egyptian fish (bolti, bouri, mackerel, shrimp, calamari), eggs, dairy (including Domty-style white cheese as the closest USDA feta or queso blanco proxy, marked `proxy`), grains, breads, legumes, nuts and seeds, oils, fruits and vegetables common in Egypt and the Gulf, supplements (whey and casein, from USDA where present), and sauces.
  - Prefer cooked entries for meats, grains and legumes, and say so in `state`.
- **Egyptian dishes (about 70).** Fatta, mahshi (cabbage, vine leaves, peppers), hawawshi, bamia, macarona bechamel, roz meammar, mesa'a'a, kofta, shish tawook, liver Alexandrian style, sausage, feteer meshaltet, basbousa, konafa, roz bel laban, om ali, molokhia with chicken, besarah, fool variants, egg dishes, and others.
- **Arab dishes (about 50).** Gulf: kabsa, mandi, machboos, harees, jareesh, saleeg, madfoon, luqaimat. Levant: shawarma (chicken and beef), hummus, tabbouleh, fattoush, kibbeh, maqluba, musakhan, mujaddara, falafel wrap, manakish. North Africa: couscous, tagine (chicken and lamb), harira, pastilla, chakchouka.
- **Every dish is a `recipe`.** It lists ingredients with grams and a cooked yield, based on a typical home recipe. Its per-100 g values are computed by the script from the USDA values of its ingredients. No dish value is typed by hand.
- **Proxies.** When a single food has no USDA match, use the closest USDA food as a `proxy`, with a short Arabic and English note saying what it stands for.

## 4. Repo data
- Extend `supabase/seed/source/foods-starter.json` and `food-references.json` in their current shape, and add the new fields: `region`, `state`, fiber, sugar, sodium, `source_kind` and `source_ref`.
- Also backfill fiber, sugar, sodium, region and state for the existing 60 foods from their current FDC ids. Do not change their kcal or macros unless the FDC row says otherwise, and list any change in the report.
- Names: Arabic in Egyptian everyday wording, plus English. Use the existing style; do not invent brand names.
- `units`: household units like the current ones (piece, loaf, cup, tablespoon, plate), with grams.
- `photo_file`: follow the planned name pattern `food_<slug>-v1.webp`. The photos come in a later card; the app must handle a missing photo (it already does for captain foods).
- Update `scripts/seed/run.ts` only if the new fields need mapping. The seed must stay idempotent through the existing seed key.

## 5. Owner review file
Write `docs/reports/food-library-review.md`: one table per region with Arabic name, English name, kcal, protein, carbs and fat per 100 g, source (FDC id, or recipe ingredients with grams), and state. The owner reviews this before anything goes live.

## Tests (`src/features/meal-plans/food-data.test.ts`, plus the migration test)
- Every global food has `source_kind` and a non-empty `source_ref`.
- Every recipe recomputes to its stored per-100 g values within 0.1.
- The Atwater check (4·P + 4·C + 9·F) is within 15% of kcal for every food, or the food is listed in an explicit, commented exception list (alcohol sugars, fiber-heavy foods).
- No duplicate Arabic or English names, every region value is valid, and every unit has grams > 0.
- The existing seed and starter-template tests still pass.

## Out of scope
UI changes (T-316) and photos (later card). Never connect to the hosted Supabase or apply the migration.

## Gates
npm run typecheck, npm run lint, and the vitest files above plus `supabase/tests`. The orchestrator runs build and check.
