# T-338 — Assessments: notify the player, and show the captain's reply

**Source:** owner report on 2026-11-16. When the captain sends an assessment (custom form) to a player, or replies to the player's answers, the player gets no notification. The player also cannot see the captain's reply anywhere.

**Verified causes:**
1. Sending a form (inserting into `public.form_requests`) creates no notification. `form_requested` is only inserted by `remind_custom_form_request` and `queue_form_reminders` (`0093_form_schedules.sql`). Live data: 2 requests, 1 `form_requested` notification.
2. A captain review (`request-actions.ts` sets `captain_reply` and `reviewed_at` on `form_requests`) has no trigger. T-333 (`0135_important_notifications.sql`) added `coach_replied` only for `check_ins` and `form_checks`.
3. The player screens (`src/features/player-shell/data/player-assessments.ts`, `captain-assessment.ts`, `/player/forms/[requestId]`) never select `reviewed_at` or `captain_reply`.

**Migration:** ONE new file, `supabase/migrations/0137_assessment_notifications.sql`. It is additive: trigger functions and triggers only. `notifications_type_check` already allows `form_requested` and `coach_replied`. Follow the exact style of `0135`:
- definer, `search_path=''`;
- revoked from public, anon and authenticated;
- the body wrapped in `exception when others then return new` with a why-comment;
- skip when the recipient is the actor or is suspended.

Do not apply it.

## A. A new form request notifies the player
- Add an `after insert on public.form_requests` trigger. It inserts `form_requested` for `new.player_id` with payload `{name: <form title>, request_id, form_id}`, the same shape the reminder functions use.
- Check `0108_invite_start_forms.sql` and any other insert path, such as start forms on invite redeem or scheduled assessments in `0096`. Notify for every real request, and never twice for the same request. If an existing path already inserts `form_requested` at creation time, skip those rows; explain what you found.

## B. A captain review notifies the player
- Add an `after update of reviewed_at, captain_reply on public.form_requests` trigger, with the same transition rule as `notify_coach_replied` in `0135`: `reviewed_at` goes from null to a value, or `captain_reply` changes to a non-empty value.
- It inserts `coach_replied` for `new.player_id` with payload `{kind: 'assessment', request_id, form_id, player_id, captain_name}`.
- The live trigger `important_form_answered` on the same table must keep working.

## C. Text and links
- **In-app** (`src/features/notifications/format.ts` and messages): add the `kind === 'assessment'` text variant for `coach_replied`. Its link opens where the player now sees the reply (part D).
  - ar «كابتن {name} رد على التقييم»
  - arStd «ردّ المدرب {name} على التقييم»
  - en "{name} replied to your assessment"
- **Push** (`supabase/functions/send-push/messages.ts` and `payload.ts`): the same text variant and link.
  - Do not touch `send-push/index.ts` or `report.ts`; another card is editing them.
- Check that `form_requested` is visible to players in the bell. `src/features/notifications/data/notifications.ts` filters it out when `captainWorkspaceEnabled()` is false. Explain whether that flag hides it in production for players; if it wrongly hides player notifications, fix it.

## D. The player sees the captain's reply
- Select `reviewed_at` and `captain_reply` where the player lists their assessments (`player-assessments.ts` and its components) and on the answered form view (`/player/forms/[requestId]`).
  - Confirm through RLS/grants that the player can read those columns on their own requests. If they can't, add the narrowest fix in the same migration.
- **UI:**
  - On an answered request, show «اتراجع» (reviewed) and the reply text in a quiet card; show nothing when there is no reply yet.
  - Use logical properties and tokens only.
  - Add an empty or loading state if a new async read is added.
  - Every string goes in ar, arStd and en messages.

## Tests
- **PGlite (`supabase/tests/assessment-notifications.test.ts`):**
  - an insert notifies the player exactly once;
  - a review notifies once, with `kind 'assessment'`;
  - an unrelated update or a repeated identical review does nothing;
  - the actor is never notified;
  - a notification failure does not roll back the review;
  - the player can read their own reply columns, and another player cannot.
- **Unit:** in-app and push text and links for the assessment kind; the player component renders the reply when present and hides it when absent.

## Gates
`npm run check` and `npm run build`.

## Out of scope
- Check-in and form-check replies (done in T-333).
- Changing how the captain writes a review.
