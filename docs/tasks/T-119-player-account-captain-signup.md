# T-119 — Existing player account during captain signup

## Evidence and owner decision
The reported email belongs to a player created on November 3. Signup verification on
November 9 confirmed that existing account; no coach relationship exists. Owner explicitly
requested keeping it a player. Do not change its role or delete it.

## Files
- `src/features/auth/data/sign-up-captain.ts`
- `src/features/auth/signup/messages.ts` (server-side signup error copy)
- `src/features/auth/captain-signup-role.test.ts`
- `src/features/player-shell/components/player-shell.tsx`
- `src/features/player-shell/components/player-shell-entry.tsx`
- `src/app/[locale]/(player)/player/layout.tsx` (compose the sign-out action from the server)
- `src/features/player-shell/components/no-captain-screen.tsx`
- `src/features/player-shell/messages.ts`
- `src/features/player-shell/no-captain.test.ts`
- `src/features/demo/player-layout.test.ts` (retain the demo wrapper contract with action props)
- `src/features/supplements/components/captain-supplements.tsx` (owner authorized fixing the bundle budget before release)
- `src/features/supplements/editor-loading.test.ts`
- This task card.

## Plan and acceptance
1. Reproduce verified, existing player profiles reaching `/player` from captain email
   signup, then reject that completion with translated account-type guidance. Sign out
   the session created by verification and clear captain intent. Never change the role.
2. Test players with no coach: no training/onboarding/progress content while loading,
   after errors or after a successful empty relationship read. Show invitation guidance,
   retry and sign-out. Keep account settings accessible and existing/cached coach flows.
3. Run focused regressions, full check, build and performance gates.
4. Publish under the owner's standing instruction, then verify deployment and runtime.

## Out of scope
Account conversion, Auth settings, schema changes, unrelated KO changes, commits/pushes.

## Performance scope extension
Owner chose to fix the bundle excess before publishing. The captain supplements panel
imports its editor dialog on initial load, although the dialog mounts only after Add/Edit.
Defer that editor until it is opened, preserving its existing behavior and budget ceilings.

## Verification and release review
- Before fixes: 9 failing regressions reproduced wrong-role completion and unassigned content.
- Auth/player-shell suites: 27 files, 217 tests passed. Final focused suites: 14 tests passed.
- `npm run check`: 389 files passed, 2655 tests passed, 1 perf test skipped because the
  failed local font build left no completed bundle diagnostics. Release audit: 0 findings.
- Baseline captain player-detail budget exceeded 310 KB even before this task (310.0586 KB).
  Owner explicitly required fixing the size before release. Deferred the closed supplement
  editor; its regression failed before the change and passed after Add/close verification.
- Final preview `dpl_4ghtAcMP1YcBur7aHDDurVyH9XTU` passed build and the real bundle budget test.
- Published production deployment `dpl_2e1KnoCCvZBq5PeLzRJwXwkqqxX7` with build command
  `npm run build && npx vitest run src/lib/perf-budget.test.ts`. Both gates passed.
  No budget increase or exception was added.
- `https://kochivo.site/login?release=T119` returned HTTP 200 with the final deployment ID
  and `x-vercel-id` beginning `fra1::fra1`. No error/fatal logs at the final smoke check.
- The reported account was inspected read-only and remains a player. No account mutation.
- Local `npm run build` still cannot fetch Google Fonts; the actual Vercel build succeeded.
- No commit, push or branch created. Sentry is unavailable; its 15-minute observation was
  not performed. Verification of authenticated UI relied on deterministic regression tests.
