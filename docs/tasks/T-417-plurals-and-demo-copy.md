# T-417: Correct Arabic and English plurals everywhere, and fix the demo copy

**Depends on:** T-415 landed (it touches billing files) · **Status:** ready · **Source:** full audit 2026-11-19

## Problems
1. **Count strings use one fixed form.** About 38 strings in `src/features/**/messages.ts` read like «{n} لاعبين», «{n} أيام» or «Ends in {n} days». Users see «1 لاعبين», «خلص من 1 أيام», «متأخر 11 أيام», «Ends in 1 days» and «العرض بيخلص بعد 1 أيام».
   - The translator already supports plural keys: `src/core/i18n/messages.ts:33` selects `key.<category>` with `Intl.PluralRules`, falling back to `key.other`.
2. **The demo meal plan total says 2,450** while its meals add up to 2,250 (`demo/guided/meals.tsx:12`, `phone-food.tsx:10`).
3. **The demo guide tells visitors to press «تمت المجموعة»**, but the control is a check-mark icon named «إنهاء المجموعة» (`demo/guided/messages.ts:13`, `demo/guided/workout.tsx:67`, `workout/components/set-rows-view.tsx:77`).

## Requirements
1. Find every message with a count placeholder followed by a counted noun, in `ar`, `arStd` and `en`. Search with patterns like `\{n\} (أيام|يوم|لاعب|لاعبين|تمارين|تمرين|وجبات|وجبة|مجموعات|حصص|حصة|أسابيع|شهور|days|players|sessions|meals|workouts|weeks|months)` and similar placeholders (`{days}`, `{count}`).
   - Convert each one to plural keys so the right form shows.
   - **Arabic (`ar` and `arStd`):** `zero`, `one`, `two`, `few`, `many`, `other` as needed. Natural forms: «لاعب واحد», «لاعبين» (2), «3 لاعبين», «11 لاعب»; «يوم واحد», «يومين», «3 أيام», «11 يوم» (`ar`) or «11 يومًا» (`arStd`).
   - **English:** `one` / `other`.
   - Make sure the caller passes the raw number as the count the translator uses. Check how existing plural keys are called before changing callers.
2. **Relative days:** where the text is about a date relative to today, 0 → «النهارده» / «اليوم» / «today» and 1 → «بكرة» / «غدًا» / «tomorrow», or «امبارح» / «أمس» / «yesterday» for elapsed time. Several files already have `today` / `tomorrow` keys; use them consistently, including `billing/phone/messages.ts:22` and `billing/offers/offer-preview.tsx:27`.
3. **Demo:** derive the plan total from the same meal values (2,250), or label it clearly as a target. Make the guide say to tap the check mark beside the set, and use the same name as the control's `aria-label`.
4. `src/core/i18n/coverage.test.ts` stays green. Egyptian `ar` stays the default and the fallback. Follow `docs/I18N-STYLE.md`.

## Out of scope
- Any other copy rewrite.
- Layout.

## Tests
- Unit tests for a sample of converted keys in all three styles: 1, 2, 3, 11 and 100. For example, money-owed total, expired days, overdue days, and offer end.
- The demo total equals the sum of its meals.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features src/core/i18n`
- `npx vitest run src/core/i18n src/features/billing src/features/captain-workspace src/features/demo`
- Then the full `npx vitest run`, because many message files change.
