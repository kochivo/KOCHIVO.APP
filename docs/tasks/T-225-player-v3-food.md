# T-225: Player v3 food screen

**Phase:** Player v3 redesign · **Depends on:** T-222 · **Status:** ready

## Goal
Match `docs/mockups/player-v3/05-food.html` exactly on `/player/nutrition` (v6 branch). Read `docs/mockups/player-v3/README.md` first. Meal logging keeps going through `saveAndQueue()`.

## Files
- `src/features/nutrition/components/*` (nutrition-screen, macro-tiles, macro-ring, meal-card, day-type, plus new files if needed).
- `src/features/nutrition/v6-messages.ts`, `v6-messages-standard.ts`.
- The water control: reuse `readiness` water data through that feature's public entry; no deep import.
- Tests in `src/features/nutrition/`.
- This card.

## Layout, top to bottom
1. **Title** «أكلك النهارده».
2. **Calories card.**
   - The big number of calories left (44px), with «سعرة فاضلة من <target>».
   - Three bars (بروتين `lime`, كارب `ink`, دهون `sore`), each with «eaten/target» in grams. All from the existing nutrition snapshot.
   - If eaten passes the target, the number reads «زيادة <n>» in `warn`, and the bar is full.
3. **Meals list.** One row per meal of the day:
   - a 48px round check: filled lime with a check when logged, or an outline button `aria-label="كلت <meal>"`;
   - the meal name and its items in one line.
   - The next un-logged meal has a lime border and «· دلوقتي».
   - Tapping the check logs the meal, using the existing log action.
   - Keep the existing meal details (swap, photo, amounts) behind tapping the row; list that in Notes.
4. **Water row.** «الميه <done> / <goal> كوبايات» and a `water`-tinted 48px «+» that adds 250 ml through the existing water save.
5. **Two outline buttons**, «صوّر أكلتك» and «اكتب اللي كلته».
   - Neither has a backend for the player yet: the photo is KO, and extra-food logging is still waiting on an owner decision.
   - Render both disabled with a small «قريباً» badge. Do not wire them to anything.

## Rest day
Inside `data-mood='rest'` the same screen turns blue through the tokens. The rest-day calorie target comes from the existing day-type logic.

## Acceptance
- [ ] Tests:
  - calories left and over-target display;
  - the next meal gets the «دلوقتي» mark;
  - the check logs through the existing path;
  - water adds 250 ml;
  - the two «قريباً» buttons are disabled;
  - there is exactly one filled lime element per state (the logged checks are status, not actions; the reviewer accepts them).
- [ ] At 390×844 it matches `05-food.html`.
- [ ] `npm run check` and `npm run build` pass, within the perf budget.

## Out of scope
KO photo logging, free-text food logging, the captain meal-plan editor, and migrations.
