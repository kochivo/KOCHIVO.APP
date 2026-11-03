# T-009b — Dropout radar: players drifting away, shown first, with a ready WhatsApp nudge

**Phase:** 3 · **Depends on:** T-009, T-018 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
At the top of the roster, the captain sees a «رادار الانسحاب» card listing players who need a nudge now. Each row shows:
- the player
- the reason in Arabic
- how many days it has been
- one «ابعتله» WhatsApp link with a ready message

The radar is computed in SQL, not in the browser.

## Who is on the radar
Only active (not archived) players of the caller:
| Reason | Rule |
|---|---|
| `no_activity` | has an active program, the last `workout_sessions.training_date` is ≥ 3 days ago, and `started_on` is ≥ 3 days ago |
| `never_started` | has an active program, no session ever, and `started_on` ≥ 3 days ago |
| `no_program` | no active program and `started_on` ≥ 2 days ago (the captain forgot to assign one) |

One row per player, using the first matching reason in the table's order. Sort by days desc, then name. `days` counts from the last session, or from `started_on` when there is none.

## Files
- `supabase/migrations/0021_dropout_radar.sql` (new): `public.captain_dropout_radar(p_today date default current_date)`:
  - returns `(player_id uuid, full_name text, phone text, reason text, days int)`
  - `language sql stable security invoker set search_path = ''`, so RLS applies exactly as in `captain_roster()` (0016)
  - filters `coach_clients.captain_id = auth.uid() and archived_at is null`
  - `p_today` exists only so tests are deterministic. The app passes the Cairo `localDate()`.
  - Grant execute to `authenticated` only.
- `supabase/tests/rls-dropout-radar.test.ts` (new):
  - each reason
  - the precedence order
  - a player active 1 day ago is excluded
  - archived players are excluded
  - another captain sees none of your players
  - the anon execute check
- `src/features/roster/radar.ts` (pure):
  - `radarReasonLabel(reason, days)` returns:
    - «مسجّلش تمرين من {days} أيام» (use the `أيام`/`يوم` rule from `status.ts`)
    - «لسه مبدأش من {days} أيام»
    - «من غير برنامج»
  - `radarMessage(name, reason)` returns short Egyptian Arabic text, one per reason. For example: «يا {name}، وحشتنا في التمرين. نرجع النهارده؟»
- `src/features/roster/data/radar.ts`: a `'use server'` action `fetchRadar(today)` that calls the RPC and returns `{ data }` or an Arabic `{ error }`. Validate `today` as `YYYY-MM-DD`.
- `src/features/roster/components/radar-card.tsx`:
  - a `glass-strong` card titled «رادار الانسحاب» with a warn dot and the count
  - up to 5 rows plus «وريني الكل», which expands the list
  - each row: name, reason label, and a ghost «ابعتله» link. Build it with the existing `whatsappShareUrl` style from `roster/invite.ts` if it fits; otherwise use a local helper. It is disabled when there is no phone.
  - Hidden entirely when the list is empty. A failed load shows one muted line «الرادار مش متاح دلوقتي» and never blocks the roster.
- `src/features/roster/components/roster-screen.tsx`: render `<RadarCard today={today} />` between the header and the counts. This is the only change in that file.
- `src/features/roster/roster.test.ts`: add `radarReasonLabel` and `radarMessage` cases, and `fetchRadar` validation and error mapping with the existing mocks.

## Requirements
1. No new client Supabase calls. RLS plus the invoker function are the security.
2. Files are under 250 lines, use tokens only, use RTL logical properties, have targets ≥ 48px, and use Egyptian Arabic.

## Acceptance
- [ ] The SQL tests and the new unit tests pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Push or automatic messages
- Changing `captain_roster()` or the roster table columns
- Billing
- The inbox
