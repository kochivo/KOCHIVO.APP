# T-343 — Notification and chat fixes

**Migration:** `0142_chat_push_and_read.sql`

## Items
1. **(Audit #6)** `src/features/notifications/data/notifications.ts` must keep and validate `payload.status` (`approved` or `declined`), so a declined swap shows the declined text.
2. **(Audit #7)** Chat pushes stop after the first message is coalesced. Fix it so that:
   - reading a conversation marks its matching chat notification as read;
   - a coalesced update that represents a new message also triggers push delivery, through the same pg_net path as the insert trigger in `0052_web_push.sql`;
   - a push is never sent twice.
3. **(Audit #8)** `supabase/functions/send-push/index.ts` calls `pushPayload(notification)` with the defaults, so every push uses Egyptian Arabic and `/ar`.
   - Resolve the recipient's locale and Arabic style from their profile. Find the real columns the app's language setting uses.
   - Pass both to `pushPayload`.
   - Add any column you need to the push read grant in the migration.
   - Keep Sentry reporting as it is.
4. **(Audit #9)** Chat (`src/features/chat/data/chat.ts:21` and `hooks/use-chat-thread.ts`):
   - add "load older messages" pagination;
   - when the thread opens, mark all unread messages read, not only the last 50;
   - show loading and error states for older pages.

## Out of scope
Assessment notifications (done in T-338), billing, workout.

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
