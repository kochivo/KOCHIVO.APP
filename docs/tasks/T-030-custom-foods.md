# T-030 — Captain custom foods

**Phase:** 3 · **Depends on:** none · **Status:** ready

## Goal
In the nutrition builder, the captain can add a food that is not in the library: a name, its macros, and an optional photo.
The food is saved to the captain's own library (`foods.owner_id = captain`) and added straight to the meal being edited.
After that it shows up in the food search for that captain (and their players' plans) and can be reused any time, with no retyping.

## What already exists (do not rebuild)
- `public.foods` already has `owner_id uuid` (null = global catalog) and RLS in `0007_nutrition.sql`:
  - `foods_select`: global, own, or my captain's
  - `foods_owner_write`: owner_id = auth.uid()
  - `active_caller` restrictive (0026)
- Values are stored **per 100 g** (`kcal_per_100g`, `protein_per_100g`, ...). Keep it that way.
- `food-media` is a public bucket written only by the seed. Do **not** let captains write there.
- `compressImage(file, maxSide, quality, t)` in `src/features/progress/image.ts` already compresses images in the browser with canvas, with no dependency.
- `foodMediaUrl(path)` in `src/core/storage/media-url.ts` builds public URLs for `food-media`.

## Files
Create or modify only these:
- `supabase/migrations/0039_captain_food_photos.sql`:
  - a new public-read bucket `captain-food-photos`: 1 MB, `image/jpeg` and `image/webp`
  - storage policies: an authenticated captain may insert into, and delete from, only their own folder `<auth.uid()>/...`
  - the restrictive suspension policy for this bucket, in the same style as `active_caller_voice` in `0038_voice_notes.sql`
  - only if needed: a check that a custom food's `photo_path` starts with `captain-food-photos/<owner_id>/`
- `supabase/tests/custom-foods.test.ts`:
  - a PGlite test (harness in `supabase/tests/harness.ts`; see `rls-voice-notes.test.ts` for the pattern)
  - a captain inserts their own food, and their player can read it
  - another captain cannot read, update or delete it
  - a captain cannot insert a food with someone else's `owner_id`
  - storage insert is allowed only in the captain's own folder
  - a suspended captain is blocked
- `src/lib/compress-image.ts`:
  - move the canvas compressor here so both features can use it
  - error messages stay translated: take the message strings or a translator as an argument; `lib/` must not import features
  - `src/features/progress/image.ts` keeps working by re-exporting or wrapping it; keep its tests green
- `src/core/storage/media-url.ts`: add `foodPhotoUrl(path)`, which uses the `captain-food-photos` bucket when the path starts with `captain-food-photos/`, and `food-media` otherwise. Use it wherever food photos render (picker, item rows, player nutrition view).
- `src/features/meal-plans/data/custom-food.ts`:
  - a `'use server'` action `createCustomFood(input)`
  - zod validation
  - inserts into `foods` with `owner_id` = the caller, `source = 'captain'`, and `name_ar` = the name; `name_en` stays null
  - converts per-serving numbers to per-100 g: `value / servingGrams * 100`, rounded to 1 decimal
  - returns the `Food`
- `src/features/meal-plans/data/custom-food-photo.ts`: the client-side upload:
  - compress to at most 800 px, JPEG quality 0.8
  - upload to `captain-food-photos/<captainId>/<uuidv7>.jpg`
  - return the stored path, which includes the bucket prefix
  - if the food insert fails afterwards, remove the uploaded file
- `src/features/meal-plans/components/custom-food-sheet.tsx`: the modal. Reuse `ResponsiveDialog` from `src/ui` and the `glass-strong` surface. Fields:
  - name (required, at most 60 characters)
  - serving size in grams (required, 5–2000, default 100)
  - total kcal for that serving
  - protein, carbs and fat in grams for that serving (each ≥ 0)
  - photo, optional: an `<input type="file" accept="image/*">` with a preview
- `src/features/meal-plans/components/meal-editor.tsx`:
  - next to "add food", add a clear "+ أكلة جديدة" button that opens the sheet
  - on save, add the new food to this meal with grams = the serving size (use the existing `addItem`)
- `src/features/meal-plans/components/food-picker.tsx`:
  - a "كل الأكل / أكلاتي" (all / mine) toggle using the `Segmented` component
  - a small "أكلتي" (mine) badge on custom foods
- `src/features/meal-plans/data/foods.ts`: support the "mine" filter (`owner_id = caller`).
- `src/features/meal-plans/data/client.ts` and `types.ts`: add `custom: boolean` to `Food`; it is true when `owner_id` is not null.
- `src/features/meal-plans/messages.ts`: all new strings in Egyptian Arabic and in plain, short English.
- `src/features/meal-plans/*.test.ts`: unit tests for:
  - the per-serving to per-100 g conversion and its validation
  - the "mine" filter in the search query
  - the cleanup when the insert fails
- `src/types/database.ts`: only if a type actually changes.

## Requirements
1. All writes are validated on the server with zod. Never trust client numbers.
2. kcal has an upper bound of 0–5000 per serving, and each macro 0–1000 g. A serving that converts to more than 900 kcal per 100 g is rejected.
3. The photo is optional, and saving works without one. If the upload fails, show the error and keep the form filled in.
4. One primary action in the sheet: "احفظ وضيفها" (save and add).
5. The sheet has a loading state while saving, an error state, and a translated `aria-label` on every icon-only button.
6. RTL logical properties only. Touch targets are at least `min-h-12`. Color tokens only. No new dependencies.

## Acceptance
- [ ] The captain creates a food with a photo; it appears in the meal right away and under "أكلاتي" (mine) in later searches.
- [ ] The player sees that food and its photo in their plan.
- [ ] Another captain never sees it.
- [ ] The PGlite test and the unit tests pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Editing or deleting custom foods (a later card).
- Barcode scanning, or nutrition lookup from the internet.
- Touching migrations 0001–0038.
