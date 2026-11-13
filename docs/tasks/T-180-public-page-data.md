# T-180: Public page data: profile details, aggregate stats, spots, waitlist

**Phase:** Public page (owner approval 2026-11-11; design v2 approved 2026-11-13) · **Depends on:** none · **Status:** ready
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
- [ ] PGlite tests:
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
