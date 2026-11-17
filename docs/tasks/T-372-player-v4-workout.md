# T-372: Player v4 workout (overview, set, rest timer, pain, finish, history)

**Migration:** none. **Owner decision 2026-11-18:** build the player v4 mockups 100%, fully working.
**Depends on:** T-370 and T-369 (pain stop), which are already in master.

## Read first
- `AGENTS.md`, `DESIGN.md`, `docs/tasks/REFINED-LOOK.md`, `docs/tasks/T-369-pain-stop-workout.md`.
- `docs/mockups/player-v4/03-day`, `04-set`, `05-timer`, `06-pain`, `07-pain-after`, `08-done` and `12-history`. Match them 1:1.

## Files
Edit only these:
- `src/features/workout/**`
- tests

## What to build
1. **Day overview (03).** It shows the day name, the stats strip, the exercise list with thumbnails, set×rep and a done mark, and one lime "start" button. Swap and alternatives keep working.
2. **Set screen (04).** It shows:
   - the big weight and reps steppers on `glass-strong`;
   - last time's numbers;
   - set dots;
   - one big lime done button.

   Video, form check and pain report stay reachable as in the mockup.
3. **Rest timer (05).** A big countdown ring with two new buttons, **−15** and **+15** seconds, next to skip.
   - The time never goes below 0.
   - The change applies to this rest only.
   - Put it in a pure helper with unit tests. Keep the existing timer and notification logic.
4. **Pain (06, 07).** Restyle to the mockup. The after-send panel lists the exercises still safe today and the ones removed for pain, by name, using the T-369 `remainingPainIds` result. Keep every T-369 rule and test.
5. **Finish (08).** It shows the headline (including the T-369 pain headlines), duration, volume, sets, PRs, points and one lime "back home" button. Keep share and the record card if the mockup shows them.
6. **History (12).** The calendar and the list of past workouts with the volume line, restyled to the mockup.

## Do not change
- offline writes (`saveAndQueue`), ids, points and session completion
- the flag-off markup

## Done when
- Tests cover:
  - the ±15 helper (it clamps at 0 and adds to the remaining time);
  - the safe and removed lists after a pain report;
  - the finish headline.
- `focus-*` files stay at 250 lines or fewer. It fits at 360px and 390px. `npm run check` passes.
