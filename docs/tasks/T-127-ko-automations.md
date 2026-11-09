# T-127 — KO automations with template messages and review

**Phase:** KO core · **Depends on:** T-123 (feed), T-122 (`ko_usage`) · **Status:** draft (owner decisions below)

## Goal
A captain switches on a few follow-up rules once, and KO prepares the nudges every morning:
- no check-in for N days
- missed today's workout
- no meals logged

The messages come from the captain's own **templates with variables**, so they cost no AI.
By default each nudge appears as a card in the KO feed for review ("Send all", or edit one).
Captains on higher plans can turn on "Rewrite with KO", which rewrites the whole day's batch
in **one** model call.

## Files
Create or modify only these:
- `supabase/migrations/0079_ko_automations.sql`: `ko_automations` and `ko_nudges` tables, `queue_ko_nudges()`, a `pg_cron` schedule (guarded as in 0067), and a new notification type `captain_nudge`
- `supabase/tests/ko-automations.test.ts`
- `src/features/ko-automations/index.ts`
- `src/features/ko-automations/template.ts`: pure `render(template, vars)` with an allowlist of variables
- `src/features/ko-automations/template.test.ts`
- `src/features/ko-automations/data/automations.ts`: read and save rules
- `src/features/ko-automations/data/nudges.ts`: list pending nudges, send, edit, skip
- `src/features/ko-automations/data/rewrite-batch.ts`: optional single-call rewrite (server-only)
- `src/features/ko-automations/components/automations-screen.tsx`: rule cards with toggle, days, template and mode
- `src/features/ko-automations/components/nudge-review.tsx`: the day's batch with "Send all"
- `src/features/ko-automations/messages.ts`
- `src/features/ko-feed/components/ko-feed.tsx`: one "N nudges ready" card linking to the review
- `src/features/notifications/types.ts`, `format.ts`: render `captain_nudge`
- `src/types/database.ts`, a captain route page for the screen, and this task card.

## Requirements
1. **`ko_automations(captain_id, kind, enabled, after_days 1–14, template ≤ 300, mode)`**
   - `kind` ∈ no_checkin | missed_workout | no_meals
   - `mode` ∈ review | auto
   - Defaults: all off, mode review, plus a starter Egyptian Arabic template per kind.
2. **`queue_ko_nudges()`** runs daily at 08:00 Cairo. For each enabled rule it inserts
   `ko_nudges(id, captain_id, player_id, kind, body, status 'pending')`, unique per
   (player, kind, Cairo date). It skips archived or frozen players and players who already got
   any nudge today. It renders variables in SQL from the same allowlist:
   `{name}`, `{days}`, `{workout}`, `{next_meal}`.
3. **Mode `auto`** inserts the notification directly (plus push through the existing pipeline)
   and marks the nudge sent. Mode `review` waits for the captain. Before sending, the review
   screen shows players who have an unreviewed check-in or reply ("Read their messages first").
4. **Sending** goes through a security-definer RPC that checks `is_captain_of(player)`. It
   inserts the `captain_nudge` notification with the body and marks the nudge sent. The RPC is
   idempotent.
5. **Rewrite with KO** (plan-gated):
   - One Gemini call per batch, with at most 25 nudges per call.
   - Input: first names, kind, days and the template only.
   - Output: `{ items: [{ i, body ≤ 300 }] }`, zod-validated.
   - Counts one `consume_ko_quota('nudge_batch')`.
   - Any invalid item keeps its template text.
6. Players can never see `ko_nudges` rows. They only receive the notification.

## Acceptance
- [ ] PGlite: rule ownership, one nudge per player per kind per day, skips archived or frozen, auto vs review, the send RPC rejects foreign players
- [ ] Template tests: unknown variables left as-is, Arabic preserved, length cap
- [ ] Rewrite test with an injected fetcher: one call for 25 nudges; an invalid item falls back to the template
- [ ] UI tests: ar/en, RTL, empty ("No nudges today"), loading and error states
- [ ] `npm run check` and `npm run build` pass

## Out of scope
- Scheduled one-off broadcasts
- WhatsApp or SMS delivery
- Player-side automation settings

## Owner decisions
- Which plans get `auto` mode and "Rewrite with KO": after the feasibility study. Build both
  behind a per-plan config flag.
- Default send time: 08:00 Cairo is a placeholder; keep it in one SQL constant.
