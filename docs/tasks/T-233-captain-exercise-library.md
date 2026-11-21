# T-233 — Captain: exercise library page

**Phase:** captain v11 · **Depends on:** none · **Status:** ready

## Goal
The captain gets a real «مكتبة التمارين» page. Today the library only exists as a picker inside the program editor. On the new page the captain can browse the 1,300+ global exercises plus their own, filter them, and open one to see its details.

## Files
Create or modify only these:
- `src/app/[locale]/(captain)/captain/library/exercises/page.tsx` (new, thin route, same shape as `library/foods/page.tsx`)
- `src/features/captain-workspace/library/exercise-library.tsx` (new): the page body
- `src/features/captain-workspace/library/exercise-card.tsx` (new): one grid card
- `src/features/captain-workspace/library/exercise-detail.tsx` (new): the detail sheet
- `src/features/captain-workspace/library/messages.ts` (new; `ar`, `arStd`, `en`)
- `src/features/captain-workspace/library/exercise-library.test.ts` (new)
- the captain nav file that lists «مكتبتي» links: add «مكتبة التمارين» between «برامج التمرين» and «الأنظمة الغذائية»
- `src/features/captain-workspace/index.ts`: export the entry

## Requirements
1. **Data:**
   - Read through the existing `searchExercises` and `trainingMuscles` from `@/features/programs`. No new query helpers.
   - RLS already returns global rows (`owner_id is null`) plus the captain's own rows. Hide rows where `archived_at` is set.
2. **Header:** «مكتبة التمارين» with the total count (Manrope), a search field, and one primary button «تمرين جديد», which goes to T-234's page.
3. **Filters:**
   - muscle tabs: الكل / رجل / صدر / ضهر / كتف / دراع / بطن / كارديو, mapped to `body_part` through the existing `trainingMuscles` labels;
   - equipment chips: بار / دمبل / جهاز / كابل / وزن الجسم;
   - a chip «تماريني» for `owner_id = me`.
4. **Grid:**
   - 4 columns on desktop, 2 on mobile;
   - each card shows the media thumbnail (`media_path`), the Arabic name (fall back to `name_en`), the English name in muted text, and pills for the muscle and the equipment;
   - the captain's own exercises get a lime «بتاعي» pill.
5. **Detail sheet:**
   - opens on click;
   - shows the media or video (`video_url`), the target, the secondary muscles, and the instructions (`instructions_ar`, falling back to `instructions_en`);
   - for the captain's own rows it adds «عدّل», which opens T-234 in edit mode.
6. Paginate with the existing search page size. Never load all 1,300 rows at once.
7. **States:** loading skeleton, error with retry, empty search («مفيش تمرين بالاسم ده»), empty «تماريني» («لسه معملتش تمرين خاص. اعمل واحد من زرار تمرين جديد.»).
8. **UI rules:**
   - tokens only, logical properties, `min-h-12` targets;
   - every string lives in messages;
   - no exercise GIF attribution on this screen (it stays only in the public footer).

## Acceptance
- [ ] `/captain/library/exercises` renders for a captain, and is blocked for a player by the existing captain layout guard.
- [ ] Tests:
  - [ ] filter mapping (muscle tab → `body_part`);
  - [ ] the «تماريني» filter;
  - [ ] the name fallback ar → en;
  - [ ] the empty states;
  - [ ] the nav item order.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Creating or editing exercises. That is T-234.
- DB or RLS changes.
- Uploading media.

## References
- Mockup: `docs/mockups/captain-workspace/v11-prototype.html`, screens «مكتبة التمارين» and «تفاصيل التمرين».
- Page map in the same mockup: button «كل الصفحات: القديم والجديد».
