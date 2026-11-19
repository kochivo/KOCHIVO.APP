# T-413: Nutrition numbers match on every screen and in KO

**Depends on:** none · **Status:** ready · **Source:** full audit 2026-11-19

## Goal
A player and a captain see the same calories and macros for the same day. Training-day and rest-day targets are honored. Food already logged never disappears from the totals.

## Problems (all confirmed in code)
1. **Training and rest targets are not applied for the player.**
   - The captain editor shows split targets: `player-editor.tsx:77` uses `dayTargets(draft.targets, trainingDays, day)`. Example: base 2,000 kcal becomes 2,160 on training days and 1,880 on rest days.
   - The player Food screen uses `targetsOf(visible)` (`nutrition-screen.tsx:67`, `macros.ts:28`), so it shows the base 2,000 on both day types.
2. **Logged food disappears when the active plan changes.**
   - `eatenTotals` in `nutrition/macros.ts:21` only loops over meals of the current plan.
   - A completed log from the previous plan, or one whose meal was deleted (`meal_id` null), is skipped, so the total drops to 0.
3. **Home counts both menus on a split day.**
   - `player-home/day-nutrition.ts:16` and `components/nutrition-slot.tsx:40` use the unfiltered meal list, so a rest day shows «1 من 2» when it should be «1 من 1».
   - `home-tiles.tsx:46` can suggest a training-only meal on a rest day.
4. **An eaten meal card disagrees with the summary after a portion edit.** `meal-card.tsx:35/101` recomputes from the current plan. The summary uses the saved `eaten_macros`.
5. **KO ignores the day type and the captain's «راحة النهارده» decision.**
   - `ai-tools/data/player-workout.ts:24` and `ko-account/data/log-meal.ts:15` do not read the date-scoped readiness decision that `player-home/components/home-screen.tsx:79` and `nutrition/components/day-type.tsx:25` use.
   - `ko-account/data/meal.ts:4` lists portions across all meals with no day-type filter, so a training «Lunch» and a rest «Lunch» both appear. The same reader feeds `execute.ts:73` and `facts.ts` (`nutritionFacts`).

## Requirements
1. **One shared, pure function decides the day for a player and a date:** training or rest, and therefore which meals show and which targets apply. It honors the captain's readiness decision first, then the program schedule.
   - Food, Home (today and past calendar days), the Home next-meal tile, and KO (workout answer, meal matching, portions, facts) all use it.
   - Reuse `nutrition/day-type-filter.ts` and `dayTargets`. Do not write a second copy.
2. **Player targets equal what the captain saw in the editor for that day type.**
   - Use the same `dayTargets` inputs as the editor, from the same source for the training-day count.
   - Plans with no split keep the base targets.
   - **No migration.** If you find that one is truly required, stop and explain why in the report instead.
3. **Eaten totals sum the completed logs for the date** using their saved `eaten_macros`. Fall back to the meal lookup only for old logs without a snapshot. This holds when the plan changed or the meal was deleted.
4. **A checked (eaten) meal card shows the logged amount** from the snapshot.
5. **KO** (`read_nutrition`, `log_meal`, `my_workout`, facts) uses the same day decision. On a captain rest decision, KO says it is a rest day and offers only rest-day meals.

## Out of scope
- UI restyling.
- Ramadan screens beyond keeping them working.
- Meal-photo estimate (T-405).
- Migrations.

## Tests (deterministic, inject `now`)
- Split targets: base 2,000/150/225/56 with 3 training days give the same numbers on the player and in the editor helper.
- A completed 500 kcal log from an old plan still counts after a plan switch. So does a log whose meal was deleted.
- Home past-day count on a rest day is 1 of 1. The next-meal tile never picks a training-only meal on a rest day.
- An eaten card after a portion edit shows the snapshot kcal.
- KO with a captain rest decision: the workout answer says rest day, and meal matching and portions only use rest meals.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/nutrition src/features/player-home src/features/meal-plans src/features/ko-account src/features/ai-tools`
- `npx vitest run src/features/nutrition src/features/player-home src/features/meal-plans src/features/ko-account src/features/ai-tools src/core/i18n/coverage.test.ts`
