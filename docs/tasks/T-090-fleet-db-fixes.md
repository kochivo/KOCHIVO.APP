# T-090 — Database fixes from fleet QA (T-089 bugs A-1, A-2, B-1, B-3)

**Phase:** V1 beta blocker · **Status:** ready (owner: "fix everything", 2026-11-05)

Each bug already has a failing test marked `it.fails` with a `// BUG T-089-…` comment in `supabase/tests/fleet-*.test.ts`. Make each one pass, then change `it.fails` to `it` and delete the BUG comment.

Put all fixes in **one new migration `supabase/migrations/0065_fleet_fixes.sql`**.
- Never edit 0001–0064.
- 0066 is reserved by T-091, which runs in parallel. Do not touch the policies or helpers T-091 owns: the captain read policies on log tables and `is_captain_of`.
- Always recreate the **latest** definition of a function. Grep all migrations for the last `create or replace`.

## Bugs → required behaviour
1. **A-1: invite redemption skips pending activation.**
   - `redeem_invite` (latest in `0049_coach_public_page.sql` or later) creates an active link.
   - → The link is `pending = true`, exactly like a join request (owner decision: every new player waits for the captain to activate a package).
   - Keep the invite's `access_until` as the suggested package end. Activation (`activate_player`) sets the real values.
   - Check that the captain UI already lists pending players with an activate action (`src/features/billing`, `src/features/roster`). If the invite flow in the UI says "you're in" to the player, the player must land on the existing waiting screen instead. Report what you found; UI copy changes go in `messages.ts`.
2. **A-2: inactivity alerts include frozen and pending players.**
   - `refresh_inactive_alerts` and any helper it uses (`0047_notifications.sql:89` or later) must skip links that are `pending`, `frozen_at is not null`, or expired by Cairo date.
3. **B-1: body scans skip the subscription check.**
   - `body_scans_owner` (`0058_body_scans.sql:18`) allows inserts for pending, frozen and expired players.
   - → Insert and update require `player_can_write()`, like the other player logs. Reads of own scans stay allowed.
   - Apply the same rule to the storage upload policy `body_scans_upload`.
4. **B-3: a late old session consumes the renewed PT balance.**
   - `renew_player` (latest in 0064) must set `billing_started_at = now()` on every renewal, so sessions started before the renewal are never deducted from the new balance.
   - Make sure the deduction trigger still deducts sessions started after renewal.

## Out of scope
- History visibility after a player changes captain (T-091).
- UI fixes (T-092).

## Requirements
- AGENTS.md:
  - keep the restrictive `active_caller` policies
  - identical function signatures and grants (or drop and recreate with the same grants)
  - no dependencies
- Update any older test whose expectation changes because of A-1 (invite now pending). List those tests in the final message.

## Tests
- The four `it.fails` markers become passing `it`.
- Add a PGlite test that an activated invited player can write and a pending one cannot.

## Acceptance
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build`.
