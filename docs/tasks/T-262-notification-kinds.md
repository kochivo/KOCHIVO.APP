# T-262 — New notification kinds: video, receipt, answered form

**Phase:** data gaps · **Depends on:** T-253 (receipts) · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 10.

## Goal
The captain gets a notification (bell plus push, where push is enabled) for each of these:
1. a player sends a performance video (`form_checks` insert);
2. a player sends a payment receipt (T-253);
3. a player answers a form (`form_requests.answered_at` set).

Each notification opens the right screen.

## Files
- `supabase/migrations/<next>_captain_notification_kinds.sql`:
  - extend `notifications_type_check` with `form_check_new`, `receipt_new` and `form_answered`. Use the same drop-and-add pattern as migration 0104, keeping every existing value.
  - Add `security definer` triggers that insert the notification for the captain, with a payload of player id, name and the source id.
  - Collapse repeats: one unread notification per player and kind, like the chat rule in 0104.
- `supabase/tests/captain-notification-kinds.test.ts`
- `src/features/notifications/`: the row copy and icon for each kind, the deep links (task or file tab), and push copy.

## Requirements
1. Respect the captain's preferences from T-268 once it lands. Until then, everything is on.
2. Never notify the player about their own action.

## Acceptance
- [ ] Each action creates exactly one unread notification for the right captain.
- [ ] Opening it goes to the right place.
- [ ] Old notification types still render.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Email notifications.
