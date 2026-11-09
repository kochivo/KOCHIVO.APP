# T-123 — KO action feed (urgent and generate cards)

**Phase:** KO core · **Depends on:** T-116 (KO popup), T-121 for the generate actions · **Status:** implemented; verification notes below

## Goal
KO tells the user what needs doing *now*, inside the existing KO popup, and each item has one
button that does it. The launcher shows a count badge when something is urgent. Everything is
computed with SQL from existing data, so the feed costs **zero AI calls** and works on the free
Gemini tier. The notification bell stays the history of events. KO is the to-do list built
from it, so items are not duplicated as notification rows.

## Files
Create or modify only these:
- `supabase/migrations/0077_ko_feed.sql`: `ko_feed()` RPC and `ko_dismissals` table
- `supabase/tests/ko-feed.test.ts`: PGlite RLS and rule tests
- `src/features/ko-feed/index.ts`: public API (`KoFeed`, `useKoFeedCount`)
- `src/features/ko-feed/types.ts`: `KoFeedItem` union
- `src/features/ko-feed/rank.ts`: pure ordering and grouping
- `src/features/ko-feed/data/load-feed.ts`, `data/dismiss.ts`
- `src/features/ko-feed/hooks/use-ko-feed.ts`: load on panel open, reuse the notifications polling interval
- `src/features/ko-feed/components/ko-feed.tsx`: Urgent and Ready-to-generate sections
- `src/features/ko-feed/components/feed-card.tsx`: icon, one line, one action, dismiss
- `src/features/ko-feed/messages.ts`
- `src/features/ko-feed/ko-feed.test.ts`
- `src/features/ko-preview/components/ko-panel.tsx`: render `KoFeed` above the chat
- `src/features/ko-preview/components/ko-widget.tsx`: badge with urgent count; `thinking` expression when count > 0
- `src/types/database.ts`
- This task card.

## Requirements
1. **`ko_feed()`** is `security invoker`, so table RLS applies. It returns at most 8 rows
   `{ key, kind, severity: 'urgent' | 'generate', player_id, player_name, data jsonb }`.
   It excludes keys present in `ko_dismissals` for the caller with `until > now()`. Dates use
   Cairo time.
2. **Captain rules:**
   - urgent `join_requested`: pending join request
   - urgent `expiring`: `access_until` within 3 days; `expired` within the last 7 days
   - urgent `sessions_used_up`
   - urgent `inactive`: no completed session in 5+ days while a program is active
   - generate `no_program`: active player with no active program
   - generate `no_nutrition`: active player with no active meal plan
3. **Player rules:**
   - urgent `today_workout`: a program day today with no completed session after 18:00 Cairo
   - urgent `my_expiring`: own access ends within 3 days
   - generate `log_meal`: an assigned plan exists and no meal has been logged today
4. **Actions** never execute directly. Each card opens an existing flow with its data prefilled:
   - `join_requested` → approval screen
   - `expiring` / `expired` → KO renew preview (existing signed approval)
   - `inactive` → KO reminder preview
   - `no_program` → T-121 brief sheet for that player
   - `no_nutrition` → nutrition plan screen
   - `today_workout` → start workout
   - `my_expiring` → message captain
   - `log_meal` → nutrition log

   Every card also has a dismiss icon button (translated `aria-label`) that snoozes the item for 24 h.
5. **`ko_dismissals(user_id, key, until)`**: owner-only RLS plus the restrictive `active_caller`
   policy. The key format is `<kind>:<player_id>:<cairo date>`, so tomorrow's item comes back.
6. **UI:**
   - Urgent first (danger-soft icon tint), then Ready to generate (lime-soft).
   - Each section header and the empty state use the existing KO character through
     `KoAvatar` (`public/ko-preview/`): `thinking` when urgent items exist, `cheer` for the
     all-clear empty state, `welcome` otherwise. Do not draw a new KO mark or a text "KO" box.
   - Max 5 visible, with "Show all" below.
   - Empty state: "Nothing urgent. Ask KO anything."
   - Loading and error states are required.
   - The chat stays below the feed and still works.
   - The launcher badge is hidden when the count is 0, and it is announced in the launcher `aria-label`.
7. **Feed work:** loading the feed never calls Gemini; only the existing chat path does.

## Acceptance
- [x] PGlite: a captain sees only their own players; a player sees only themselves; dismissals are private; suspended callers get nothing
- [x] Rule tests for each kind at its boundary (3 days, 5 days, 18:00 Cairo) with injected `now`
- [x] UI tests: ar/en, RTL, empty, loading, error, badge count, and dismiss hiding a card optimistically
- [ ] `npm run check` and `npm run build` pass

## Out of scope
- Daily push digest for urgent items (follow-up card; reuse `send-push` and send at most one per day)
- Weekly progression suggestions (needs its own engine)
- Changing the notification bell

## Implementation notes

- `no_program` uses `/[locale]/captain/players/[playerId]/programs` until T-121 exists.
- Renewal asks for days before requesting the existing signed KO preview. Reminders use that
  same preview/confirmation flow. Feed loading itself uses only `ko_feed()`, never Gemini.
- `KoAvatar` is passed from the popup into the feed, preserving feature boundaries without
  changing the KO preview public API outside this card's file list.
- Join requests open the existing roster approval list; that screen does not support selecting
  a request through URL parameters. Sessions-used-up opens the player's existing billing/profile flow.
- UI tests use server rendering plus deterministic ordering/count/snooze tests; browser interaction
  with Show all and the signed preview still needs manual review.

## Verification notes

- Full Vitest run with `--configLoader native --pool threads --maxWorkers 4`:
  391 files passed, 1 failed; 2683 tests passed, 1 failed. The remaining failure is
  `src/lib/perf-budget.test.ts`: stale bundle stats reference a missing `.next` chunk.
- Production build is blocked only by fetching Alexandria, Changa and Manrope from Google Fonts.
- The release audit's child `git` process is denied by this sandbox (`spawnSync git EPERM`).
  Running the audit rules with a shell-provided file list instead reports two existing
  `unguarded-route` findings: `src/app/[locale]/dev/ko/page.tsx` and
  `src/app/[locale]/dev/ko/chat/route.ts`. Those files are outside this card and unchanged.

## References
- `src/features/ko-preview/components/ko-panel.tsx`, `ko-widget.tsx`
- `src/features/notifications/types.ts`, migrations 0047, 0061, 0067
- Mockup: "KO action feed" (shown in chat 2026-11-09)
