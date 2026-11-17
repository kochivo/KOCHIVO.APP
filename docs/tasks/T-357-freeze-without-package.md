# T-357 — Players can ask for a freeze even when their subscription was added by hand

**Migration:** `supabase/migrations/0151_freeze_fallback.sql`. It is additive only and must not be applied live; the reviewer asks the owner first.

**Source:** owner report on 2026-11-17. The owner approved this fix the same day.

## Problem (verified on the live data by the reviewer)
- `security_private.freeze_allowance(p_player, p_captain)` (migration 0150) takes the freeze days only from `captain_packages.max_freeze_days`, through `player_payments.package_id` of the current payment.
- Payments a captain records by hand have `package_id = null`. Example: one live captain has 3 active players and 4 payments, and **none** of them is linked to a package. So `remaining_freeze_days` returns 0 and the player never sees «اطلب تجميد».
- Any player whose subscription was added by hand can never ask for a freeze.

## Fix
### 1. Database (new migration 0151, additive)
- Add a captain default for freeze days.
  - Preferred: a small table `public.captain_freeze_settings`:
    - `captain_id uuid primary key references profiles(id) on delete cascade`;
    - `default_days int null check (default_days between 0 and 90)`;
    - `updated_at timestamptz not null default now()`.
  - RLS: the captain reads and writes only their own row; players have no access.
  - If an existing captain settings table already fits better, you may use it instead; explain why in the notes.
- Replace `security_private.freeze_allowance` with `create or replace` in 0151 (do not edit 0150). The days allowed for the current period come from the first rule that gives a value:
  1. The payment's linked package, when `package_id` is set and that package's `max_freeze_days` is not null. This is today's behavior and must not change.
  2. Otherwise, the captain's best-matching package: same captain, not archived, `kind = 'days'`, `max_freeze_days` not null, and `days` equal to the payment's paid days (`player_payments.days` minus `coalesce(bonus_days, 0)`; check how `days` is stored and say what you used). If several match, use the newest (`created_at desc, id desc`).
  3. Otherwise, `captain_freeze_settings.default_days`.
  4. Otherwise, 0.
- Keep everything else exactly as it is:
  - approved days are still subtracted within the current period;
  - `greatest(0, …)`, `security definer`, `set search_path = ''`, and the same grants.
- Check whether anything else reads `max_freeze_days` the same way, for example request validation in `request_freeze` / `decide_freeze_request`, which may re-check the allowance. Every check must use the same allowance function, so the request is not rejected on submit.

### 2. Captain UI
- In the captain packages area, where «أقصى أيام تجميد» already is (`src/features/billing/components/packages-card.tsx` / workspace packages), add one setting: **«أيام التجميد لأي اشتراك من غير باقة»**.
  - Hint: «بتتطبق على اللاعيبة اللي اشتراكهم متسجل بالإيد. سيبها فاضية عشان تقفل التجميد ليهم».
  - It is a number from 0 to 90, or empty. Use the new `NumberInput` from `@/ui` (clearable, `allowEmpty`).
  - Save it like the other billing settings (optimistic, error state, loading state). Strings go in ar, arStd and en.
- No change to the player screen: the existing «اطلب تجميد» button appears once `remaining_freeze_days > 0`.

### 3. Types
- Regenerate or extend `src/types/database.ts` for the new table, following the repo's pattern.

## Tests
- PGlite test in `supabase/tests/` covering the allowance:
  - linked package with freeze days: unchanged;
  - hand-added payment with a matching-length package: uses that package;
  - no matching package: uses the captain default;
  - nothing set: 0;
  - approved days are subtracted within the period;
  - another captain's packages and default are never used.
- RLS test for the new table: the owner can read and write their own row; another captain and a player cannot.
- A request with days within the fallback allowance is accepted end to end (request → pending).
- A unit or render test for the new captain setting.

## Out of scope
- Do not edit migrations 0001–0150. No data rewrites; do not backfill `package_id` on old payments.
- No change to how payments are recorded, to the renewal flow, or to the player freeze UI.
- The renew button contrast and the KO bubble overlap on the player captain screen belong to another task; note them, don't fix them.

## Rules
- **Verify first:** confirm the problem in the 0150 SQL before changing anything.
- **UI:** tokens only, logical properties, touch targets 48px or more, files 250 lines or fewer, no emoji.
- **Gates:** run `npm run check`, `npm run build`, then `npx vitest run src/lib/perf-budget.test.ts`. All three must pass. Do not commit.
