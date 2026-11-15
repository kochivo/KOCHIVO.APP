# T-304: captain sets the player's daily water target

## Problem
The player's water goal comes only from body weight: `waterGoalMl(weightKg)` in `src/features/readiness` (`water.ts`), used by `player-home/components/home-tiles.tsx`, `nutrition/components/food-water.tsx` and `readiness/components/daily-panel.tsx`. The owner wants the captain to set how much water the player drinks each day, as part of the plan.

## Do
1. **Migration `supabase/migrations/0118_nutrition_water_target.sql`.** Additive only.
   - Add `nutrition_plans.water_target_ml integer null` with `check (water_target_ml between 500 and 10000)`. Null means "use the weight formula".
   - Captains already write their own plans through existing RLS/grants. If column-level grants exist for `nutrition_plans` updates, grant the new column the same way; check the migrations.
   - Keep the template copy complete. Recreate the 3 copy functions from `0114_template_copy_full.sql` (`nutrition_plan_to_template`, `assign_nutrition_template`, `copy_template` nutrition branch) so they also copy `water_target_ml`.
     - Start from the 0114 text. Change only the inserted columns. Keep the same security, search_path and grants.
2. **Captain nutrition editor** (`src/features/meal-plans/components/editor/...`, near the plan macros: kcal, protein, carbs, fat).
   - Add a "water a day" control in litres, with 0.25 L steps from 0.5 to 10 L. Stored as ml.
   - Empty means automatic. Show the automatic value as a hint («تلقائي حسب الوزن: 2.8 لتر») when the player's weight is known.
   - Save it the same way the macro targets are saved (autosave and draft).
   - Templates show and keep it too.
3. **Player side.** Where the active nutrition plan reaches the player (the snapshot or local db used by home and nutrition), carry `water_target_ml`.
   - The goal becomes `plan.water_target_ml ?? waterGoalMl(weight)` everywhere the goal is computed today: home tile, food-water, daily panel.
   - Put this in one pure helper, `playerWaterGoalMl(planTarget, weightKg)`, and use it in all three places.
   - If the offline cache needs a new field, add it the way other plan fields were added. Check the Dexie schema versioning rules in `src/core/offline`.
4. **Messages** in ar, arStd and en. No emoji.

## Tests
- PGlite, new `supabase/tests/nutrition-water-target.test.ts`:
  - the check constraint;
  - a captain can set it on their plan, another captain cannot;
  - a player cannot write it;
  - the 3 copy functions keep it, including null.
- The pure helper: the captain value wins; null falls back to weight; no weight falls back to the existing default.
- Editor: the control renders, and step and limits clamp.
- Player home and food-water use the plan target when set.

## Out of scope
- Other nutrition changes.
- Old migrations. 0114 stays as is; 0118 redefines the functions on top of it.
- Never apply anything to a hosted database.

## Gates
1. The new test.
2. `npx vitest run supabase/tests src/features/meal-plans src/features/nutrition src/features/player-home src/features/readiness src/core/offline`
3. `npm run typecheck`
4. `npm run lint`
