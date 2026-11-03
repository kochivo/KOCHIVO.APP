# T-051 — Notification center and admin KPI check

**Phase:** 3 · **Depends on:** none · **Status:** ready

## Already exists, do not rebuild
- **Admin:** `/admin` (`src/features/admin`) is gated in the database by `public.is_admin()` (0015) and `require-admin.ts`. Do **not** switch it to a `NEXT_PUBLIC_ADMIN_EMAIL` check: a public env var is visible in the browser and is not a security boundary. The captains table and `activate-panel.tsx` already upgrade a captain's plan through the admin RPC on `profiles.plan`. Do not add a `subscription_tier` column or a `captains` table.
- **Voice notes and their "new" badge:** `src/features/voice-notes`.

## Admin delta
- `kpi-row.tsx` must show these three: total captains, total players, and the share of captains on a paid plan. Add whatever is missing to the admin data query, which runs as admin only, and test the percentage maths (zero captains shows 0%).

## Notifications
- `supabase/migrations/0047_notifications.sql`:
  - `public.notifications` with these columns:
    - `id uuid` primary key, default `gen_random_uuid()`
    - `user_id` referencing profiles, on delete cascade
    - `type text`, checked to `plan_assigned`, `nutrition_updated`, `player_joined` or `player_inactive`
    - `payload jsonb not null default '{}'`, holding ids and names. The UI builds the text from `messages.ts`, so do not store raw message text.
    - `is_read boolean not null default false`
    - `created_at timestamptz not null default now()`
  - RLS: a user selects and updates (only `is_read`, through a column grant) their own rows. Nobody inserts from the client; inserts come from security-definer triggers or functions with `set search_path = ''`. Add an index on `(user_id, created_at desc)` and a partial index `where not is_read`.
  - Triggers:
    - A program becomes `active` for a player → `plan_assigned` to that player.
    - An active nutrition plan is created, or its targets are updated → `nutrition_updated`. Coalesce these: at most one unread per plan.
    - A `coach_clients` row is inserted → `player_joined` to the captain.
  - Function `public.refresh_inactive_alerts()`, security definer, callable by a captain for themself only: for each active player with no workout session in the last 3 days (use `localDate`-style dates in the captain's `profiles.timezone`), insert `player_inactive` unless one for that player was created in the last 3 days.
- PGlite tests `supabase/tests/notifications.test.ts`:
  - Each trigger fires.
  - A user cannot read or update another user's rows.
  - A client insert is rejected.
  - The inactivity alert is not duplicated.
  - A captain cannot run the refresh for another captain.
- `src/features/notifications`, following the standard layout (index, components, hooks, data, tests):
  - `NotificationBell` in the captain and player shells' top bar. It uses a lucide `Bell` icon button with a translated `aria-label`, and a small lime dot when anything is unread. Keep the glow tight.
  - Clicking it opens a `glass-strong` dropdown. It is an anchored popover on desktop and a bottom sheet on mobile; reuse `ResponsiveDialog`.
  - The dropdown shows the latest 20, with relative time and a link to the related screen, plus «علّم الكل كمقروء». Marking one or all as read is optimistic, with rollback.
  - The captain home calls `refresh_inactive_alerts()` once per local day on open. Do not block rendering, and fail silently with `console.warn`.
  - Polling: refetch the count on window focus and every 2 minutes while visible. No realtime subscription, because of the live per-IP rate limit.
  - Include an empty state, a loading state and an error state.
- `messages.ts`: Egyptian Arabic and English, with one string per type using payload values.

## Requirements
- No new dependencies. Tokens only. RTL logical properties. Files under 250 lines. The perf budget must pass; load the dropdown with `next/dynamic`.

## Acceptance
- [ ] A player gets a notification when a program is assigned or the macros change. A captain gets one when a player joins and when a player has been inactive for 3 or more days.
- [ ] Nobody sees anyone else's notifications.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
