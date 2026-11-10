# T-150 — Hall of fame: past crown holders

**Phase:** Gamification · **Depends on:** T-139, T-146 (landed) · **Status:** ready (owner request 2026-11-10)

## Goal
Past winners disappear on the 1st of each month. After this card the team keeps a hall of fame: the crown
holder of each of the last 12 months, shown to the captain on the leaderboard and to players on the rank screen.

## Files
Create or modify only these:
- `supabase/migrations/0087_crown_hall_of_fame.sql` (new)
- `supabase/tests/crown-hall-of-fame.test.ts` (new)
- `src/types/database.ts`
- `src/features/ranks/data/load-hall-of-fame.ts` (new), `src/features/ranks/components/hall-of-fame.tsx` (new),
  `src/features/ranks/components/rank-screen.tsx`, `src/features/ranks/hooks/use-rank-data.ts`,
  `src/features/ranks/index.ts`, `src/features/ranks/messages.ts`
- `src/features/rank-review/components/leaderboard-screen.tsx`, `src/features/rank-review/hooks/use-leaderboard.ts`
- Tests in both features.
- This task card.

## Requirements
1. **Frozen history.** Table `public.crown_winners(captain_id, month, player_id, adherence, done, planned,
   primary key(captain_id, month))`, RLS on, no client writes. A captain reads own rows; a player reads their
   active captain's rows. Winners are frozen on the 1st so later program edits cannot rewrite history
   (T-139 computes past months with today's program).
2. `security_private.freeze_crown_winners(p_month date)`: for every captain, the holder of `p_month` by the
   current rule (position 1, `done >= 4`, `adherence > 0`); `on conflict do nothing`. Scheduled with `pg_cron`
   (guarded as in 0052/0067) at 00:10 Africa/Cairo on the 1st for the previous month. Revoked from every role.
3. Backfill once in the migration for months since points started (the earliest `points_log.earned_on`).
4. `public.crown_hall_of_fame()` returns the last 12 rows for the caller's team: month, display name (full name
   for the captain, first name for players, as `team_leaderboard` does), adherence, done, planned. Players see
   `player_id` only on their own rows.
5. **UI.** A «لوحة الشرف» / "Hall of fame" section: month label (locale month name), crown badge `sm`, name,
   «{n}٪ التزام». Empty state «لسه محدش أخد التاج» / "No crown winners yet". Loading and error states. On the
   leaderboard, under the board; on the rank screen, after the team board.

## Acceptance
- [x] PGlite tests: freeze picks the right holder, skips a month with no qualified holder, is idempotent;
  later program change does not change a frozen row; read rules for captain, own player, other team, anon,
  suspended; privacy of names and ids; the 12-row limit.
- [x] Render tests ar and en with rows and empty.
- [ ] `npm run check` and `npm run build` pass (known sandbox limits).

## Out of scope
- Prizes in the hall (T-146 data may be joined later), badges for multiple wins.

## Implementation notes
- Added migration 0087 only: immutable monthly results reuse `points_board`, with a one-time backfill of completed months since the first points entry. Historical backfill necessarily uses today's programs; subsequent freezes are preserved.
- The guarded cron job checks hourly at minute 10 and freezes only at 00:10 on Cairo's first day, handling winter/summer UTC offsets without changing the server's cron timezone.
- Team RLS and `active_caller` protect reads; clients have no write privileges. Direct winner-id reads are withheld, including from captains; the RPC supplies full captain names/ids and masks teammate names/ids for players.
- Shared Arabic/English history appears after each team board with localized month/year labels, small crown badges, empty/loading/error states, and retry. History read failures keep the current ranking visible.
- Added PGlite freeze/privacy/backfill/cron tests, render tests in both features, and loader validation coverage. Prizes and multiple-win badges remain out of scope.
- Verification: typecheck and lint pass. `npm run check` stops at the release audit because the sandbox denies its Git child process (`spawnSync git EPERM`); supplying the tracked-file list externally to the same audit rules reports 0 findings. Vitest runs with `--configLoader native --pool=threads --maxWorkers=2` to avoid the sandbox's default-loader subprocess restriction. `npm run build` fails only on fetching Alexandria, Changa, and Manrope from Google Fonts.
- Full-suite result: 422 test files passed, 1 skipped; 3045 tests passed, 1 skipped. The subsequent feature rerun includes the newly added loader tests: 10 files and 80 tests passed. The dedicated SQL/loader rerun passed 8 tests across 2 files.
