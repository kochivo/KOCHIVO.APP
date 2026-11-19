# T-405: KO meal photo, "eat it, how much, or skip it"

Owner approved the mockup on 2026-11-19: `docs/mockups/ko/meal-photo/meal-photo.png`. The HTML is `docs/mockups/ko/meal-photo/index.html`. It has 3 panels:
1. A portion verdict.
2. A small-part verdict.
3. One question when the photo is unclear.

**T-403 and T-406 have landed.** Reuse the T-403 `KoActionCard`, the `actions` wire field, and the T-406 `quick` field and quick buttons (do not add them again). A meal photo counts as a photo in the T-406 daily cap.

## The look must not change (hard rule)
- The KO panel, bubbles, composer and colors stay as they are.
- The only new UI is the **meal verdict card**, built from existing classes exactly as in the mockup:
  - Card: `space-y-inline rounded-control border border-line p-stack` (same as `KoActionCard`).
  - Verdict line: `text-sm font-bold`, for example «كُل منها بالكميات دي».
  - One row per food: the name in `font-bold`, the amount in `text-muted`, and the kcal at the row end in `tabular-nums text-muted`. Use `flex items-center justify-between gap-inline`.
  - Day line in `text-xs text-muted`: «يومك بعد الأكلة دي: {after} من {target} سعرة.»
  - Fixed note in `text-xs text-muted`: «الأرقام تقريبية: الأكل من الصورة، والسعرات من كتالوج الأكل. مش نصيحة طبية.»
  - Buttons use the same control classes as `KoActionCard`:
    - Panels 1 and 2: «سجّلها في أكلي» (primary).
    - Panel 1: «عدّل الكميات».
    - Panel 2: «مش هاكلها».
- Source chips («خطة الكابتن», «أكل النهارده») come from T-404. Leave them out if T-404 has not landed.
- Quick-answer buttons for the question in panel 3 are secondary controls, `min-h-12`.
- No dashed outlines. Those exist only in the mockup.

## Read first
- `AGENTS.md`, `DESIGN.md`, and T-403 as landed.
- `src/features/ko-account/data/intents.ts`, `execute.ts`, `route.ts`, `approval.ts`, `messages.ts`.
- `src/features/ai-tools/data/player-nutrition.ts`: `playerNutritionPlan`, `playerMealLogs`, `nutritionDay`, `foodPortion`.
- `src/features/ai-tools/tools/log-my-meal.ts` and the `ai_log_meal` RPC (migration 0156).
- `src/features/meal-plans/data/foods.ts`: the `foods` table has `kcal/protein/carbs/fat_per_100g` and `units` (household units with grams).

## Safety rules (owner decisions, must hold)
1. **The model identifies foods and household amounts only. It never gives numbers.**
   - Calories and macros are computed in our code: `foods` catalog per-100 g values × grams.
   - Never take kcal from Gemini output.
2. Amounts are in **household units**: معالق كبيرة, طبق, قطعة, نص/ربع قطعة, حبة. Never cups (owner decision 2026-11-19). Grams are used only internally.
3. When a food, its cooking method (fried or grilled), or its amount is unclear, KO asks **one** question with up to 3 quick answers. It never guesses.
4. A food that is not in the catalog makes the whole photo get the question «مش لاقي {food} عندي، قولي هو إيه؟». No partial math with a missing item.
5. The player can edit amounts before logging. Nothing is logged without a tap.
6. Every verdict card shows the "تقريبي، مش نصيحة طبية" note.
7. **Feature flag `KO_MEAL_ESTIMATE`**, server env, default off.
   - Off: the current `meal_photo` reply stays exactly as today.
   - On: the new flow runs.
   - The owner turns it on after the accuracy gate: about 50 weighed Egyptian meals, mean error within ±20%.
   - Add the key, empty, to `.env.example` only.

## What to build

### 1. Intent (`intents.ts`)
- Extend the `meal_photo` schema. Keep the old fields valid:
  ```ts
  { meal?: title, foods: [{ name, amount: number (0.25..20), unit: enum['spoon','plate','piece','half','quarter','unit'], cooking?: enum['fried','grilled','boiled','baked','raw'] }] (1..8),
    unsure?: { question: string ≤ 120, answers: string[] (2..3, each ≤ 20) } }
  ```
- New description:
  > Identify visible foods and estimate each portion in household units (spoons, plates, pieces). Never output calories, grams or advice. If a food, its cooking method or its amount is unclear, fill `unsure` with one short question and 2-3 short answers instead of guessing.

### 2. Math (new `data/meal-estimate.ts`, pure, unit-tested)
- **`matchFoods(items, catalog)`**:
  - Match each name to one `foods` row with the existing name matching (`normalizeName` / `matchNamed`).
  - Prefer a row whose name contains the cooking word (مقلي/مشوي) when `cooking` is set.
  - Return `{ matched, missing }`.
- **`gramsFor(item, food)`**:
  - Use the food's `units` entry for `unit` when present.
  - Otherwise use one fixed table in this file: spoon 15 g, plate 250 g, piece = the food's `piece` unit or 100 g, half/quarter of a piece, unit = the food's first unit.
  - Clamp to 5..1500 g.
- **`verdict({ items, remaining, target })`**:
  - `full` when meal kcal ≤ remaining kcal: «كُل منها بالكميات دي».
  - `part` when remaining ≥ 25% of meal kcal. Scale every item down to the largest of 3/4, 1/2 or 1/4 that fits, rounded to household units. Line: «لو عايزها، خد {fraction} بس».
  - `skip` when remaining < 25% of meal kcal or below 80 kcal: «الأكلة دي أكتر من اللي فاضلك النهارده. الأحسن تسيبها أو تسأل الكابتن.»
  - Return the scaled items, meal kcal, and `after = target − remaining + meal kcal`.
- Remaining and target come from `nutritionDay(plan, logs, today, rest)` in `ai-tools`. Export what you need through `@/features/ai-tools/server`, with no deep imports.
- No active plan → reply with the existing `noMeal`-style message («مفيش خطة أكل نشطة، اسأل الكابتن.»). No verdict.

### 3. Execution (`execute.ts` / new `data/meal-photo.ts` to stay under 250 lines)
- Flag off → the current behavior, unchanged.
- `unsure` present → reply text = the question, plus `quick: answers` (see wire). Tapping an answer sends it as a normal text message. The route's "last KO question" grounding already carries the context. On the next turn the player sends a text answer with no photo. Keep the last photo analysis in the existing KO history: put the parsed items as JSON in a hidden `history` field, never in the visible text, so the follow-up can finish the math without a new photo.
- Otherwise → KO bubble «شايف {foods}. فاضلك النهارده {kcal} سعرة و{protein} جم بروتين من خطة الكابتن.» plus one `meal` card.
- Meal points (`award_meal_check`) keep working as today when a photo is analysed.

### 4. Logging
- «سجّلها في أكلي» confirms a signed approval of the new kind `meal_estimate`.
  - Payload: `{ mealId, items: [{ foodId, grams }] }`.
  - Player only. Expires in 10 minutes, like the others.
- On confirm, the server recomputes the macros from the catalog (never trusts the client). It then calls `ai_log_meal` with:
  - `p_meal_id` = the plan meal the photo replaces;
  - `p_eaten = true`;
  - `p_eaten_macros` = the recomputed sum.
  - **No migration.**
- Which plan meal it replaces:
  - the meal the player named;
  - otherwise the next plan meal today that is not logged yet;
  - when none is left, the last meal of the day.
  - Show it in the card title: «هتتسجّل بدل {meal}».
- «عدّل الكميات» turns each row into a stepper for the household amount: − and + buttons, `min-h-12`, with a translated `aria-label`. The kcal and day line update live from the same pure functions on the client. Confirming then sends the edited amounts. The server re-signs by issuing a fresh token from the route: `confirm=1`, `token`, and `amounts` JSON, validated against the token's items. Only amounts may change, within 0.25..20.
- «مش هاكلها» just closes the card with «تمام، متسجلتش.». Nothing is written.
- Done state: «اتسجّلت بدل {meal}.», the same as the T-403 done state.

### 5. Wire
- `message` gains an optional `meal` object: `{ verdict, line, items: [{ name, amount, unit, kcal }], after, target, mealName, token }`.
- `message` also gains an optional `quick: string[]` (max 3).
- Validate both with zod in `ko-core/wire.ts`. `playerReply` passes them through.

### 6. Same verdict without a photo (owner report 2026-11-19)
- Today, «طب أنا برا وهاكل الوجبة دي» and «آكل قد إيه من دي» get a dead end: «الوجبات اللي بره مش في خطتك فمش هقدر أحسب».
- With the flag on, a **text** that describes a meal goes through the same flow:
  - Examples: «هاكل طبق كشري برا», «عزومة فيها فراخ ورز آكل قد إيه».
  - Add a player intent `meal_estimate`, which has the same `foods` and `unsure` schema as the new `meal_photo`. Its description: "Player describes a meal they are about to eat (not in their plan) and asks whether or how much to eat."
  - It produces the same verdict card.
- A follow-up like «آكل قد إيه من دي» right after a photo reuses the last analysis kept in history. It does not ask for the photo again.
- Without the flag, keep today's text but make it helpful: «ابعتلي صورة الأكلة أو اكتبلي فيها إيه، وأقولك تاكل قد إيه.» Do not offer a plan swap.

### 7. Smaller photos
- Resize the photo on the device to at most 1024 px on the long side, as JPEG at quality 0.8, before upload. Use canvas, with no new dependency.
- This halves the cost of a photo.

## Messages
- All strings go in `ko-account/messages.ts` and `ko-preview/messages.ts`, with `ar`, `arStd` and `en`.
- Use Latin digits only.
- Unit labels in Arabic: معلقة كبيرة/معالق كبيرة, طبق, قطعة, نص قطعة, ربع قطعة, حبة. English: tbsp, plate, piece, half, quarter, item.

## Out of scope
- Database migrations. `ai_log_meal` covers logging.
- The accuracy gate run itself, which is the owner's call.
- MCP tools.
- Natural replies (T-404).
- The captain side.
- No new dependency. No `.env*` changes except `.env.example`.

## Tests (deterministic)
- `meal-estimate.test.ts`:
  - grams from food units and from the fallback table, plus clamping;
  - full, part (3/4, 1/2, 1/4) and skip verdicts;
  - `after` math;
  - a missing catalog food gives the question;
  - the cooking word picks the fried or grilled row.
- `intents`: the new schema is accepted; old `foods: string[]` calls still parse (flag off path); kcal fields from the model are rejected (strict object).
- Execute:
  - flag off → old text;
  - `unsure` → question plus quick answers;
  - no plan → message;
  - a full verdict returns a card with a valid `meal_estimate` token.
- Confirm:
  - recomputes macros server-side and calls `ai_log_meal` with the right meal id;
  - tampered amounts out of range → expired/invalid text;
  - a captain token or another player's token is refused.
- UI:
  - the card renders rows, the day line and the note;
  - edit mode steppers change kcal;
  - «مش هاكلها» writes nothing;
  - 48px targets.

## Rules
AGENTS.md:
- max 250 lines per file;
- one component per file;
- no `any`;
- `import type`;
- strings in messages;
- logical CSS only;
- `min-h-12`;
- no `Math.random`;
- dates via `localDate`.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ko-account src/features/ko-core src/features/ko-preview src/features/ai-tools`
- `npx vitest run src/features/ko-account src/features/ko-core src/features/ko-preview src/features/ai-tools`

Report in the AGENTS.md final format, with a one-line description of every visible change.
