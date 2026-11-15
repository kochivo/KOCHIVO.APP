# T-312: Food within the player's budget

The owner approved the mockup on 2026-11-15: `docs/mockups/edge/edge-features-v1.html`, section `#budget` (screenshot `edge-budget.jpg`). Match its three screens.

## Owner decisions
- **The player enters a monthly food budget** in EGP, in the intake and later in settings. It is optional.
- **The daily budget** = monthly ÷ days in the current month (in the player's timezone).
- **We (the platform) set food prices** and update them monthly. A captain can override a price for their own team.
- **If the budget cannot reach the protein target**, the captain is warned.

## What exists today
- **`foods`** (0007): `owner_id` (null = global), `name_ar`, `name_en`, `kcal/protein/carbs/fat_per_100g`, `photo_path`, `source`. There is no price anywhere. Seeds are in `supabase/seed/source/foods-starter.json`, loaded by `scripts/seed/`.
- **Meal plans:** `nutrition_plans`, `meals`, `meal_items`, and `meal_item_alternatives` (0007).
  - Captain side: `src/features/meal-plans`, with the calculator in `components/calculator-view.tsx`, `energy.ts` and `macro-check.ts`.
  - Player side: `src/features/nutrition`.
- **There is no meal-plan generator.** Use the rule-based `src/features/program-generator/generate.ts` as the model for structure and tests.
- **Intake:**
  - Table `player_intake` (0012).
  - Wizard: `src/features/onboarding/components/intake-wizard.tsx`, with steps `step-food.tsx` and others.
  - Schema: `data/intake-schema.ts`, `save-intake.ts`.
- **Player settings:** `src/app/[locale]/(player)/player/settings/page.tsx`, `player-account.tsx`, `player-preferences.tsx`.
- **Admin dashboard:** 0117.

## Do

### 1. Migration `supabase/migrations/0124_food_budget.sql` (additive only)
- `player_intake.food_budget_monthly_egp int null`, with check 300–100000.
- **Table `food_prices`:**
  - `food_id uuid references foods`;
  - `owner_id uuid null` (null = platform price; otherwise a captain override);
  - `unit text` with check `in ('kg','piece','pack')`;
  - `unit_grams numeric` (grams per piece or pack; 1000 for kg);
  - `price_egp numeric(10,2) > 0`;
  - `updated_at`;
  - primary key `(food_id, coalesce(owner_id, zero-uuid))`, implemented as a unique index.
- **RLS on `food_prices`:**
  - Everyone authenticated reads platform rows. A captain's players read that captain's rows.
  - A captain writes only their own rows.
  - Only admins write platform rows (use the admin check from 0117).
  - Test: `supabase/tests/food-prices.test.ts`.
- **Seed:** add `supabase/seed/source/food-prices-egp.json` with rough prices for the starter foods that matter for cheap protein and carbs:
  - eggs, ful medames, lentils, chicken breast, chicken liver, canned tuna, rice, baladi bread, oats, milk, yoghurt, potatoes, bananas, peanut butter, white cheese, pasta, frozen chicken.
  - Mark each entry `"estimate": true`.
  - Load it in the existing seed runner.
  - Add a note in the card result that the owner must confirm the prices before production.
  - Do NOT run the seed against production.

### 2. Pure planner `src/features/meal-plans/budget-plan.ts`
- **Input:** daily kcal and protein targets, meals per day, daily budget, allowed foods with nutrition and price-per-gram, and food tags (breakfast / main / snack).
- **Output:** a day of meals with items and grams, `costEgp` per meal and per day, macros, and `feasible` / `shortBy` (protein grams missing).
- **Method:** a deterministic greedy algorithm.
  - Sort protein sources by EGP per gram of protein, fill protein first, then fill kcal with the cheapest kcal sources.
  - Cap any single food at a sensible daily amount (e.g. eggs ≤ 6, tuna ≤ 2 cans), as a table in the module.
  - Round grams to kitchen units.
  - No randomness. No LLM.
- **`cheaperSwap(item, foods)`** returns the cheapest food with protein within 10% for the same tag, plus the saving.
- **`weeklyShoppingList(days)`** returns quantities rounded up to purchase units, and the total.
- Tests: feasible, infeasible (`shortBy`), swap, shopping-list rounding, determinism.

### 3. Player input
- **Intake:** in `step-food.tsx`, an optional field «ميزانية الأكل في الشهر (جنيه)», with the hint «هنقسمها على أيام الشهر. لو مش عايز، سيبها فاضية.».
- **Settings:** the same field in player settings.
- Show the computed daily amount live: «يعني حوالي 150 جنيه في اليوم».

### 4. Captain screen (mockup phone 1)
- In the meal plan editor, add an action «خطة على قد الميزانية» that opens a sheet with:
  - the player's daily budget (read-only, from intake), with the `glass-strong` number;
  - the targets from the calculator;
  - food chips the planner may use, defaulting to all priced foods;
  - the primary button «اعمل الخطة».
- **Result:** it fills a draft plan using the existing meal-plan save path. The captain can edit everything as usual.
- **Infeasible:** show the warn card «الميزانية مش هتكفي <N> جم بروتين.» with two choices:
  - «قلّل البروتين لـ <reachable>»;
  - «كلّم اللاعب».
- **Captain price overrides:** a small «أسعار الأكل» list in captain settings (food, unit, platform price, your price).

### 5. Player screens (mockup phones 2 and 3)
- **Nutrition day:**
  - a chip with the day total («146 جنيه»);
  - each meal shows its price in lime;
  - a «بديل أرخص» card when `cheaperSwap` saves at least 10 EGP.
- **«طلبات الأسبوع» page:**
  - items with quantity and price;
  - the total;
  - «الأسعار تقريبية، والكابتن يقدر يحدّثها كل شهر.»;
  - a secondary button «ابعت القايمة على الواتساب» that opens `https://wa.me/?text=` with the encoded list. Nothing personal goes in the URL beyond the list itself.
- **Hidden when no data:** the prices UI hides entirely when the player has no budget or a food has no price.

### 6. Admin
- In the admin dashboard, add a «أسعار الأكل» table to edit platform prices, with «آخر تحديث».

## Rules
- Follow AGENTS.md. Use tokens only, logical properties, targets of at least 48px, LTR-isolated numbers, and `formatNumber`.
- Messages go in ar, arStd and en.
- Money is shown with «جنيه», no currency symbol.
- Keep any new file under 250 lines.

## Tests
- The planner tests above.
- `supabase/tests/food-prices.test.ts`.
- Intake schema accepts empty, rejects below 300.
- Render tests:
  - the captain sheet, feasible and infeasible;
  - the player price chips;
  - the shopping list;
  - prices hidden without a budget.

## Out of scope
- Live price scraping.
- Supermarket ordering.
- Ramadan (T-310), pain (T-311), women's mode (T-313).

## Gates
1. `npx vitest run src/features/meal-plans src/features/nutrition src/features/onboarding src/features/settings supabase/tests/food-prices.test.ts`
2. `npm run typecheck`
3. `npm run lint`
