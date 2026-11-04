# T-084 — Manual admin approval for new captains

**Phase:** V1 · **Status:** ready (owner request 2026-11-05: "stop spam, keep the platform exclusive")

## Today (read before coding)
- Captain sign-up: `src/features/auth/data/sign-up-captain.ts` → `confirm_role('captain')`. Routing: `src/features/auth/routing.ts` (`homeFor`).
- Admin: `/admin` (`src/features/admin/`) with captains table, activate panel, suspend dialog, audit log (0015, 0024).
- Server-side block: `profiles.suspended_at` and `public.is_suspended()`, used by restrictive `active_caller` policies on most tables.
- No approval step exists.

## Changes
1. **Migration `0061_captain_approval.sql`** (new file; 0060 is reserved by T-083, never edit older ones):
   - `profiles.captain_status text not null default 'approved' check (captain_status in ('pending','approved','rejected'))`, plus `captain_reviewed_at timestamptz`.
     - Every existing row stays `approved`, so existing captains are untouched.
     - The demo workspace (0031/0032) stays `approved`.
   - `confirm_role('captain')`, recreated with the same signature, sets `captain_status = 'pending'` for a new captain. Admins are never pending.
   - **Server-side block (RLS is the real security):**
     - A pending or rejected captain must not create players, invites, programs, meal plans or packages, and must not read other users' data.
     - Preferred: recreate `is_suspended()` so it also returns true when the caller is a captain whose `captain_status <> 'approved'`. All `active_caller` policies then apply.
     - Check every caller of `is_suspended()` first (grep migrations and `src/`). If any UI or RPC needs to tell "suspended" apart from "pending", add a separate helper rather than overloading the meaning.
     - The captain must still be able to read and update their own profile (name, photo) and sign out.
   - `captain_status` / `captain_reviewed_at` are not updatable by the user. Extend the existing profile column guard trigger from 0015.
   - **Admin-only RPCs:**
     - `admin_pending_captains()`: id, email, full name, created_at; oldest first.
     - `admin_review_captain(p_captain uuid, p_status text)`: approved or rejected.
     - Each review writes the existing admin audit log.
     - Rejecting sets `rejected`. It does **not** delete the auth user; deletion stays a manual founder action.
   - On approval, insert a notification for the captain (reuse the notifications table with a new type `captain_approved`, as 0059 did) so push reaches them.
2. **Routing:**
   - `homeFor` sends a pending or rejected captain to `/captain/pending`.
   - The captain layout (`src/app/[locale]/(captain)/…`) redirects any other `/captain/*` route there while not approved, and redirects `/captain/pending` to `/captain` once approved.
   - Keep the route thin; the logic lives in `features/auth` or `features/roster`.
3. **`captain-pending-screen.tsx`** (feature component):
   - A centered `glass-strong` card with lucide `Hourglass` and a lime glow. Respect `motion-reduce`.
   - Copy:
     - «أهلاً بيك في KOCHIVO. حسابك تحت المراجعة من فريقنا، وهنبعتلك إشعار أول ما يتفعّل.» ("welcome to KOCHIVO; your account is under review by our team, and we'll notify you once it's activated").
     - English: "Welcome to KOCHIVO. Your account is under review. We'll notify you when it's approved."
   - Rejected state copy: «للأسف طلبك ماتقبلش. لو شايف إن ده غلط كلّمنا.» ("unfortunately your request wasn't accepted; if you think this is a mistake, contact us"). Include the existing support or WhatsApp link if the app has one.
   - Offer the push toggle (`@/features/notifications` public API) so they get the approval notification, plus a sign-out button.
4. **Admin approvals:** a new "طلبات الكباتن" ("captain requests") section at the top of `/admin`, or a tab, following the admin screen's existing patterns.
   - A `glass` table/list with email, sign-up date (`localDate` / formatted), and actions.
   - One lime «وافق» ("approve") primary per row and a subtle danger «ارفض» ("reject") with a confirm step.
   - Optimistic removal from the list, with an error rollback.
   - Empty, loading and error states. A pending count badge.
   - The admin route is already admin-gated: verify it, don't weaken it.

## Out of scope
- Player sign-up.
- Deleting auth users.
- Email sending (push and in-app only).
- T-083 billing work.

## Requirements
- AGENTS.md rules: tokens only (`glass`/`glass-strong`, no `bg-white/[0.03]` or hex), logical RTL, strings in `messages.ts` (Egyptian Arabic + short English), lucide icons with `aria-label`s, ≥ 48 px targets, files ≤ 250 lines, no new dependencies.
- **Perf:** do not add weight to `/captain/players/[playerId]` (309.9/310 KB). Budgets unchanged.

## Tests
- PGlite tests in `supabase/tests/`:
  - a new captain is pending
  - a pending captain cannot insert invites/programs/players or read other profiles
  - a pending captain can read and update their own profile
  - only an admin can list and review
  - approve unblocks and writes the audit log and notification
  - a user cannot set their own `captain_status`
  - existing captains remain approved
- Unit tests for `homeFor` with pending, rejected and approved captains. Render tests for the pending screen (both states) and the admin list (accessible names, empty state).

## Acceptance
- [ ] A new captain lands on the pending screen and can't use the dashboard, even by calling Supabase directly.
- [ ] The founder approves from `/admin`, and the captain gets a push and full access.
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npm run build`, `npx vitest run --maxWorkers=2` (perf budget included).
