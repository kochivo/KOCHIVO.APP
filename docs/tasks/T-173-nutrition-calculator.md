# T-173: Nutrition calculator (BMR, TDEE, macros, training/rest days)

**Phase:** Captain suite (owner approval 2026-11-11) · **Depends on:** T-167 · **Status:** ready

## Goal
The design is screen 3 («حاسبة السعرات») in `docs/mockups/captain-workspace/suite.html`.

The captain should never type a number the app already knows. The calculator lives inside the player's nutrition page as a «الحسبة» view next to «الخطة». Every input is prefilled from the player file, and each input shows where it came from. «طبّق على الخطة» writes the targets to the player's nutrition plan.

## Files
- New pure module `src/features/meal-plans/energy.ts` plus `energy.test.ts`. If `meal-plans` already has a calc file, put it next to that file.
- New components in `src/features/meal-plans/components/` for the calculator view, plus messages.
- `src/features/meal-plans/index.ts`: add the public exports the route needs (allowed).
- `src/app/[locale]/(captain)/captain/players/[playerId]/nutrition/page.tsx`:
  - Flag on: a `?view=calc` switch.
  - Flag off: unchanged (with a test).
- This card.

## Requirements
1. **`energy.ts` (pure, no I/O):**
   - **`bmr({weightKg, heightCm, age, sex, bodyFatPct?})`:**
     - Mifflin-St Jeor by default.
     - Katch-McArdle when `bodyFatPct` is given.
     - Rounded to the nearest whole number.
   - **`activityFactor(trainingDays, sessionMinutes)`:** a documented table.
     - 0–1 days → 1.2
     - 2–3 → 1.375
     - 4–5 → 1.55
     - 6–7 → 1.725
     - +0.05 when sessions are ≥ 75 minutes, capped at 1.9.
   - **`targetKcal(tdee, goal, rateKgPerWeek)`:**
     - cut is negative and bulk is positive, with 7700 kcal per kg spread over 7 days;
     - the result is clamped to ≥ BMR for a cut.
   - **`macros(kcal, weightKg, {proteinGPerKg=2, fatPct=25})`:** carbs are the remainder. It returns grams and percentages.
   - **`cycle(avgKcal, trainingDays)`:** training and rest kcal with the same weekly average.
     - training = round to 10 of `avg × 1.08`;
     - rest = round to 10 of `(7 × avg − days × training) ÷ (7 − days)`;
     - with 0 or 7 training days it returns one number for every day;
     - carbs carry the difference.
   - **Rounding rule:** compute with unrounded values; round only the returned outputs. For macro grams, round P and F first, then C = round((kcal − 4P − 9F) ÷ 4).
   - **Fixture** (corrected 2026-11-11: 0.5 kg/week = 550 kcal/day): male, 82 kg, 178 cm, 27 years, 4 days × 60 minutes, cut at 0.5 kg/week gives:
     - BMR 1803 (1802.5 unrounded);
     - TDEE 2794 (2793.875);
     - target 2244;
     - `macros(2244, 82)` (it takes the rounded target) → P 164 / F 62 / C 258;
     - cycle: training 2420, rest 2010.
2. **Inputs view.**
   - Values come from `loadPlayerFile` facts. Each value shows its source (form and date).
   - A missing fact shows «أضف», which opens an inline number field. That value is local only; this card does not write it back.
   - The goal segment has cut / maintain / bulk, with the rate.
3. **Results view.**
   - BMR, daily burn and target use `glass-strong`, and the target is lime.
   - Macro bars.
   - The training/rest split toggle.
   - Two actions: the primary «طبّق على خطة الأكل», and «رقم واحد لكل الأيام».
4. **Apply.** Write the targets through the existing meal-plans targets save path (the one `TargetsBar` uses). It is optimistic and has an error state.
5. **Missing body data** (no intake): show an empty state asking the captain to request a data update.

## Acceptance
- [x] Unit tests for every `energy.ts` function, including the fixture above, Katch-McArdle, clamping, and the cycle average.
- [x] A component test: prefilled values show their sources, and a missing fact shows «أضف».
- [x] A flag-off test for the nutrition page.
- [ ] All gates pass.

## Out of scope
- Storing training/rest day plans. That is T-174; until then, apply writes the average only.
- Auto-recalculation when the weight changes (later).
- Migrations.

## Implementation notes
- Enabled only when `NEXT_PUBLIC_CAPTAIN_WORKSPACE=1`; `?view=calc` selects the calculator.
- `calculateEnergy` retains unrounded BMR/TDEE internally. `targetKcal` takes an explicit fourth BMR argument because TDEE alone cannot determine the cut floor.
- Current and target weight prefill the goal; a missing target defaults to maintenance. Missing inputs and rate edits stay local.
- Applying uses the existing `loadPlan`/`savePlan` path and preserves meals and plan metadata. Training/rest previews are not stored.
- Rounding the day split can move the weekly average by up to 5 kcal/day. Infeasible splits use one average target rather than displaying negative carbs.

## Verification (2026-11-11)
- `npx tsc --noEmit -p .` and `npx eslint .`: passed.
- Default `npx vitest run` encountered Windows `spawn EPERM`. `npx vitest run --maxWorkers=2 --configLoader native --pool=threads`: 466 files passed, 3363 tests passed (including 37 calculator tests).
- `npm run audit:release` and consequently `npm run check` stopped at `spawnSync git EPERM`. The same release scanner, with Git's tracked/new file list piped from PowerShell into Node, reported 0 findings across 1873 files.
- `npm run build`: compiled successfully in 7.1s, then hit `spawn EPERM` at its TypeScript worker. Standalone TypeScript passed; the complete build still needs the reviewer to re-run it.
- The dedicated performance test also needed the Vitest fallback flags. It passed after using Next's own `writeRouteBundleStats` to regenerate stale diagnostics from the compiled manifests. Captain nutrition routes measured 275.1 KiB gzip against the unchanged 310 KiB budget.
- No dependency, migration, budget, or commit changes. All-gates acceptance remains unchecked because the standard Windows commands above were blocked.
