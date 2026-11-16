# T-326 — Forms: atomic answer submit, atomic form save, locked question meaning

**Source:** `docs/AUDIT-2026-11-16-full.md`, findings 3 (DATA-01), 10 (DATA-02) and 11 (DATA-04).

**Migration:** ONE new file, `supabase/migrations/0130_forms_atomic.sql`. It is additive: new functions and a trigger only. No data writes, no drops of tables or columns, and no edits to older migrations. Do not apply it to any hosted database.

## 1. Atomic answer submit (DATA-01, HIGH)
- **Where:**
  - `src/features/forms/data/submit-answers.ts:25-38` sends two upserts: empty answers first, then filled answers.
  - The trigger `complete_custom_form_request` (0091:153) sets `answered_at` as soon as every required question has an answer.
- **Bug:** if the first batch already covers the required questions, the request is marked answered. If the second batch then fails, or a captain reviews in between, the remaining answers are lost. A retry hits the "already answered" branch and returns false.
- **Fix:** add an RPC `submit_custom_form_answers(p_request uuid, p_answers jsonb)`.
  - Use security invoker if RLS allows it; otherwise use security definer with `set search_path = ''`, and check that the caller is the request's player, the player is active, and the request is not reviewed.
  - It writes all answers in one transaction.
  - It must keep today's distinction: an answer with no value stores the column default (JSON null) and not SQL NULL. Read why in commit 05461e06 (`git show 05461e06`).
  - The request is marked answered only after every row is stored. Keep the existing trigger working.
  - Retry is safe: when the request is answered but not reviewed, missing rows are inserted and existing rows are updated.
  - Grant execute to `authenticated` only.
- Change `submit-answers.ts` to make one RPC call. Keep its exported signature and return values, so `answer-flow.tsx` does not change.

## 2. Atomic form save (DATA-04, still present)
- **Where:** `src/features/forms/data/save-form.ts:45-59` makes four separate writes: parent, position moves, question upsert, deletes.
- **Fix:** add an RPC `save_custom_form(p_form jsonb, p_questions jsonb)` that does the same steps in one transaction, with the same ownership checks the current RLS gives (captain owns the form). Change `save-form.ts` to call it and keep its exported signature.

## 3. Lock the meaning of answered questions (DATA-02)
- **Bug:** a kept question can change its type, `maps_to` or options after players answered it. Example: a weight answer of 80 then shows as waist 80 in the player file.
- **Fix:** add a `before update` trigger on the questions table. When the question has at least one answer, it rejects changes to `type`, `maps_to`, and the meaning of existing options (removing or renaming an option value).
  - Wording edits to the label stay allowed.
  - Adding a new option stays allowed.
  - Use a clear error code or message.
- **UI:** `save-form.ts` maps that error to a new message: "This question already has answers. Add a new question instead." Write it in ar, arStd and en, in the forms messages file. Show it through the existing save-error path.
  - Do not change other components.

## Tests (PGlite, full chain) — `supabase/tests/forms-atomic.test.ts`
- **Submit:**
  - A photo-only required question plus a filled optional text answer stores both, in one call.
  - A retry after a partial state inserts the missing row.
  - An empty answer stores JSON null, not SQL NULL.
  - Another player cannot submit.
  - A reviewed request rejects new answers.
- **Save:**
  - A failure in the middle, for example a bad question payload, leaves the form unchanged.
  - The owner can save. Another captain cannot.
- **Lock:**
  - Changing `maps_to` from weight to waist on an answered question fails.
  - A label edit succeeds.
  - On an unanswered question, any edit succeeds.
- **Also:**
  - Update `src/types/app-database.ts` for the new RPCs.
  - Update the existing unit tests for `submit-answers` and `save-form` if they mock the old calls.

## Out of scope
- `answer-flow.tsx` and the other forms components. T-327 changes them at the same time.
- `library.ts` and `metrics.ts`.

## Gates
`npm run typecheck`, `npm run lint`, `npx vitest run supabase/tests/forms-atomic.test.ts src/features/forms`, and the existing forms tests in `supabase/tests/`.
