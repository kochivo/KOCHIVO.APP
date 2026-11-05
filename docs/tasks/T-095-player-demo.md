# T-095 — Player demo mode ("try it as a player")

**Phase:** V1 core · **Status:** ready (owner 2026-11-05)

## Today (read first)
- The public demo (`/demo`, `src/features/demo`) signs in anonymously (Turnstile when configured), then calls `create_demo_workspace()`.
  - The latest version is in `0033_anonymous_only_demo.sql` / `0050_weekly_cycle.sql`; grep for the newest.
  - It creates a demo **captain** with seeded players, programs, meals and history.
- Demo data expires after 24h and is purged by the existing purge job. Demo profiles carry `demo_expires_at`.
- The player demo is missing. `e2e/support/demo.ts` says a public demo player mode is required to test real set logging and sync.
- 0066 `captain_since` shows demo captains all history; demo links backdate `started_on`.

## Changes
1. **Migration `0068_player_demo.sql`** (new; never edit 0001–0066).
   - 0067 is being written in parallel by another task, so do not depend on it and do not touch the notifications type check.
   - Add `create_demo_player_workspace()`:
     - Same rules as the captain demo: anonymous caller only, the same rate limit and abuse guards, `demo_expires_at` = 24h, purged by the same job (extend the purge if needed).
     - The caller becomes a demo **player** linked to a new demo captain (named «كابتن تجريبي», "Demo captain", also with `demo_expires_at`):
       - an active, non-pending, time-based link (30 days)
       - an assigned program where today is a training day (use the weekly cycle)
       - an active nutrition plan
       - about one week of history so progress and the muscle map are not empty
       - `started_on` backdated to cover that history
   - The demo player logs sets, meals and daily checks for real (own rows, normal RLS and `player_can_write()`). They cannot redeem invites or reach real captains.
   - Reuse the seeding helpers of `create_demo_workspace` where possible instead of copying large SQL.
2. **UI:**
   - On `/demo`, add a second choice, «جرّب كلاعب» ("try it as a player"), next to the captain demo. Same Turnstile flow.
   - After start, land on `/player` with the existing demo banner. Adapt its text for the player role via `messages.ts`.
   - Exiting the demo works as for the captain demo.
3. **E2E:** update `e2e/support/demo.ts` and the player demo spec so it starts a player demo and logs one set (still skip when Turnstile is configured, as today). Do not run e2e; it hits the hosted project.

## Out of scope
- Real accounts.
- Changing the captain demo's behaviour.

## Tests
- PGlite:
  - the anonymous caller gets a player role, one active link to a demo captain, a program with a training day today, a nutrition plan and history
  - a non-anonymous caller is rejected
  - the rate limit applies
  - the purge deletes everything (player, captain, logs)
  - the demo player cannot see any other tenant
- Unit or render tests for the role choice and the start flow.

## Acceptance
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npm run build`, `npx vitest run --maxWorkers=2` (includes the perf budget: marketing 200 KB, player 300 KB).
