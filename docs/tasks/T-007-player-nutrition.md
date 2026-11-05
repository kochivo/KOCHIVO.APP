# T-007 — Player "today's food": macros ring, mark a meal eaten, smart swaps (offline)

**Phase:** 2 · **Depends on:** T-005 (merged), T-006 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
The player opens التغذية and sees:
- the active nutrition plan for today: one card per meal with food photos and grams
- a big calories ring plus protein, carb, and fat bars that fill as meals are marked eaten

On any item that has alternatives, the player can tap «بدّل» to swap it (for example rice to pasta); the grams were precomputed by the captain to match the calories. It works offline, exactly like workouts: a local snapshot for reading, and `saveAndQueue()` for meal logs.

Mockup board: **PlayerNutrition** (`docs/mockups/PlayerNutrition.dc.html`). Schema: `supabase/migrations/0007_nutrition.sql`.

## Files
- `src/core/offline/db.ts`:
  - add `version(3)` with a `nutrition_snapshot` table (`'id'`, one row keyed `'active'`)
  - add the `NutritionSnapshot` type: plan title, targets, and meals → items → alternatives, each with food name, grams, and per-100 g macros, plus `photo_path`
  - keep versions 1 and 2 untouched
- `src/core/offline/index.ts`: export the new types
- `src/core/storage/media-url.ts`: add `foodMediaUrl(path)` (public `food-media` bucket), mirroring `exerciseMediaUrl`. Export it from the index.
- `src/features/nutrition/` (new):
  - `index.ts`
  - `data/nutrition-snapshot.ts`:
    - `fetchNutritionSnapshot(client)` reads the caller's single `status = 'active'` plan with `meals(position, name, meal_items(..., foods(...), meal_item_alternatives(..., foods(...))))`
    - `mapNutritionSnapshot(...)` is pure, and sorts by `position`
  - `data/refresh-nutrition.ts`: same contract as `player-home/data/refresh-snapshot.ts` (offline or error keeps the old snapshot; a null plan deletes it)
  - `data/log-meal.ts`: `setMealEaten(db, { mealId, logDate, eaten, swaps }, now)` saves `meal_logs` through `saveAndQueue` with `id = stableId('meal', mealId, logDate)`:
    - `completed_at` is now when eaten and null when un-eaten
    - `swaps` maps `meal_item_id → alternative_id`
    - re-saving keeps one row
  - `macros.ts` (pure):
    - `itemMacros(item, swapId?)` uses `macrosFor` from `@/lib/macros` with the chosen food and grams
    - `mealMacros(meal, swaps)`
    - `eatenTotals(snapshot, logs)` sums only eaten meals, using each log's swaps
    - `targetsOf(snapshot)` uses the plan targets, falling back to the sum of all meals when a target is null
  - `hooks/use-nutrition-snapshot.ts` and `hooks/use-meal-logs.ts`: `useLiveQuery` (from `@/core/offline`) for today's logs
  - `components/nutrition-screen.tsx`:
    - header «أكل النهارده» with the plan title and `SyncPill`
    - `macro-ring.tsx`: an SVG ring for kcal, «{eaten} / {target} KCAL», with three thin bars (بروتين, كارب, دهون)
    - `meal-card.tsx`: meal name, items with photo (`next/image` `unoptimized`), «فراخ · 200ج», per-meal P · C · F, an item-level «بدّل» button cycling original → alternatives, and one big «كلت الوجبة» toggle (lime when not eaten, ghost with a check when eaten)
  - `nutrition.test.ts`
- `src/app/(player)/player/nutrition/page.tsx` (new, thin)
- `src/features/player-home/components/nutrition-slot.tsx`: replace the placeholder with a compact summary («1,240 / 2,900 سعرة», the next uneaten meal name), linking to `/player/nutrition`. Use the nutrition feature only through `@/features/nutrition` (its `index.ts`). This file is the only player-home change.

## Requirements
1. Swapping an item on an eaten meal re-saves the log with the new swaps, so totals update immediately.
2. Dates use `localDate()`, and pure functions take `today`. Never use `Math.random`, never write to Supabase directly, and use no new dependencies.
3. States: loading, empty («الكابتن لسه بيجهز نظام أكلك»), error with retry, and stale-but-shown («آخر تحديث من شوية»).
4. Files under 250 lines, RTL logical properties, ≥ 48px targets, no hex, Egyptian Arabic, `aria-label` on icon buttons, and `aria-pressed` on the eaten toggle.

## Acceptance
- [ ] `nutrition.test.ts` covers:
  - `mapNutritionSnapshot` ordering
  - `itemMacros` with and without a swap
  - `eatenTotals` with swaps and un-eaten meals
  - `targetsOf` fallback
  - with fake-indexeddb: `setMealEaten` keeps one row and one outbox entry across toggles, and un-eating sets `completed_at` to null
- [ ] `/player/nutrition` builds, and `npm run check` and `npm run build` pass.

## Out of scope
- Logging off-plan food
- Water tracking
- The captain's builder (T-011)
- Migrations
