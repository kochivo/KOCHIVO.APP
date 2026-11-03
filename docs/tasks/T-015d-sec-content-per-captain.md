# T-015d — Security fix SEC-02: a player reads content only through the captain who owns it

**Phase:** 5 · **Depends on:** T-015 report, migrations 0001–0024 (merged) · **Status:** ready
**Delegate to:** Codex

Read `docs/SECURITY-REVIEW.md` section SEC-02 first. Its SQL is a proposal; you own correctness. Judge the **final** state of each object across 0001–0024 before replacing it.

## Files
- `supabase/migrations/0027_sec_content_per_captain.sql` (new). Use exactly 0027.
  - `player_can_read_from(p_captain uuid)`: definer, empty search path, same window rule as `player_can_read()` (unarchived, `current_date <= access_until + 3`, or whatever the final `player_can_read` uses; copy it exactly) but for that one captain. Revoke from `public, anon`; grant to `authenticated`.
  - Programs and nutrition plans: the player SELECT policies and `can_read_program` / `can_read_plan` use `player_can_read_from(captain_id)` instead of `player_can_read()`.
  - Grep 0001–0024 for every other use of `player_can_read()` (child tables, storage, sync RPCs, meal logs, sessions). For each, decide whether it should be tied to a specific captain. List each in Notes with your decision. Only change those where content has a `captain_id` (direct or through its parent).
  - Do not rename or drop `player_can_read()`.
- `supabase/tests/rls-content-per-captain.test.ts` (new), using the harness:
  - captain A assigns an active program and plan; A's relationship is archived; the player redeems captain B's invite; A's program, days, exercises, plan, meals, items and alternatives are all hidden; B's content is visible
  - same with A's relationship expired past the 3-day grace, and still visible inside the grace
  - the player's own logs and sessions keep working under B

## Requirements
1. Do not edit 0001–0024. No `src/` changes unless a test proves a caller breaks; if so, say why in Notes.
2. Every existing test keeps passing.

## Acceptance
- [ ] New and old tests pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- SEC-01, SEC-03, SEC-04, SEC-05
- Archiving or deactivating old content automatically
