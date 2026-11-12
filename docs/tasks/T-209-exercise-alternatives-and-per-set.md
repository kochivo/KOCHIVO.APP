# T-209: «بدائل» and «مجموعات مختلفة» in the program editor, plus the player side (mockup v6-program-editor)

**Phase:** v6 editor parity (owner approved 2026-11-12: "Yes, add them"; T-198 left these two buttons out because nothing stored them) · **Status:** ready · **Depends on:** T-198, T-199 (both landed) · **Migration:** `supabase/migrations/0100_exercise_alternatives_set_plan.sql`. It is additive only. The reviewer applies it to production after the owner says OK.
**Flag:** the captain UI sits behind `captainWorkspaceEnabled()`. The player UI appears only when the data exists. With the flag off and no data, output must be byte-identical. **Messages:** `ar` (Egyptian), `arStd`, `en`.
**Rules:** follow AGENTS.md in full.
- No new deps. Keep every file under 250 lines.
- Tokens only and logical properties only. Touch targets ≥48px; gym controls bigger.
- Do not use Get-Content/Set-Content. Do not commit.
- Never edit migrations 0001–0099.

Read first:
- `docs/mockups/captain-workspace/v6-program-editor.html`: the expanded exercise row with the buttons «بدائل» / «اربطه سوبرسِت» / «مجموعات مختلفة» / «شيل», and the player screen.
- `supabase/migrations/0098_day_warmup.sql`: the guarded `pg_get_functiondef` patch pattern, and the functions it patches.
- `supabase/migrations/0080_exercise_swap_requests.sql`: the player swap requests that already exist. Do not change them.

## Files
- `supabase/migrations/0100_exercise_alternatives_set_plan.sql` (new), and `supabase/tests/exercise-alternatives-set-plan.test.ts` (new).
- `src/types/database.ts`: the two new columns only.
- `src/features/programs/`:
  - `types.ts`, `data/program-io.ts` (load, schema and save payload);
  - `draft.ts` / `weekly-draft.ts` / constructors that copy exercises: copy the new fields;
  - new pure module `set-plan.ts` + test.
- `src/features/captain-workspace/training/`:
  - `exercise-row.tsx` / `exercise-fields.tsx`: the two buttons;
  - new `alternatives-sheet.tsx`, `set-plan-editor.tsx`;
  - messages and tests.
- `src/core/offline/db.ts` (optional snapshot fields) and `src/features/player-home/data/program-snapshot.ts` (select and map).
- `src/features/workout/`: alternatives switch and per-set targets in the focus screen, plus tests.
- Fixtures that break only because of the new required fields.

## Requirements
1. **Data (migration 0100)**
   - Add `program_exercises.alternatives uuid[] not null default '{}'`, with a CHECK of at most 3 entries.
     - A trigger rejects:
       - duplicates;
       - the row's own `exercise_id`;
       - an exercise the program's captain cannot see (global, or `owner_id` = that captain).
     - Raise a clear `errcode`.
   - Add `program_exercises.set_plan jsonb null`. Null means every set is the same, as today.
     - When set, it is an array whose length equals `sets`.
     - Each item is `{reps_min int 1–100, reps_max int|null ≥ reps_min, rir int 0–5|null}`.
     - Enforce it with a CHECK or trigger.
     - A save that changes `sets` without updating the plan must fail. The client keeps them in step.
   - Patch with the guarded approach (match exactly once, raise on drift) so both columns are written and copied by:
     - `save_weekly_program`;
     - `assign_program_template`;
     - `program_to_template`;
     - `copy_template`;
     - `security_private.copy_starter_templates`;
     - any other function that copies `program_exercises` rows. Grep for them.
   - Existing rows stay unchanged.
2. **`set-plan.ts` (pure)**
   - `uniformPlan(row)`;
   - `resizePlan(plan, sets)`: adding repeats the last set, removing trims;
   - `targetForSet(row, index)`: uses the plan item, or falls back to the row's reps/rir;
   - `planLabel(plan)`: for example «12 · 10 · 8».
3. **Captain editor (behind flag)**
   - The exact mockup buttons in the expanded row.
   - «بدائل» opens a sheet that reuses the inline exercise search. It picks up to 3 alternatives, shows them as removable chips, and shows a count badge on the button.
   - «مجموعات مختلفة» turns the reps box into one row per set. Each row has a reps stepper and an optional «يسيب N عدّة». A «زي بعض» action goes back to uniform (null).
   - The collapsed row shows the plan label in the reps cell, for example «12·10·8».
   - Both save through the existing autosave and one save status.
4. **Player workout**
   - When the current exercise has alternatives, a small «بدّل التمرين» control lists them, with name and GIF thumb.
   - Choosing one switches this session only:
     - set logs record the chosen `exercise_id` with the same `program_exercise_id`;
     - last-session and PR lookups use the chosen exercise;
     - the choice survives reload through the session-local pattern of T-199.
   - This is separate from the injury swap request flow (0080). Keep that flow as it is.
   - Per-set targets: set rows show `targetForSet` for each set.
5. **Offline:** the snapshot carries both fields as optional. Old cached snapshots behave exactly as today.

## Acceptance
- [ ] The editor row matches the mockup at 1440×900 and 390×844; list any differences.
- [ ] PGlite tests cover:
  - the alternatives limit, duplicates, own exercise and cross-captain private exercise;
  - set_plan length/shape and the sets mismatch;
  - save and every copy function carrying both columns;
  - RLS unchanged.
- [ ] Unit tests cover:
  - `set-plan.ts`;
  - the player alternative switch logging the chosen `exercise_id`;
  - per-set targets;
  - an old snapshot without the fields.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.

## Out of scope
- Changing the generator.
- Captain approval of player switches; the alternatives are pre-approved by the captain.
- Drop sets and per-set weights.
