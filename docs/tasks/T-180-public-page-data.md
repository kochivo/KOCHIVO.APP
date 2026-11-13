# T-180: Public page data: profile details, aggregate stats, spots, waitlist

**Phase:** Public page (owner approval 2026-11-11; design v2 approved 2026-11-13) · **Depends on:** none · **Status:** implemented (2026-11-13); migration not applied to production
**Migration:** yes, additive only. Applying it to production needs the owner's approval.

## Goal
Add the data the public page (`docs/mockups/landing/coach-page.html`) needs and that does not exist yet. Do not touch existing rows, columns or functions.

The owner's rule: build on what exists and only add. Never drop, rename, retype or rewrite data, and never replace an existing function's signature.

Packages are **not** in this card: the page uses the existing published catalog (`captain_package_tiers` with `features` and `is_featured`, migration 0099).

## Files
- New migration `supabase/migrations/0103_public_page_data.sql` (or the next free number).
- PGlite tests `supabase/tests/public-page-data*.test.ts`.
- Regenerate `src/types/database.ts`; overlay corrections go in `app-database.ts` and `enums.ts`.
- This card.

## Requirements
1. **`profiles`, new columns with defaults or nullable:**
   - `specialties text[] not null default '{}'`: at most 6 items, each 2–30 chars (check constraint).
   - `years_experience smallint null`, between 0 and 60.
   - `languages text[] not null default '{}'`: allowed values `ar`, `en`.
   - `show_public_stats boolean not null default false`.
   - Grant `update` on these columns to `authenticated`, following the pattern used for `public_slug`.
2. **New function `coach_public_page(slug text)`.** `security definer`, `stable`, `search_path = ''`, granted to anon and authenticated. Leave `coach_public_profile` untouched. It applies exactly the same eligibility filter as `coach_public_profile` and returns:
   - the four new profile columns;
   - `spots_left`: the captain's player limit (from the same source `enforce_player_limit` uses) minus the live `coach_clients` count, floored at 0;
   - `accepting`: `spots_left > 0`.
3. **New function `coach_public_stats(slug text)`.** Same eligibility filter. It returns `null` unless the captain has `show_public_stats` **and** at least 5 live players, which prevents identifying anyone. Otherwise it returns:
   - `players`: the live `coach_clients` count;
   - `workouts_logged`: all completed workout sessions of the captain's live players, using the existing workout tables;
   - `adherence_pct`: workouts done ÷ scheduled for the last 7 days, rounded;
   - `member_since`: the captain profile's `created_at` year.

   Aggregates only: no ids, no names, no per-player rows.
4. **New table `coach_waitlist`.**
   - Columns: `id uuid pk` (the app gives `uuidv7`), `captain_id`, `player_id`, `created_at`, `notified_at`.
   - A unique index on `(captain_id, player_id) where notified_at is null`.
   - RLS: a player inserts and deletes their own row, and only when the captain is not accepting. The captain selects their own rows. Nobody else has access.

## Acceptance
- [x] PGlite tests:
  - existing profile rows keep their values;
  - stats are null under 5 players or with the toggle off;
  - stats never expose ids;
  - `workouts_logged` and `adherence_pct` match a seeded fixture;
  - spots are floored at 0;
  - the waitlist RLS works, including the insert being refused while the captain is accepting;
  - `coach_public_profile` still returns exactly the old columns.
- [ ] The types are regenerated and all gates pass.

## Out of scope
- UI (T-181).
- Package changes (the catalog already has what the page needs).
- Notifying the waitlist (later).
- Before/after photos and testimonials (later, consent required).

## Implementation / reviewer notes (2026-11-13)

- Added migration `0103_public_page_data.sql`; no remote database was contacted or migrated.
  Existing profile fields, rows, functions and package tables are unchanged.
- Both RPCs reuse `coach_public_profile` for eligibility. Live players match seat enforcement:
  unarchived relationships excluding demo profiles, including pending/frozen/expired seats.
  Capacity reads `plan_tiers` through `security_private.current_tier`.
- Adherence counts unique scheduled player/dates in the player's local last seven days (today included),
  from active non-template programs, excluding rest days and dates before program creation or joining.
  Completions are matched to those dates, so duplicate/off-schedule sessions cannot inflate adherence.
  No scheduled days yields 0%; completed history counts all completed sessions of live players.
- Waitlist reads remain captain-only. A filtered player DELETE requires SELECT visibility in Postgres,
  so `leave_coach_waitlist(p_id)` provides withdrawal by id with ownership, account and capacity checks.
  Direct unfiltered DELETE also remains protected by RLS. Clients cannot set timestamps or notifications.
- Additive types were regenerated from the local PGlite catalog on top of the existing generated base;
  nullability, aggregate JSON, language unions and write restrictions live in the overlay.
- `public-page-data.test.ts`: 9 tests pass, including column constraints, RPC eligibility and ACLs,
  subscription expiry, aggregate privacy, duplicate completions, waitlist isolation and withdrawal.
  Focused regression set: 4 files passed, 38 tests passed. Independent review found the filtered-delete
  issue; the withdrawal RPC resolves it and passed follow-up review.
- `npm run check`: TypeScript and ESLint pass; the release audit stops at `spawnSync git EPERM`.
  Running the same audit rules with shell-supplied tracked paths: 2747 tracked files, 0 findings.
- `npm run build`: Turbopack cannot resolve Next.js through the external `node_modules` junction.
  `npm run build -- --webpack` also stops at `spawn EPERM`. Route bundle sizes are unavailable.
- Out-of-scope regression assertions need follow-up: `timezone-auto.test.ts` and
  `timezone-aware-equivalence.test.ts` compare full profile snapshots across additive migrations;
  `security-pass-2.test.ts` hard-codes the old anonymous RPC allowlist. These files were left unchanged.
  Full fallback run (`npm run test -- --configLoader native --pool=threads --maxWorkers=2`):
  **3 files failed, 699 passed, 1 skipped; 3 tests failed, 4393 passed, 1 skipped**.
  No demo timeout occurred. The default test runner also hits `spawn EPERM` loading its config.
- Reviewer (2026-11-13): updated the three regression tests (snapshot tests strip the 0103 columns;
  the anon RPC allowlist adds `coach_public_page` and `coach_public_stats`). In the main checkout
  `npm run check` passes apart from the known load-timeout flakes (`demo`, `fleet-player-notifications`,
  17/17 alone) and `npm run build` passes.
