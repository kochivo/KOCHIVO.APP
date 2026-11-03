# T-048 — Archive custom exercises and foods instead of blocking delete

**Phase:** 3 · **Depends on:** T-043, T-044 merged · **Status:** ready (launch)

## Problem
Since T-043 and T-044, deleting a custom exercise or food that a program, meal plan or log still uses fails with a clear message (the FKs from 0005/0006/0007/0008 have no cascade, so nothing breaks). The owner wants the captain to be able to remove it from their library anyway, without breaking any player's plan or history.

## Decision
Soft delete with `archived_at timestamptz`. Do not add `is_active`. Elsewhere the schema already uses `archived_at` (`coach_clients`).

## Files
- `supabase/migrations/0044_archive_library_items.sql`:
  - Add `archived_at timestamptz` to `public.exercises` and `public.foods`.
  - Allow updating the column only through the existing owner update policies. Players and other captains must still be blocked.
  - Add partial indexes for the library queries, `where archived_at is null`, on (owner_id) for both tables.
- PGlite test `supabase/tests/archive-library.test.ts`:
  - The owner archives an item that is used in a program or meal plan.
  - The plan still reads the item for the player and the captain.
  - Another captain cannot archive it.
  - A hard delete of an unused item still works.
- `src/features/programs/data/custom-exercise.ts` and `src/features/meal-plans/data/custom-food.ts`:
  - `deleteCustom*` tries a hard delete first.
  - On FK `23503`, it sets `archived_at = now()` and returns success with `{ archived: true }`.
  - The food photo is removed only on a hard delete. An archived food keeps its photo for existing plans.
- Library queries (`programs/data/library.ts`, `meal-plans/data/foods.ts` search): exclude archived rows from search, pickers and the «تماريني»/«أكلاتي» filters.
  - Snapshot and plan reads must still load archived items by id.
- UI:
  - The toast after delete says «اتشال من مكتبتك. البرامج اللي فيه مش هتتأثر» when archived, and the normal deleted message otherwise.
  - Remove the "in use" error path; keep its message key only if it is still used.
- Update the T-043/T-044 tests that expect the in-use error.
- `src/types/database.ts`: `archived_at` on both tables.

## Out of scope
- The global GIF library (`owner_id is null`) and templates.
- Restoring archived items.

## Requirements
- No new dependencies. Tokens only. Files under 250 lines. Messages in Egyptian Arabic and English.

## Acceptance
- [ ] A captain can remove any of their custom items. Used ones disappear from the library, but programs, meal plans and logs still show them.
- [ ] Nobody else can archive them.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
