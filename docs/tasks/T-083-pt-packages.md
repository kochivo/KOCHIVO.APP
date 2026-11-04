# T-083 — PT packages: session-based plans, approval and freeze

**Phase:** V1 · **Status:** ready (owner request 2026-11-05: "auto-activating with fixed days is flawed; real PT is sold in sessions too")

## Today (read before coding)
- Access lives on `coach_clients.access_until` (0003). Many RLS policies and helpers read it (active, 3-day read-only grace, hidden). **Keep `access_until` as the single date gate.** Everything below layers on top of it.
- Packages are in `captain_packages(days, price_egp)` (0037). Renewals are `player_payments` plus installments in `payment_collections`. The renew flow is `renew_player` in 0037 / `features/billing/components/renew-sheet.tsx`.
- Join paths:
  - Invite links carry a fixed `access_until` (0003/0049).
  - Public-page requests go through `coach_join_requests` → `resolve_coach_join_request` (0049).

## Changes
1. **Migration `0060_pt_packages.sql`** (new file; never edit older ones):
   - `captain_packages.kind text not null default 'days' check (kind in ('days','sessions'))`.
   - `sessions int` (1–200), required when kind = 'sessions'. For a session package, `days` stays the validity window (e.g. 12 sessions within 60 days).
   - `coach_clients`:
     - `sessions_left int` (null = time-based, no session counting).
     - `frozen_at timestamptz` (null = not frozen).
     - `pending boolean not null default false`.
   - **Pending:**
     - A player who joins through the public coach page is created `pending = true` with no package.
     - While pending, the player keeps profile and onboarding but no training content. Reuse the existing "hidden" access state: pending counts as not active in the access helper(s).
     - Find and update the access helper used by RLS (grep `access_until` in migrations; recreate the function in 0060 with the same signature).
     - Invite links stay auto-active, since the coach already chose the window when creating the invite.
   - **Activate:** RPC `activate_player(p_link uuid, p_package uuid null, p_kind text, p_quantity int, p_price_egp int, p_paid_egp int, p_free_trial boolean)`.
     - Captain-only, for their own link.
     - Sets `access_until` (today + days), `sessions_left` (for sessions), `pending = false`.
     - Records a `player_payments` row unless it is a free trial (price 0, flagged in notes).
     - Uses `localDate` semantics: Africa/Cairo `current_date` as in existing RPCs.
   - **Freeze / unfreeze:** RPC `set_player_frozen(p_link uuid, p_frozen boolean)`.
     - Freeze sets `frozen_at`. A frozen player is treated as not active.
     - Unfreeze pushes `access_until` forward by the whole days frozen (so days are saved), then clears `frozen_at`.
   - **Session deduction:**
     - Trigger on `workout_sessions` when `completed_at` goes from null to set, inserted or updated through `sync_workout_sessions`.
     - If the player's active link has `sessions_left` not null and > 0, decrement it once per session id. The trigger must be idempotent: re-sync of the same completed session must not deduct twice. Guard with a small `session_deductions(session_id primary key)` table or equivalent.
     - When `sessions_left` reaches 0, notify the captain (reuse the notifications table with a new type `sessions_used_up`, as 0059 did for `workout_feedback`).
   - **Top-up:** extend renew so a sessions package adds sessions and extends `access_until` to at least today + package days.
   - RLS and grants for every new column and table. Players can read their own `sessions_left` / `frozen_at` / `pending`; only the captain writes them, through RPCs.
2. **Player: `features/billing/components/player-waiting-room.tsx`**:
   - A centered `glass-strong` card shown instead of training content when the link is pending or frozen.
   - Pending: lucide `Lock` with a lime glow. Text «بياناتك وصلت للكابتن. مستني يوافق ويحدد الباقة.» ("your details reached the coach; waiting for approval and a package").
   - Frozen: lucide `Snowflake`, using the existing info or cool token (no new hex). Text «الاشتراك متجمّد. أيامك وحصصك محفوظة. كلّم الكابتن عشان يفكّه.» ("subscription frozen; your days and sessions are saved; contact the coach to unfreeze").
   - Wire it into the player home/today route the same way the existing "expired" state is shown. Find that state and follow its pattern.
3. **Coach: `activate-sheet.tsx`** (native `<dialog>` with the `sheet` class; see `src/ui/sheet-surfaces.test.ts`):
   - Opens from the pending player's row/profile and from the join-request item in the inbox.
   - Fields:
     - A segmented control: «بالأيام» ("by days") / «بالحصص» ("by sessions").
     - Quantity: a `Stepper`, typeable.
     - A package picker that pre-fills both fields.
     - Price and paid.
     - A free-trial `Chip` that zeroes the price.
   - One lime primary: «فعّل اللاعب» ("activate player").
4. **Coach: `billing-manager-card.tsx`** in the player profile (lazy if it adds weight; see Perf):
   - Shows «فاضل ٧ حصص» ("7 sessions left") or «باقي ١٢ يوم» ("12 days left"), plus a frozen badge.
   - Freeze/unfreeze toggle with a confirm step.
   - «جدّد / زوّد» ("renew / top up") opens the existing renew sheet, extended for sessions.
5. Roster and billing lists show pending, frozen and "N sessions left" badges where they already show days left.

## Out of scope
- Online payments.
- The captain's own KOCHIVO subscription (`captain_subscriptions`).
- Changing invite links.

## Requirements
- AGENTS.md rules: tokens only (no `bg-white/[0.03]` or hex; use `glass`/`glass-strong`), logical RTL, strings in `messages.ts` (Egyptian Arabic + short English), lucide icons with `aria-label`s, ≥ 48 px targets, loading/error/empty states, optimistic UI where writes are local.
- Files ≤ 250 lines. No new dependencies.
- **Perf:** `/captain/players/[playerId]` is at 309.6/310 KB, so the billing manager card must be dynamically imported. Player routes ≤ 300 KB. Do not raise budgets.

## Tests
- PGlite tests in `supabase/tests/`:
  - activate (captain-only, own link)
  - freeze → unfreeze extends `access_until` by frozen days
  - pending and frozen players cannot read training content
  - session completion deducts once (re-sync does not double-deduct) and notifies at 0
  - top-up adds sessions
- Unit tests for any pure helpers (balance label, frozen-days math). Render tests for the waiting room (both states) and the activate sheet (accessible names).

## Acceptance
- [ ] A public-page join creates a pending player who sees the waiting room until the coach activates them with days or sessions.
- [ ] Completing a workout deducts one session. At 0 the coach is notified.
- [ ] Freeze hides training and unfreeze restores it with days preserved.
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npm run build`, `npx vitest run --maxWorkers=2` (perf budget included).
