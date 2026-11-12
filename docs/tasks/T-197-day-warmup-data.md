# T-197: Warm-up data per training day (migration 0098)

**Phase:** Unified program editor (owner approved mockup 2026-11-12: "اعتمده… عاوزه يطلع 100% زي ال mockup") · **Depends on:** none · **Status:** ready
**Migration:** `supabase/migrations/0098_day_warmup.sql` (additive only; the reviewer applies it to production after owner OK). **Flag:** data only; no UI.

Read first: `docs/mockups/captain-workspace/v6-program-editor.html` (block «التسخين» and the player screen «اللاعب بيشوف إيه»), `AGENTS.md`, `docs/ARCHITECTURE.md`.

## Files
- `supabase/migrations/0098_day_warmup.sql` (new) and a PGlite test in `supabase/tests/`.
- `src/types/database.ts` (only the `program_days` Row/Insert/Update entries).
- `src/features/programs/types.ts`, `src/features/programs/data/program-io.ts` (load + `draftSchema`), a new pure module `src/features/programs/warmup.ts` (+ test), `src/features/programs/index.ts` exports.
- `src/features/player-home/data/program-snapshot.ts` select list only (so the player side receives the field).
- This card (append "Verification").

## Requirements
1. Add `program_days.warmup jsonb not null default '{"items":[],"ramp":false}'::jsonb` with a CHECK that it is an object, `items` is an array of at most 12, and `ramp` is boolean. Existing rows keep working (default). Never edit migrations 0001–0097.
2. Item shape: `{ id: uuid, name: text 1–60, amount: int 1–999, unit: 'min'|'sec'|'reps'|'times', note?: text ≤ 80 }`. Validate it in `warmup.ts` (zod, matching the existing `draftSchema` style). The SQL check covers shape at the top level only; the app validates items.
3. `save_weekly_program(jsonb)` must persist `warmup` on insert and on conflict update. Patch the **current** function definition the same way earlier migrations did (`pg_get_functiondef` + guarded replace, see 0055 / 0070 / 0097), and raise if the expected text is not found so a silent no-op is impossible.
4. Every SQL path that copies program days must copy `warmup` too: template → player assignment, saving a player program as a template, duplicating, starter templates for new captains, demo workspaces. Find the **latest** definition of each (grep all migrations, later files override earlier ones) and patch with the same guarded approach. List each function you patched in "Verification".
5. `DraftDay` gets `warmup: DayWarmup`. Loading an old row without the key yields the empty default. Pure helpers in `warmup.ts`: `emptyWarmup()`, `addWarmupItem`, `removeWarmupItem`, `moveWarmupItem`, `setRamp`, `warmupMinutes(warmup)` (sum minutes; seconds rounded up; reps/times count 0), and `rampSets(workingKg | null)` returning the fixed ladder 50%×10, 70%×5, 85%×2 with kg rounded to the nearest 2.5 when a weight is known.
6. RLS is unchanged (column on an existing table), but add a PGlite test proving: default for old rows, save round-trip through `save_weekly_program`, copy through template assignment, the 12-item limit and a non-boolean `ramp` rejected.

## Out of scope
UI of any kind (T-198, T-199). `src/features/workout/`. Messages.

## Acceptance
- [ ] Migration is additive; old data untouched; the PGlite test passes.
- [ ] Unit tests for every helper in `warmup.ts` (deterministic, no timers).
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.

## Verification

- Added `0098_day_warmup.sql` only; migrations 0001–0097 and RLS are unchanged. The JSONB default applies to existing and new rows; the top-level CHECK rejects missing keys, malformed shapes, more than 12 items, and non-boolean ramp values.
- Patched the current catalog definitions with `pg_get_functiondef` and exactly-one-match guarded replacements:
  - `public.save_weekly_program(jsonb)` — latest patch 0097; base 0050, ownership fix 0055, RIR 0070. Persist warmup on insert and conflict update; missing legacy values default empty.
  - `public.assign_program_template(uuid,uuid)` — latest patch 0097; base 0028, weekly/cardio 0050, RIR 0070. Copy warmup into assigned days.
  - `public.program_to_template(uuid,text)` — latest patch 0070; base 0022, weekly/cardio 0050. Copy warmup into template days.
  - `public.copy_template(text,uuid,text)` — latest patch 0070; base 0036, weekly/cardio 0050. Copy warmup into duplicated days.
  - `security_private.copy_starter_templates(uuid)` — latest patch 0070; base 0030, weekly/cardio 0050. Read warmup from starter JSON with an empty fallback.
- Demo entrypoints `public.create_demo_workspace()` (base 0032, latest patch 0097) and `public.create_demo_player_workspace()` (base 0068, latest patch 0097) delegate to the patched starter/assignment functions. Neither needs a direct patch. Tests exercise both paths with non-empty starter warmup data.
- Added item validation, immutable pure helpers, load/save validation and defaults, database column types, public exports, and the player query select field. No UI changes.
- Focused fallback verification: **3 test files passed; 16 tests passed**, including load/save payload validation, every helper, pre-migration defaults, insert/update saves, template save/copy/assignment, constraints, new captains, both demo workspace paths, new-day defaults, warmup preservation during conversion to a week, and generated-program acceptance.
- `npx eslint .`: passed. `git diff --check`: passed. Release audit fallback: **2439 workspace files, 0 findings**; the normal audit command cannot spawn git (`spawnSync git EPERM`).
- Reviewer approved the minimal constructor/fixture scope extension. `DraftDay.warmup` remains required. New days get an empty warmup; conversion to a week carries source warmup through. Generated days use the same empty object literal, keeping the generator's programs import type-only and avoiding a new runtime dependency on the programs barrel.
- `npx tsc --noEmit -p .`: passed after the extension. `npm run check` passes typechecking and lint, then the release audit fails with **spawnSync git EPERM**.
- `npm run build`: **Compiled successfully in 16.6s**; **Completed runAfterProductionCompile in 419ms**; then **Running TypeScript ... spawn EPERM**. Standalone TypeScript passes.
- Standard Vitest startup cannot probe Windows network drives (`spawn EPERM`). The fallback runs Vitest with two thread workers and the same alias/setup configuration, disabling only the unavailable `net use` probe in memory; no repository tooling files or dependencies are changed.
- Final full fallback suite: **Test Files 1 failed | 626 passed (627)**; **Tests 1 failed | 3995 passed (3996)**. The only failing test is `src/lib/perf-budget.test.ts` / `keeps first-load route JavaScript within gzip budgets`, which reads a missing `.next/static/chunks/32al0u947fwh-.js` artifact. The run began after the preceding build settled and still failed with ENOENT; focused warmup tests are **16 passed**. No performance-budget assertions or generated artifacts were changed to hide this failure.

### Notes for reviewer: approved extra files

- `src/features/programs/draft.ts`: empty warmup for new days.
- `src/features/programs/weekly-draft.ts`: preserve source warmup; default newly filled days.
- `src/features/program-generator/generate.ts`: empty warmup for generated days.
- `src/features/program-generator/warmup-copy.test.ts`: test source warmup preservation when accepting a generated program.
- Typed fixtures only: `src/features/captain-workspace/training/training-ui.test.ts`, `src/features/captain-workspace/week-strip.test.ts`, `src/features/captain-workspace/workspace.test.ts`, `src/features/programs/a11y.test.ts`, `src/features/programs/components/builder-fields.test.ts`, `src/features/programs/components/builder-ui.test.ts`, `src/features/programs/drag-reorder.test.ts`, `src/features/programs/empty-states.test.ts`, `src/features/programs/locale-render.test.ts`, `src/features/programs/save-program.test.ts`, `src/features/programs/weekly-ui.test.ts`.
- No UI component implementations changed. No dependencies, commits, branches, pushes, or hosted migration application.
