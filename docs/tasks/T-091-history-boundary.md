# T-091 — New captain sees only data from after the move (T-089 bug B-2)

**Phase:** V1 beta blocker · **Status:** ready (owner decision 2026-11-05: privacy first)

## Problem
When a player moves from captain X to captain Y, Y can read X's era of the player's history:
- workouts and sets
- meal logs
- supplement logs
- daily checks and readiness
- body scans
- feedback

The captain read policies only check that a current relationship exists (`is_captain_of`, latest in `0026_sec_suspension.sql:81` or later). There is no time boundary.

The failing test is in `supabase/tests/fleet-player-access.test.ts`, marked `// BUG T-089-B-2` with `it.fails`. Make it pass, then change `it.fails` to `it` and delete the comment.

## Required behaviour
- A captain reads a player's logs only from the **start of their own relationship** onward. Use `coach_clients.created_at`, or a clearer column if one exists (grep `coach_clients` columns first).
  - **Rows with a date** (`training_date`, `log_date`, `scan_date`, …): compare the Cairo date to the relationship start date in Cairo.
  - **Rows with a timestamp only:** compare `created_at` or `started_at`.
- Profile basics stay visible to the current captain, as today: name, avatar, goal, intake answers if they belong to the link.
- The player always sees their own full history.
- The previous captain loses all access once their link ends, as today.
- Keep performance acceptable:
  - add a helper such as `public.captain_since(player uuid) returns timestamptz`, `stable`, `security definer`, `set search_path = ''`
  - check `supabase/tests/progress-indexes.test.ts` style for any needed index

## Migration
- **One new migration: `supabase/migrations/0066_history_boundary.sql`.**
  - 0065 is being written in parallel by T-090. Do not depend on it, and do not touch:
    - `redeem_invite`
    - `refresh_inactive_alerts`
    - `renew_player`
    - the deduct trigger
    - the `body_scans_owner` policy (T-090 owns these)
  - You may change the **captain read** policies on `body_scans`, but only those.
- Never edit 0001–0064.
- Keep the restrictive `active_caller` policies. Recreate policies with identical roles.

## Tests
- The B-2 marker passes.
- Add PGlite tests:
  - Y sees a set logged after the move and not one before it, for each log table
  - the player sees both
  - X sees neither after the move
- Check `rls-cross-tenant.test.ts` and `rls-roster.test.ts` still pass. Update any test whose fixture logs data before the relationship start without meaning to, and list them.

## Out of scope
- The bugs in T-090 and T-092.
- UI.

## Acceptance
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build`.
