# T-174: Meal plan editor: live targets, training/rest days, allergy flags, household units

**Phase:** Captain suite (owner approval 2026-11-11) · **Depends on:** T-173 · **Status:** implemented; generated types and release gates pending
**Migration:** yes. It is additive, and applying it to production needs the owner's approval.

## Goal
The design is screen 4 («خطة الأكل») in `docs/mockups/captain-workspace/suite.html`.

Improve the existing captain nutrition plan editor; do not replace its data model. Everything is behind the flag, and the flag-off editor is unchanged.

## Files
- New migration `supabase/migrations/0092_meal_day_types_and_units.sql` (0091 is occupied), plus a PGlite test in `supabase/tests/`.
- Regenerate `src/types/database.ts` the way T-163 does it. Corrections go in the overlay only.
- `src/features/meal-plans/` (new components and pure helpers), messages, tests.
- This card.

## Requirements
1. **Migration (additive only):**
   - `meals.day_type text not null default 'all' check (day_type in ('all','training','rest'))`. Existing rows stay `all`, so today's plans behave exactly as before.
   - `foods.units jsonb not null default '[]'`. Each entry is `[{ key, name_ar, name_en, grams }]`, and a check keeps it an array.
   - Seed units for the existing global Egyptian staples that already exist, for example رغيف 90 g, حباية بيض 50 g, طبق 200 g. Do it with an idempotent update by name; never insert duplicates.
   - RLS is unchanged. The test proves a captain cannot edit global foods' units and can edit their own.
2. **Targets bar (sticky).**
   - Calories, protein, carbs and fat as plan / target, with a bar and a %.
   - Lime when within ±5%, warn when over, muted when under.
   - Pure helper `targetStatus(planned, target)`, unit tested.
3. **Day types.**
   - Chips: «يوم تمرين / يوم راحة» (only when a plan has typed meals or the captain turns cycles on), plus «انسخ من يوم التمرين».
   - Meals with `all` show in both.
   - Targets per day type come from T-173's `cycle()`.
4. **Allergy and medical flags.** A pure `flagFood(food, facts)` matches player-file allergies against food names and tags (Arabic and English keyword table, documented and tested). A flagged item row is danger-styled, says why, and offers alternatives from `meal_item_alternatives` when they exist.
5. **Household units.** A quantity stepper in the food's units (e.g. «1 رغيف»), falling back to grams. Macros are computed from grams.
6. **Inline add.**
   - Search inside the meal over global foods plus the captain's own foods (a «أكلاتي» badge), Arabic and English, bounded to 20 results.
   - The last option is «مش لاقيها؟ أضفها», which opens the T-175 food form prefilled with the query.
7. **Smart notes panel (pure rules, unit tested):**
   - allergy conflict;
   - a macro gap with a concrete fix (which item to increase, and by how much);
   - the last 7 days' adherence chips from `meal_logs`, bounded.
8. **Send.** «ابعت لأحمد» (the player's name) uses the existing publish path. The autosave indicator uses the existing save.

## Acceptance
- [x] PGlite tests for the migration: defaults, checks, RLS and idempotent seeding.
- [x] Unit tests for `targetStatus`, `flagFood`, the unit conversion and the notes rules.
- [x] A flag-off test: the old editor is unchanged.
- [ ] All gates pass. Report the route budget.

## Out of scope
- The foods library page (T-175).
- Player-side display of day types: the player app keeps showing all meals until a follow-up card.
- `src/app/globals.css` and `src/features/luxury-preview`.

## Implementation plan and reviewer notes (2026-11-11)

- [x] Add migration 0092 without changing existing functions or policies. The three-argument
  `save_nutrition_plan` overload invokes the original two-argument save, then writes day types
  atomically under the caller's RLS permissions. The original signature remains intact.
- [x] Add deterministic rules/tests for target status, units, bilingual conflict matching,
  day filtering/copy/reordering, actionable macro gaps and seven-day scheduled adherence.
- [x] Gate the enhanced entry with `NEXT_PUBLIC_CAPTAIN_WORKSPACE`; keep legacy save/publish
  paths and add debounced autosave only to the enhanced editor.
- [x] Add live targets, day controls, unit steppers, conflict alternatives, notes, inline search
  limited to 20 results, and query-prefilled reuse of the existing custom-food form.
- [ ] Replace `src/types/database.ts` with an actual generated artifact. T-163 used a
  reviewer-provided `database.generated.ts`; no such artifact is present here. Live Supabase
  access is prohibited for this card, so the generated file was deliberately left untouched.
  New row fields are runtime-validated in `data/editor-fields.ts`, with no hand edits to the
  generated schema or type corrections outside the overlay.

Keyword policy: `food-flags.ts` documents conservative Arabic/English token matching for
dairy/lactose, eggs, nuts, gluten, fish/shellfish/seafood, soy, sesame, diabetes (sugar/honey)
and blood pressure (salt/salted). Canonical intake codes `seafood` and `blood_pressure` are
covered. Unknown facts match literal names/tags only; these flags are review prompts, not
medical diagnoses. Token boundaries prevent egg/eggplant false matches. Conflicting foods
are excluded from increase suggestions and suggested alternatives.

Verification so far:
- `npx tsc --noEmit -p .`: passed; `npx eslint .`: passed.
- `npm run check` reaches the release audit, then stops on `spawnSync git EPERM`.
- `npm run audit:release`: same EPERM. Its unchanged `scanFile`/`scanRoutes` functions,
  supplied paths by PowerShell `git ls-files --cached --others --exclude-standard`, report
  **1905 paths, 0 findings** (includes new task files).
- Default `npx vitest run` hits `spawn EPERM`; the specified
  `--maxWorkers=2 --configLoader native --pool=threads` fallback reports
  **473 files passed, 1 skipped; 3422 tests passed, 1 skipped** on the final run.
  The subsequent focused feature/migration run reports **22 files passed, 148 tests passed**.
- `npm run build` (final flag-enabled run): **Compiled successfully in 15.6s**, then `spawn EPERM` during the
  TypeScript worker. The separate compiler gate passed; build settings were not changed.
- Default `npx vitest run src/lib/perf-budget.test.ts` hits `spawn EPERM`; the same fallback
  reports **1 skipped**, because no `route-bundle-stats.json` was produced.
- Compilation-only route measurement from the union of root and route-entry JavaScript
  chunks: `/captain/nutrition/[planId]` **280.07 KiB gzip** with the flag enabled,
  unchanged ceiling **310 KiB**. The earlier flag-off compilation measured **280.04 KiB**.
  These do not substitute for a successful full build/performance gate.

Read-only review identified missing persisted allergy/medical codes and reordering across
hidden day-type meals, and autosave recovery after a validation failure. All were reproduced
with failing tests and fixed; legacy error behavior is covered separately. No live project
was contacted, no migration was applied outside PGlite, and no dependency or budget changed.
