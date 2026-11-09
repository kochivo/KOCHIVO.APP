# T-117 — Captain registration visibility

## Request
Incomplete email signups appear as requests; rejected captains remain in admin management.

## Files
- `supabase/migrations/0074_captain_registration_visibility.sql`
- `supabase/tests/captain-registration-visibility.test.ts`
- `supabase/tests/rls-captain-approval.test.ts`
- `supabase/tests/rls-captain-intake.test.ts`
- This task card (implementation plan and verification record).

## Requirements
- Pending requests require a confirmed email, confirmed captain role and submitted intake.
- Management lists approved captains only, filtering before search and pagination.
- Keep existing approved captains visible, including legacy accounts without intake.
- Preserve admin-only access, return signatures, grants, search and subscription history.
- No dependencies, edits to old migrations, account deletion, commits or branches.

## Plan
1. Add deterministic PGlite regressions: incomplete stages hidden, completed request visible,
   rejection persisted and hidden after reload, approval enters management, search/pagination
   exclude rejected and pending rows, non-admins denied. Run and observe failures.
2. Add a numbered migration replacing only the two admin list functions.
3. Update existing approval/intake fixtures to represent verified, submitted requests.
4. Run focused suites, `npm run check` and `npm run build`; inspect final diff.

## Out of scope
Auth account cleanup, changing approval permissions, KPI definitions, unrelated KO changes.

## Verification
- Before the fix: new regression suite had 3 failures and 1 passing access-control test.
- Focused suites: 5 files, 63 tests passed.
- `npm run check`: passed; 386 test files, 2637 tests passed; release audit 0 findings.
- `npm run build`: failed fetching Alexandria, Changa and Manrope from Google Fonts.
  A separate connection check to fonts.googleapis.com also timed out.
- Applied to production at the owner's explicit request, migration version `20261108224933`.
- Live admin reads: 0 rejected captains in management, 0 incomplete requests.
- Non-admin calls remain denied; Security Advisor reports no new findings.
- Existing site responds HTTP 200 from `fra1`; no frontend or edge function deployment required.
- Local build still cannot fetch Google Fonts. No application commit, push or branch created.
- Sentry is not connected in this session; a 15-minute Sentry observation was not performed.
