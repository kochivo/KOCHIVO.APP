# T-306: supersets done properly, and drop sets (new)

Mockup approved by the owner on 2026-11-15: `docs/mockups/training/superset-dropset-v1.html` (screenshot `superset-dropset-v1.jpg`). Open it and match it. Four screens:
1. the captain's day editor with a superset group;
2. the captain's drop set settings in the sets sheet;
3. the player inside a superset;
4. the player doing a drop set.

## Today
- **Supersets partly exist.**
  - `program_exercises.superset_group smallint` is already in the database.
  - The captain builder (`src/features/captain-workspace/training/exercise-row.tsx`, `day-exercises.tsx`) has a link/unlink button and a lime start border.
  - The player queue (`src/features/workout/queue.ts`) alternates grouped exercises.
- **Drop sets do not exist.**
  - Per-set plans live in `program_exercises.set_plan jsonb`, an array of `{ reps_min, reps_max, rir }`.
  - Player sets are logged in `set_logs` with `stableId('set', session, programExerciseId, setIndex)` (`src/features/workout/ids.ts`). Dexie has a unique index `&[session_id+program_exercise_id+set_index]`.

## Do

### A. Data (migration `supabase/migrations/0120_drop_sets.sql`, additive only)
1. **Drop config on a set.**
   - Each `set_plan` entry may carry an optional `drop` object: `{ "count": 1..3, "percent": 10..40, "mode": "failure" | "reps", "reps": 1..50 | null }`. `reps` is required only when `mode = 'reps'`.
   - Find where `set_plan` is validated on save: the save RPC, a check function, or a zod schema in `src/features/programs`. Accept and validate `drop` there.
   - If the database validates `set_plan`, extend that validation in 0120 by patching the live function by anchor, the way `0115`/`0119` do, raising on drift.
   - When the captain turns on a drop set and `set_plan` is null, expand it from the base reps first; the builder already does this for per-set reps.
2. **Logging drops.**
   - Add `set_logs.drop_index smallint not null default 0 check (drop_index between 0 and 3)`. `0` is the main set; `1..3` are drops.
   - Replace any unique constraint or index on `(session_id, program_exercise_id, set_index)` with one that includes `drop_index`. Find it in the migrations.
   - Keep RLS as is, and make sure the sync upsert's conflict target matches the new unique key.
   - Ids: a drop row uses `stableId('set', session, programExerciseId, String(setIndex), 'drop', String(dropIndex))`. Main sets keep today's id exactly, so existing rows and devices are untouched.
   - Dexie: add a new `version(n+1)`:
     - the compound unique index becomes `&[session_id+program_exercise_id+set_index+drop_index]`;
     - an `upgrade()` sets `drop_index = 0` on existing rows.
     - Follow the versioning rules in `src/core/offline`. Never edit an old version.
3. **Template and KO copies.**
   - `copy_template`, assign and the KO `set_plan` resize (`0115`) copy or merge `set_plan` as whole jsonb, so `drop` survives. Confirm this with a test; do not redefine them unless a test shows it is lost.
4. Update `src/types/database.ts`, and the `SnapshotExercise.set_plan` type in `src/core/offline/db.ts`.

### B. Captain builder (screens 1 and 2)
- **Superset group:**
  - one rounded card with a lime border around the grouped exercises, the header «سوبرست A» (B, C… for further groups in the day), and per-exercise tags A1, A2, A3;
  - «من غير راحة» between members;
  - a rest note on the header: «راحة X ث بعد آخر تمرين بس».
- **Linking:**
  - a dashed «اربطه مع اللي فوقه في سوبرست» control between ungrouped neighbours;
  - «+ ضيف تمرين تالت للسوبرست» inside a group of two; at most 3 members;
  - unlinking stays available.
  - On linking, members get the same set count: use the larger one and tell the captain with a short hint.
- **Drop set:**
  - In the exercise's sets sheet, each set row can turn on «دروب سيت»: a toggle with a stepper for the drop count (1–3) and the percent (10–40, step 5), and a segmented control «لحد الفشل» / «عدد عدات» with a reps stepper for the second option.
  - A live example line: «مثال لو شال 60 كجم: 60 ← 48 ← 38 كجم».
  - Set rows with a drop show a warn-tone «دروب سيت» chip, and the exercise row in the day list shows it too.
- Both work in the player's program and in templates, since they share the builder.

### C. Player workout (screens 3 and 4)
- **Superset:**
  - the header shows «سوبرست A», «الجولة 2 من 3» and an A1 ← A2 chip;
  - a lime "next" card under the set: «بعدها على طول: …» with «من غير راحة بينهم. الراحة بعد التاني.»;
  - the primary button is «خلصت A1 ← روح لـ A2».
  - **No rest timer between members**; the rest timer runs after the last member of each round with the group's rest.
  - Check `queue.ts` and the rest logic, and fix whatever does not match.
- **Drop set:**
  - After the main set of a set with `drop`, show the drop screen instead of rest: a warn line «قلل الوزن وكمل على طول — من غير راحة», then the main set (done), the current drop and the next drops.
  - Weights: each drop is the previous weight × (1 − percent), rounded to the nearest 2.5 kg. The player can change the weight.
  - Reps: «لحد الفشل», or the target.
  - The player logs reps for each drop with the big stepper. The button reads «خلصت النزلة ← اللي بعدها», and after the last drop the normal rest starts.
  - Drops are saved through `saveAndQueue()` as their own `set_logs` rows with `drop_index`.
- **Records and stats:**
  - personal records, "last time" and progression use main sets only (`drop_index = 0`);
  - total volume counts drops too.
  - Update the finish summary, history and the captain's session view to show drops under their set, like «دروب: 47.5 × 7، 37.5 × 5».
- The player's program preview shows the superset group and «دروب سيت» chips.

### D. Copy
- Messages in ar, arStd and en.
- English: "Superset", "No rest between", "Rest after the last exercise only", "Link with the one above as a superset", "Add a third exercise", "Drop set", "Drops", "Reduce weight each time", "To failure", "Set reps", "Drop the weight and keep going, no rest", "Finish drop, next".
- No emoji. Logical properties, tokens only, targets of at least 48px (the gym steppers bigger), the T-278 spacing scale and T-275 click cues. Keep the v11 look and the liquid button style.

## Tests
- PGlite, new `supabase/tests/drop-sets.test.ts`:
  - the `drop_index` check;
  - the unique key allows a main set and its drops, and rejects duplicates;
  - a player can write only their own drop rows (RLS);
  - `set_plan` with a valid `drop` saves, and invalid values (count 4, percent 50, reps mode without reps) are rejected;
  - template copy, assign and the KO resize keep `drop`.
- Dexie: the upgrade sets `drop_index = 0` on existing rows, and main-set ids are unchanged.
- Pure helpers: drop weights (60 at 20% → 47.5, 37.5) with rounding; records ignore drops; volume includes them.
- Builder: grouping labels A1/A2/A3, the max of 3, the set count aligned on link, drop toggle limits.
- Workout: no rest between superset members and rest after the last one; the drop screen replaces rest and logs each drop; rest starts after the last drop.

## Out of scope
- Old migrations; 0120 patches on top of them.
- Never apply anything to a hosted database.
- KO suggestions for drop sets, and any other training changes.

## Gates
1. The new tests.
2. `npx vitest run supabase/tests src/features/programs src/features/captain-workspace src/features/workout src/features/player-preview src/core/offline`
3. `npm run typecheck`
4. `npm run lint`
