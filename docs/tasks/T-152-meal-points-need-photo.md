# T-152 — Meal-check points need a real meal photo

**Phase:** Gamification · **Depends on:** T-138, T-129 · **Status:** ready (owner request 2026-11-10)

## Goal
`public.award_meal_check()` can be called by any signed-in player without a photo, earning +1 a day toward
the lifetime rank. After this card the point is awarded only after KO's server has analysed a meal photo.

## Approach
The KO route (`src/features/ko-account/route.ts`) already calls `award_meal_check` after a successful
`meal_photo` analysis. The database cannot tell that call from a direct one, because both use the player's
own token. So the route signs a short receipt with a server secret, and the database checks it.

## Files
Create or modify only these:
- `supabase/migrations/0088_meal_check_receipt.sql` (new)
- `supabase/tests/meal-check-receipt.test.ts` (new); update the meal tests in `points-crown-meals.test.ts` and
  `points-ranks.test.ts` that call `award_meal_check()` directly.
- `src/features/ko-account/meal-receipt.ts` (new), `src/features/ko-account/route.ts`
- `src/types/database.ts`
- `.env.example`: one new line documenting the secret, no value.
- `docs/RELEASE-CHECKLIST.md`: the owner setup step below.
- Tests for the receipt helper.
- This task card.

## Requirements
1. Replace `public.award_meal_check()` with `public.award_meal_check(p_day date, p_receipt text)`; drop the
   old signature. It awards only if `p_day` is today (Africa/Cairo) and `p_receipt` equals
   `encode(extensions.hmac(auth.uid()::text || ':' || p_day::text, secret, 'sha256'), 'hex')`, where `secret`
   is read from `security_private.app_secrets` (a new one-row-per-name table, RLS on, no grants to any API
   role). Constant-time compare is not available in SQL; a wrong receipt simply raises `42501`. Confirm where
   `pgcrypto` lives in this project (`extensions` schema on Supabase) and use that schema explicitly.
2. If the secret row is missing, the function raises `42501` (fail closed).
3. The route computes the same HMAC with `KO_MEAL_RECEIPT_SECRET` from the server environment
   (Node `crypto.createHmac`), only after a successful `meal_photo` intent, and calls the new signature. If the
   env var is missing, it skips the award and logs one `console.warn`.
4. **Owner setup** (document in RELEASE-CHECKLIST, do not do it): generate a random 32-byte hex secret, set
   `KO_MEAL_RECEIPT_SECRET` in Vercel production, and insert the same value once in production with
   `insert into security_private.app_secrets(name, value) values ('meal_receipt', '<secret>')` via the SQL editor.
   Until both are set, meal points are simply not awarded.
5. Meal points stay out of the crown (T-138 unchanged).
6. No secret in the repository, tests use a fixed test secret inserted in the PGlite setup.

## Acceptance
- [ ] PGlite tests: valid receipt awards once per day; wrong receipt, another player's receipt, yesterday's
  receipt and missing secret all refuse with `42501`; the old no-argument call no longer exists; anon refused;
  lifetime and `rank_up` still work for a valid receipt.
- [ ] Unit test: the TypeScript HMAC equals a precomputed SQL value for a fixed secret, user and day.
- [ ] `npm run check` and `npm run build` pass (known sandbox limits).

## Out of scope
- Putting meal points back in the crown race, changing KO's meal analysis.

## Implementation notes

- Plan: add deterministic receipt/security regressions, replace the unsigned RPC in migration 0088,
  sign successful meal-photo responses on the server, then run the required gates.
- Implemented an RLS-enabled private secret table with all API-role privileges revoked. The new RPC
  retains active-player/write-access checks, rejects invalid dates/receipts or missing secrets with 42501,
  and uses the existing once-per-day points ledger; crown calculations are unchanged.
- Confirmed migration 0001 installs pgcrypto in `extensions`; the helper's fixed HMAC fixture was
  precomputed with PGlite `extensions.hmac`. Test secrets are fixtures only.
- Receipt dates are computed in Cairo after analysis completes, so a request crossing midnight signs
  the completion day. Missing server configuration logs one warning per eligible request and skips awards.
- Owner setup is documented in RELEASE-CHECKLIST; no production secret was generated or configured.
- Verification: 34 focused tests passed. Full-suite run using a process-only workaround for Vite's
  blocked Windows `net use` lookup: 425 files / 3086 tests passed; `src/lib/perf-budget.test.ts` failed
  because existing build statistics reference a missing `.next/static/chunks/3rohhnt8j93pa.js` file.
- `npm run check`: typecheck and lint passed, then the release audit's `git ls-files` subprocess failed
  with sandbox EPERM. Running the same audit rules with the file list supplied by the shell yielded
  `Release audit: 1722 tracked files, 0 findings`. `npm run build` failed only fetching Google Fonts
  (Alexandria, Changa, Manrope). No tooling or performance-test files were changed.
