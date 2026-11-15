# T-297: the player sees the tempo (and RPE/RIR) the captain set

## Problem
The captain sets `program_exercises.tempo`: 4 characters such as `3010` or `30X0`, with the constraint in `0005_programs.sql:43`. The player snapshot already loads it (`src/features/player-home/data/program-snapshot.ts:13,56`, with `rpe`, `rir` and `tempo`).

No player workout component renders it: a search for "tempo" in .tsx files under src/features/workout and src/features/player-home finds nothing. So the captain writes a tempo and the player never sees it.

## Do
1. **Tempo on the player's exercise.** Show it in the focus/workout screen and in the workout overview.
   - Use whichever existing components render the current exercise: `src/features/workout/components/exercise-header.tsx`, `workout-overview-exercise.tsx`, and the v3 player workout (`player-workout-v3.tsx`, `workout-v3-model.ts`).
   - Show a small chip: «تمبو 3-0-1-0».
   - Explain the 4 numbers: نزول، تحت، طلوع، فوق. `X` means انفجاري. A tap or a short secondary line both work.
   - Format with a pure helper, `formatTempo('3010')` → `3-0-1-0`. Render it inside `<bdi>` so it keeps its order in RTL.
2. **RPE / RIR.** If either is set and not already shown to the player, show it the same way, with short wording. If one is already shown, leave it alone.
3. **UI rules.** Messages in ar, arStd and en. No emoji. Tokens only, logical properties, the T-278 spacing scale, and the T-275 click cues if the chip is tappable.
4. **Demo.** Since T-288 the demo uses the real `SetRowsView` and header views. Add tempo `3010` to one demo fixture exercise so it shows there too.

## Files
- The workout components above.
- New `src/features/workout/tempo.ts`, with its test `tempo.test.ts`.
- The messages files.
- One demo fixture.
- Component or model tests: the tempo shows when set and hides when null; the same for RPE/RIR.

## Out of scope
SQL, captain screens, other findings.

## Gates
`npx vitest run src/features/workout src/features/demo src/ui`, `npm run typecheck`, `npm run lint`.
