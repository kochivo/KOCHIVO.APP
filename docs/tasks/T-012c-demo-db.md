# T-012c (DB) — One-click demo workspace

**Phase:** 3b · **Depends on:** migrations 0001–0030 (merged) · **Status:** ready
**Delegate to:** Codex · **Pairs with:** T-012c (UI), which is built in parallel against the contract below

Start by reading PLAN.md T-012c and docs/SECURITY-REVIEW.md. Demo accounts are the easiest door for abuse, so every rule below is a security requirement.

## Contract (the UI relies on this exactly)

- **The anonymous session.** The browser calls `supabase.auth.signInAnonymously()`, which creates an anonymous auth user. That fires `handle_new_user`, so a `player` profile with `role_confirmed = false` gets created.
- **`public.create_demo_workspace() returns void`**, a definer function with `search_path = ''`, granted to `authenticated` only:
  - The caller must be anonymous: `(auth.jwt() ->> 'is_anonymous')::boolean` is true. Otherwise it raises `42501`.
  - It turns the caller's profile into a confirmed demo captain: `role = 'captain'`, `role_confirmed = true`, `full_name = 'كابتن تجريبي'`, and a new column `demo_expires_at = now() + 24h`.
  - It is idempotent: a second call does nothing.
  - **Global limit:** if 50 or more demo workspaces were created in the last hour, it raises `P0001` with message `demo_limit`. The UI shows «الديمو زحمة دلوقتي، جرّب بعد شوية».
  - It creates **8 demo players**. Insert their `auth.users` rows inside the definer, with no email, no password and no way to sign in. Each one gets a profile with a realistic Egyptian name, a link in `coach_clients` with varied `access_until` values (some ending soon, one ended), and an intake row.
  - It creates **2 programs** and **2 nutrition plans** assigned to some of the players. It also adds **two weeks of history** before `now()`: workout sessions with set logs, meal logs, and a couple of check-ins without photos. That way the roster, the radar (at least two players inactive for 3+ days), the progress views and the inbox all look alive.
  - It reuses seeded exercises and foods (`owner_id is null`) and works even if there are none: skip whatever is missing, and never fail because of it.
- **A new column**, `profiles.demo_expires_at timestamptz null`. Add a partial index for the purge.

## Abuse rules

- A demo captain cannot create invites. Block inserts into `coach_invites` for demo profiles with `42501`.
- Demo players never count toward plan limits. Make `enforce_player_limit` skip them.
- Demo accounts never send email: anonymous users have none, and demo players have no email.
- A demo captain is limited to their own demo data; the existing RLS and `active_caller` rules apply unchanged.
- `security_private.purge_demo_workspaces() returns int` deletes expired demo captains and their demo players. Delete through `auth.users` so the cascades remove everything, and delete their `storage.objects` rows in the private buckets. It is owner-only.
  - Add its schedule to `supabase/ops/pg-cron-purge.sql`, as a second `cron.schedule('purge-demo-workspaces', '*/30 * * * *', ...)`. It is hosted-only; do not put it in a migration.

## Files

- `supabase/migrations/0031_demo_workspace.sql`
- `supabase/ops/pg-cron-purge.sql` (add the line)
- `supabase/tests/demo.test.ts` (PGlite). It must cover:
  - an anonymous caller gets the workspace
  - a non-anonymous caller gets `42501`
  - a second call does nothing
  - the 51st workspace in one hour gets `demo_limit`, using the fixed test clock
  - a demo captain cannot create an invite
  - the plan limit ignores demo players
  - another captain cannot read any demo data
  - the purge removes everything after expiry and keeps anything not expired

Every new table follows the catalog rules (RLS plus a restrictive `active_caller` policy). Do not edit 0001–0030.

## Requirements

1. The test harness may need a way to sign in as anonymous. Add it to `harness.ts` only if needed: set the `is_anonymous` claim the way Supabase does, and keep the other tests unchanged.
2. Seeded content and history are deterministic relative to `now()` (the test clock is fixed).
3. **Do not touch:** `src/`, `.env*`.

## Acceptance

- [ ] All the tests above pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope

- The UI
- Turnstile, which Supabase Auth's own CAPTCHA setting handles
