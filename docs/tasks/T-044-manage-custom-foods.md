# T-044 — Edit and delete custom foods, and make «+ أكلة جديدة» easy to find

**Phase:** 3 · **Depends on:** T-030 merged · **Status:** ready (urgent)

## Problem
The owner could not find how to add a custom food, and a captain cannot edit or delete one after saving it.

## Already exists, build on it (T-030)
- `public.foods` with `owner_id`, the `captain-food-photos` bucket (migration 0039), `createCustomFood` in `src/features/meal-plans/data/custom-food.ts`, the photo upload in `data/custom-food-photo.ts`, `custom-food-sheet.tsx`, the «+ أكلة جديدة» button in `meal-editor.tsx`, and the «أكلاتي» filter in `food-picker.tsx`.
- Keep `owner_id`; do not add a `captain_id` column.

## Files
- `supabase/migrations/0043_custom_food_writes.sql` (0041 and 0042 are reserved by parallel cards):
  - The current `foods_owner_write` policy (0007) is `for all` with only `owner_id = auth.uid()`, so a **player** could insert a food. Replace it with insert/update/delete policies that also require the caller's role to be captain. Keep the restrictive `active_caller` policy.
- PGlite test in `supabase/tests/custom-foods.test.ts`: captain edits and deletes own; captain B cannot; a player cannot insert; a food used in a meal plan cannot be deleted silently (expect the FK error to surface as a clear message in the app).
- `data/custom-food.ts`: `updateCustomFood` and `deleteCustomFood` server actions (same validation and per-100 g conversion as create; on delete, also remove the photo; on photo replace, remove the old file only after the update succeeds).
- `custom-food-sheet.tsx`: an edit mode prefilled from the food.
- `food-picker.tsx`: own foods show edit and delete (icon buttons with translated `aria-label`, confirm before delete); edits and deletes update the list at once and roll back on failure.
- Discoverability:
  - In the nutrition builder, put «+ أكلة جديدة» at the top of the food picker as well as in the meal editor, visible without scrolling.
  - When the «أكلاتي» filter is empty, the empty state's action opens the sheet.
- Toasts with `useToast` from `@/ui/toast` (no Sonner). Messages in Egyptian Arabic and English.

## Requirements
- No new dependencies. Tokens only. RTL logical properties. Files under 250 lines.

## Acceptance
- [ ] A captain can find, add, edit and delete their own foods; nobody else can; players cannot create foods.
- [ ] A new or edited food shows in the picker at once.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
