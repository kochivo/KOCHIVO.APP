# T-265 — Lifetime workout count for the «كل الوقت» ranks tab

**Phase:** data gaps · **Depends on:** none · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 13.

## Goal
The ranks page gets a working «كل الوقت» tab. It ranks the captain's players by lifetime points (`player_points.lifetime`, which already exists) and shows each player's lifetime count of counted workouts. The player file shows the same count.

## Files
- `supabase/migrations/<next>_lifetime_workouts.sql`:
  - `player_points.workouts integer not null default 0`.
  - The existing `count_points` trigger increments it on a counted `workout` row, and decrements it when a counted workout row is rejected or deleted, if that path exists.
  - Backfill from `points_log` (`kind='workout' and status='counted'`). This only sets the new column, so it is additive.
  - Captain RPC `team_leaderboard_all_time()`: the same shape as `team_leaderboard`, without a month, ordered by lifetime points.
- `supabase/tests/lifetime-workouts.test.ts`: the trigger count, the backfill, and RLS through the RPC.
- `src/features/ranks/data/`: a loader for the all-time tab, exported via `ranks/server.ts`.
- `src/features/captain-workspace/` (ranks page): enable the tab. Rows show «N تمرين · N نقطة» and the tier badge from `tierFor`.

## Requirements
1. Crown logic is untouched. The all-time tab has no crown.
2. Ties sort by workouts, then name.

## Acceptance
- [ ] The tab shows the correct order and counts on seeded data.
- [ ] A new counted workout raises the count by 1.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Medals (approved for after production; separate cards).
