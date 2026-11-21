# T-236 — Program builder: player panel with live checks and injury warnings

**Phase:** captain v11 · **Depends on:** none · **Status:** ready

## Goal
When the captain builds or edits a program for a specific player, the player's data sits beside the editor. Live checks tell the captain whether the program fits: training days, session time, and injuries. An exercise that may hurt the player's injury shows a warning and a one-tap swap.

## Files
Create or modify only these:
- `src/features/captain-workspace/training/training-facts.tsx`: becomes the richer panel (split it if it passes 250 lines)
- `src/features/captain-workspace/training/fit-checks.ts` (new): pure check helpers
- `src/features/captain-workspace/training/fit-checks.test.ts` (new)
- `src/features/captain-workspace/training/injury-note.tsx` (new): the warning row under an exercise
- `src/features/captain-workspace/training/exercise-row.tsx`: render `InjuryNote`
- `src/features/captain-workspace/training/training-content.tsx`: pass the data the panel needs
- the server loader that builds `PlayerFile` for this route, only to add the latest body-fat value and each exercise's `exercise_generator_tags.stress`
- `src/features/captain-workspace/training/messages.ts` (`ar`, `arStd`, `en`)

## Requirements
1. **The panel shows only on player programs** (`player_id` set), not on templates. The data comes from existing sources:
   - name, age, sex, experience → `player_intake`;
   - height, weight, target weight, and the goal (lose / gain / maintain, worked out as today);
   - latest body fat → `body_scans.fat_pct`;
   - training days as 7 day chips → `training_days`;
   - session length → `session_minutes`;
   - injuries as warn pills, and allergies;
   - the intake `notes`;
   - a link «ملفه كامل» to the player file.
2. **Live fit checks** (`fit-checks.ts`, pure, recalculated on every edit), shown as small ok/warn chips:
   - program days vs `training_days.length`, e.g. «4 أيام في البرنامج، وهو فاضي 4 أيام»;
   - the selected day's estimated minutes (the same number `day-summary.tsx` shows) vs `session_minutes`;
   - the count of exercises on the selected day whose `stress` overlaps the player's injuries.
3. **Injury warning.**
   - An exercise whose generator tags `stress` overlaps the player's injuries gets a warn row: «ممكن يضايق <injury label>».
   - It offers up to 1 suggestion from `swapOptions` (`@/features/program-generator`) and a «بدّله» button that uses the editor's existing replace action.
   - Only `knee`, `shoulder` and `lower_back` map, which are the existing tag values.
   - Exercises without tags show nothing. Never guess from names.
4. **Layout and states:**
   - desktop: a full-width card under the day tabs and above the day's exercises;
   - mobile: a collapsed summary (name, weight → target, injury pill) that expands;
   - missing intake shows «اللاعب لسه مكملش بياناته» with the checks hidden.
5. Saving and the offline behaviour of the editor do not change.

## Acceptance
- [ ] Tests:
  - [ ] the days check;
  - [ ] the minutes check;
  - [ ] the injury overlap (none, one, an untagged exercise);
  - [ ] the swap suggestion limited to 1;
  - [ ] the panel hidden on templates;
  - [ ] the missing-intake state.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- New injury types or tags.
- Tagging custom exercises.
- DB changes.
- Changes to the player app or KO chat.

## References
- Mockup: `docs/mockups/captain-workspace/v11-prototype.html` → برامج التمرين → «برنامج للاعب», day 2 (صدر) shows the warning.
- Tables: `0012_player_intake.sql`, `exercise_generator_tags` (stress), `body_scans`.
- Existing code: `training-facts.tsx`, `src/features/ko-account/data/swap.ts` (same `swapOptions` use).
