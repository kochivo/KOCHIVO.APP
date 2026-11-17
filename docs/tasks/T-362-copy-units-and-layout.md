# T-362 — Templates, meal plans, settings, forms and player view: copy, units and layout

**Migration:** none. No data deletes.

**Source:** the owner's logged-in screen review on 2026-11-17 (`docs/tasks/SCREEN-REVIEW-2026-11-17.md`: L-8, C-1, the rest of C-2, C-3, C-4, C-5, D-3, D-5, and D-6). On 2026-11-17 the owner asked for every item to be fixed.

## Items
### L-8. Leftover «قالب جديد» templates
- The program library and the meal-plan library each hold a template named «قالب جديد» (a program with 1 day, and a 2000 kcal plan).
- It looks like auto-save creates a row as soon as a captain opens "new template" and leaves.
- Find where the new template row is created:
  - Create it only on the first real edit (a name, a day, an exercise, or a food).
  - Or, if creation must stay eager, keep an untouched new template out of the library list.
- Never delete existing rows. If you add a filter, it must only hide templates that are still exactly the untouched default.

### C-1. Grams look like money
- Meal plans write grams as «150ج». In Egypt «ج» reads as **جنيه**.
- Use «جم» for grams everywhere in meal plans and the player's food views (ar and arStd). English stays «g».

### C-2 (rest). Number grammar
- Fix the following:
  - «1 أيام» → «يوم واحد»;
  - «0 لاعبين عليه» → «مفيش لاعبين عليه»;
  - «12 مجموعات» → «12 مجموعة».
- These appear in templates, programs and the player view. Use or extend the existing Arabic plural helper; search `src/lib` and `src/core/i18n` first.

### C-3. The player-view banner is cut off
- In the captain's «شوف زي اللاعب» preview, the banner reads «ده عرض بس. أي تعديل من البرنامج أو النظام», which stops mid-sentence.
- Finish the sentence in ar, arStd and en. For example: «ده عرض بس. أي تعديل في البرنامج أو النظام بيظهر هنا على طول».

### C-4. Set order in the player file
- Sets are shown as «2.5 × 8 كجم», which reads as 2.5 reps of 8 kg.
- Show the weight with its unit first, then the reps: «2.5 كجم × 8». Do this everywhere this formatter is used, and update the tests.

### C-5. An English form title
- One assessment is titled «Weekly assessment» in the Arabic app.
- Check whether a built-in template seeds English titles for Arabic captains. If it does, seed the title in the captain's language.
- Do not rename existing rows.

### D-3. Settings duplicates
- «اللغة والوقت» and «اللغة والتوقيت» are two cards showing the same thing. Merge them into one card.
- «أسعار الأكل» is a lone card with only a button. Place it with the related nutrition or budget settings, or give it a one-line description so it does not look empty.

### D-5. Player «النهارده» at 390px
- In the week strip, «الخميس» breaks into «الخمي / س». Use the short day names, or prevent the break, so every day fits on one line at 360–390px.
- «اليوم التالت» shows twice: remove the duplicate heading.
- Exercise media leaves a large empty block while it loads. Use a fixed-ratio placeholder, or collapse it when there is no media.

### D-6. Cryptic week letters
- The programs list shows the week as «س ح ن ث ر خ ج», which is hard to read.
- Use short day names, or show the training-days count instead.

## Out of scope
- Captain nav and shell (T-358).
- Roster and leaderboard (T-359).
- Billing, money-owed, and the player's captain screen (T-360).
- Home and inbox (T-361).

## Done when
- No new empty templates appear in the libraries.
- Units and grammar are fixed.
- The banner reads as a full sentence.
- Sets read weight × reps.
- Settings has no duplicate cards.
- The player view fits at 390px.
- Tests are updated or added for formatters, plural rules, and template creation.
- `npm run check` and `npm run build` pass.
