# T-118 — Duplicate email signup feedback

## Request
An email already registered reaches the signup-code screen although no code was sent.

## Files
- `src/features/auth/data/sign-up-captain.ts`
- `src/features/auth/data/sign-up-player.ts`
- `src/features/auth/duplicate-signup.test.ts`
- This task card.

## Plan and acceptance
1. Add failing action tests for Supabase's obfuscated duplicate user response
   (`session: null`, `user.identities: []`) for captain and player signup.
2. Handle that response before setting captain intent or returning `codeEmail`, using
   the existing translated sign-in/reset guidance. Preserve explicit Auth errors.
3. Verify real signup responses still reach code entry and unverified registrations
   with an identity can continue verification. No account preflight lookup or DB change.
4. Run focused tests, `npm run check`, `npm run build`, and review the diff.

## Out of scope
Deleting existing accounts, changing Auth confirmation settings, unrelated KO work.

## Verification
- Regression before fix: 3 failed, 2 passed; duplicate responses reached code entry.
- Auth suites after fix: 19 files, 168 tests passed.
- `npm run check`: passed, 387 files and 2642 tests; release audit 0 findings.
- `npm run build`: failed fetching Alexandria, Changa and Manrope from Google Fonts.
- Published directly through the authorized Vercel connection; no commit, push or branch created.
- Final production deployment: `dpl_Efq2ABuxkLBSMoWjBuTUSnyNswDm` (`READY`), serving `https://kochivo.site`.
- `npm run build` passed on Vercel (the local Google Fonts connection issue remains).
- Source upload retained the already-live KO files. Compared available complete production
  source hashes against local files: only the two signup action files differed.
- Preview `dpl_AkxRyU8YcJxFUtGee2ghmw7cUd6H` built and served signup with HTTP 200.
- Live browser duplicate-signup test showed the Arabic sign-in/reset guidance, not code entry.
  Verified the existing account stayed single and its profile name was unchanged.
- Final domain smoke check: HTTP 200, expected deployment ID, `x-vercel-id` starts `fra1::fra1`.
- Set the project's function default region to `fra1` to preserve the repository's region
  requirement when deploying through the API. Final deployment reports `regions: ["fra1"]`.
- Fresh focused regression and perf suites: 2 files, 6 tests passed. No new Security Advisor findings.
- No error/fatal runtime logs at the final smoke check. Sentry is not connected, so its
  15-minute observation could not be performed. No database change was required for T-118.
