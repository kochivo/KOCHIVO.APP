# T-021b — Admin panel UI

**Phase:** 3 · **Depends on:** T-021 (merged, migration 0015) · **Status:** ready
**Delegate to:** Codex

## Goal
The owner opens `/admin` and runs the business from there:
- sees every captain, their plan, and how many players they have against their limit
- activates a paid plan after a captain pays on WhatsApp
- suspends a suspicious account
- reads the audit log

Mockup board: **AdminConsole**. The database side already exists. Read `supabase/migrations/0015_admin_billing.sql` for:
- `is_admin`
- `admin_captains`
- `admin_activate_plan`
- `admin_set_suspended`
- `admin_audit_log`
- `plan_tiers`

## Files
- `src/features/admin/` (new):
  - `index.ts`
  - `types.ts`: narrow local types for the RPC rows (no generated types yet)
  - `format.ts` (pure):
    - `tierLabel` (entry → ENTRY …)
    - `usageLabel(active, limit)` («31 من 40»)
    - `captainState(row, today)`: `'suspended' | 'expired' | 'paid' | 'free' | 'unconfirmed'`
    - `endsLabel(date)`
  - `schemas.ts`: zod for activation (tier in the 4 values, months 1–12, `payment_ref` ≤ 80 and optional) and for suspension (reason 3–200 chars)
  - `data/require-admin.ts`: server-only `requireAdmin()`. It calls `rpc('is_admin')` and calls `notFound()` when it is false or errors, so the page never reveals that it exists.
  - `data/captains.ts`: `fetchCaptains({ search, limit, offset })` calls `admin_captains`
  - `data/audit.ts`: the latest 20 `admin_audit_log` rows, newest first
  - `data/activate-plan.ts` and `data/set-suspended.ts`: `'use server'` actions. Each calls `requireAdmin()` again, validates with zod, calls the RPC, calls `revalidatePath('/admin')`, and maps errors to Arabic («مش مسموح», «الباقة مش موجودة», and so on).
  - `components/admin-screen.tsx`: the header «لوحة الإدارة» with the `ADMIN · للإدارة بس` tag, search, and filter chips (الكل, مدفوع, مجاني, خلصت باقته, إيميل مش متأكد, موقوف), with filtering done client-side on the fetched page
  - `components/kpi-row.tsx`: كباتن مسجلين, باقات مدفوعة, مستنيين تفعيل (always 0 for now, with a `TODO`), and مشبوهين (unconfirmed email + 0 players + created < 24h). Compute these from the fetched rows, and label them «من أول 100» when the list is capped.
  - `components/captains-table.tsx`: a table on desktop and cards on mobile. Each row has a «فعّل باقة» button (lime only on the selected row) and a «وقّف» / «رجّع» ghost button.
  - `components/activate-panel.tsx`:
    - a side panel or sheet with 4 tier chips showing the price, months via `Stepper` from 1 to 12, and an optional `payment_ref`
    - the computed total «699 ج × 1 = 699 ج»
    - a confirm button «فعّل LEGEND»
    - the success message «اتفعّلت لحد {date}»
  - `components/suspend-dialog.tsx`: a required reason and a clear warning that the captain cannot invite players while suspended
  - `components/audit-list.tsx`: «آخر العمليات» lines
  - `admin.test.ts`
- `src/app/admin/page.tsx` (new, thin): `await requireAdmin()`, fetch, and render. Add `export const dynamic = 'force-dynamic'` and `metadata` with `robots: { index: false }`.

## Requirements
1. Security:
   - The RPCs already raise `42501` for non-admins. The page also checks, so a non-admin gets a 404.
   - Never call admin RPCs from the browser client. Use server actions only.
   - Do not add `/admin` to the role routing table.
   - Hide nothing behind client-only checks.
2. Every action shows a loading state, and on success it refreshes the data and shows a short confirmation. Errors show Arabic text, never raw messages.
3. Desktop first (the owner uses a laptop), but it must not break at 375px.
4. Files under 250 lines, tokens only, no hex, RTL logical properties, Egyptian Arabic, and `aria-label` on icon buttons.

## Acceptance
- [ ] `admin.test.ts` covers:
  - `captainState` for every branch
  - `usageLabel`
  - the zod schemas (bounds and the tier enum)
  - the action error mapping: a mocked Supabase error with code `42501` → «مش مسموح»
  - `requireAdmin` calls `notFound` when `is_admin` is false (mock `next/navigation`)
- [ ] `npm run check` and `npm run build` pass, and `/admin` builds as dynamic (ƒ).

## Out of scope
- Price editing
- Storage usage
- Bulk delete of suspicious accounts
- Email sending
- Making yourself admin. The owner runs the SQL line from 0015 by hand.
