# T-086 — Device and session security (QA audit 2026-11-05, items 1, 2, 3, 10)

## Implementation notes
- Local access requires `setLocalUser(userId)` before rendering player features; logout unbinds it.
- Legacy `kochivo` data moves only when at least one program/nutrition snapshot exists and every
  existing snapshot names the current user. Missing, foreign, or conflicting owners cause deletion.
  Existing user-scoped rows take precedence over legacy rows. Migrated outbox entries receive the owner id.
- Logout tries a final sync. Databases with pending outbox rows or media remain for that user's next login;
  empty databases are deleted. The captain metadata cache is also keyed by user id.
- Private navigations always fall back to the public `/offline` shell. It restores auth before opening
  the scoped database and rendering cached workouts. The worker precaches the shell's lazy static scripts.
  Offline entry accepts an expired persisted session only when its cookie user matches the remembered
  authenticated owner; logout clears that binding. The offline shell also runs sync on reconnect.
- Migration 0063 logs the actual rejected endpoint deletion count with `RAISE NOTICE` at apply time.
  It recreates no functions and does not depend on 0064.

**Phase:** V1 beta blocker · **Status:** ready

## Problems (all confirmed by the audit)
1. **Shared device leaks data across accounts.**
   - `src/core/offline/db.ts:121` opens one IndexedDB (`'kochivo'`) for every user, and `localDb()` (line ~139) is a singleton.
   - Logout leaves the database and its outbox intact. Queued rows from user A then sync under user B. Reproduced: A's private note became B's session and deducted B's PT session.
2. **Private pages stay available offline after logout.**
   - `public/sw.js:56` caches every navigation response and line 59 serves them offline.
   - `src/features/auth/data/sign-out.ts` doesn't clear caches. The captain roster HTML contains player data.
3. **Push endpoints are arbitrary.**
   - `supabase/migrations/0052_web_push.sql:10` accepts any `https://` host.
   - `supabase/functions/send-push/index.ts:68` posts to it server-side, which allows outbound requests to arbitrary URLs.
4. **Logout keeps push attached to the old account.** `sign-out.ts` only calls `auth.signOut()`; subscription removal lives in `src/features/notifications/push/data/push-subscriptions.ts:75`.

## Changes
1. **Per-user local database.**
   - Name the Dexie database per authenticated user, e.g. `kochivo-<userId>`.
   - `localDb()` must be bound to the current user id. Find where the session user is known on the client (sync runner, player shell, offline bootstrap) and design a small `setLocalUser(userId | null)` / `localDb()` API in `@/core/offline`, keeping existing call sites working.
   - Before sending any outbox row, verify the row belongs to the signed-in user. Drop it, and report via `console.warn`, if not.
   - On sign-out:
     - close the DB
     - delete that user's database **only after** the outbox is empty or the user confirms losing unsent data. Simplest acceptable approach: try one final sync; if rows remain, keep the per-user DB, which is now harmless because it is user-scoped and never read by another account.
   - Migration of existing data: on first run, if the legacy `'kochivo'` DB exists, move its contents to the current user's DB only if its snapshot owner matches the current user; otherwise delete the legacy DB. Document the rule.
2. **Service worker.**
   - Stop caching authenticated navigations. Cache only public pages (marketing routes, `/offline`, login) and static assets.
   - The offline fallback for app routes is the `/offline` page. The app works offline from IndexedDB, not cached HTML: confirm the player workout flow still opens offline. If it depends on cached HTML, cache only the logged-out app shell and keep personal data out of HTML.
   - Bump `VERSION` so old caches are deleted on activate.
   - On sign-out, post a message to the SW (or call `caches.delete`) to clear the shell cache.
3. **Push endpoint allow-list.**
   - Migration `0063_push_endpoint_hosts.sql` (new; 0062 is the latest, never edit older ones). Replace the endpoint check with an allow-list of known push services:
     - `fcm.googleapis.com`
     - `*.push.apple.com`
     - `updates.push.services.mozilla.com`
     - `*.notify.windows.com`
     - `push.services.mozilla.com`
   - Existing rows that don't match are deleted in the migration (log the count in a comment).
   - Mirror the same allow-list in `send-push/index.ts` before calling `webpush.sendNotification`, and in the client before saving.
   - Keep the list in one shared constant per runtime with a unit test.
4. **Sign-out removes this device's push subscription** (best-effort, with a timeout) before `auth.signOut()`, then clears the SW caches and closes the local DB. Never block sign-out on failures.

## Out of scope
- Package and billing logic (T-087).
- UI redesigns.

## Requirements
- AGENTS.md rules. No new dependencies. Files ≤ 250 lines.
- Offline-first must keep working for the signed-in player.
- Perf budgets unchanged (player detail 306.5/310 KB).

## Tests
- Unit tests:
  - DB name per user
  - outbox ownership check drops foreign rows
  - legacy DB migration rule
  - sign-out order (push unsubscribe, cache clear, DB close) with failures tolerated
  - SW fetch handler does not cache authenticated navigations (extend `src/core/pwa` tests)
  - endpoint allow-list
- PGlite: the 0063 check rejects a non-allow-listed endpoint and accepts FCM and Apple endpoints.

## Acceptance
- [ ] Two accounts on one browser never see or sync each other's local data.
- [ ] After logout, private pages are not served offline.
- [ ] Push only goes to allow-listed hosts.
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npm run build`, `npx vitest run --maxWorkers=2`.
