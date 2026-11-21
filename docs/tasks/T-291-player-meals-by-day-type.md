# T-291: the player sees only today's meals (training day or rest day), with time and unit (audit BL-01)

## Problem (live: 1 active plan affected today)
The captain's meal editor sets each meal's `day_type` to `all`, `training` or `rest`. Migration 0110 also added `meals.time_of_day` and `meal_items.unit`. The player side ignores all three:

- `src/features/nutrition/data/nutrition-snapshot.ts:46`: the select has `meals(id,position,name,meal_items(id,position,grams,...))`, with no `day_type`, `time_of_day` or `unit`.
- `mapNutritionSnapshot` (line 33) drops them.
- `nutrition-screen.tsx:45` renders every meal.
- `components/day-type.tsx` already knows whether today is a rest day, through `onRestChange`, but only changes a label.

So on any day the player sees, and can log, both the training-day and the rest-day menu, and the macro totals add both.

## Files
- `src/features/nutrition/data/nutrition-snapshot.ts`: select and map `day_type`, `time_of_day` and item `unit`.
- The `NutritionSnapshot` type in `@/core/offline` (or wherever it is defined): add optional fields. Old cached snapshots without them must still work and be treated as `all`, null and null. If the Dexie schema needs a version bump for indexes, don't add one; these are plain fields.
- `src/features/nutrition/components/nutrition-screen.tsx` and `meal-card.tsx`:
  - filter meals by the day type that `DayType` already reports;
  - show the meal time;
  - show the item unit the way the captain side shows it. Reuse the existing unit formatter from meal-plans if it is exported through a public entry. Otherwise add a tiny pure helper inside nutrition.
- The macro totals and the meal-log choices on the screen use the filtered list. `server-macros.ts`: if it sums the plan for the player, apply the same filter given the day type, or note why not.
- Strings in the nutrition `messages` files (ar, arStd, en) if you add any.
- Tests: `src/features/nutrition/day-type-filter.test.ts`. Pure tests for the filter and for mapping old snapshots, plus a component or model test showing that a rest day hides training-only meals and that totals change.

## Rules
- Until `DayType` has decided (loading), show `all` meals only, plus nothing day-specific. This avoids a flash of the wrong menu.
- If there is no program, so the day type is unknown, show `all` meals plus the training-day meals. That is today's behaviour for a training day. Document the choice.
- Meals already logged today stay visible even if they belong to the other day type, so history is not hidden.
- Tokens only, logical properties, T-278 spacing scale, no new one-off sizes. AGENTS.md UI rules.
- If the hosted database does not have 0110 yet, the select must not break. It does have it, but keep a fallback: on error 42703, retry without the new columns.

## Out of scope
Migrations. Template copy functions (separate card). Captain screens.

## Gates
`npx vitest run src/features/nutrition`, then `npm run typecheck`, `npm run lint`.
