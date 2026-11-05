# T-089 — Real-user QA: 30 simulated captains and their players

**Phase:** V1 beta QA · **Status:** ready (owner request 2026-11-05: "act like 30 captains with different player counts and try everything a captain and a player do, like real users")

## Why this shape
- Production (kochivo.site and its Supabase) is **never** used for tests: no sign-ups, no sign-ins, no writes.
- There is no Docker on this machine, so no local Supabase stack.
- The real database logic (all migrations, RLS, RPCs, triggers) runs in the PGlite harness (`supabase/tests/harness.ts`: `createTestDb`, `createUser`, `asUser`, a fixed clock `TEST_NOW`). The fleet lives there.
- UI behaviour is tested with render tests (`react-dom/server` like the other `*.test.ts`) and pure-logic tests, per screen and per data shape.

**This is a QA task.** Do **not** fix product code.
- Write the scenario tests.
- When behaviour is wrong, keep the test describing the **correct** behaviour and mark it `it.fails(...)`, with a one-line comment `// BUG T-089-<part>-<n>: <what is wrong>`. Every bug must have a test that fails today.
- List every bug in your final message, with severity (critical / major / minor), the steps a real user takes, the expected vs actual result, and the file and line of the cause if you found it.

## Shared fleet fixture (part A writes it first; B and C import it)
`supabase/tests/fleet-fixture.ts`, deterministic, no `Math.random`. Derive variety from the captain index.
- **30 captains:**
  - approved, confirmed role, on different plan tiers (`plan_tiers`: cover every tier including the entry tier, at and over its player limit)
  - 3 of them `pending`, 1 `rejected`, 1 suspended
- **Player counts per captain:** `0, 1, 2, 3, 5, 8, 12, 20, 35, 50` cycling, capped by what the tier allows. Also one captain trying to exceed the limit.
- **Player variety:**
  - time-based and session-based (PT) packages
  - pending, active, frozen, expired (`access_until` in the past, Cairo date)
  - players who joined by invite and by join request
  - one player who later moves to a second captain
- **Content per captain:** 0–3 program templates and 0–2 meal-plan templates; programs and nutrition assigned to some players.

## Part A (Codex A) — captain journeys at fleet scale
File: `supabase/tests/fleet-captain.test.ts` (split into more files under 250 lines).

As each captain, through the same RPCs and tables the app uses (read `src/features/roster`, `billing`, `templates`, `programs`, `meal-plans`, `admin`, `captain-approval` data files to find them):
1. **Onboarding:** sign-up, pending gate, intake save, admin approve or reject, `my_approval_route_profile` at each step.
2. **Roster:**
   - `captain_roster` returns exactly the captain's players
   - counts are right for 0, 1 and 50 players
   - `current_tier` and the "X of Y players" numbers are right (the owner saw «0 من 0 لاعب» on a desktop dashboard: find what produces 0 / 0)
3. **Invites and join requests:** create, accept, expire, reject, limit reached at the tier cap.
4. **Packages:**
   - activate (days or sessions), freeze, unfreeze, renew (days resets `sessions_left`, sessions adds)
   - renew-while-frozen error
   - session deduction on a completed workout
   - `sessions_used_up` notification
   - dues (`captain_dues`)
5. **Templates:** create a program and a meal-plan template, assign to 1 and to many players, edit after assigning.
6. **Isolation:** every captain reads 0 rows of every other captain's players, programs, plans, logs, payments, notifications. Pending, rejected and suspended captains cannot write templates or see a public page.
7. **Dashboard RPCs:** `captain_dropout_radar`, `pending_coach_join_requests`, `refresh_inactive_alerts` return sane results at 0 and 50 players.

## Part B (Codex B) — player journeys at fleet scale
File: `supabase/tests/fleet-player.test.ts` (split as needed). Import the fixture from part A. If it is not there yet, write it exactly as specified above, in the same file name, so the two match.

As players of different captains and states:
1. Join by invite link and by join request; pending player sees nothing private until activated.
2. **Workout:**
   - start a session, log sets through the sync RPCs the offline outbox uses (`src/core/offline`, `src/features/workout/data`)
   - finish the session; re-sync the same rows (idempotent); late sync of an old session (no deduction from a newer package)
3. Nutrition: meal logs, swaps, the day boundary in Cairo at 23:30 UTC.
4. Supplements, daily checks and readiness, session feedback, body scans, if present.
5. Frozen, expired and pending players: which reads and writes are blocked (expected: no new logs, history readable per current policy). Write what actually happens.
6. Moving captain: the old captain loses access, the new one gets only data from after the move (check what policy exists and test it).
7. Notifications and reminders: `queue_workout_reminders` for active vs frozen vs pending vs expired players; `plan_assigned`, `nutrition_updated`, `workout_feedback` reach the right user only.

## Part C (Codex C) — UI behaviour per data shape
Render and logic tests next to the features (`src/features/**/fleet-ui-*.test.ts`), no network (mock data loaders the way existing render tests do).
1. **Captain dashboard and roster** with 0, 1, 5, 50 players and each tier:
   - the package indicator text (reproduce «0 من 0 لاعب» if a loader can return a missing tier or limit)
   - empty states
   - the 250-player-name overflow
   - Arabic and English
   - check the layout classes for desktop: the owner reported the dashboard looks squeezed on desktop. Inspect the dashboard page and shell container widths (`max-w-*`, grid columns at `md:`/`lg:`) and report what limits the width.
2. **Player detail** for time-based, session-based, frozen, pending and expired: the renew button is disabled while frozen with «فكّ التجميد الأول»; the sessions-left text.
3. **Player home, workout and nutrition** with no program, an empty program, a rest day and a finished day.
4. **Stepper typing:** Arabic digits, decimals, empty, Escape.
5. **Pending captain screen:**
   - the intake form shows only when intake is null
   - the approval watcher navigates when approved
   - sign-out works
6. **Every list has an empty state and every async view has loading and error states** (AGENTS.md §4). List the screens that break this rule.
7. Read the e2e demo specs (`e2e/demo-*.spec.ts`) and list captain or player screens they never visit, so the reviewer can extend them.

## Out of scope
- Any change to product code under `src/` other than new test files.
- Migrations.
- Production. Never call kochivo.site or the hosted Supabase.

## Requirements
- AGENTS.md rules for test files:
  - ≤ 250 lines
  - no `any`
  - deterministic: fixed clock, no timers, no network
- Use `uuidv7()` from `@/core/offline/ids` or fixed ids, never `Math.random`.
- The full suite must stay green except the `it.fails` bug markers, which pass by failing.

## Final message
The AGENTS.md format, plus a **Bugs** section: a numbered list, each with severity, user steps, expected, actual, and cause if known.
