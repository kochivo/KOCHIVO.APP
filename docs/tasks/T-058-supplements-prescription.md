# T-058 — Supplements prescription «روشتة المكملات»

**Phase:** 3 · **Depends on:** — · **Status:** ready (owner request, 2026-11-04)

## Goal
- The captain prescribes supplements for each player.
- The player ticks them off daily, and the ticks count toward adherence.

## Changes
1. **Migration `0051_supplements.sql`:**
   - `supplements`:
     - columns `id`, `captain_id`, `player_id`, `name` (1–60), `dose` (≤ 40, e.g. «5 جم»), `timing text check in ('morning','pre_workout','post_workout','with_meal','before_bed','any')`, `notes` (≤ 300), `position`, `archived_at timestamptz`, `created_at`.
     - The captain inserts, updates and archives rows only for their own players (`is_captain_of`). The player selects their own rows.
   - `supplement_logs`:
     - columns `id`, `supplement_id → supplements on delete cascade`, `player_id`, `log_date date`, `taken_at`; unique `(supplement_id, log_date)`.
     - The player inserts and deletes their own rows (untick). The captain selects rows for their players.
   - Apply the restrictive active/suspension policies like the other player tables.
   - Add a PGlite test in `supabase/tests/` for owner, captain, other captain, other player and anon.
2. **Captain** (player profile, a new «المكملات» section or tab next to nutrition):
   - Show a list of glass cards with name, dose, a timing chip and notes, plus an add/edit sheet (name, dose, timing select, notes), reorder and archive.
   - The empty state is «لسه مفيش مكملات».
   - The section shows the last 7 days of adherence per supplement (ticked days / 7).
3. **Player** (home, under today's tasks, or in the nutrition screen; pick the least crowded):
   - Show a glass checklist «مكملات النهارده» grouped by timing, one big tick per item (≥ 56 px).
   - Ticks are optimistic and offline-safe. Use `saveAndQueue()` and `stableId('supplement_log', supplement_id, log_date)`, and add a sync handler following the meal-log pattern in `@/core/offline`. Use `localDate()` for `log_date`.
   - Unticking removes the row the same way.
   - It is hidden when the player has no supplements.
4. **Adherence:** include supplement ticks in the existing adherence or compliance calculation wherever meals and workouts are counted, as a separate weighted part. Read the current formula first. If no shared adherence function exists, add `supplementAdherence(logs, supplements, days, now)` and show it in the captain view only. Write the choice in "Notes for reviewer".
5. Tests:
   - The adherence math.
   - The stable id.
   - Optimistic tick and untick.
   - Grouping by timing.
   - The PGlite RLS test.
   - Inject `now`.

## Out of scope
A product catalogue, reminders and notifications, buying links.

## Requirements
- No new dependencies.
- Messages in `messages.ts`.
- Tokens only (`glass`, `glass-strong`).
- Logical RTL properties.
- Files under 250 lines.
- Every list has an empty state; loading and error states.
- Hand-edit `src/types/database.ts`.

## Acceptance
- [ ] A captain adds 3 supplements with timing.
- [ ] The player ticks them offline, and they sync.
- [ ] The captain sees adherence.
- [ ] `npm run check`, `npm run build`, the perf budget and PGlite pass.
