# T-121 — Program generator screens

**Phase:** KO core · **Depends on:** T-120 · **Status:** draft

## Goal
From a player's programs page or the templates screen, the captain taps **Generate with KO**,
fills a one-screen brief with chips (no typing needed), sees the generated week, swaps any
exercise with one tap, and assigns it. Thirty seconds instead of an hour, and nothing reaches
the player until the captain confirms.

## Files
Create or modify only these:
- `src/features/program-generator/components/generate-button.tsx`: entry button
- `src/features/program-generator/components/brief-sheet.tsx`: brief form (chips)
- `src/features/program-generator/components/generated-week.tsx`: day tabs and exercise list
- `src/features/program-generator/components/generated-exercise.tsx`: row with reasons and swap
- `src/features/program-generator/components/swap-sheet.tsx`: alternatives for one slot
- `src/features/program-generator/hooks/use-generator.ts`: brief, seed, regenerate, swap state
- `src/features/program-generator/data/save-generated.ts`: save via the existing programs save path
- `src/features/program-generator/messages.ts`
- `src/features/program-generator/index.ts`: export the entry button
- `src/features/programs/index.ts`: re-export existing create, save and activate actions for the generator (reviewer approved).
- `src/features/templates/index.ts`: re-export existing template creation for the generator (reviewer approved).
- `src/features/program-generator/generator-ui.test.ts`
- `src/app/[locale]/(captain)/captain/players/[playerId]/programs/page.tsx`: render the entry button
- `src/features/templates/components/templates-screen.tsx`: render the entry button (save as template)
- This task card.

## Requirements
1. **Brief sheet:** chip groups for goal, level, weekdays (Saturday first), minutes, equipment
   and injuries. Defaults are prefilled from the player profile where available. Player name
   shown at the top when opened from a player. One primary lime button: **Generate**.
2. **Generated week:** day tabs; each row shows the exercise name (locale), `sets × reps`, rest,
   and up to 2 reason chips (for example "Knee-safe", "Your favorite"). Tapping the row opens the
   existing exercise details. A **swap** icon button (translated `aria-label`) opens the
   alternatives sheet. **Regenerate** (secondary) increments the seed and keeps manual swaps
   only if the user confirms.
3. **Primary action:** "Assign to <player>" (or "Save as template" from templates). It saves a
   draft through the existing programs save path, then activates or assigns it with the existing
   flow. Secondary text action "Edit in builder" saves and opens
   `/captain/programs/[programId]`.
4. Generation runs locally (pure engine + already-loaded candidates), so there is no network
   call between brief and preview. Loading, error ("slot cannot be filled, remove an injury or
   change equipment") and empty-candidates states are required.
5. Tokens only, logical properties only, `min-h-12` targets, Arabic Egyptian and short English
   in `messages.ts`, lucide icons. One primary action per screen.

## Acceptance
- [ ] Brief → preview → assign works for a test player in local dev; the player sees it only after assign
- [x] Swap replaces one exercise and keeps the others; regenerate changes the program
- [x] Rendering tests for ar and en, RTL, empty, loading and error states
- [ ] `npm run check` and `npm run build` pass

## Out of scope
- Plan quotas and KO chat entry (T-122)
- Nutrition generator
- Changing the program builder itself

## References
- Mockup: "program generator" (shown in chat 2026-11-09)
- `src/features/programs/components/program-builder.tsx`, `templates/components/assign-sheet.tsx`

## Implementation notes (2026-11-09)
- Approved public API changes are re-exports only; the T-120 engine and existing save behavior are unchanged.
- Intake weekdays convert from Sunday-based dates to Saturday-first builder days. Unsupported durations/day counts use a 60-minute, three-day default; goal defaults to general fitness and equipment to gym where the intake has no matching field.
- Failed profile loads block generation with retry. Unsupported profile injuries require opening the saved draft in the builder before assignment.
- Candidate loading finishes before the brief opens. Preview, regeneration and swaps run locally; save/activation errors retain the draft ID for retries.
- Detail rows use the shared `ExerciseImage` in a native dialog. Reusing the private workout lightbox would require another public export outside the approved Files list; reviewer agreement is still needed for this substitution.
- Feature verification: `npx vitest run src/features/program-generator --configLoader native --pool threads`: 2 files passed, 27 tests passed.
- `npm run check`: TypeScript and ESLint passed; release audit stopped at the known sandbox `spawnSync git EPERM` limit. `npm run build`: only Alexandria, Changa and Manrope Google Fonts fetch failures.
- Live test-player assignment and browser interaction smoke testing remain for the reviewer outside this sandbox.

## Review (2026-11-09)

- Added `sheet` to the three generator dialogs (the opaque-surface rule) and replaced an Arabic-Indic digit in messages (Latin digits only).
- Template screen tests mock `@/features/program-generator`, because `GenerateButton` reaches a server action through `save-generated.ts`.
- Intake weekdays (Sunday = 0) map to Saturday-first builder days with `(day + 1) % 7`; checked against `day-picker.tsx`.
- Not verified in the browser: live assign, template save, and swap flows.
