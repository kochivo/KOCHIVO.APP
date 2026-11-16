# T-333 — Notifications for the 7 missing important events

**Source:** owner request on 2026-11-16: "turn on notifications for the player and the captain for anything important". The owner approved this list of 7 events.

**Migration:** ONE new file, `supabase/migrations/0135_important_notifications.sql`. It is additive:
- it widens `notifications_type_check` the same way `0123_pain_reports.sql` does (read the live expression, then append `or type in (...)`);
- it adds `security_private` trigger functions and triggers.

It writes no data and does not edit older migrations. Do not apply it to any hosted database.

## How notifications work today (follow this pattern)
1. A row in `public.notifications(user_id,type,payload)` is the in-app notification (the bell).
2. The trigger `notifications_push` in `0052` sends it as web push through the `send-push` edge function.
3. Pattern to copy: `security_private.notify_pain()` in `0123`. It is a definer function with `search_path=''`, revoked from public, anon and authenticated, and runs from an `after insert` trigger.
4. Type list: `src/types/enums.ts` `notificationTypes`.
   - In-app text and links: `src/features/notifications/` (`format.ts`, `components/captain-notification-format.ts`, `messages.ts`).
   - Push text and links: `supabase/functions/send-push/messages.ts` and `payload.ts`.

## The 7 events
| # | Type | To | Fires when | Opens |
|---|---|---|---|---|
| 1 | `checkin_submitted` | captain | a row is inserted into `check_ins` | the player's file, check-ins section |
| 2 | `form_answered` | captain | `form_requests.answered_at` goes from null to a value | the answered form or request |
| 3 | `swap_requested` | captain | a row is inserted into `exercise_swap_requests` | the player's file, pending swap |
| 4 | `form_check_submitted` | captain | a row is inserted into `form_checks` | the player's file or inbox item |
| 5 | `receipt_submitted` | captain | a row is inserted into `payment_receipts`, or a declined receipt is resubmitted (revision goes up and status returns to pending) | billing or money for that player |
| 6 | `coach_replied` | player | `check_ins` or `form_checks`: `reviewed_at` goes from null to a value, or `captain_reply` changes to a non-empty value. Use one type with `payload.kind` = `checkin` or `form_check` | the player screen where they see the reply |
| 7 | `swap_decided` | player | `exercise_swap_requests.status` goes from `pending` to `approved` or `declined`; `payload.status` says which | the player's workout or program screen |

Use the exact routes the app already uses for these screens: grep for the existing links. Do not invent paths.

## Rules
- **Payload:**
  - Include the ids needed for the link and `display_name` (player name, for the captain types) or `captain_name` (for the player types).
  - Never include check-in notes, photos, amounts or reply text. The push goes through a third-party push service.
- **No duplicates:**
  - If an existing flow already notifies for the same moment, skip the new insert for that case. For example, a captain reply that also creates a `chat_message` notification. Explain your finding.
  - Offline sync can replay the same insert (`on conflict do nothing`), so fire only on real inserts or real transitions.
  - An `UPDATE` that does not change the watched columns must not notify.
- **Recipients:**
  - Never notify the person who caused the event.
  - Skip when the recipient is null or suspended, if a helper for that exists.
- **Failures:** a trigger failure must never block the player's or captain's write. Wrap the insert body like `send_notification_push` does (`exception when others then return new`), and add a comment saying why.
- **Wording:** add messages in `ar` (Egyptian), `arStd` and `en`, both in-app and in push. Keep them short and plain, with no emoji. Player-facing text uses the captain's name; captain-facing text uses the player's name.
  - Examples in Egyptian: «{name} بعت المتابعة», «{name} جاوب على الفورم», «{name} طالب يبدّل تمرين», «{name} بعت فيديو أداء», «{name} رفع إيصال دفع», «الكابتن رد على المتابعة», «الكابتن رد على فيديو الأداء», «الكابتن وافق على تبديل التمرين» / «الكابتن رفض تبديل التمرين».
- Update `src/types/enums.ts`. Keep `src/types/database.ts` consistent if it lists the CHECK values.

## Tests
- **`supabase/tests/important-notifications.test.ts` (PGlite):**
  - each of the 7 events creates exactly one row for the right user, with the right type and payload keys;
  - a replayed sync insert, an unrelated update and a second identical update create nothing;
  - the actor never receives their own event;
  - a failing notification insert does not roll back the source write (simulate it if practical, or explain);
  - payloads contain no notes, amounts or reply text.
- **Unit tests** for the push payload (title, body, url per type and locale) and the in-app formatting of the new types.
- Rerun the existing notification, pain and web-push tests.

## Out of scope
- `safe_timezone` (SEC-04).
- Notification settings and mute toggles per type.
- PR, points and meal-log notifications. The owner chose not to send these.
- Deploying the edge function or applying the migration (the reviewer does it after the owner OKs).

## Gates
`npm run check`, `npm run build`, and the new and existing notification tests in `supabase/tests/` and `src/features/notifications/`.
