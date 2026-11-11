# T-175: Foods library

**Phase:** Captain suite (owner approval 2026-11-11) · **Depends on:** T-174 (needs `foods.units`) · **Status:** ready

## Goal
The design is screen 5 («مكتبة الأكلات») in `docs/mockups/captain-workspace/suite.html`.

Build one place where the captain can browse every food and manage their own foods. It lives under a new «المكتبة» section in the captain nav, at the route `/captain/library/foods`. Both the nav entry and the route exist only when the flag is on; when it is off, the route calls `notFound()`.

## Files
- New route `src/app/[locale]/(captain)/captain/library/foods/page.tsx` (thin).
- `src/features/meal-plans/` (or a new `foods` feature if meal-plans would pass 250-line files): components, data, messages, tests.
- Captain nav: add «المكتبة» only when the flag is on, with a test that the flag-off nav is unchanged.
- This card.

## Requirements
1. **List.**
   - Bounded, paged with a keyset cursor (40 per page).
   - Search over `name_ar` and `name_en`, server-side `ilike` with an escaped pattern.
   - A segment: all / my foods / global, with counts.
   - Category chips. Use an existing category column if there is one. If there isn't, hide the chips and note it for the reviewer.
   - Columns: kcal, P, C, F per 100 g, units, and «في خطط» (the count of meal_items using the food, one grouped query per page).
2. **Edit drawer.**
   - The side panel on desktop, a sheet on the phone.
   - Name in AR and EN, per-100 g macros, units (add/remove), and a photo, using the existing food photo upload if present.
   - Global foods are read-only, with «انسخ لأكلاتي».
3. **Consistency check.** A pure `kcalMismatch(food)` uses `4P + 4C + 9F` against kcal with a 12% tolerance. A mismatch shows a warning, but saving is allowed.
4. **Duplicate warning.** Warn when the captain's food name matches an existing name after Arabic normalisation (alef forms, taa marbuta, diacritics), using a pure helper.
5. **Delete own food.** Blocked when the food is used in plans; the message says how many.
6. **Validation.** Writes go through the existing foods data layer and RLS. Use `uuidv7()` for new ids.

## Acceptance
- [x] Unit tests for `kcalMismatch`, the Arabic normalisation, and duplicate detection.
- [x] Tests that the list is bounded with a keyset cursor and that search escaping works.
- [x] Tests that global foods are read-only and that delete is blocked when the food is used.
- [x] A flag-off nav test.
- [ ] All gates pass.

## Out of scope
- An exercise library page.
- Plan templates page changes.
- Barcode or external food APIs.
- New dependencies.

## Implementation notes

- Uses `NEXT_PUBLIC_CAPTAIN_WORKSPACE` for the route, navigation and library data actions.
- Reuses the existing custom-food validation, writes, photo upload and RLS; no migration or dependency added.
- Category chips are hidden because foods has tags but no category column.
- The list counts `meal_items` in one grouped page query. Deletion also checks alternative references, including a concurrent-reference FK guard without archiving.
- Global copies preserve names, macros, units and the source photo. The source photo is resolved on the server from a visible global food.
- Duplicate checks scan names in bounded keyset batches, independent of the current list page; a warning allows saving on the next submission.
- The forms navigation points to `/captain/library/forms`; that route and feature are owned by T-177.
- Windows validation: default Vitest config loading and release audit Git spawning hit EPERM. Native-config/thread Vitest and the same audit rules with shell-provided Git paths are used as fallbacks. Next production compilation succeeds, but its TypeScript child process hits EPERM; standalone TypeScript is checked separately. The performance test skips without completed build statistics. The all-gates acceptance item remains open for the reviewer.
- Final focused tests: 28 files, 169 tests passed. Full fallback run: 485 files passed, 1 failed, 1 skipped; 3,470 tests passed, 1 failed, 1 skipped. The remaining failure is `src/ui/route-loading.test.ts`, which requires `loading.tsx` in both new route segments. Adding those two paths is pending authorization because the card's route file list only permits `page.tsx`.
