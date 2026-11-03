# T-011 — Nutrition builder (captain): meals, foods, live macros, smart swaps, activate

**Phase:** 3 · **Depends on:** T-009 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
From a player in the roster, the captain opens «الأنظمة الغذائية». There they:
1. create a plan with calorie and macro targets
2. add meals (فطار, غدا, …)
3. add foods by search with grams
4. watch the totals update live against the targets
5. for any item, add swap alternatives whose grams are **computed automatically** to match the calories (`equivalentGrams` in `src/lib/macros.ts`)
6. tap «فعّل للاعب»

Mockup board: **CaptainNutrition** (`docs/mockups/CaptainNutrition.dc.html`). Schema: `supabase/migrations/0007_nutrition.sql`.

## Files
- `supabase/migrations/0018_nutrition_activation.sql` (new):
  - `create unique index nutrition_plans_one_active on public.nutrition_plans (player_id) where status = 'active' and player_id is not null`
  - `public.activate_nutrition_plan(p_plan uuid) returns void`: `security invoker`, `set search_path = ''`. It locks the plan, raises `42501` if the caller is not its captain, raises `22023` for templates or plans without at least one meal with one item, archives the player's other active plans, and activates this one.
  - Per 0014: grant execute to `authenticated` only.
- `supabase/tests/rls-nutrition-activation.test.ts` (new)
- `src/features/meal-plans/` (new; `nutrition` is the player feature):
  - `index.ts`
  - `types.ts`
  - `draft.ts` (pure):
    - `addMeal`, `renameMeal`, `removeMeal`, `moveMeal`
    - `addItem(mealId, food, grams)`, `setGrams`, `removeItem`, `moveItem`
    - `addAlternative(itemId, food)` computes grams with `equivalentGrams(original, grams, alternative)`
    - `removeAlternative`
    - changing an item's grams recomputes its alternatives' grams
    - positions stay 1..n
  - `totals.ts` (pure): `planTotals(draft)` and `mealTotals(meal)` via `macrosFor` and `sumMacros`; `targetDelta(totals, targets)` gives a signed difference per macro; `macroTargetsFromKcal(kcal, split = {p:30,c:45,f:25})` gives grams
  - `data/foods.ts`: `searchFoods({ query, limit: 30 })` with `ilike` on `name_ar` and `name_en` (escaped), visible via RLS (global, plus the captain's own)
  - `data/plan-io.ts`: `createPlan(playerId, title)`, `loadPlan(id)`, `savePlan(draft)` (replaces meals, items, and alternatives, with `uuidv7()` ids for new rows), and `listPlayerPlans(playerId)`. They are server actions or server-only, scoped by RLS, and never take `captain_id` from the client.
  - `data/activate.ts`: calls `activate_nutrition_plan`
  - `hooks/use-plan-draft.ts`
  - `components/plan-builder.tsx`
  - `components/targets-bar.tsx`: kcal and P/C/F inputs, «احسب من السعرات», and live totals with the delta shown green when within ±5% and amber outside it, using tokens only
  - `components/meal-editor.tsx`
  - `components/item-row.tsx`: grams `Stepper` (step 5 g, 5–2000), per-item macros, ↑↓ with Arabic `aria-label`s, and a «بدائل» expander showing alternatives with their computed grams («مكرونة · 230ج = نفس السعرات»)
  - `components/food-picker.tsx`: search, rows with photo (`foodMediaUrl` if it exists in `src/core/storage`; otherwise build the public URL the same way `exerciseMediaUrl` does, inside this feature), and per-100 g macros
  - `meal-plans.test.ts`
- `src/app/(captain)/captain/players/[playerId]/nutrition/page.tsx` (new, thin): the player's plans plus «نظام جديد»
- `src/app/(captain)/captain/nutrition/[planId]/page.tsx` (new, thin): the builder
- `src/features/roster/components/roster-row.tsx`: add a «الأكل» link to `/captain/players/{playerId}/nutrition`. This is the only roster change. Another task (T-010) adds a «البرامج» link to the same row, so keep your change to one added link.

## Requirements
1. Server actions only for writes. RLS is the security, and there are no client Supabase writes.
2. `beforeunload` warning when dirty.
3. States: loading, error with retry, empty meal «ضيف أول أكلة», and empty search «مفيش أكلة بالاسم ده». The foods catalog may be empty until the seed runs; say «مكتبة الأكل لسه فاضية».
4. Files under 250 lines, tokens only, RTL logical properties, ≥ 48px targets, Egyptian Arabic, and `aria-label` on icon buttons. One lime primary per screen («فعّل للاعب»).

## Acceptance
- [ ] `rls-nutrition-activation.test.ts` covers:
  - activation archives the previous plan
  - one active per player
  - another captain gets `42501`
  - a template or an empty plan gets `22023`
  - anon has no execute
- [ ] `meal-plans.test.ts` covers the draft operations, alternatives recomputed when grams change, `planTotals`/`targetDelta`, `macroTargetsFromKcal`, and search escaping.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Templates (T-017)
- Captain-created custom foods
- Ramadan plans
- The player screen (T-007)
- The program builder (T-010)
