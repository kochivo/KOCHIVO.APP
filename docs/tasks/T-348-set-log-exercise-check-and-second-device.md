# T-348 — Set logs must not unlock other exercises; finished workout on a second phone

**Migration:** `0146_set_log_exercise_access.sql`

## Items
1. **(A-1, security)** A player can insert or update a set log with any `exercise_id`. The orphan read helper `security_private.owns_orphan_reference` (latest in `0134_purge_after_transfer.sql:11`) then treats that set log as permission to read a deleted captain's private exercise.
   - **Where to fix:** at write time, in the set_logs insert/update path:
     - `sync_set_logs`, latest in `0120_drop_sets.sql` plus the patch in `0128_audit_fixes.sql`;
     - the set_logs RLS in `0011_log_ownership.sql`.
   - **The rule:** the exercise must be one the player may use, meaning one of:
     - a global exercise (`owner_id is null`);
     - one owned by the player's current captain or the session's captain;
     - one referenced by the program exercise or its `alternatives`;
     - one already referenced by an existing set log of that player (historical retries).
   - **Do not break:**
     - retries of old logs after a captain deleted the plan;
     - alternatives and swaps;
     - drop sets;
     - timestamp conflict handling.
   - **PGlite tests:**
     - a fake set log cannot unlock an orphan exercise;
     - legitimate logs still sync.
2. **(A-2, MEDIUM)** A player finishes a workout on phone A, then opens it on phone B. Phone B shows set 1 as not done, "complete set" does nothing, and the finish screen never shows.
   - **Cause:**
     - `src/features/workout/data/hydrate-session.ts` downloads only the session, not its sets;
     - progress reads only local sets (`use-focus-session.ts:95-103`);
     - completion is gated at `:167` and `:194`.
   - **Fix:** hydrate the session's set logs too, merging by stable id and timestamp.
     - Keep pending local edits.
     - Never resurrect deleted sets.
     - Keep drop indices and chosen alternatives.
   - **Done when:** the completed workout shows as finished on phone B.

## Out of scope
Forms (T-347), billing (T-349), chat/dashboard (T-350), points (T-351), nutrition (T-352).

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
