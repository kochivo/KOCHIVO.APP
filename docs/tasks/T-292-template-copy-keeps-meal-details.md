# T-292: nutrition template copy keeps day type, meal time and unit (audit DB-02 / BL-02)

## Problem
Three functions copy nutrition plans:
- save as template: last defined in `supabase/migrations/0022_templates.sql:60` or later;
- assign a template to a player: `0028_template_not_empty.sql:73` or later;
- copy a template: `0036_locked_starter_templates.sql:134` or later.

Find each one's FINAL definition. Then trace the callers from `src/features/templates/data/templates.ts:100,115,133`.

All three still insert `meals (plan_id, position, name)` and `meal_items (meal_id, food_id, grams, position)`. They drop:
- `meals.day_type` (0092);
- `meals.time_of_day` (0110);
- `meal_items.unit` (0110).

Also check for any other column added later that is also dropped, such as meal notes, item alternatives (`meal_item_alternatives`) or plan targets. If you find one, keep it too.

A PGlite probe showed a training-only 13:00 meal with unit `loaf` coming back as `all` / null / null.

## Files
- New migration `supabase/migrations/0114_template_copy_full.sql`. Additive: `create or replace` of the three functions, with the same signatures, security, search_path, grants and lock checks as their final definitions. Change only the copied column lists.
- New test `supabase/tests/template-copy-full.test.ts`. It must fail before 0114 and pass after. Cover save-as-template, copy and assign, each round-tripping `day_type`, `time_of_day`, `unit`, and alternatives if the final functions copy them.

## Out of scope
Old migrations, app code (unless a caller must pass something new; it should not), other findings. Never apply anything to a hosted database.

## Gates
`npx vitest run supabase/tests/template-copy-full.test.ts` plus the existing template tests in supabase/tests. Then `npm run typecheck`, `npm run lint`.
