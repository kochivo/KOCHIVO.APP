# T-015b — Security fixes SEC-03, SEC-04, SEC-05

**Phase:** 5 · **Depends on:** T-015 report, migrations 0001–0024 (merged) · **Status:** ready
**Delegate to:** Codex

Read `docs/SECURITY-REVIEW.md` sections SEC-03, SEC-04 and SEC-05 first. Their SQL is a proposal; you own correctness. Always judge the **final** state of each object across 0001–0024 before replacing it (copy the latest body, then change only what the fix needs).

## Files
- `supabase/migrations/0025_sec_inbox_invites_disclosure.sql` (new). Use exactly 0025.
  1. **SEC-03:** restrictive INSERT policies on `check_ins` and `form_checks` so `reviewed_at` and `captain_reply` must be null on insert. Captain review UPDATE keeps working.
  2. **SEC-04:** `coach_invites_captain_insert` requires the caller to be a confirmed captain (`role = 'captain' and role_confirmed`), keeping the existing uid and suspension checks. `enforce_player_limit()` also rejects an inviter who is not a confirmed captain with `42501`, keeping its lock, suspension and count logic exactly.
  3. **SEC-05:** `plan_of_meal` and `plan_of_item` return null unless `public.can_read_plan(plan)` is true. `current_tier(p_captain)` returns a value only for the caller themself or an admin; owner-run code (`enforce_player_limit`, `admin_captains`) calls an internal `security_private.current_tier` that clients cannot execute. Keep every existing grant on the public functions; revoke the private schema and function from `public`, `anon`, `authenticated`.
  - Check every other caller of `current_tier(` in 0001–0024 (grep) and decide per call site whether it must use the private version. A player redeeming an invite must still be limited by the inviting captain's real tier.
- `supabase/tests/rls-sec-fixes.test.ts` (new), using the existing harness helpers:
  - SEC-03: insert with `reviewed_at`, with `captain_reply`, and with both, on both tables, each rejected; a clean insert still works; the captain can still review.
  - SEC-04: a confirmed player and an unconfirmed account both fail to insert an invite; an invite row seeded as owner for a player inviter fails to redeem and stays unused; a confirmed captain's invite redeems normally.
  - SEC-05: a stranger gets null from `plan_of_meal`/`plan_of_item` for another player's rows and null/no tier from `current_tier(other_captain)`; the owner, the eligible player and an admin still get results; a champion captain can still admit their 6th player; meal/item child SELECT policies still work (no recursion).
- `docs/ARCHITECTURE.md`: one short note under the security section: the `security_private` schema exists, is never exposed in the Data API, and holds unfiltered lookups for owner-run code.

## Requirements
1. Do not edit 0001–0024. Do not touch `src/` unless a test proves a caller breaks; if so, say why in Notes.
2. Every existing test keeps passing.

## Acceptance
- [ ] New tests pass, and all old SQL tests pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- SEC-01 (suspension) and SEC-02 (content per captain): separate cards T-015c and T-015d
- The two-connection race test
