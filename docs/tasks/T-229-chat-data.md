# T-229 — Chat between player and captain: table, rules and data module

**Phase:** player v3 · **Depends on:** none · **Status:** ready

## Goal
The player and their captain can send each other text and voice messages inside the app. This card adds only the database table, the security rules, the notification, and a client data module. It adds no screens; T-230 and T-232 build those. The owner approved the new table on 2026-11-13. It is additive: no existing table or row changes.

## Files
Create or modify only these:
- `supabase/migrations/0104_chat_messages.sql` (new)
- `supabase/tests/chat-messages.test.ts` (new, PGlite, same harness as the other files in `supabase/tests/`)
- the app database types file that already lists `voice_notes` (`src/types/...`; find it). Add `chat_messages` the same way.
- `src/types/enums.ts`: add `'chat_message'` to the notification type.
- `src/features/notifications/`: the formatter and link for the new type, in the files that handle the other types today, plus their messages (`ar`, `arStd`, `en`).
- `src/features/chat/` (new feature): `index.ts`, `types.ts`, `data/chat.ts`, `hooks/use-chat-thread.ts`, `thread.ts` (pure merge and sort), `chat.test.ts`
- `src/features/voice-notes/index.ts`: export the existing captain-replies loader only if `chat` needs it. Make no other changes in voice-notes.

## Requirements
1. **Table** `public.chat_messages`:
   - `id uuid primary key`. The client creates it with `uuidv7()`.
   - `captain_id uuid not null references public.profiles(id) on delete cascade`.
   - `player_id uuid not null references public.profiles(id) on delete cascade`.
   - `sender_id uuid not null`, with `check (sender_id in (captain_id, player_id))`.
   - `body text`: trimmed, length 1–1000.
   - `audio_path text unique`, with `check (split_part(audio_path, '/', 1) = player_id::text)`.
   - `duration_seconds int`, between 1 and 120.
   - A check that exactly one of `body` and `audio_path` is set, and that `duration_seconds` is set only when `audio_path` is.
   - `read_at timestamptz`.
   - `created_at timestamptz not null default now()`.
   - Indexes: `(player_id, created_at desc)`, `(captain_id, created_at desc)`, and a partial unread index on `(captain_id, player_id) where read_at is null`.
2. **RLS.** Copy the `voice_notes` style:
   - Start from `revoke all`, then grant `select, insert` and `update (read_at)` only.
   - Add the restrictive `active_caller` policy.
   - **Select:** `auth.uid()` is the `captain_id` or the `player_id`.
   - **Insert:** `sender_id = auth.uid()`, and either:
     - the caller is the captain and `public.is_captain_of(player_id)`; or
     - the caller is the player and `captain_id = public.my_captain_id()`.

     Before relying on `my_captain_id()`, read it in the migrations. It must return only a current, non-pending, non-archived link. If it does not, write a small `security_private` helper that does.
   - **Update read_at:** only the recipient (`auth.uid()` is captain or player, and `sender_id <> auth.uid()`).
   - No delete for now.
3. **Storage.** The bucket `voice-notes` already exists. Add an insert policy so a player can upload only under `<own id>/chat/…`. The existing read policy already lets the player and their captain read that folder; confirm this in the test. The captain already has insert there. Do not change the existing policies.
4. **Notification.**
   - Add the type `chat_message` with the same do-block that 0102 uses, which keeps every existing kind.
   - Add an after-insert trigger that notifies the recipient. Payload: `name` (the sender's full name), `player_id`.
   - Combine repeats: keep one unread `chat_message` row per `(user_id, payload->>'player_id')`. Use a partial unique index as `notifications_unread_nutrition` does, plus `on conflict do update set created_at = now()`.
   - The notification link goes to `/player/captain` for the player and `/captain/players/<player_id>/chat` for the captain.
5. **Data module** `src/features/chat`, client side, with an injected Supabase client like `voice-notes/data` uses:
   - `listMessages(client, { playerId, captainId, limit = 50 })` returns the newest 50, oldest first.
   - `sendText(client, { playerId, captainId, senderId, body })`.
   - `sendVoice(client, { …, blob, mimeType, durationSeconds })` uploads to `<playerId>/chat/<id>.<ext>`, then inserts the row. If the insert fails, it removes the upload.
   - `markRead(client, ids)`.
   - `unreadCounts(client, captainId)` returns `Record<playerId, number>` in one query.
   - `mergeThread(...)` in `thread.ts` is pure. It merges chat messages, the existing captain `voice_notes`, and the existing captain text replies (the loaders that `voice-notes` already has) into one list sorted by `createdAt`, with a `mine` flag computed from `viewerId`.
   - `useChatThread({ playerId, captainId, viewerId, now?, intervalMs = 15000 })`:
     - loads on mount;
     - polls only while `document.visibilityState === 'visible'`;
     - inserts optimistically on send, marking failed sends `failed` with a retry;
     - marks incoming unread items as read once they are loaded on screen.

     Inject the timer (or `intervalMs`) so tests use no real timers.
   - Export from `index.ts` only what T-230 and T-232 need. Do not export UI.
6. Strings go in messages files for `ar`, `arStd` and `en`. Player standard Arabic follows the existing `NEXT_PUBLIC_INTERNATIONAL` getter pattern, as `coverage.test.ts` enforces.

## Acceptance
- [ ] The PGlite test proves:
  - [ ] the player can send only to their own current captain;
  - [ ] a captain can send only to their own player;
  - [ ] nobody can send with someone else's `sender_id`;
  - [ ] a third user can't read;
  - [ ] only the recipient can set `read_at`;
  - [ ] the body can't be edited;
  - [ ] the notification is created for the recipient and combined while unread;
  - [ ] the player can't upload into another player's folder;
  - [ ] every existing notification type still inserts.
- [ ] Unit tests cover `mergeThread` order and `mine`, and polling start, stop and hidden-tab behavior using an injected timer.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Any screen. T-230 builds the player chat, T-231 the captain page and assessments page, T-232 the captain-side chat.
- Images in chat, deleting messages, typing indicators, realtime.
- Do not edit migrations 0001–0103.

## References
- `supabase/migrations/0038_voice_notes.sql` (style, storage), `0047_notifications.sql`, `0102_join_request_package.sql` (constraint pattern)
- Mockup: `docs/mockups/player-v3/12-chat-split.html`
