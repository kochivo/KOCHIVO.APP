# T-368: Refined look for player workout, food, progress, rank, account, and captain settings

**Migration:** none. **Read first:** `AGENTS.md`, `docs/tasks/REFINED-LOOK.md`, then mockups `p2`, `p3`, `p4`, `p6`, `p9` and `c16` in `docs/mockups/refined/`.

## Files
Edit only these:
- `src/features/workout/**`
- `src/features/nutrition/**`
- `src/features/progress/**`
- `src/features/muscle-analytics/**`
- `src/features/ranks/**`
- `src/features/settings/**` (both captain c16 and player p9)
- their tests, and their messages

Do not touch `src/ui/**` or the player shell (T-367).

## p2: Workout (`workout`)
- Header:
  - the exercise name;
  - the set counter, for example "2 من 4";
  - a thin progress bar.
- Media in a fixed-ratio `glass` frame.
- Set table rows:
  - the previous set;
  - weight and reps steppers (keep the gym-size steppers);
  - the done button.
- The rest timer card.
- The single lime action.
- Do not change the logging, offline save, timers or any workout logic.

## p3: Food (`nutrition`)
- Calories hero: an `engraved` remaining number, or a ring if the current screen already has one.
- A macro `StatStrip` with thin bars for protein, carbs and fat.
- Meals as `glass` cards, each with food rows and a check action.
- Water.
- Shopping stays reachable.

## p4: Progress (`progress`, `muscle-analytics`)
- A `StatStrip` with the key numbers:
  - weight;
  - change, shown as a `delta`;
  - workouts;
  - volume.
- The weight chart card. In RTL its labels read from oldest to newest: «من شهرين، من شهر، النهارده».
- The muscle analytics card.
- Body scans, if they exist.

## p6: Rank (`ranks`)
- Current rank hero:
  - the medal;
  - the points as the `engraved` number;
  - progress to the next rank as a thin bar.
- Then the history or the next ranks.
- Keep the medal art.

## p9 and c16: Account and settings (`settings`)
- A profile header card at the top.
- Grouped `glass` cards with 56px rows: label, current value, then a chevron or a switch.
- One card per topic. No duplicate cards: language and time stay merged (T-362).
- Sign out is a secondary danger button at the bottom.
- The captain and player versions share these components, so both must look right.

## Done when
- The player screens match at 390×844 and fit at 360px.
- Captain settings matches at 1440×900.
- `npm run check` and `npm run build` pass.
- The final message follows AGENTS.md section 8, with Notes.
