# T-043 — Captain custom exercises (blocker for launch)

**Phase:** 3 · **Depends on:** none · **Status:** ready (urgent)

## Problem
A captain cannot add their own exercise. The database already allows it, but there is no UI.

## Already exists, build on it
- `public.exercises` (migration 0004): `owner_id` null = global GIF library, otherwise the captain's private exercise. RLS already allows a captain to insert, update and delete **only** rows where `owner_id = auth.uid()`; players read their captain's custom exercises through `my_captain_id()`. Keep `owner_id` (do not add a `captain_id` column; it would duplicate it).
- The picker: `src/features/programs/components/exercise-picker.tsx`, opened from the left drawer `exercise-drawer.tsx` («+ إضافة تمرين»).

## Files
- `supabase/migrations/0042_exercise_video.sql` (0041 is reserved for the RLS audit running in parallel):
  - `alter table public.exercises add column video_url text` with a check: null, or an `https://` URL of at most 500 chars.
  - Only if needed: a `body_part` check is not wanted (custom exercises may use the existing body-part values only, enforced in the app).
- PGlite test `supabase/tests/custom-exercises.test.ts`: captain inserts, edits, deletes own; captain B cannot read, edit or delete A's; A's player can read A's custom exercise; a player cannot insert; a suspended captain cannot write; an `http://` or `javascript:` URL is rejected.
- `src/types/database.ts`: `video_url`.
- `src/features/programs/data/custom-exercise.ts` (server action): validate with zod (name 1–60, body part from the existing library list, optional target muscle text 0–40, optional https URL), check the caller is a captain, insert with `owner_id = auth.uid()` and `name_en = name_ar = name`, return the new library row. Plus `updateCustomExercise` and `deleteCustomExercise` for own rows; a delete that is still used in a program must fail with a clear message (FK) instead of breaking the program.
- `src/features/programs/components/custom-exercise-sheet.tsx`: `glass-strong` modal (native `<dialog>` like the other sheets) with name, target muscle (body part select + optional detail), video link. Inline field errors; `toast.success` on save (`useToast` from `@/ui/toast`; no Sonner).
- `exercise-picker.tsx`: a «+ تمرين خاص بيك» button and a «تماريني» filter (like the foods' «أكلاتي»). A new exercise appears at the top of the list at once (optimistic, reconciled with the server row) and can be added to the day straight away. Own exercises show a «بتاعي» badge and edit/delete actions.
- Player side: where the workout shows exercise media, a custom exercise with `video_url` shows a «شوف الفيديو» link that opens in a new tab (`rel="noopener noreferrer"`). Do not embed YouTube (no CSP or perf changes).
- `messages.ts` in programs and workout: Egyptian Arabic and English.
- Unit tests for the action's validation and the picker's optimistic insert.

## Requirements
- No new dependencies. Tokens only. RTL logical properties. Files under 250 lines (split the picker if needed).
- The perf budget must still pass: the sheet loads with `next/dynamic`.

## Acceptance
- [ ] A captain adds an exercise from the drawer and puts it into a player's day in one flow.
- [ ] They can edit and delete their own; nobody else can.
- [ ] The player sees the custom exercise in their workout, with the video link if any.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
