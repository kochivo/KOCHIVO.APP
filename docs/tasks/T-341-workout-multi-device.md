# T-341 — Workout and progress across devices

**Migration:** `0140_session_sync_keep_completion.sql`

## Items
1. **(Audit #4)** `sync_workout_sessions` (latest: `0059_session_feedback.sql`) lets a fresh session row from a second device overwrite `completed_at`, `session_rpe` and `player_note` with null.
   - Once a session is completed, a later sync must never clear completion, RPE or note. A newer non-null value may still update them.
   - On the client (`src/features/workout`), when online, hydrate an existing server session for the same deterministic id before starting fresh, so the player sees it as done.
2. **(Audit #22)** `src/features/progress/data/strength.ts:15`: when merging rows by id, keep the newest `client_updated_at`.
3. **(Audit #23)** `src/features/workout/hooks/use-last-session.ts:24`: when online, check the server as well, and use the latest eligible workout from either source.
4. **(Audit #24)** `src/features/workout/data/pr-history.ts` and the finish screen: merge synced server PR baselines, so records set on another device are respected.
5. **(Audit #13)** `src/features/progress/components/progress-v3.tsx:50` and `checkin-sheet.tsx:68`: "Log today's weight" after this week's check-in must not swallow the unique-constraint failure.
   - Either update this week's check-in weight (only if RLS lets the player update their own row; check it), or show a clear translated message.
   - Never close the sheet as if it succeeded.

## Out of scope
`finish-cardio-session.ts` (T-345), templates and reminders (T-342), nutrition, billing.

## Rules
- **Source:** on 2026-11-16 the owner asked to fix every item of the logic audit (`docs/tasks/AUDIT-2026-11-16.md`). The scenario for each item is there.
- **Verify first:** re-check each item in the code before fixing it. If an item turns out not to be a real bug, skip it and say why.
- **Database:**
  - All DB changes go in ONE new migration, with the exact number given above. Do not apply it.
  - The migration is additive: `create or replace` for functions, triggers and policies; new columns or tables only. No data rewrites or deletes.
  - Never edit old migrations.
- **Tests:** every fix gets a test. Use PGlite in `supabase/tests/` for SQL and vitest for TS. Tests must be deterministic.
- **UI:**
  - Every new string goes in ar, arStd and en.
  - Use tokens only and logical properties.
  - Touch targets are 48px or more.
  - Files are 250 lines or fewer.
- **Scope:** do not touch the out-of-scope features. Other cards are fixing them in parallel.
- **Gates:** `npm run check` and `npm run build`.
