# T-387: Captain phone library (programs, builder, exercises, meal plans)

**Migration:** none. Mockups: `c5-11-programs`, `c5-12-builder`, `c5-13-exercises`, `c5-14-meal-plans`.

## Files
- programs list and program builder components, the exercise library, `src/features/meal-plans/components/` (phone only; T-378/T-381 desktop stays), messages, tests.

## What to build
1. **Programs:** tabs برامجي / من KOCHIVO with counts; cards with name, days, exercise count, players count.
2. **Builder day:** program name, «اليوم x من y · name», day chips with «+ يوم», exercise rows with drag handle, sets, reps, rest; «ضيف تمرين»; sticky lime «احفظ وابعت للاعبين ({n})». Existing save and reorder logic stays.
3. **Exercises:** count, search (Arabic or English), muscle chips, rows with GIF thumb, name, muscle and equipment.
4. **Meal plans:** cards with name, calories, players, macro grams and a split bar.

## Rules for every captain-phone card
- **Phone only.** Apply the new look below the `md` breakpoint (`max-md:` / the existing phone checks). The desktop at `md` and up must render exactly as today. Owner decision 2026-11-18: «سيب شكل الديسكتوب زي ما هو، هنعدل على شكل الفون بس».
- Only the v6 workspace (`NEXT_PUBLIC_CAPTAIN_WORKSPACE=1`). Flag-off markup and its hash tests stay unchanged.
- Keep every action and data that works today; this is a new look, not fewer features. Do not change queries, writes, ids or RLS. No migrations, no dependencies.
- Strings in ar, arStd (const outside `defineMessages` + `get arStd()` behind `NEXT_PUBLIC_INTERNATIONAL`) and en. Tokens only, logical properties, targets ≥ 48px, files ≤ 250 lines, every `<dialog>` has the `sheet` class, `localDate(x, timezone)` always gets a timezone.
- Match the mockups in `docs/mockups/captain-phone/` (open the .dc.html files at 390px; `00-all.png` is the overview) 1:1 at 360px and 390px.

## Done when
- Tests cover what is listed above, and a test proves the desktop markup did not change (class or structure check under md).
- `npm run check` passes.
