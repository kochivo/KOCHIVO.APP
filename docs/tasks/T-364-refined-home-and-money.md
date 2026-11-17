# T-364: Refined look for captain home, subscriptions and packages

**Migration:** none. **Read first:** `AGENTS.md`, `docs/tasks/REFINED-LOOK.md`, then mockups `c01`, `c14` and `c15` in `docs/mockups/refined/`.

## Files
Edit only these:
- `src/features/dashboard/**`
- `src/features/billing/workspace/**`
- `src/features/billing/packages/**` (captain side only)
- `src/features/captain-workspace/money-owed/**`
- their tests, and their `messages.ts`

Do not touch `src/app/*.css`, `src/ui/**` or `src/features/roster/**` (T-363 owns them).

## c01: Captain home (`dashboard`)
Match the mockup from top to bottom:
1. **Header**
   - A greeting and the date sub-line.
   - The page's one lime button, «ضيف لاعب».
   - Search and the bell stay in the frame top bar. Do not duplicate them.
2. **KO strip** (`ko-strip`, full width)
   - The day's count as the single `engraved` hero number.
   - The KO summary sentence from the existing smart alerts / next task data.
   - The first suggested action as a secondary button.
3. **StatStrip, 4 cells** from the data the home already loads:
   - weekly commitment % with a thin bar;
   - tasks waiting;
   - money this month (or what is owed);
   - active players.
   Use only numbers the home already has. If one is missing, use 3 cells. Never show a fake number.
4. **Two columns** (stack under 1100px):
   - Main: the tasks list card, with a header, a `Segmented` filter if the tasks list already supports one, and the mockup's 58px `.row` rows with tags.
   - Side: the player finder, activity and start steps as compact `glass` cards with no dead space.
5. Keep every current home feature: smart alerts, start steps for new captains, player finder, activity, errors, empty states and loading. They move into the structure above; none is removed.

## c14: Subscriptions (`billing/workspace`) and the money-owed slot
- A StatStrip at the top for the existing totals (collected, owed, active, ending soon), using `tone` colors as in the mockup.
- Then the subscriptions list as one `glass` card with 58px rows:
  - name;
  - package;
  - status as a `tone-*` tag (warn for ending soon, danger for overdue);
  - amount in tabular numbers;
  - a row action.
- The existing filters become a `Segmented` control in the card header.

## c15: Packages (`billing/packages`)
- Package cards in a grid that fills the row:
  - name;
  - price as a big number with its unit;
  - duration;
  - an included list with check icons;
  - edit as a secondary button.
- The most popular or featured package (if the data marks one) uses `glass-featured`.
- «باقة جديدة» is the one primary button.
- Do not build coupons or the «مين على أنهي باقة» breakdown unless the data already exists. List them in Notes.

## Done when
- The screens match the mockups at 1440×900. Under 760px they are one column with nothing cut off.
- `npm run check` and `npm run build` pass.
- Final message follows AGENTS.md section 8. "Notes for reviewer" lists every mockup element you left out for lack of data.
