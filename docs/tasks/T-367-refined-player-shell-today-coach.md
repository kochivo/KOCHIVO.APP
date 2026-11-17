# T-367: Refined look for player navigation, today, rest day, coach and check-in

**Migration:** none.
**Read first:** `AGENTS.md`, `docs/tasks/REFINED-LOOK.md`, then mockups `p1`, `p5`, `p7` and `p8` in `docs/mockups/refined/`.
Player screens are designed at 390×844 and must also fit 360px.

## Files
Edit only these:
- `src/features/player-shell/**`
- `src/features/player-home/**`
- `src/ui/pill-nav.tsx` and its tests (only the player shell uses it)
- `src/features/voice-notes/**`, only if the coach screen needs a style change there
- The player form-fill screen inside `src/features/forms/**`, only if p7 needs it. Leave the captain side to T-366.
- Their tests and their messages

## Bottom nav (all player screens)
- The mockup has a labeled bar with 5 tabs: النهارده، التمرين، الأكل، التقدم، الكابتن.
  - Every tab shows its icon and its label.
  - The active tab is lime: icon and label, in bold. The others use `text-faint`.
- It is a full-width bar with a top hairline and a dark translucent background, as in the mockup. It no longer floats as a pill.
- Keep:
  - the current destinations and their order;
  - `aria-current`;
  - touch targets of 48px or more;
  - safe-area padding;
  - `--nav-height` and the content clearance, so nothing hides behind the bar;
  - the KO engraved icons.

## p1: Today (`player-home`)
Build it top to bottom:
1. The greeting row.
2. The hero card for today's workout:
   - a `glass` card with `cut-corner`;
   - the day name;
   - the exercise count and duration;
   - the single lime «ابدأ التمرين».
3. A compact `StatStrip` of the week's numbers that already exist: streak, workouts done, and calories or water.
4. The meals and next-task cards.

Keep everything the home has today, in the mockup's order: the week strip, Ramadan mode, the streak ring and the rest. There should be no empty blocks; media placeholders use a fixed ratio.

## p8: Rest day
- Same structure as p1, with a calm rest hero that keeps the `rest` mood.
- Recovery tips or a light activity, only from data that already exists.
- The lime button is the one action the rest day already offers.

## p5: Coach (`player-shell` captain screen)
- The captain header card: avatar, name and message action.
- The chat thread with `glass` bubbles.
- Voice notes stay as they are.

## p7: Check-in (player form fill)
- One question per `glass` card.
- Options as large chips, 48px or more.
- A thin progress bar at the top.
- A single lime submit button.

## Done when
- The screens match the mockups at 390×844 and fit at 360px.
- Every existing player-shell, home and nav test passes. Change an assertion only where it checked the old pill look, and name the ones you changed.
- `npm run check` and `npm run build` pass.
- The final message follows AGENTS.md section 8, including Notes.
