# T-414: No lost workout completions, no replayed KO meal approvals, no lost KO chat

**Depends on:** none · **Status:** ready · **Source:** full audit 2026-11-19

## Goal
A finished workout stays finished whatever order two devices sync in. An approval from KO takes effect once. Chat turns survive two open tabs.

## Problems (1 and 2 confirmed in code)
1. **A completed workout can sync as unfinished.**
   - `sync_workout_sessions` (`supabase/migrations/0140_session_sync_keep_completion.sql`) ends with `where workout_sessions.client_updated_at < excluded.client_updated_at`.
   - Scenario: phone A finishes offline at 09:00; phone B opens the same session at 09:05 and syncs first. When A syncs, its whole row is dropped, including `completed_at`. The outbox clears anyway (`src/core/offline/sync.ts:120`).
2. **A KO meal approval can be replayed.**
   - In `ko-account/data/route.ts` (the `action.kind === 'meal_log'` branch), the token is checked for signature and expiry only.
   - A second confirm with the same token while it is valid re-applies the meal, undoing a later correction.
   - Captain approvals already use a database receipt to stop repeats. Look at how `commitApproval` / `ko_apply_action` do it.
3. **Two open tabs can overwrite each other's chat history.**
   - `ko-preview/hooks/use-ko-history.ts:62` saves the tab's whole in-memory list, so a stale tab erases the other tab's new turn.

## Requirements
1. **New migration `supabase/migrations/0159_session_sync_completion_merge.sql`:** `create or replace` the same function with the same signature and grants.
   - `completed_at` merges as the first non-null value, whatever the timestamps say.
   - When the incoming row is older, keep every other column as today, but still take a non-null `completed_at` (and the post-completion `session_rpe` / `player_note` rules already in 0140) when the stored row has none.
   - Additive only: no data changes, no dropped objects.
   - Add a PGlite test in `supabase/tests/` that runs both sync orders.
2. **A meal approval is consumed once.**
   - Reuse the existing receipt mechanism used for captain approvals if it fits the player meal path. If it needs a schema change, put it in the same migration `0159` with RLS and a PGlite test.
   - A replayed token returns the existing «انتهت» (expired) reply. A double tap must not error.
3. **History merge across tabs.**
   - Before saving, merge stored entries with in-memory ones by entry id, keep order by time, and keep the existing caps (40 entries, 7 days).
   - Listen to the `storage` event to refresh other tabs.

## Notes
- Do not apply the migration to any database. The reviewer applies it after the owner approves.
- Player writes still go through `saveAndQueue()`.

## Out of scope
- Other sync tables.
- KO UI.

## Tests
- PGlite: A-completed-older vs B-unfinished-newer, in both orders. The result is completed, with B's newer non-completion fields kept.
- Route: the same meal token confirmed twice applies once, and the second reply is «انتهت».
- History: two hook instances on the same storage, each appending, give both entries.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ko-account src/features/ko-preview src/core/offline`
- `npx vitest run src/features/ko-account src/features/ko-preview src/core/offline src/features/workout supabase/tests`
