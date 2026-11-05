# T-021c — Admin sees expired paid plans and captains over their limit

**Phase:** 3 · **Depends on:** T-021, T-021b (merged) · **Status:** ready
**Delegate to:** Codex

## The gap
`admin_captains()` (0015) returns `tier` from `current_tier()` and `tier_ends_at` only for a subscription that is **active now**. When a paid plan ends:
- the captain drops to `entry`
- `tier_ends_at` becomes null
- the admin can no longer see that this captain used to pay, when the plan ended, or that they now have more active players than the entry limit

Those are exactly the captains the owner needs to call on WhatsApp for renewal. The admin UI's "expired" status (`format.ts`) can never trigger with real data.

## Files
- `supabase/migrations/0024_admin_captains_history.sql` (new). Use exactly 0024.
  - The return type changes, so `drop function public.admin_captains(text, int, int);` then recreate it with every 0015 column plus:
    - `last_paid_tier text`: the tier of the captain's most recent subscription (any time) whose tier is not `entry`, or null
    - `last_paid_ends_at timestamptz`: its `ends_at`
    - `over_limit boolean`: `active_players > player_limit`
  - Keep the security definer, the `is_admin()` check, the search escaping, the ordering, and the limits exactly as in 0015.
  - Re-apply the grants exactly as 0015 does for this function: revoke from `public`, `anon`, and `authenticated`, then grant to `authenticated`.
- `supabase/tests/rls-admin.test.ts`:
  - a captain whose paid plan ended yesterday shows `tier = 'entry'`, `tier_ends_at = null`, and `last_paid_tier` / `last_paid_ends_at` set
  - `over_limit` is true with 6 active players on entry
  - a non-admin still gets `42501`
  - Use the existing harness helpers.
- `src/features/admin/types.ts`, `format.ts`, `data/captains.ts`: add the 3 fields.
  - `planStatus`, or whatever `format.ts` calls it (read it): `'expired'` now means `tier === 'entry' && last_paid_ends_at !== null`.
  - Keep `'paid'` and the free status as today.
- `src/features/admin/components/captains-table.tsx`:
  - for expired rows, show «انتهت {LEGEND} يوم {date}» (`ar-EG`, `timeZone: 'Africa/Cairo'`) in the plan cell
  - a warn tag «فوق الحد» when `over_limit`
  - Mobile and desktop layouts both.
- `src/features/admin/components/kpi-row.tsx`: add one KPI «باقات خلصت» counting the expired rows. Keep the others.
- `src/features/admin/admin.test.ts`: update and add cases for the new status rule and the KPI count.

## Requirements
1. No change to who can call the function. Admin only.
2. Files are under 250 lines, use tokens only, use RTL logical properties, and use Egyptian Arabic.

## Acceptance
- [ ] The SQL and unit tests pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Automatic downgrades
- Auto-archiving players over the limit
- Emails or WhatsApp sending
- Any other admin screen
