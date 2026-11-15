# T-307: seven medal ranks and medal sets

Mockup approved by the owner on 2026-11-15: `docs/mockups/ranks/ranks-v5.html` (screenshots `ranks-v5.jpg`, `ranks-v5-phones.jpg`, `ranks-v5-sets.jpg`). Open it and match it.

In scope:
- the seven-rank ladder;
- the four medal sets (workouts, full weeks, PRs, crown);
- the rank page, the "how to earn points" sheet, the points at the end of a workout, the unlock moment;
- the captain views and the captain notification.

The "rank per lift" (strength) set in the mockup is **out of scope**; it is T-308.

## Today
- **Points:** they live in `points_log` and `player_points` (migration 0081 and later), and are awarded only in SQL.
  - `security_private.points_tier(int)` returns the 4 legacy keys `beginner | champion | elite | legend` at 0/100/300/600.
  - The live callers are `security_private.count_points()` (the trigger that sends `rank_up`), `public.my_points()` and `public.team_leaderboard(date)`.
- **App:** `src/features/ranks/tiers.ts` mirrors those 4 tiers, plus `legendStars`.
  - `src/ui/rank-badge.tsx` draws the old badges (and a `crown` badge).
  - The zod schemas in `ranks/data/*-schema.ts` parse `tier` as the 4-key enum.
- **Level-up:** the celebration uses `ranks/level-up.ts` and `hooks/use-level-up.ts`, which store the last seen tier in localStorage.
- **Live data:** the highest player has 31 lifetime points, so nobody is above the first rank.

## Decisions (owner-approved)

### Seven ranks from lifetime points

| Rank | Key | Points |
|---|---|---|
| حديد | `iron` | 0 |
| برونز | `bronze` | 100 |
| فضة | `silver` | 200 |
| ذهب | `gold` | 300 |
| بلاتين | `platinum` | 400 |
| ماس | `diamond` | 600 |
| أسطورة | `legend` | 900 |

- Legend stars start at 1200, one every 300.
- Ranks never go down.
- The monthly crown rules stay exactly as they are.

### Medal sets
Five medals per set. The metal for each step follows the mockup's `data-tiers`.

| Set | Counts | Steps | Metals |
|---|---|---|---|
| Workouts (`flame`) | completed workout sessions | 1, 10, 50, 100, 250 | 0, 1, 2, 3, 5 |
| Full weeks (`calendar`) | counted `perfect_week` rows | 1, 4, 12, 26, 52 | 1, 2, 3, 4, 6 |
| PRs (`bolt`) | counted `pr` rows | 1, 10, 25, 50, 100 | 0, 1, 2, 3, 5 |
| Crown (`crown`) | months the player held the team crown | 1, 3, 6, 3 in a row, 12 | 3, 4, 5, 5, 6 |

The "3 in a row" step is the longest run of consecutive crown months.

### Captain notification
The linked captain gets a notification when a player reaches a new rank.

## Do

### A. Migration `supabase/migrations/0121_medal_ranks.sql` (additive only; never edit old migrations)
1. **`security_private.medal_rank(p_total int) returns text`** (immutable) returns the seven keys above.
2. **Keep `points_tier` and every RPC's existing `tier` column unchanged**, so app versions still cached on phones keep parsing.
   - Add a new `medal` column only where it is cheap, or let the app derive the rank from `lifetime` (preferred: no RPC change needed).
3. **Rank-up trigger.** Patch `security_private.count_points()` by anchor, the way `0115`/`0119`/`0120` do: read `pg_get_functiondef`, require each anchor exactly once, `execute replace(...)`, and raise on drift.
   - `rank_up` must fire when `medal_rank` changes, not `points_tier`.
   - Keep the payload's existing keys and add `medal`.
   - In the same branch, insert a `player_rank_up` notification for the player's active captain, with payload `{player_id, display_name (first name), medal}`.
   - Use `security_private` helpers that already exist for the active link.
4. **Notification type.** Extend `notifications_type_check` with `player_rank_up` without retyping the list:
   - read the live definition with `pg_get_constraintdef`;
   - drop the constraint;
   - re-add it as `(<old expression>) or type = 'player_rank_up'` with dynamic SQL;
   - raise if the constraint is missing.
5. **New RPC `public.my_medals()`** (security definer, `search_path = ''`, `authenticated` only, revoke from `anon`/`public`).
   - It acts on `auth.uid()` and returns one row: `workouts int, full_weeks int, prs int, crowns int, crown_streak int`.
   - `workouts` counts the caller's non-deleted completed `workout_sessions`.
   - `full_weeks` and `prs` count the caller's `counted` `points_log` rows of those kinds.
   - `crowns` and `crown_streak` come from the same crown-month logic `crown_hall_of_fame()` uses. Reuse its private helper; do not duplicate the ranking rules.
6. **Captain variant `public.player_medals(p_player uuid)`**, with the same columns.
   - Only callable when `is_captain_of(p_player)`.
   - Raise `42501` otherwise.
7. Update `src/types/database.ts`.

### B. App: ranks core
- **`src/features/ranks/tiers.ts`:** `MEDAL_RANKS`, `medalRank(lifetime)`, `nextMedalRank(lifetime)` returning `{ rank, needed }`, and `legendStars` with the new 1200 start.
  - Keep the old exports only while something still imports them; remove them once nothing does.
- **`src/features/ranks/medals.ts`** (pure):
  - the set definitions above;
  - `medalProgress(counts)` returning, for each set, the earned steps, the next step and its percent;
  - `earnedCount`.
- **`src/features/ranks/data/load-medals.ts`:** calls `my_medals()` and `player_medals()` with zod schemas.
- **`src/ui/medal.tsx`:** one component that draws the mockup medal.
  - Props: `rank: 0..6`, `emblem: 'star' | 'flame' | 'calendar' | 'bolt' | 'crown'`, `size`, `locked`, `label`.
  - Port the SVG geometry from the mockup's `medal()` function:
    - the frame becomes a shield from gold up;
    - wings from silver up;
    - a crown on top from diamond up.
  - Colors become tokens in `globals.css` `@theme` (`--color-medal-<rank>-a|b|c|gem|gem2`), with **no hex in the component**.
  - Gradient ids use `useId()`.
  - Respect `prefers-reduced-motion`; no infinite animation.
- **Replace `RankBadge`** with `Medal` (emblem `star`) wherever a player's rank shows:
  - rank hero, rank chip, team board, rank journey, level-up panel, hall of fame;
  - captain `rank-review` lists and crown card;
  - the share card image.
  - Crown visuals keep their current badge unless the mockup shows otherwise.
  - Delete `rank-badge*` only if nothing imports them any more.

### C. Player screens (match the mockup)
1. **Rank page (`/player/rank`, `rank-v6.tsx` and its pieces):**
   - **Hero:** the medal, the rank name, a progress bar, and «فاضلك N نقطة على X · حوالي …».
     - The time estimate is the remaining points ÷ the player's average weekly points over their last 4 weeks.
     - When there is no history, use 24 per week.
     - Round to «أقل من أسبوع» / «حوالي أسبوع» / «حوالي N أسابيع» / «حوالي N شهور».
   - **The month's crown race:** it already exists; restyle it to the mockup card, with the gap line «تمرينين كمان وتعدّي X» built from the existing crown gap data.
   - **Rank medals:** a 3-column grid of all 7, with earned, next (lime with percent), and locked (grey with points).
   - **«ميدالياتك التانية»:**
     - the counter shows «N من 20»;
     - it shows the earned medals first, then the next one of each set;
     - tapping it opens a sheet with all four sets.
   - **Button «إزاي أجيب نقط»:** opens the sheet from screen 2.
   - Keep the hall of fame, the points log and the details sections below, collapsed as today.
2. **«إزاي تجيب نقط» sheet** (use the existing sheet/`ResponsiveDialog` pattern):
   - one row per point source with its value;
   - a lime check when it is already earned today (from `my_points().logs` with today's `earned_on`);
   - the full-week row shows «فاضل N تمرين» from the existing week progress data, if it is already available on the client; otherwise plain text;
   - a hint line for the fastest path to the next rank;
   - a primary button «ابدأ تمرين النهارده» linking to today's workout, or the workout list when today is a rest day.
3. **End of workout** (`workout/components/done-panel.tsx` or `finish-hero.tsx`, wherever T-145 shows the workout points):
   - the big «+N» with the rows (workout +3, each PR +1);
   - the medal card with the progress bar;
   - a crown-race line when the player is in the top 3.
   - Points come from the server after sync. If they are not there yet, show the expected rows as pending; never invent numbers.
4. **Unlock:**
   - The level-up celebration uses the new medal and the copy «بقيت <rank>», with «كمّل» and «شارك الرتبة» (reuse the share flow).
   - The same celebration, with its own copy («ميدالية جديدة»), fires once for each newly earned set medal. Store the seen medals in localStorage, following `use-level-up.ts`.
   - One celebration at a time: rank first.
   - The motion runs once, and not at all under reduced motion.

### D. Captain screens
- The team leaderboard and the `rank-review` lists show the player's medal by lifetime, as in the mockup's captain frame.
- The player file header shows a chip: medal + rank name + lifetime points.
- `player_rank_up` notifications render in the captain's notification list with the text «<name> طلع <rank>», and tapping opens that player's file.
- Add the type to `src/features/notifications` formatting and tests.

### E. Copy
- Messages in ar, arStd and en. arStd is gated as the existing files do (getter or a separate `standard` file with `as const`).
- English rank names: Iron, Bronze, Silver, Gold, Platinum, Diamond, Legend. Set names: Workouts, Full weeks, Personal records, Crown.
- No emoji. Logical properties, tokens only, targets of at least 48px, the T-278 spacing scale and T-275 click cues. Keep the v11 look and the liquid button style.

## Tests
- **PGlite `supabase/tests/medal-ranks.test.ts`:**
  - `medal_rank` boundaries (0, 99, 100, 199, 200, 299, 300, 399, 400, 599, 600, 899, 900);
  - `rank_up` fires at 100 and at 200 (a new medal), and not twice;
  - the captain gets one `player_rank_up` per new rank, and none when the player has no active captain;
  - the notifications check still accepts every old type plus the new one;
  - `my_medals` counts, including the crown streak;
  - `player_medals` works for the captain and is denied for another captain and for anon.
- **Unit tests:**
  - `medalRank` and `nextMedalRank` boundaries;
  - `legendStars` at 1199, 1200 and 1500;
  - `medalProgress` for each set;
  - the time-estimate rounding;
  - the celebration order (rank first, one at a time, never repeated).
- **UI tests** in the existing render-to-string style:
  - the rank page shows 7 rank medals and the other-medals counter;
  - the sheet marks today's earned rows;
  - the captain chip renders.

## Out of scope
- T-308, the rank per lift.
- Changing point values or crown rules.
- Applying anything to a hosted database.
- Old migrations.

## Gates
1. The new tests.
2. `npx vitest run supabase/tests src/features/ranks src/features/rank-review src/features/notifications src/features/workout src/features/captain-workspace src/ui`
3. `npm run typecheck`
4. `npm run lint`
