# T-142 — Ranks are fully automatic: no captain review

**Phase:** Gamification · **Depends on:** T-133, T-137, T-139, T-141 (all landed) · **Status:** ready (owner decision 2026-11-10: "خلي الرتب تبقى أوتوماتيك", suspicious workouts are not counted)

## Goal
Today a workout the anti-cheat flags (too short, or too few logged sets) waits for the captain to
approve or reject it. The owner wants no manual step: the system decides alone. A flagged workout
simply earns no points. The captain has nothing to review, and the player sees that the workout
was not counted and why.

## The rule
- The anti-cheat test in `security_private.award_session_points` does not change (duration under
  `greatest(1200, planned seconds * 0.5)`, or logged sets under 60% of the planned sets).
- A flagged workout and its PR rows stay in `points_log` with status `pending`, which now means
  "not counted". They add nothing to lifetime, the monthly crown score, `done`, or the perfect week.
- The only way out of `pending` is the existing automatic one: late offline sets arrive, the
  session passes the test, and the rows become `counted`. Keep that path exactly as it is.
- Nobody can approve or reject by hand. `public.review_points` is removed.
- Rows a captain already rejected stay `rejected`. Rows a captain already approved stay `counted`.

## Files
Create or modify only these:
- `supabase/migrations/0084_automatic_ranks.sql`: new. Do not edit 0081–0083.
- `supabase/tests/points-ranks.test.ts`, `supabase/tests/points-crown-adherence.test.ts`, and a new `supabase/tests/points-automatic.test.ts` if space is needed (250-line limit per file).
- `src/types/database.ts`: remove the `review_points` RPC.
- `src/features/ranks/data/review-points.ts` (delete), `src/features/ranks/index.ts`, `src/features/ranks/messages.ts`, `src/features/ranks/rank-screen.test.ts`
- `src/features/rank-review/`: delete `components/pending-list.tsx`, `components/pending-row.tsx`, `hooks/use-pending-points.ts`, `data/load-pending.ts`, and `types.ts` if nothing else uses it; edit `index.ts`, `messages.ts`, `components/leaderboard-screen.tsx`, `components/team-crown-link.tsx`, `rank-review.test.ts`.
- `src/app/[locale]/(captain)/captain/leaderboard/page.tsx`
- `docs/tasks/T-133-points-and-ranks-db.md` and `docs/tasks/T-137-captain-leaderboard-review.md`: one line each pointing to this card.
- This task card.

## Requirements
1. **Migration 0084.** `drop function public.review_points(uuid, boolean)`. Nothing else in the points logic changes. Add a SQL comment on `points_log.status` that `pending` means flagged by the anti-cheat and not counted, cleared only by late sets. If `security_private.guard_points` has a branch that exists only for the captain's review, leave it: the automatic `pending → counted` update still goes through it.
2. **No manual path left.** A test proves that a captain and a player cannot change a `points_log` row's status directly (RLS/guard), and that calling `review_points` fails because the function is gone.
3. **Tests that used `review_points`.** Do not delete their intent. Where a test approved a pending workout to reach a state (perfect week on the final day, crown moving, PR following its workout), reach the same state through late sets making the session pass. Tests that only covered approve/reject by a captain are replaced by the tests in requirement 2 and by: a flagged workout stays `pending` and adds 0 to lifetime, monthly, `done`; its PR rows stay `pending`; late sets turn the workout and its PRs to `counted` once, with `crown_taken`/`crown_lost` sent once.
4. **Captain UI.** The leaderboard screen shows the month switch, the crown card and the board only. The "workouts to review" list, its buttons, the confirm text, the decision error and the pending count on the players-page link are removed with their messages, hooks and loader. `TeamCrownLink` becomes a plain link (no data loading); `LeaderboardScreen` loses the `pending` prop. The route stays thin.
5. **Player UI.** In the points log the `pending` label becomes «ما اتحسبش: التمرين قصير أو مجموعاته ناقصة» / "Not counted: workout too short or sets missing". The `rejected` label becomes «ما اتحسبش» / "Not counted". The points value of a row that is not `counted` is shown muted with a line through it (`line-through text-muted`), so it does not read as earned.
6. `reviewPoints` is no longer exported from `@/features/ranks`; nothing in `src` may reference `review_points`, `reviewPoints`, `usePendingPoints` or `loadPending` afterwards.
7. Rules as always: tokens and logical properties only, strings in `messages.ts`, files under 250 lines, no new dependency.

## Acceptance
- [x] PGlite tests as in requirements 2 and 3; all of `supabase/tests` passes.
- [ ] Render tests: the leaderboard screen has no review list or buttons in ar and en; the crown link renders without a count; the points log shows the two new labels and the struck-through value.
- [x] `grep -rE "review_points|reviewPoints|usePendingPoints|loadPending" src` returns nothing.
- [x] `npx vitest run src/ui/route-loading.test.ts src/ui/sheet-surfaces.test.ts` passes.
- [ ] `npm run check` and `npm run build` pass (sandbox fonts and the audit's git EPERM are known limits).

## Out of scope
- Changing the anti-cheat thresholds or the points values.
- Telling the player at workout end that the session will not count (later card if the owner wants it).
- Notifications, crown prize, stars, share card.

## Implementation notes
- 0084 drops only the manual review RPC and documents the new meaning of `pending`; awarding, thresholds, guards and late-set triggers are unchanged. An upgrade test verifies historical decisions and pending rows survive unchanged.
- Removed the review loader, hook, components, types, exports and RPC type. The captain route now composes the leaderboard hook and screen; the crown entry is a plain link without a count or fetch.
- Reworked perfect-week, PR-cap and crown-swap tests to clear set shortages through late sets. Added direct-status/RPC denial, zero pending totals, persistent duration flags, repeated-sync idempotency and historical-upgrade coverage. Rejected-history fixtures use privileged test setup only.
- Updated both player status labels. The required value styling is blocked by a scope mismatch: `src/features/ranks/components/points-log.tsx` is absent from the allowed Files list. Approval to include it was requested; its two ar/en strike-through render tests remain failing until that edit is authorized.
- Verification so far: TypeScript and ESLint pass; `npm run check` stops at release audit with sandbox `spawnSync git EPERM`. A direct release-rule scan including untracked files reports 1,692 files and 0 findings. `npm run build` fails only fetching Alexandria, Changa and Manrope from Google Fonts. Route-loading and sheet-surface tests pass (2 files, 3 tests). No migrations were applied outside PGlite.
- Full-suite fallback (thread pool, two workers, skipping only Vite's blocked `net use` probe): 410 files passed, 1 failed, 1 skipped; 2,960 tests passed, 2 failed, 1 skipped. Both failures are the outstanding strike-through assertions in `rank-screen.test.ts`. All 83 database suites passed. Final crown/PR and captain-render changes were also verified separately (2 files, 21 tests passed).
- Standalone final database run with `--configLoader native --pool threads --maxWorkers 2`: 83 files / 715 tests passed. Final TypeScript verification also passed.
