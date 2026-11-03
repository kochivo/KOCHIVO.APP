# T-010 — Program builder (captain): days, exercises, supersets, activate

**Phase:** 3 · **Depends on:** T-009 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
From a player in the roster, the captain opens «البرامج». There they:
1. create a program
2. add days
3. add exercises from the library (search in Arabic or English, filter by body part)
4. set sets, reps (min–max), and rest
5. group two or more exercises as a superset
6. reorder with ↑↓
7. tap «فعّل للاعب»

Activation replaces the player's previous active program in one step. Mockup board: **CaptainBuilder** (`docs/mockups/CaptainBuilder.dc.html`). Schema: `supabase/migrations/0005_programs.sql`.

## Files
- `supabase/migrations/0017_program_activation.sql` (new):
  - `create unique index programs_one_active on public.programs (player_id) where status = 'active' and player_id is not null`
  - `public.activate_program(p_program uuid) returns void`: `language plpgsql security invoker set search_path = ''`, so RLS applies. In one statement order:
    1. Lock the program's row, and raise `42501` when the caller can't see it as its captain.
    2. Set the player's other active programs to `archived`.
    3. Set this one to `active`.
  - Raise `22023` for templates (`player_id is null`) and for programs with no day that has at least one exercise.
  - Per 0014: `grant execute ... to authenticated` only.
- `supabase/tests/rls-program-activation.test.ts` (new)
- `src/features/programs/` (new):
  - `index.ts`
  - `types.ts`: narrow local DB types
  - `draft.ts` (pure): the editable draft model and its operations:
    - `addDay`, `removeDay`, `renameDay`
    - `addExercise`, `removeExercise`, `moveExercise(dayId, id, -1|1)`, `moveDay`
    - `toggleSuperset(dayId, ids[])`: assigns the next free group number. Ungrouping a group of 1 clears it.
    - `updateExercise` (sets 1–20, reps_min 1–100, reps_max ≥ reps_min or null, rest 0–900 in 15 s steps)
    - `positions` are always 1..n after every operation
  - `summary.ts` (pure): per-day totals (exercises, sets, estimated minutes using the same formula as `player-home` `today-card`) and `validateForActivation(draft)`, which returns Arabic error strings
  - `data/library.ts`: `searchExercises({ query, bodyPart, limit: 30 })` with `ilike` on `name_ar` and `name_en` (escape `%` and `_`), returning id, names, body_part, equipment, and `media_path`
  - `data/program-io.ts`:
    - `loadProgram(id)`
    - `saveProgram(draft)`: upserts `programs`, then replaces days and exercises (delete removed rows, upsert the rest with `uuidv7()` ids generated on the client for new rows)
    - `createProgram(playerId, title)`
    - `listPlayerPrograms(playerId)`

    All are `'use server'` actions or server-only, all scoped by RLS (captain session). Each returns `{ error }` with Arabic messages.
  - `data/activate.ts`: a server action that calls `activate_program`
  - `hooks/use-program-draft.ts`: holds the draft, a dirty flag, and save with optimistic UI and rollback on error
  - `components/program-builder.tsx`: a day tabs/list column plus an editor
  - `components/day-editor.tsx`
  - `components/exercise-row.tsx`: Steppers for sets and reps and a rest select, ↑↓ `IconButton`s with Arabic `aria-label`s («طلّع لفوق», «نزّل لتحت»), a superset checkbox, and delete
  - `components/exercise-picker.tsx`:
    - a search `TextField`
    - body-part chips
    - result rows with GIF thumbnails (`exerciseMediaUrl`, `unoptimized`) and the caption «© Gym visual» (AGENTS.md §4)
    - empty state «مفيش تمرين بالاسم ده»
  - `components/builder-header.tsx`: title edit, «احفظ» (ghost), «فعّل للاعب» (lime, the one primary), and the status tag
  - `programs.test.ts`
- `src/app/(captain)/captain/players/[playerId]/programs/page.tsx` (new, thin): lists the player's programs plus «برنامج جديد»
- `src/app/(captain)/captain/programs/[programId]/page.tsx` (new, thin): the builder
- `src/features/roster/components/roster-row.tsx`: add a «البرامج» link to `/captain/players/{playerId}/programs`. This is the only roster change.

## Requirements
1. Captain writes go **directly** to Supabase (they are not offline player logs), but always through server actions with the user's session. RLS is the security. Never pass `captain_id` from the client; the server sets it from `getClaims()`.
2. Unsaved changes: warn with `beforeunload` when dirty.
3. Mobile works with ↑↓ (no drag and drop). Desktop may use the same buttons.
4. States: loading, error with retry, an empty day «ضيف أول تمرين», and empty search.
5. Files under 250 lines, tokens only, RTL logical properties, ≥ 48px targets, Egyptian Arabic, and `aria-label` on icon buttons.

## Acceptance
- [ ] `rls-program-activation.test.ts` covers:
  - activation archives the previous active program
  - only one active per player (a direct second activation via `update` hits the unique index)
  - another captain gets `42501`
  - a template or an empty program gets `22023`
  - anon has no execute
- [ ] `programs.test.ts` covers every draft operation (positions stay 1..n, superset grouping and ungrouping, move at the edges is a no-op), `validateForActivation`, the minutes estimate, and search escaping.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Templates library and «احفظ كقالب» (T-017)
- RPE/Tempo UI
- Copying from another player
- Drag and drop
- The nutrition builder (T-011)
