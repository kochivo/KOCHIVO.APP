# T-002 — Expand RLS tests to nutrition, inbox, storage, invites

**Phase:** 1 · **Depends on:** none · **Status:** ready
**Delegate to:** Codex

## Goal
Every table outside workouts gets the same proof the workout tables already have: one captain can never see or change another captain's data, and a player only reaches their own. These tests are the safety net for every later feature.

## Files
- `supabase/tests/rls-nutrition.test.ts` (new)
- `supabase/tests/rls-inbox.test.ts` (new)
- `supabase/tests/rls-storage.test.ts` (new)
- `supabase/tests/rls-invites.test.ts` (new)
- `supabase/tests/harness.ts`: add small helpers only if two or more test files need them, such as `createCaptainWithPlayer(db)`.

Do **not** modify any file in `supabase/migrations/`. If a test exposes a real hole in the policies, leave that test failing with `it.fails(...)`, plus a comment naming the policy. Report it under "Notes for reviewer". The reviewer writes the fix migration.

## Requirements
Use `createTestDb`, `createUser`, and `asUser` from `harness.ts`. Read `rls.test.ts` first and follow its style. Each `it` checks one thing, and its title is a plain English sentence.

**Nutrition** (`0007_nutrition.sql`)
1. Captain A creates a plan with meals, items, and alternatives for player P. Captain B can select none of them and can update none of them.
2. P reads their active plan, meals, items, and alternatives, but cannot insert or update any of them.
3. P syncs a meal log through `sync_meal_logs`. A second call with an older `client_updated_at` does not overwrite it (LWW).
4. P cannot insert a meal log for a meal from someone else's plan.
5. A captain-owned food is visible to that captain and their players, but not to captain B. Global foods (`owner_id` null) are visible to everyone.

**Inbox** (`0008_inbox.sql`)
6. P inserts a check-in. The trigger sets `captain_id` to P's captain, even when P sends a different `captain_id`.
7. A second check-in for the same `week_start` fails (unique constraint).
8. The captain can mark a check-in reviewed and add a reply. P cannot change the review fields, and the captain cannot change P's body fields (`guard_review_update`).
9. The `inbox_items` view shows captain A only A's items.

**Storage** (`0009_storage.sql`)
10. P can insert into `checkin-photos` under their own folder, but not under another user's folder.
11. P's captain can read that object. Captain B cannot.
12. When P's access is expired (`access_until` in the past), P cannot insert a new photo.

**Invites** (`0003_coach_clients.sql`)
13. Redeeming a valid code links the player. Redeeming the same code twice fails.
14. A player who already has an active captain cannot redeem a second captain's code.
15. Redeeming captain A's code fails when A is on the free plan and already has 5 active players.

## Acceptance
- [ ] All 15 cases exist as separate `it` blocks
- [ ] `npm run test` passes. Any `it.fails` is listed with the reason in the final message.
- [ ] `npm run check` and `npm run build` pass
- [ ] No migration file changed

## Out of scope
- Any change to migrations, `src/`, or the existing `rls.test.ts` cases

## References
- `docs/ARCHITECTURE.md`: the RLS table
- `supabase/tests/rls.test.ts`: the style to follow
