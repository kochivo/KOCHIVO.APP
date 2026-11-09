# T-120 — Program generator engine

**Phase:** KO core · **Depends on:** none · **Status:** draft (owner decisions below)

## Goal
A captain describes a player in a short brief (goal, level, days, session length, equipment,
injuries) and gets a complete weekly program draft in under a second. The engine is pure
TypeScript with **no AI call**: it picks only tagged catalog exercises, prefers the captain's own
habits, and every number (sets, reps, rest, RIR) comes from a fixed table. That makes it
correct, testable and free to run on the free Gemini tier. AI is only used later (T-122) to turn
free text or voice into the same brief.

## Files
Create or modify only these:
- `supabase/migrations/0075_exercise_generator_tags.sql`: tag table and curated seed
- `supabase/tests/exercise-generator-tags.test.ts`: PGlite RLS test
- `src/features/program-generator/index.ts`: public API (`generateProgram`, `GeneratorBrief`, `GeneratedProgram`)
- `src/features/program-generator/brief.ts`: zod schema for the brief
- `src/features/program-generator/splits.ts`: days → split → slot recipes
- `src/features/program-generator/prescription.ts`: goal × level → sets/reps/rest/RIR
- `src/features/program-generator/pick.ts`: slot filling, injury/equipment filters, seeded choice
- `src/features/program-generator/generate.ts`: orchestration → `WeeklyDraft`-compatible output
- `src/features/program-generator/data/load-candidates.ts`: tagged exercises + captain usage counts
- `src/features/program-generator/program-generator.test.ts`
- `src/types/database.ts`: types for the new table
- This task card.

## Requirements
1. **Brief** (zod, strict): `goal` ∈ fat_loss | muscle | strength | general; `level` ∈ beginner |
   intermediate | advanced; `weekdays` 2–6 distinct weekdays (same convention as
   `programs/weekly-draft.ts`); `minutes` ∈ 45 | 60 | 90; `equipment` ∈ gym | dumbbells | bodyweight;
   `injuries` ⊆ knee | shoulder | lower_back; optional `playerId`; `seed` integer ≥ 0.
2. **Tags table** `public.exercise_generator_tags`: `exercise_id` (pk, fk to a **global**
   exercise, `owner_id is null`), `pattern` (squat, hinge, lunge, h_push, v_push, h_pull,
   v_pull, chest_iso, shoulder_iso, biceps, triceps, legs_iso, calves, core), `kind`
   (compound | isolation), `equipment` (gym | dumbbells | bodyweight), `stress` text[] ⊆
   {knee, shoulder, lower_back}, `min_level`. RLS: authenticated read-only, no write grants,
   restrictive `active_caller` like other tables. Seed about 120 well-known exercises from the
   global catalog by `dataset_id` (agent chooses; owner delegated naming calls). At least 3
   candidates per pattern × equipment, so every slot can be filled.
3. **Splits:** 2 days full body A/B, 3 full body A/B/C, 4 upper/lower ×2, 5 push/pull/legs +
   upper/lower, 6 push/pull/legs ×2. Each day is an ordered list of pattern slots; compounds first.
   Slot count by minutes: 45 → 4–5, 60 → 5–6, 90 → 7–8.
4. **Prescription table:** strength 4×3–6, rest 150 s, RIR 2. Muscle 3×8–12, rest 90 s, RIR 1.
   Fat loss 3×10–15, rest 60 s, RIR 2. General 3×8–12, rest 75 s, RIR 3. Beginner: −1 set
   (min 2), RIR +1. Advanced: +1 set on compounds. Values must pass `program_exercises` constraints.
5. **Picking:** filter by equipment (bodyweight ⊂ dumbbells ⊂ gym), `min_level`, and drop any
   exercise whose `stress` intersects `injuries`. Rank by captain usage count (exercises in the
   captain's own programs and templates), then a seeded PRNG keyed on `seed`. Never `Math.random`.
   No exercise repeats within a day; avoid repeating across days for the same slot when possible.
6. **Output:** a draft compatible with the existing program builder save path (reuse types from
   `@/features/programs` through its `index.ts`), plus, per exercise, `reasons` keys (for example
   `injury_safe_knee`, `captain_favorite`) and `alternatives` (up to 3 other ids for the same slot).
   If a slot cannot be filled, return a typed error naming the slot. Never return a partial program.
7. Same brief and seed → identical output. Seed + 1 → a different but valid program.

## Acceptance
- [x] Unit tests: every split × goal × level × equipment combination produces a valid draft
- [x] Knee injury never yields a tagged knee-stress exercise; same for shoulder and lower back
- [x] Determinism and the "seed + 1 differs" tests pass; injected data only, no network
- [x] PGlite test: authenticated can read tags, cannot insert/update/delete; anon cannot read
- [ ] `npm run check` and `npm run build` pass

## Out of scope
- UI (T-121), KO text/voice parsing and quotas (T-122)
- Nutrition generator, weekly progression
- Tagging captain custom exercises
- Editing migrations 0001–0074

## Owner decisions
- Curated list size (proposed ~120 global exercises) before T-121 ships.

## Implementation plan
- Add deterministic unit tests for strict briefs, all split/goal/level/equipment combinations,
  prescriptions, injuries, favorites, alternatives, seed variation and atomic failure.
- Implement pure brief validation, split recipes, prescriptions, seeded selection and draft
  assembly. Reuse builder types via the programs public API; allocate persistence ids separately
  with the existing UUID v7 helper so generation stays deterministic.
- Add migration 0075 with catalog-backed tags, global-only integrity, read-only RLS and seed
  coverage tests; load paginated tagged catalog rows and captain-owned usage counts.
- Run focused tests, then npm run check and npm run build; inspect the scoped diff.

## Implementation decisions for review
- Seed contains 126 unique catalog dataset ids. Coverage is cumulative across equipment tiers
  and asserted for every pattern/equipment combination used by the recipes. The catalog lacks
  three genuine bodyweight vertical presses, chest isolations, or shoulder isolations, so those
  slots become horizontal presses/core. Beginner non-gym vertical pulls become horizontal pulls.
  This interprets coverage as the combinations the splits need, rather than inventing tags for
  stretches. Bodyweight means unweighted; catalog movements may require a bench or pull-up bar.
- `GeneratedProgram` reuses builder types without persistence ids. `toProgramDraft` accepts an
  existing program id and translated title, then allocates child UUID v7 ids exactly once before
  calling the existing builder save path. Saturday is weekday 0, matching weekly-draft.ts.
- `src/features/programs/index.ts` additionally exports ProgramDraft, DraftDay, DraftExercise,
  and LibraryExercise, as authorized by the reviewer.
- A private curated seed function and restricted catalog-import trigger support both catalog
  import orders. The trigger is SECURITY DEFINER only to write the read-only tags table; it
  accepts only global exercises with curated dataset ids. No public RPC or write grant is added.
- Missing safe patterns try ordered substitutes (direct patterns before indirect fallbacks),
  retaining same-day uniqueness and compound ordering. Substitutions expose `replacedPattern`
  plus `replaced_for_<injury>` when injury filters exclude candidates for the requested pattern.
  `injury_safe_<injury>` applies only to normally affected patterns; `seeded_choice` is omitted.
  Exhausting all fallback patterns still returns an atomic typed error.
- Real-seed regression coverage spans every split, goal, level, equipment tier, duration and
  injuries in [], [knee], [shoulder], [lower_back], [knee, lower_back] (2,700 briefs). Supported
  bilateral bridges and hamstring curls retain lower-body choices; added catalog core exercises
  prevent duplicate exercises when upper-body slots need substitutes. Unilateral bridges and
  spinal-flexion core exercises retain their lower-back stress tags.
- Global-to-private catalog conversions remove tags instead of blocking maintenance; returning
  a curated row to the global catalog restores its tag. Tests cover both directions.

## Verification in this checkout
- TypeScript and ESLint pass. `npm run check` reaches release audit, then the sandbox blocks
  its Git child process (`spawnSync git EPERM`). The same rules run via a shell Git pipe report
  two existing unguarded dev/ko routes, outside this card's scope.
- Vitest with native config loading and thread workers: 391 files / 2,675 tests pass. Only
  perf-budget.test.ts is excluded because the failed build leaves stale .next chunk references.
  The default Vite config loader also hits a sandbox-blocked Windows `net use` subprocess.
- `npm run build` fails only fetching Alexandria, Changa and Manrope from Google Fonts.

## References
- `docs/ARCHITECTURE.md` §4, §5
- `src/features/programs/weekly-draft.ts`, `save_weekly_program` (0070)
- `src/features/ko-account/drafts.ts` (current KO training draft, to be replaced in T-122)
