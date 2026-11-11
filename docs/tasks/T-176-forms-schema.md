# T-176: Custom forms schema (tables, RLS, tests)

**Phase:** Captain suite (owner approval 2026-11-11) · **Depends on:** none · **Status:** ready
**Migration:** yes. It is additive, and applying it to production needs the owner's approval.

## Goal
The database part for screens 2 and 6 in `docs/mockups/captain-workspace/suite.html`. This card adds no UI.

A captain owns forms. A form has ordered questions, and each question can map its answer into a player-file fact. Forms are sent to players as requests, either by hand or on a schedule, and players submit answers.

## Files
- New migration `supabase/migrations/00NN_custom_forms.sql` (use the next free number).
- PGlite tests in `supabase/tests/custom-forms*.test.ts`.
- Regenerate `src/types/database.ts`; any overlay corrections go in `app-database.ts` and `enums.ts`.
- This card.

## Requirements
1. **Tables.** All have `id uuid primary key`; the app supplies `uuidv7()` values.
   - **`forms`:**
     - `captain_id` (references profiles), `title`, `kind`.
     - `kind` is `checkin | onboarding | progress | injury | update | custom`.
     - `schedule jsonb null`, of the shape `{ every: 'week'|'month', weekday?, day?, hour }`.
     - `remind_after_hours smallint null`.
     - `archived_at`, `created_at`, `updated_at`.
   - **`form_questions`:**
     - `form_id`, `position`, `label_ar`, `label_en`, `type`, `options jsonb`, `required bool`, `maps_to text null`.
     - `type` is `number | scale | choice | multi | text | photos | yesno`.
     - `maps_to` is a FactKey from `src/features/player-file/model.ts`, with a check listing the allowed keys.
     - `alert_on jsonb null`, for example `{ "yes": true }`.
   - **`form_requests`:**
     - `form_id`, `player_id`, `captain_id`, `sent_at`, `due_at`, `reminded_at`, `answered_at`, `reviewed_at`, `captain_reply`.
     - `status` is a generated column: `pending | answered | reviewed`.
     - A unique index on `(form_id, player_id, sent_at)`.
   - **`form_answers`:**
     - `request_id`, `question_id`, `value jsonb`, `photo_paths text[]`.
     - Unique on `(request_id, question_id)`.
2. **RLS:**
   - The captain does full CRUD on their own forms and questions.
   - The captain creates requests only for players who have a live `coach_clients` link to them.
   - The player reads requests addressed to them, plus the matching forms and questions.
   - The player inserts and updates answers only while the request is not reviewed, and only for their own requests.
   - Nobody else has any access.
3. **Integrity:**
   - Questions are deleted with their form.
   - A form that has requests cannot be hard-deleted; archive it instead.
   - A trigger sets `answered_at` when the last required answer arrives.
4. **Indexes** for:
   - the captain queue `(captain_id, answered_at desc) where reviewed_at is null`;
   - the player's pending list `(player_id) where answered_at is null`.
5. **Storage.** Photos reuse the existing check-in photo bucket policy pattern under a new prefix `forms/`. Add a policy test.

## Acceptance
- [x] PGlite tests:
  - captain A cannot read or modify captain B's forms or requests;
  - a captain cannot send to an unlinked player;
  - a player cannot answer someone else's request, or a reviewed one;
  - `answered_at` is set by the trigger;
  - a used form cannot be deleted.
- [x] The types are regenerated.
- [ ] All gates pass.

## Out of scope
- UI (T-177, T-178).
- Migrating existing `check_ins` into forms: they stay and are read through the player-file adapter.
- Notifications.

## Implementation notes
- Added `0091_custom_forms.sql`; no existing migration or live project was changed.
- Photo paths use `forms/<player_id>/<request_id>/<file>` in the existing private `checkin-photos` bucket.
- New table types were generated from the migrated PGlite catalog. CHECK unions and column write grants are reflected in the application overlay.
- Windows verification: default Vitest and the release audit hit process-spawn EPERM; thread/native Vitest and direct Git enumeration with the unchanged audit rules are the fallbacks. Production compilation succeeds, but `next build` hits spawn EPERM at its TypeScript worker. Full gate approval remains with the reviewer.
- Final results: TypeScript and ESLint pass; audit fallback reports 0 findings; native/thread Vitest reports 462 files passed, 3339 tests passed, and 1 performance test skipped because build route statistics are unavailable. The custom-form suite contains 14 passing tests.
