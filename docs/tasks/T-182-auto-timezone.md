# T-182: Automatic timezone for every user (app layer)

**Phase:** International (owner decision 2026-11-12) · **Depends on:** none · **Status:** ready
**Migration:** yes, additive only. Applying it to production needs the owner's approval.

## Goal
Anyone, in any country, sees "today", workouts, meals, check-ins and dates in their own timezone, detected automatically from their device. Today the app assumes Cairo in about 80 places (`localDate()` with no timezone). Egyptian users must see exactly what they see today.

Owner decisions:
- Each person sees their own day. The player trains on the player's day, and the captain sees requests on the captain's day.
- Subscription and package expiry use the **captain's** timezone, because the captain owns the package. The database side of that is T-183.
- Automatic by default. If someone travels, the timezone follows the device. Settings keep a manual choice for anyone who wants to pin it.

## Files
- New migration `supabase/migrations/00NN_timezone_auto.sql` (the next free number after the newest file): `profiles.timezone_auto boolean not null default true`, with update granted to `authenticated` following the existing `timezone` grant. Add a PGlite test.
- `src/lib/dates.ts` and `src/lib/timezone.ts` (new): `isValidTimezone(tz)`, `deviceTimezone()` (from `Intl.DateTimeFormat().resolvedOptions().timeZone`, validated, falling back to `DEFAULT_TIMEZONE`).
- `src/core/` (a small timezone context): `getTimezone()` for server code, which reads the signed-in profile once per request (cached) and falls back to `DEFAULT_TIMEZONE`, plus a client `useTimezone()` hook.
- A client sync component mounted in the signed-in layouts. When `timezone_auto` is true and the device timezone differs from the profile, it updates the profile once (debounced, no loop).
- `src/features/settings/`: an «تلقائي» toggle next to the existing timezone picker. Manual mode keeps today's picker.
- Every `localDate(...)` call that today relies on the Cairo default: pass the user's timezone. Which one is used where:
  - player screens use the player's timezone;
  - captain screens use the captain's timezone;
  - data about a player shown to the captain is labelled by the player's day (the player's timezone; it comes with the player row, so add it to the existing selects).
- Types: regenerate the overlay for the new column (`app-database.ts`).
- Tests next to each touched feature.

## Requirements
1. **Flag.** Everything new is behind `NEXT_PUBLIC_INTERNATIONAL === '1'` (add `src/lib/international-enabled.ts`, mirroring `captain-workspace-enabled.ts`). With the flag off:
   - the sync component renders nothing;
   - the settings toggle is hidden;
   - `getTimezone()` returns `DEFAULT_TIMEZONE`.

   The app must be byte-identical to today, with a test.
2. **Invalid values.** An invalid or unknown timezone never crashes a screen; it falls back to Cairo.
3. **Offline.** Offline writes (`saveAndQueue`) keep the date computed on the device at the moment of the action. Never recompute a stored `log_date`.
4. **No rewrites.** Do not change any existing stored dates or rows. No backfill.
5. **No Cairo literals.** Do not leave any `'Africa/Cairo'` literal in `src/` outside `DEFAULT_TIMEZONE` and tests. Use a grep test to keep it that way.
6. **Determinism.** Tests inject `now` and the timezone. Cover these cases:
   - Cairo (identical to today);
   - Riyadh (UTC+3);
   - Dubai (UTC+4);
   - London (DST);
   - New York (UTC−5);
   - Auckland (UTC+13);
   - a player and captain in different timezones around midnight.

## Acceptance
- [ ] A flag-off test proves nothing changes.
- [ ] Unit tests for `deviceTimezone`, `isValidTimezone`, `getTimezone` fallback, and the sync rules (no loop; manual mode never overwritten).
- [ ] Tests for the "today" boundary in the cases listed above.
- [ ] PGlite test: the new column defaults to true and existing rows are unchanged.
- [ ] Grep test: no stray `'Africa/Cairo'` in `src/`.
- [ ] All gates pass.

## Out of scope
- Database functions and cron jobs that assume Cairo (T-183).
- Currency, payments, Gulf foods.
- Standard Arabic (T-184).
