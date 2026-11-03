# T-018 — Billing: renew a player in one tap, payment history, WhatsApp reminder, the captain's own plan

**Phase:** 3 · **Depends on:** T-009, T-021 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
The captain opens «الاشتراكات». Players pay their captain outside the app, in cash or InstaPay. The page has two parts.

**1. My players.** One row per active player:
- name
- status tag (active / ending / grace / expired, using the roster's `playerStatus`)
- `access_until`
- last payment
- «جدّد» opens a small sheet: the period (30 / 90 days, or a custom 1–365), and an optional amount in EGP. Saving records the payment and extends access at once.
- «فكّره» opens WhatsApp to the player with a ready Arabic reminder, when the player has a phone.

**2. My plan.**
- the current tier and its player limit, from `current_tier()` and `plan_tiers`
- active players used out of the limit, with a progress bar
- the end date of the current paid subscription, if any
- «رقّي باقتك» opens WhatsApp to the owner with a ready message. Captains are activated manually by the admin after paying.

Mockup board: **CaptainBilling** (`docs/mockups/CaptainBilling.dc.html`).

## Today
- `coach_clients.access_until` drives access. `player_can_read` allows a 3-day grace period after it, and `player_can_write` stops at it.
- Since 0015, captains may change only `access_until` and archive (`guard_coach_client_update`).
- There is no payment history table.
- Prices are confirmed: entry 0 for 5 players, champion 399 for 20, legend 699 for 40, empire 1,499 for 100 (EGP/month).

## Files
- `supabase/migrations/0019_player_payments.sql` (new):
  - Table `public.player_payments`:
    - `id uuid primary key default gen_random_uuid()`
    - `captain_id uuid not null references profiles on delete cascade`
    - `player_id uuid not null references profiles on delete cascade`
    - `amount_egp int check (amount_egp between 0 and 100000)` (nullable)
    - `days int not null check (days between 1 and 365)`
    - `period_start date not null`
    - `period_end date not null`
    - `created_at timestamptz not null default now()`
  - Index on `(captain_id, created_at desc)`.
  - RLS enabled. No direct insert, update, or delete for anyone: revoke them from `public`, `anon`, and `authenticated`.
  - Select policies:
    - the captain sees rows where `captain_id = auth.uid()`
    - the player sees their own rows
  - `public.renew_player(p_player uuid, p_days int, p_amount int default null) returns date`:
    - `security definer`, `set search_path = ''`
    - Raise `42501` unless the caller is the active (not archived) captain of `p_player`, and also when `public.is_suspended()`.
    - Raise `22023` for `p_days` outside 1–365, or an amount outside 0–100000.
    - Lock the `coach_clients` row.
    - `period_start = greatest(access_until + 1, current_date)` and `new_end = period_start + p_days - 1`.
    - Update `access_until`, insert the payment, and return `new_end`.
  - Grant execute to `authenticated` only (per 0014).
- `supabase/tests/rls-player-payments.test.ts` (new):
  - renew extends from the old end when still active
  - renew extends from today when expired
  - another captain gets `42501`
  - a suspended captain gets `42501`
  - an archived player gets `42501`
  - bad days get `22023`
  - the player reads only their own payments, and another player reads none
  - a direct insert is denied
  - anon has no execute
- `src/features/billing/` (new):
  - `index.ts`
  - `renew.ts` (pure):
    - `renewalPreview(accessUntil, today, days)` mirrors the SQL dates and returns `{ start, end }`
    - `reminderText(playerName, accessUntil)` returns short Egyptian Arabic text: «يا {name}، اشتراكك مع الكابتن بيخلص {date}. تحب نجدد؟»
    - `waLink(phone, text)` returns `https://wa.me/{digits}?text={encodeURIComponent}`, or null
  - `data/billing.ts`, `'use server'`, captain session:
    - `fetchBilling()` returns:
      - the roster rows: reuse `fetchRoster` through `@/features/roster` only
      - player phones from `profiles`
      - the last payment per player
      - the tier, limit, and used count
      - the subscription end
    - `renewPlayer({ playerId, days, amount })`: zod-validated, calls the RPC, and returns `{ data: newEnd }` or an Arabic `{ error }`
  - `components/billing-screen.tsx`, `components/player-billing-row.tsx`, `components/renew-sheet.tsx` (shows the `renewalPreview` dates live), `components/plan-card.tsx`
  - `billing.test.ts`
- `src/app/(captain)/captain/billing/page.tsx` (new, thin)
- `.env.example`: add `NEXT_PUBLIC_OWNER_WHATSAPP=` with a comment. «رقّي باقتك» is disabled with «رقم الدعم لسه متضافش» when it is empty. Do not touch any other `.env*` file.

## Requirements
1. The captain id never comes from the client. RLS and the RPC are the security.
2. Renew is optimistic: the row shows the new date at once and rolls back with the error.
3. Dates use `localDate()`, and pure functions take `today`.
4. States:
   - loading
   - error with retry
   - empty «لسه مفيش لاعبين. ابعت دعوة من صفحة اللاعبين»
5. One lime primary per view: «جدّد» in the sheet. The row buttons are ghost.
6. Files are under 250 lines, use tokens only, use RTL logical properties, have targets ≥ 48px, use Egyptian Arabic, and give icon buttons an Arabic `aria-label`.

## Acceptance
- [ ] The SQL tests listed above pass.
- [ ] `billing.test.ts` covers:
  - `renewalPreview`: active, expired, the same day, and across a month boundary
  - `reminderText`
  - `waLink`: no phone, and encoding
  - `renewPlayer`: validation before any network call, and the error mapping, with a mocked client
- [ ] `/captain/billing` builds, and `npm run check` and `npm run build` pass.

## Out of scope
- Online payment
- Automatic WhatsApp sending
- Admin screens
- The captain shell nav (another task)
- `src/features/roster/**`, except one change: add `export { playerStatus } from './status';` and `export type { RosterPlayer } from './types';` to `src/features/roster/index.ts`, then import them from there. Change nothing else in roster.
