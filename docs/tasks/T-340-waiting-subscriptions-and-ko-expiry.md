# T-340 — Waiting subscriptions keep access, and correct KO expiry cards

**Migration:** `0139_waiting_access.sql`

## Items
1. **(Audit #3)** A player whose subscription clock is paused while waiting for plans must not lose access at the provisional `access_until`.
   - `player_can_write()` and `player_can_read_from()` ignore `awaiting_plans_at` (from `0119_subscription_waits_for_plans.sql`). Fix their latest definitions (0064, 0097 or later).
   - Keep every other restriction: pending, frozen, archived, suspended, and the 3-day read grace.
   - Find any other helper or RLS path that compares `access_until` for player access, and apply the same rule.
2. **(Audit #21a)** The KO ending-soon and expired rules (`0109_ending_soon_window.sql` and its latest replacements) must exclude subscriptions that are still awaiting plans. Keep the plan-setup prompts.
3. **(Audit #21b)** For session packages, the KO feed must not offer the day-based renewal that `src/features/ko-account/data/execute.ts:93` rejects. Route those cards to the billing renewal flow, or don't offer the action.

## Out of scope
`captain_money_owed` and the billing UI (T-339), workout, notifications.

## Rules
- **Source:** on 2026-11-16 the owner asked to fix every item of the logic audit (`docs/tasks/AUDIT-2026-11-16.md`). The scenario for each item is there.
- **Verify first:** re-check each item in the code before fixing it. If an item turns out not to be a real bug, skip it and say why.
- **Database:**
  - All DB changes go in ONE new migration, with the exact number given above. Do not apply it.
  - The migration is additive: `create or replace` for functions, triggers and policies; new columns or tables only. No data rewrites or deletes.
  - Never edit old migrations.
- **Tests:** every fix gets a test. Use PGlite in `supabase/tests/` for SQL and vitest for TS. Tests must be deterministic.
- **UI:**
  - Every new string goes in ar, arStd and en.
  - Use tokens only and logical properties.
  - Touch targets are 48px or more.
  - Files are 250 lines or fewer.
- **Scope:** do not touch the out-of-scope features. Other cards are fixing them in parallel.
- **Gates:** `npm run check` and `npm run build`.
