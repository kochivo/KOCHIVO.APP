# T-270 — Best lifts in the player file

**Phase:** data gaps · **Depends on:** none · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 18.

## Goal
The player file measurements card shows the player's best weight for key lifts, with the change over the last 30 days. Examples are «أقصى سكوات 110 (+10)» and «أقصى بنش 85 (+5)».

## Files
- No new table. A captain RPC `player_best_lifts(player_id)` reads `set_logs`, ignoring deleted rows.
- For each exercise it returns:
  - the best `weight_kg` with reps ≥ 1;
  - the best weight before 30 days ago;
  - the date of the best.
- It covers the player's top 3 exercises by logged volume, plus any exercise the captain pinned.
- `supabase/migrations/<next>_best_lifts.sql`: the RPC, plus an index on `set_logs(player_id, exercise_id, weight_kg desc)` if the query plan needs it.
- `supabase/tests/best-lifts.test.ts`: the right best, deleted sets ignored, and RLS (the captain's own players only).
- `src/features/captain-workspace/player-file/`: metric rows as on the board.

## Requirements
1. The "best" is the heaviest weight, not an estimated 1RM. Keep it simple and true.
2. Show the delta only when there was a best before 30 days ago.
3. No logs: hide the rows. Never show zeros.

## Acceptance
- [ ] Seeded logs show the correct best and delta.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- 1RM estimates and charts per lift. Pinning exercises can be a follow-up if there is no place to pin today; then use top volume only.
