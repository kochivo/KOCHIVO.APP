# T-093 — Subscription expiry reminders for captain and player

**Phase:** V1 core · **Status:** ready (owner 2026-11-05: "add what V1 needs")

## Today (read first)
- Time-based links (`coach_clients.access_until`, Cairo date) end silently. Only PT packages notify when they run out (`sessions_used_up`, 0060 and 0061).
- Daily reminders already run: `queue_workout_reminders` (latest in `0064_package_rules.sql`) is scheduled by pg_cron in `0052_web_push.sql:115` (`workout-reminders`, 06:00 UTC).
- Notifications table and push:
  - `notifications` has a type check constraint (latest in 0061).
  - `supabase/functions/send-push/{messages.ts,payload.ts}` maps every type to text and a URL. The in-app notification list lives in `src/features/notifications`.

## Changes
1. **Migration `0067_expiry_reminders.sql`** (new; never edit 0001–0066).
   - Add the notification types `subscription_expiring` and `subscription_expired` (recreate the check with **all** existing types plus these two).
   - New `queue_expiry_reminders(p_today date default (now() at time zone 'Africa/Cairo')::date)`:
     - `security definer`, `set search_path = ''`, executable by service_role/postgres only.
     - For every active link (not archived, not pending, not frozen, captain approved, demo captains excluded), with access ending **exactly 3 days from today** or **today**:
       - one notification to the captain, payload `{player_id, name, access_until, days_left}`
       - one to the player, payload `{captain_name, access_until, days_left}`
     - Idempotent per link, per type and per `access_until` (running twice gives no duplicates).
     - PT links still get the reminder when `access_until` is the binding limit.
   - Schedule it next to the workout reminder, guarded the same way 0052 does (only if pg_cron exists), daily at 06:05 UTC.
2. **Push text** (`supabase/functions/send-push/messages.ts` + `payload.ts`, Egyptian Arabic + English):
   - **Captain:** «اشتراك {name} هيخلص بعد 3 أيام» ("{name}'s subscription ends in 3 days") / «اشتراك {name} خلص النهارده» ("{name}'s subscription ends today") → `/captain/players/{player_id}`.
   - **Player:** «اشتراكك مع كابتن {name} هيخلص بعد 3 أيام» ("your subscription with captain {name} ends in 3 days") / «اشتراكك خلص النهارده، كلّم كابتنك» ("your subscription ends today, contact your captain") → `/player`.
   - Update the payload tests.
3. **In-app notification list:** render the two new types with the right icon, text and link (find the type → text map in `src/features/notifications`).

## Out of scope
- Deploying the edge function. The reviewer redeploys send-push after merge.
- Payments.

## Tests
- PGlite:
  - day −3 and day 0 produce exactly one notification each for the captain and the player
  - day −2 produces none
  - running twice produces no duplicates
  - frozen, pending, archived, demo and unapproved-captain links produce none
- Unit tests for push payload text and URL in both locales.
- A render or mapping test for the two new types in the notification list.

## Acceptance
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npm run build`, `npx vitest run --maxWorkers=2` (includes the perf budget).
