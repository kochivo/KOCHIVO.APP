# T-300: data for the redesigned admin dashboard (migration 0117)

## Goal
The owner approved the admin redesign in `docs/mockups/admin/admin-v1.html`. Open it; the items tagged «جديد» need data we don't read today. This card adds the read functions and the server data layer. A parallel card, T-301, builds the UI against the shared types in `src/features/admin/dashboard-types.ts`, which are already written.
- Do not rename these types or change their shape.
- If a field truly cannot be computed, return a safe value (0 or null) and explain why under Notes for reviewer.

## Current state
- **The admin page.** `src/app/[locale]/admin/page.tsx` calls `fetchCaptains`, `fetchPlanTiers`, `fetchAudit`, `fetchKpis` and `fetchPendingCaptains` from `@/features/admin`. Its data files live in `src/features/admin/data/`.
- **Existing functions and tables.**
  - RPCs: `admin_captains` (last defined in 0074), `admin_notification_kpis` (0054) and `admin_pending_captains`.
  - Paid periods: `captain_subscriptions` (captain_id, tier, starts_at, ends_at, payment_ref, amount_egp).
  - `plan_tiers` (tier, price_egp, player limit) and `admin_audit_log`.
- **How plans are activated.** Payments are activated manually, through `admin_activate_plan` (0015). A renewal starts after the current period ends.
- **Prices.** ENTRY 0, CHAMPION 399, LEGEND 699, EMPIRE 1,499 EGP a month.

## Do
1. **New migration `supabase/migrations/0117_admin_dashboard.sql`.** It is additive only: no table changes and no edits to old functions.
   - Every function is `security definer`, `set search_path = ''`, and raises 42501 unless `public.is_admin()`.
   - Revoke execute from public and anon, then grant it to authenticated.
   - **`public.admin_dashboard()`** returns one jsonb matching `AdminDashboard`.
     - `actions.pendingCaptains`: the same rule `admin_pending_captains` uses.
     - `actions.expiringSoon`: the captain's latest paid period ends within 7 days, and there is no queued renewal after it.
     - `actions.overLimit`: the same rule as `admin_captains.over_limit`.
     - `actions.quietPaid`: a paid captain whose last activity is older than 7 days.
     - `mrr`: the sum of `amount_egp / months` over subscriptions active now. Derive months from `starts_at` and `ends_at` (rounded months), or use `plan_tiers.price_egp`; pick one and document it. `previous` is the same figure computed at `now() - 30 days`.
     - `captains`, `paidCaptains`, `players`: `value` is now; `previous` is 7 days ago, based on `created_at` and the subscription dates.
     - `activeCaptains`: captains active in the last 7 days; `previous` is the 7 days before that.
     - `signups`: 30 Cairo days, oldest first. Include days with zero signups.
     - `planMix`: the current tier of every captain.
     - `stateCounts`: the same state rules as `src/features/admin/format.ts` `captainState`, plus `expiringSoon`.
     - `health`:
       - `cronJobs` and `cronFailures24h` come from `cron.job` and `cron.job_run_details`. If the `cron` schema does not exist (as in PGlite), return 0. Guard it, for example with `to_regclass` and dynamic SQL.
       - `pendingDeletions`: accounts waiting for the purge. Use the same rule as `public.purge_deleted_accounts()`.
   - **"Last activity" for a captain.** Define it in one private helper and reuse it everywhere. It is the greatest of:
     - `auth.users.last_sign_in_at`;
     - the latest chat message the captain sent;
     - the latest update to the captain's programs or nutrition plans.

     Use whichever of these columns exist; check the schema. Document the rule in a comment.
   - **`public.admin_captain_activity(p_ids uuid[])`** returns rows matching `AdminCaptainActivity`: `lastActiveAt`, `expiringSoon`, `quiet`. At most 100 ids per call.
   - **`public.admin_captain_detail(p_captain uuid)`** returns jsonb matching `AdminCaptainDetail`.
     - `phone`: from the captain's intake or profile, if stored; otherwise null.
     - `players`: active linked players.
     - `trainedThisWeek`: players with a completed `workout_sessions` row in the last 7 days.
     - `totalPaidEgp`: the sum of `amount_egp`.
     - `history`: the captain's `captain_subscriptions`, newest first, at most 24.
2. **Server data layer: `src/features/admin/data/dashboard.ts`** (server-only, following `data/kpis.ts`).
   - Add `fetchAdminDashboard()`, `fetchCaptainActivity(ids)` and `fetchCaptainDetail(id)`.
   - Each returns `{ data, error }` with translated error strings, like the existing fetchers.
   - Validate the RPC output with zod in `schemas.ts`.
   - Export them the way the other fetchers are exported.
3. **Types.** Add the three RPCs to `src/types/database.ts` by hand, in the same style as the generated entries.

## Tests
- New `supabase/tests/admin-dashboard.test.ts`, PGlite, following the other admin tests:
  - a non-admin gets 42501;
  - anon cannot execute;
  - the counts are correct for a seeded mix: free, paid, expiring in 3 days, expiring with a queued renewal, over limit, quiet, suspended, unconfirmed;
  - mrr now and 30 days ago;
  - `signups` has exactly 30 days, including zero days;
  - the detail history and the total paid.
- Unit tests for the zod parsing in `src/features/admin`.

## Out of scope
- UI (T-301 owns `src/features/admin/components` and the admin page).
- Old migrations.
- Never apply anything to a hosted database.

## Gates
1. The new test.
2. `npx vitest run supabase/tests src/features/admin` (the admin-related files are enough if the full folder is slow).
3. `npm run typecheck`
4. `npm run lint`
