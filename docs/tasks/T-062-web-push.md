# T-062 — Web push notifications and daily workout reminder

**Phase:** 3 · **Depends on:** T-051 notification center (merged) · **Status:** ready (owner chose push on 2026-11-04)

## Goal
- A player or captain turns on «إشعارات على الموبايل» once.
- Every in-app notification (`public.notifications`) then also arrives as a phone or desktop push, even with the app closed.
- Players also get a morning reminder on their training days, because adherence is what keeps captains paying.

## Architecture (follow it; ask in "Notes" if something blocks it)
- **Subscriptions:** the browser Push API with VAPID. There is **no client dependency**.
- **Sender:** a Supabase Edge Function `supabase/functions/send-push/index.ts` (Deno) using `npm:web-push@3.6.7` (a Deno import, **not** a package.json dependency).
  - It reads its config through `public.push_config()`, called with the service role. Deno env only provides the built-in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
  - Set `verify_jwt = false` and authenticate the caller by comparing the header `x-push-secret` with the `push_hook_secret` from that config (constant-time compare).
- **Delivery:** an `after insert` trigger on `public.notifications` calls the function through `pg_net` with `{ notification_id }`.
  - The function loads the notification and the user's subscriptions, builds the localized payload, and sends.
  - On a 404 or 410 it deletes that subscription. On other errors it logs `console.error` with no user data.
- **Config in Vault**, never in files: the secrets `push_function_url`, `push_hook_secret`, `vapid_public_key`, `vapid_private_key` and `vapid_subject`. The reviewer stores them after merge.
  - `public.push_config()`: SECURITY DEFINER, reads `vault.decrypted_secrets`, returns them as jsonb. EXECUTE is revoked from `public`, `anon` and `authenticated`, and granted only to `service_role`.
  - The trigger reads the URL and secret with an internal `security_private` helper.
  - If any value is missing, or `pg_net` is not installed, the trigger does **nothing** and never raises. The in-app notification must always commit.

## Files
- `supabase/migrations/0052_web_push.sql`:
  - Enable `pg_net` only when it exists in `pg_available_extensions` (PGlite does not have it). Call `net.http_post` through dynamic SQL guarded by `to_regprocedure`, so the migration and the PGlite tests run without it.
  - `push_subscriptions` table:
    - columns `id uuid pk`, `user_id → profiles on delete cascade default auth.uid()`, `endpoint text unique` (≤ 1000, `https://` only), `p256dh text`, `auth text`, `user_agent text` (≤ 300), `created_at`, `last_success_at`
    - RLS: the owner selects, inserts and deletes their own rows; nothing else
    - the restrictive `active_caller` policy
    - at most 10 subscriptions per user (trigger)
  - Allow the new notification type `workout_reminder` in the `notifications.type` check (drop and re-add the constraint in this migration; do not edit 0047).
  - `public.queue_workout_reminders(p_today date default (now() at time zone 'Africa/Cairo')::date)`:
    - SECURITY DEFINER, executable by `service_role` / `postgres` only
    - inserts one `workout_reminder` notification (payload `{ day_title, program_id }`) for each player whose **active** program has a `program_days` row with `weekday` = the Saturday-0 weekday of `p_today`, `not is_rest_day`, and no `workout_sessions` row with `training_date = p_today`
    - legacy rotation programs (no weekday) are skipped
    - idempotent per player per day (a unique partial index or a `not exists` guard)
    - suspended users are skipped
  - At the end: `cron.schedule('workout-reminders', '0 6 * * *', 'select public.queue_workout_reminders()')`, but only when the `cron` schema exists. This is 08:00 or 09:00 Cairo depending on DST, which is fine.
- `supabase/functions/send-push/index.ts`, plus `supabase/functions/send-push/payload.ts` (pure: notification row and locale in, `{ title, body, url, tag }` out) and `supabase/functions/send-push/messages.ts`:
  - Arabic (Egyptian) and English for every type in `notifications`: `plan_assigned`, `nutrition_updated`, `player_joined`, `player_inactive`, `workout_reminder`.
  - Default to Arabic. There is no locale on profiles yet.
  - URLs point to the right screen (`/ar/player`, `/ar/captain/players/<id>`, …); check them against `src/app`.
- `src/features/notifications/push/` (inside the existing feature):
  - `push-support.ts` (pure): support detection, the iOS-not-installed case, and base64url to `Uint8Array`
  - `data/push-subscriptions.ts`: subscribe, unsubscribe and current state, using `loadSupabaseBrowser()` and `navigator.serviceWorker.ready`
  - `components/push-toggle-card.tsx`: a glass card with a toggle (reuse `settings/components/glass-toggle.tsx` through the settings index, or move it to `@/ui` if the import direction requires it), with states for unsupported, iOS «ضيف التطبيق للشاشة الرئيسية الأول», permission denied (how to re-enable), on and off
  - Export the card from `src/features/notifications/index.ts` and mount it in `settings-screen.tsx` for both captain and player.
  - The VAPID public key comes from `NEXT_PUBLIC_VAPID_PUBLIC_KEY` through `src/lib/public-config.ts`. When it is empty, the card does not render.
- `public/sw.js`:
  - a `push` handler: `showNotification(title, { body, icon: '/icons/icon-192.png', badge, tag, data: { url } })`
  - a `notificationclick` handler: focus an open client on that URL, otherwise `clients.openWindow(url)`, same origin only
  - bump `VERSION`
- `.github/workflows/deploy.yml` and `docker/runtime.Dockerfile`: add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` next to the Supabase public values, set to an empty string for now. The reviewer fills in the real public key.
- `.env.example`: add `NEXT_PUBLIC_VAPID_PUBLIC_KEY=` with a comment.
- `src/types/database.ts`: hand-edit `push_subscriptions`, the new functions and the type union.
- Exclude `supabase/functions/**` from `tsconfig.json` and ESLint only if the Deno imports break them. Test `payload.ts` with Vitest by adding `supabase/functions/**/*.test.ts` to the Vitest include. `payload.ts` and `messages.ts` must import nothing Deno-specific.

## Tests
- PGlite `supabase/tests/web-push.test.ts`:
  - subscription RLS: owner, other user, anon
  - the 10-subscription cap
  - the trigger is a no-op without config or `pg_net`
  - `queue_workout_reminders` with injected dates covers training day, rest day, already-logged day, legacy rotation, suspended user, and idempotency
  - `push_config` is not executable by `authenticated` or `anon`
- Vitest:
  - `payload.ts` for every type in both locales
  - `push-support.ts`: base64url and the iOS detection matrix
  - the toggle state machine if it has logic

## Requirements
AGENTS.md rules apply:
- no new package.json dependencies
- messages in messages files
- tokens only
- logical RTL properties
- 48 px targets
- files ≤ 250 lines
- `uuidv7()` for client ids
- never touch `.env*` except `.env.example`
- never put real keys in files

## Acceptance
- [ ] Toggling on in settings stores one subscription row, and toggling off deletes it.
- [ ] Inserting a notification calls the function when it is configured, and does nothing (with no error) when it is not.
- [ ] The reminder queue picks exactly the right players for a given date.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build` and the perf budget pass.

## Out of scope
- supplement reminders
- per-type notification preferences
- quiet hours
- email notifications
- deploying the function and storing the Vault secrets (the reviewer does it)
