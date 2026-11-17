# T-350 — Chat history after transfer, expiring voice links, dashboard adherence for rotating programs

**Migration:** none (client only). If you find you need SQL, stop and explain why.

## Items
1. **(D-2, MEDIUM)** After a transfer, the old captain's voice notes and replies show up in the player's chat with the new captain, labelled as the new captain.
   - **Cause:** these loaders filter by player only:
     - `src/features/chat/hooks/use-chat-thread.ts:44-45`;
     - `src/features/voice-notes/data/voice-notes.ts:52-54`;
     - `src/features/voice-notes/data/captain-thread-replies.ts:6-9`.

     Then `src/features/chat/thread.ts:13-24` stamps the current captain on every legacy item.
   - **Fix:** filter legacy content by the conversation's captain. The player keeps access to old records elsewhere, as today.
2. **(D-3, MEDIUM)** In an open chat, older voice messages stop playing after one hour.
   - **Cause:** `src/features/chat/data/chat.ts:33` signs URLs for 3600 s, and cached pages are never re-signed.
   - **Fix:** re-sign cached messages when playback fails or before they expire.
   - **Keep:**
     - pagination;
     - pending recordings;
     - read state;
     - conversation isolation.
3. **(D-1, MEDIUM)** Weekly adherence on the captain dashboard is wrong for rotating programs. For example, one workout out of three scheduled shows 100%.
   - **Cause:** `src/features/dashboard/home/model.ts:46-49` divides distinct completed day ids by the number of program days.
   - **Fix:** count the planned occurrences in the week, then count completed sessions by date without double counting. Planned occurrences come from:
     - `player_intake.training_days` for rotating programs, as the leaderboard does in `0132_rotating_and_templates.sql:210-214`;
     - the weekdays for weekly programs.
   - **Keep:** the Saturday week start and rest-day handling.

## Out of scope
Forms (T-347), workout (T-348), billing (T-349), points and public-page SQL (T-351), nutrition (T-352).

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
