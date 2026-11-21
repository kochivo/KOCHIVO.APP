# T-234 — Captain: full «تمرين جديد» screen

**Phase:** captain v11 · **Depends on:** T-233 · **Status:** ready

## Goal
Adding a custom exercise becomes a full screen. Today it is a small dialog with a name, a muscle, a target and a video link. The new screen fills in the columns the `exercises` table already has, and shows a live preview of what the player will see.

## Files
Create or modify only these:
- `src/app/[locale]/(captain)/captain/library/exercises/new/page.tsx` and `.../exercises/[exerciseId]/edit/page.tsx` (new, thin routes)
- `src/features/captain-workspace/library/exercise-form.tsx` (new): the form
- `src/features/captain-workspace/library/exercise-preview.tsx` (new): the live preview card
- `src/features/captain-workspace/library/similar-exercise.ts` (new): a pure helper for the similar-name hint
- `src/features/captain-workspace/training/data/editor-actions.ts`: extend the `custom` schema and the row in `saveCustom`
- `src/features/captain-workspace/training/custom-exercise.tsx`: the editor's «تمرين خاص» button links to the new screen with a `returnTo` param, instead of opening the dialog
- `src/features/captain-workspace/library/messages.ts` (`ar`, `arStd`, `en`)
- `src/features/captain-workspace/library/exercise-form.test.ts` (new)

## Requirements
1. **Fields.** All of them map to existing columns. No migration.
   - «الاسم بالعربي» → `name_ar` (required, max 60).
   - «بالإنجليزي» → `name_en` (optional in the UI). The column is `not null`, so save the Arabic name when it is empty. That matches today's behaviour.
   - «العضلة الأساسية» → `body_part`: one-choice chips, same enum as today.
   - «العضلة المستهدفة» → `target` (max 40).
   - «عضلات مساعدة» → `secondary_muscles text[]`: multi-choice chips, max 6.
   - «الأداة» → `equipment`: one-choice chips (بار، دمبل، جهاز، كابل، وزن الجسم، كيتل بل، أستك), allowed for every body part. Keep treadmill and stairmaster for cardio.
   - «خطوات الأداء» → `instructions_ar text[]`: an ordered list with «ضيف خطوة», max 8 steps, 160 characters each.
   - «لينك فيديو» → `video_url` (https only, same rule as today).
2. **Live preview** card on the side (desktop) or under the form (mobile): name, English name, pills, and «بتاعي». It updates while the captain types.
3. **Similar-name hint.** While typing, search the library and show «فيه تمرين شبهه في المكتبة: X» with a link to it.
   - Use a normalised Arabic compare: strip «ال», unify أ/إ/آ → ا and ة → ه.
   - Pure function, unit tested.
4. **Saving:**
   - goes through `saveCustom`, insert or update, with ids from `uuidv7()` as today;
   - ownership checks stay as they are (`owner_id = captain`);
   - after saving, return to `returnTo` (the editor) or to the library;
   - toast «اتحفظ <name> في مكتبتك»;
   - when coming from the editor, the new exercise is added to the current day.
5. Validation errors show inline and in Arabic. The save button shows busy and is disabled while saving.

## Acceptance
- [ ] Tests:
  - [ ] the schema accepts and rejects (secondary muscles count, steps count and length, https video);
  - [ ] the `name_en` fallback;
  - [ ] the similar-name normaliser;
  - [ ] the edit route loads only the captain's own row.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Uploading a GIF or image (`media_path`). It needs a storage bucket and policies, which is a DB change that needs the owner's approval first.
- Generator tags (`exercise_generator_tags`) for custom exercises.
- The player app.

## References
- Mockup: `docs/mockups/captain-workspace/v11-prototype.html` → مكتبة التمارين → «تمرين جديد».
- Table: `supabase/migrations/0004_exercises.sql`, `0042_exercise_video.sql`, `0044_archive_library_items.sql`.
