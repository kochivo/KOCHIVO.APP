# T-287 — Captain edits calories and macros of any library food

**Phase:** nutrition · **Status:** ready (after T-286)
Read `AGENTS.md`, `DESIGN.md` and `docs/tasks/V11-FIDELITY.md` first.

## Goal
The owner asked on 2026-11-15: «عاوز الكابتن يقدر يعدل ف سعرات وبروتين الاكلات اللي موجوده ف المكتبه عادي».

Today a captain can edit only foods they added. A catalog food (`foods.owner_id is null`, 60 rows, shared by every captain) shows «انسخ» (copy). That opens the new-food form with `?copyFrom=<id>`, and the captain ends up with two foods of the same name.

## Behaviour
1. **Every food has «عدّل».** On a catalog food in the library (`library/food-drawer.tsx` and the v11 foods table), the action reads «عدّل» like on own foods, not «انسخ».
2. **Editing a catalog food never changes the shared row.**
   - Saving creates the captain's own food (`owner_id = me`, `source = 'captain'`) with the edited values.
   - It is linked to the original through a new column `foods.replaces_id`.
   - Other captains still see the original values.
3. **The captain's version replaces the original for them.**
   - In the library, in `searchFoods` (the plan editor food picker) and in the player's food search for that captain's players (`my_captain_id()`), the original catalog row is hidden wherever the captain has a version with `replaces_id = original.id`.
   - Their version shows instead, with the same name and photo, the new numbers and a small «معدّلة» marker.
4. **Editing again** updates the same version. No third copy.
5. **«رجّع الأصل»** (restore original) on an edited version deletes the captain's version (or archives it if a plan uses it, using the same rule as `deleteCustomFood(id, blockUsed)`). The original catalog food shows again.
6. **Existing meal plans keep the food they point to.** Their numbers do not change silently. New picks use the captain's version.
7. **Editable fields:** calories, protein, carbs and fat per 100 g, plus household units (the same fields as own foods). Name and photo can be edited too.

## Data
- Add a new migration `supabase/migrations/0111_food_replaces.sql`. It is additive only:
  - `alter table public.foods add column replaces_id uuid references public.foods(id) on delete set null;`
  - A partial unique index on `(owner_id, replaces_id) where replaces_id is not null and archived_at is null` (one live version per captain per catalog food).
  - A check that `replaces_id`, when set, points to a catalog row (`owner_id is null`). Use a trigger or a `security definer` helper with `search_path = ''` if a check constraint cannot see the other row.
- RLS is unchanged: the existing owner insert, update and delete policies already cover the captain's own row. Add a PGlite test in `supabase/tests/` for each case:
  - a captain can create a version of a catalog food;
  - a captain cannot set `replaces_id` to another captain's food;
  - a captain cannot update the catalog row;
  - a second live version for the same catalog food is rejected.
- Do not apply the migration to any remote database. The reviewer applies it after the owner approves.
- **The app must keep working before 0111 is applied:** if the column is missing, editing a catalog food falls back to today's copy flow. Detect the missing-column error and do not show «رجّع الأصل».

## Files
- `src/features/meal-plans/` (data: `food-form.ts`, `custom-food*.ts`, `foods.ts`, `food-library.ts`; components: the library drawer, the foods table, the food form)
- The player food search, if it lives elsewhere
- `supabase/migrations/0111_food_replaces.sql` and `supabase/tests/food-replaces.test.ts`
- `messages.ts` files (Egyptian `ar`, `arStd` and `en`)
- Tests next to each

## Acceptance
- [ ] A captain edits the calories or protein of a catalog food in two taps from the library, and sees the new numbers at once (optimistic).
- [ ] Other captains still see the original values (PGlite test).
- [ ] The library and the food picker never show both the original and the captain's version.
- [ ] «رجّع الأصل» brings the original back.
- [ ] Before 0111 is applied, nothing errors.
- [ ] `npm run check` and `npm run build` pass. No new dependencies.

## Out of scope
- Changing the shared catalog itself (admin work).
- Updating existing meal plans to the new numbers.
