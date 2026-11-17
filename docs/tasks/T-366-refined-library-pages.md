# T-366: Refined look for programs, builder, exercises, meal plans, foods and check-ins

**Migration:** none. **Read first:** `AGENTS.md`, `docs/tasks/REFINED-LOOK.md`, then mockups `c08` to `c13` in `docs/mockups/refined/`.

## Files
Edit only these:
- `src/features/templates/**`
- `src/features/programs/**`
- `src/features/captain-workspace/training/**`
- `src/features/captain-workspace/library/**`
- `src/features/captain-workspace/forms/**`
- `src/features/meal-plans/**`
- `src/features/forms/**`, captain side. The player form-fill screen belongs to T-367; if a shared component renders there too, keep it working for both.
- their tests, and their messages

Do not touch `src/features/captain-workspace/components/**` or `queue/**` (T-365 owns them).

## c08: Programs (`templates`)
- One header row:
  - the title;
  - a `Segmented` filter if one exists;
  - «برنامج جديد» as the only lime button.
- Program cards in a full-width grid. Each card has:
  - the name;
  - a goal tag (`tone-*`);
  - the number of days per week;
  - how many players are on it (use the existing grammar helpers);
  - the week as 7 small cells, with training days lime-soft;
  - a menu.

## c09: Builder (`programs`, `captain-workspace/training`)
- Three areas:
  - the day list on the start side;
  - the open day's exercises in the middle, as rows with sets × reps, rest and a drag handle;
  - the exercise picker or settings panel on the end side.
- Keep the auto-save, the number fields and every editor behavior exactly as they are.

## c10: Exercises (`captain-workspace/library`)
- A search and a muscle-group filter.
- A grid of exercise cards. Each card has the media, the name, muscle tags and equipment.
- «تمرين جديد» is the one lime button.

## c11: Meal plans and c12: Foods (`meal-plans`)
- **Meal plans:** each plan is a card with:
  - the name;
  - the calories as a big number;
  - the macro split as thin bars (protein, carbs and fat, in the lime, info and warn tones);
  - the number of meals and of players.
- **Foods:**
  - a search and a category `Segmented`;
  - one `glass` card of rows, each with the name, portion, kcal and P/C/F in tabular numbers.
- Keep «جم» for grams (T-362).

## c13: Check-ins (`forms`, `captain-workspace/forms`, captain side)
- The forms library as cards, each showing its question count and how many players use it.
- Check-in review:
  - the player's answers in `glass` cards;
  - photos in a grid;
  - the captain reply box.
- No KO suggested reply unless it already exists.

## Done when
- The screens match the mockups at 1440×900 and collapse cleanly under 760px.
- `npm run check` and `npm run build` pass.
- The final message follows AGENTS.md section 8. Under Notes, list every mockup element you left out.
