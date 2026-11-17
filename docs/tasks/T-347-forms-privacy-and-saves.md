# T-347 — Forms: former-captain privacy, frozen answers, deleting answered questions, photo size

**Migration:** `0145_forms_privacy.sql`

## Items
1. **(B-1, security, HIGH)** A former captain keeps reading and reviewing the assessments they sent before the player moved.
   - **Cause in SQL:** `form_requests_read` and `form_answers_read` check only the stored ids. `form_requests_review` checks only `captain_id` (`0091_custom_forms.sql:111-122`).
   - **Cause in the server action:** `src/features/forms/data/request-actions.ts:34` updates by request id and captain id only.
   - **Fix:** the captain side of read and review requires a current, non-pending relationship: a `coach_clients` row for that captain and player, with `archived_at is null` and `not pending`. Use the same shape as the other transfer-privacy policies in `0113_transfer_privacy.sql`.
   - **Keep:** the player still reads their own history, and the current captain keeps full access.
   - **Also check** form-answer photo storage reads stay consistent. 0113 already checks the relationship there.
2. **(B-2, security, MEDIUM)** A frozen or expired player can still submit answers through `submitAnswers` / `submit_custom_form_answers`. The answer guard (`0113_transfer_privacy.sql:103-111`) does not check `player_can_write()`.
   - **Fix:** add `public.player_can_write()` to that database guard, covering insert and update.
   - **Keep:**
     - the relationship check and the locking;
     - the awaiting-plans allowance in `0139_waiting_access.sql`.
3. **(B-3, MEDIUM)** Removing an already answered question makes the whole form save fail.
   - **Cause:** `save_custom_form` deletes omitted questions (`0130_forms_atomic.sql:65-66`), but answers keep a non-cascading foreign key (`0091:60`).
   - **Fix:** never delete answered questions; retire them instead. Add a nullable `retired_at` (or similar) column and set it when an answered question is omitted.
   - **Behaviour of retired questions:**
     - excluded from new requests and from the builder;
     - still shown in old answers and in the 0143 snapshots.
   - Unanswered omitted questions may still be deleted.
   - Never cascade-delete answers.
4. **(B-5, MEDIUM)** `src/features/forms/data/answer-photos.ts:8` accepts form photos up to 10 MB, but the `checkin-photos` bucket limit is 5 MB.
   - **Fix:** compress or resize images on the client to under 5 MB before upload.
   - Reuse an existing image-compression helper if the repo has one. Check check-ins, body scans and receipts.
   - Show a clear translated error only when the photo still cannot fit.
   - Do not raise the bucket limit.

## Out of scope
Set logs and workout (T-348), billing and invites (T-349), chat and dashboard (T-350), points and public page (T-351), nutrition (T-352).

## Rules
- **Source:** on 2026-11-17 the owner asked to fix every item of audit round 2 (`docs/tasks/AUDIT-2026-11-17.md`). The evidence for each id is quoted in the card.
- **Verify first:** re-check each item in the code before fixing it. If an item turns out not to be a real bug, skip it and say why.
- **Database:**
  - All DB changes go in ONE new migration, with the exact number given above. Do not apply it.
  - The migration is additive: `create or replace` for functions, triggers and policies; new columns or tables only. No data rewrites or deletes.
  - Never edit old migrations.
- **Patch, do not rewrite:** to change a long existing function, follow the pattern of 0139/0141/0144:
  1. read `pg_get_functiondef(...)`;
  2. `replace()` an exact fragment;
  3. raise on drift (the fragment count must be exactly 1);
  4. `execute` the result.

  Short functions may be restated with `create or replace`. If you do that, copy the LATEST definition exactly and change only what the card needs.
- **Tests:** every fix gets a test. Use PGlite in `supabase/tests/` for SQL and vitest for TS. Tests must be deterministic.
- **UI:**
  - Every new string goes in ar, arStd and en.
  - Use tokens only and logical properties.
  - Touch targets are 48px or more.
  - Files are 250 lines or fewer.
- **Scope:** do not touch the out-of-scope features. Other cards are fixing them in parallel.
- **Gates:** `npm run check` and `npm run build`.
