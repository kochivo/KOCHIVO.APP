# T-076 — QA pass: coach→player journey tests and edge-case hardening tests

**Phase:** V1 freeze · **Status:** ready (owner request, 2026-11-04).
- Tests only. Do not change app behaviour unless a test exposes a real bug. If one does, fix it minimally and list it under "Notes for reviewer".

## Context (already covered, do not duplicate)
- 45 PGlite files in `supabase/tests/`: cross-tenant, log ownership, set sync, suspension, readiness, templates…
- Sync outbox tests in `src/core/offline/*.test.ts`.
- `validateSet` (weight > 0 unless bodyweight, reps ≥ 1).
- DB checks: `set_logs.weight_kg` 0..1000, `reps >= 1` (0053).
- Playwright in `e2e/` runs against `npm run start` on :3100. The demo player spec is skipped because there is no public player demo.

## 1. SQL journey test — `supabase/tests/journey.test.ts` (PGlite, deterministic)
Follow the harness in `supabase/tests/harness.ts`. One `describe` that walks the whole V1 journey as real roles:
1. Captain A creates a **template** (programme with `player_id` null) through `save_weekly_program(jsonb)`: one day, two exercises. Then assigns it to player P1 through the same path the app uses (read `src/features/templates` / `use-template-assignment.ts` to find it).
2. P1 reads the assigned programme (days and exercises visible), and P2 (Captain A's other player) cannot see P1's copy.
3. P1 syncs a `workout_sessions` row and three `set_logs` through the sync RPCs used by `src/core/offline/transport.ts`, then completes the session (`completed_at`).
4. Assertions:
   - The rows exist with the exact values.
   - Captain A can read them.
   - Captain B and P2 read zero rows.
   - Replaying the same payload is idempotent (same row count).
   - An older `client_updated_at` does not overwrite a newer one.
5. Negative cases, each expected to fail or be ignored:
   - weight −5
   - weight 1000.01
   - reps 0
   - reps null on a completed set (if the schema allows null, assert the app-side guard instead and note it)
   - P2 inserting a set into P1's session
   - P1 inserting a set for an exercise not in their programme (if the policy allows it, document it under Notes instead of changing RLS)
   - a suspended player writing
   - an anonymous (demo) user writing to a real player's session

## 2. Unit edge cases (Vitest)
- `validateSet`: NaN, Infinity, negative, `0` with and without bodyweight, decimal reps (decide: reps must be an integer; if the stepper can produce a decimal, add the guard plus a test).
- Outbox: a flush that fails mid-batch keeps unsent entries, and a reload (new Dexie instance) still has the queue. Add these only if they are not already covered; grep first.

## 3. Playwright journey — `e2e/journey.spec.ts`
Same flow as section 1, through the UI:
1. Coach signs in.
2. Coach creates a template from «قوالبي» ("my templates"), adds two exercises, and assigns it to the player.
3. Player signs in, opens today's workout, logs every set with weight and reps, and taps finish.
4. Player sees the done panel.
5. Coach opens the player and sees the session (history / analysis).

Rules:
- **Credentials only from env:** `E2E_COACH_EMAIL`, `E2E_COACH_PASSWORD`, `E2E_PLAYER_EMAIL`, `E2E_PLAYER_PASSWORD`, `E2E_BASE_URL`. `test.skip` with a clear reason when any is missing. Never hard-code accounts. Never run against `kochivo.site` (skip if `E2E_BASE_URL` contains it). The intended target is a local or staging Supabase stack.
  - If password sign-in is not available in the UI (OTP only), add the smallest test-only sign-in helper in `e2e/support/` that uses the Supabase JS client with those env credentials to set the session cookie. Do not add app code paths for tests.
- Use role/label selectors with strings from `messages.ts` (like `e2e/demo-player.spec.ts`), not CSS.
- Step 3 of the user's request ("verify the data is saved in Supabase") is done in the spec through the Supabase client with the **player's** session, reading back `workout_sessions` / `set_logs` for today. No service-role key.
- Register the spec in `playwright.config.ts` like the others.
- Add `docs/QA.md` (short):
  - how to run the journey (env vars, local stack)
  - what the SQL journey covers
  - a one-line list of known accepted advisor warnings: SECURITY DEFINER helpers are guarded inside (admin_* check `is_admin()`), anonymous-sign-in lint comes from the demo, `pg_net` is in public, and leaked-password protection is an owner action

## Requirements
- No new dependencies (Playwright and Vitest exist).
- Deterministic: inject `now`, no real timers, no network in Vitest/PGlite.
- Files ≤ 250 lines (split the journey test if needed).
- All gates pass. The Playwright spec only needs to compile (`tsc`) and skip cleanly without env.

## Acceptance
- [ ] `journey.test.ts` passes and covers the flow plus every negative case listed.
- [ ] New unit edge-case tests pass.
- [ ] `e2e/journey.spec.ts` compiles, skips without env, and is documented in `docs/QA.md`.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build` and the perf budget pass.
