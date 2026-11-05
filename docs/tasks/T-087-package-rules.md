# T-087 — Package and permission rules (QA audit 2026-11-05, items 4–9, 11)

**Phase:** V1 beta blocker · **Status:** ready

All items were confirmed by the audit, most by reproduction. Fix them in **one new migration `0064_package_rules.sql`**: 0063 is reserved by T-086, and you must not depend on it. Always recreate the **latest** definition of each function, which may come from a later migration than the one named here.

## Problems → required behaviour
1. **Players and anonymous accounts can create captain templates.**
   - The parent-write policies for programs (`0005_programs.sql:78`, plus later recreations) and meal plans (`0007_nutrition.sql:117`) only check `captain_id = auth.uid()`.
   - → Require a confirmed captain: `role = 'captain' and role_confirmed`. Approval is already enforced by `is_suspended()` (0061).
2. **Pending or rejected captains can publish a public coach page.**
   - The latest `coach_public_profile` (0054) omits `captain_status`.
   - → Require `captain_status = 'approved'`. Also make join-request validation (0049 `validate_join_request`) reject unapproved captains.
3. **Mixed timezones.**
   - `player_can_read`, `player_can_read_from` and `player_can_write` (0060) use `current_date` (UTC).
   - → Use `(now() at time zone 'Africa/Cairo')::date` everywhere access is computed. Grep 0001–0062 for other `current_date` uses in access helpers or RLS and fix them in the same migration.
4. **A days renewal keeps PT session counting.**
   - `renew_player` (0060:144) keeps `sessions_left`.
   - → A days package sets `sessions_left = null`, switching the link to time-based. A sessions package adds sessions as today.
5. **Renewal while frozen depends on order.**
   - → `renew_player` raises `22023` ("unfreeze first") when `frozen_at is not null`. The UI must show this: disable or hide renew while frozen, with the message «فكّ التجميد الأول» ("unfreeze first"). Find the renew entry points in `src/features/billing`.
6. **Old workouts synced late charge the new link.**
   - The deduct trigger (0060:171) charges the player's current active link, regardless of when the session happened.
   - → Add `coach_clients.billing_started_at timestamptz`.
     - Backfill it to `created_at`.
     - `activate_player` sets it to `now()`.
     - Links created by invite or join keep their creation time.
   - The trigger only deducts when `new.started_at >= link.billing_started_at` and the session's `training_date` is within the link's access window.
   - Make `started_at` null-safe: if null, use `completed_at`.
7. **Frozen or pending players get workout reminders.**
   - `queue_workout_reminders` (0052:95) ignores relationship state.
   - → Only queue for players with an active, non-pending, non-frozen link whose `access_until >= p_today` (Cairo).

## Out of scope
- Device and offline security (T-086).
- New features.

## Requirements
- Never edit older migrations. Keep function signatures identical, or drop and recreate them with identical grants.
- Keep the restrictive `active_caller` policies.
- UI copy goes in `messages.ts` (Egyptian Arabic + English). AGENTS.md rules. No dependencies.
- Perf budgets unchanged.

## Tests (PGlite, `supabase/tests/`)
- A player and an anonymous user cannot insert program or meal-plan templates. A captain still can.
- A pending captain's public profile returns no row, and a join request to them fails.
- At 23:30 UTC, the day after `access_until` in Cairo, a player can no longer write.
- A days renewal on a sessions link clears `sessions_left`.
- Renewing a frozen link raises the error.
- A session with `started_at` before `billing_started_at` is not deducted. A new one is.
- A frozen player gets no reminder; an active one does.
- Update any existing tests whose expectations change, and say which ones in the final message.

## Acceptance
- [ ] All seven behaviours hold under tests.
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npm run build`, `npx vitest run --maxWorkers=2`.
