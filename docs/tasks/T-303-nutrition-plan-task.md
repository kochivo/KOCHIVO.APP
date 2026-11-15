# T-303: captain gets a task when a player has no nutrition plan

## Problem
When a new player joins and the captain assigns a training program, nothing reminds the captain to add a nutrition plan. Tasks only has `program` (no training program), from `src/features/captain-workspace/queue/tasks-model.ts:40`. A player can stay without a nutrition plan forever, and the captain forgets.

## Do
1. **New task kind `nutrition`.**
   - It applies to an active, non-pending, non-frozen player who is in their access period (the same guards as `program`) and has no active nutrition plan.
   - Text: «محتاج نظام أكل» / plain English «Needs a nutrition plan»; arStd too. Check the existing `program` task copy and match its tone.
   - Action: the button opens the player's nutrition editor. Find the route the player file uses today for nutrition; do not build a new screen. The row links there, like T-295 did for assessments.
   - Add it to `TaskKind`, the priority list (right after `program`), `taskTabs`, the tag and action labels, and the Home task mapping in `src/features/dashboard/home/tasks.ts`.
   - Keep one count source: Home, Tasks and the nav count stay equal (T-283, T-295).
2. **Data, with no SQL.** In `queue/data/tasks.ts` `loadTasks`, read the captain's active nutrition plans:
   - `nutrition_plans` with `status = 'active'`, `is_template = false`, and the player in the roster;
   - select `player_id` only, in one query.

   Captain RLS already allows reading their own plans; confirm that in the migrations. Pass the set of player ids into `buildTasks` (a new optional parameter, defaulting to "unknown", which means no nutrition tasks). On a read error, follow how the other reads in `loadTasks` fail.
3. **Order on Home.** If a player is missing both plans, show both tasks. Program comes first.

## Tests
- tasks-model: a player with a program and no nutrition plan gets a `nutrition` task; one with an active plan does not; pending, frozen and expired players do not; the "unknown" default makes no nutrition tasks.
- `loadTasks`: the query shape (table, filters, `player_id` column), and the counts stay equal across Home, Tasks and nav.
- The row links to the nutrition editor route.

## Out of scope
SQL, subscription start rules (a separate card), and other findings.

## Gates
1. `npx vitest run src/features/captain-workspace src/features/dashboard`
2. `npm run typecheck`
3. `npm run lint`
