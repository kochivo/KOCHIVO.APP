# T-137 — Captain leaderboard and points review

**Phase:** Gamification · **Depends on:** T-133, T-134 (both landed) · **Status:** ready

## Goal
The captain sees this month's crown race for their team, and decides on workouts the anti-cheat
flagged (too short, or too few sets): approve to count the points, or reject.

Data is ready: `loadLeaderboard(month?)` and `reviewPoints(id, approve)` from `@/features/ranks`,
and `RankBadge` from `@/ui`. Pending rows are readable by the captain through RLS on `points_log`.

## Files
Create or modify only these:
- `src/app/[locale]/(captain)/captain/leaderboard/page.tsx`: thin route.
- `src/features/rank-review/` (new feature, standard layout):
  - `index.ts`, `messages.ts`, `types.ts`
  - `components/`: `leaderboard-screen.tsx`, `crown-card.tsx`, `board-list.tsx`, `month-switch.tsx`, `pending-list.tsx`, `pending-row.tsx`, `team-crown-link.tsx`
  - `hooks/use-leaderboard.ts`, `hooks/use-pending-points.ts`
  - `data/load-pending.ts`: selects `points_log` rows with `status = 'pending'` and `kind = 'workout'` for the captain's players (RLS scopes it), newest first, with the player's name and the session's `training_date`, `started_at` and `completed_at`. Validate with zod.
  - `months.ts`: pure month helpers (previous, next, label), using `@/lib/dates`.
  - `rank-review.test.ts`
- `src/app/[locale]/(captain)/captain/players/page.tsx`: render `<TeamCrownLink />` above the roster. No other change.
- This task card.

Do not touch `src/features/ranks/` (T-136 edits it in parallel). Import from `@/features/ranks` only.

## Requirements
1. **Crown card** (`glass-strong`): the `crown` badge (`lg`), the holder's name and monthly points. If nobody has 20 points yet: «لسه محدش أخد التاج الشهر ده» / "Nobody holds the crown yet this month", with the rule in one short line.
2. **Board:** position, `sm` badge for the player's tier, name, monthly points, lifetime points. Each row links to `/captain/players/{id}`. Empty state when the roster is empty.
3. **Month switch:** previous and next month buttons (icon-only, translated `aria-label`, 48px). Next is disabled on the current month. The label shows the month name in the current locale. Past months show who held the crown.
4. **Pending review:**
   - A list above the board, shown only when there are pending rows, titled «تمارين محتاجة مراجعتك» / "Workouts to review".
   - Each row: player name, training date, the workout's duration in minutes, and two buttons: «احسبها» / "Count it" and «ارفض» / "Reject".
   - Reject asks for one confirmation; say that the decision is final.
   - The update is optimistic: the row leaves at once, and comes back with an error message if the RPC fails.
   - After a decision, reload the leaderboard.
5. **Entry link** on the players page: a compact row with the `crown` badge (`sm`), «ترتيب الفريق» / "Team ranking", the count of pending reviews if any, at least 48px tall, linking to `/captain/leaderboard`. Render immediately; while loading or on error, keep the link without a count (review correction).
6. **States.** Loading, error with retry, and the empty states above.
7. **Rules.** Tokens only, logical properties only, every string in `messages.ts` (Egyptian Arabic and short English, no emoji), numbers through `formatNumber`, one primary lime action per screen (the approve button is the lime one), `uuidv7`/`Math.random` not needed. The route file stays thin.

## Acceptance
- [x] Unit tests: month helpers (year boundary, next disabled on the current month) with an injected `now`.
- [x] Render tests (renderToStaticMarkup style, data passed as props): crown card with and without a holder; board rows and links; pending list hidden when empty; both buttons with ar and en labels; entry link with and without a pending count; no `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-` classes.
- [ ] `npm run check` and `npm run build` pass (sandbox fonts are a known limit).

## Out of scope
- Player screens (T-136) and notifications (T-135).
- Any migration or RPC change. If `load-pending` cannot get what it needs through RLS, say so under "Notes for reviewer" and show what is available.
- A captain navigation entry (the nav is full; the players page link is the entry).

## Implementation notes
- Added a thin client route composing the two hooks and a prop-driven screen; display components accept locale and data for static render tests.
- Pending reads are scoped to the authenticated captain, paged newest first, and validated with Zod. Workout `source_key` is the session UUID as text, so profiles and sessions are fetched separately through their existing RLS and matched by player ID.
- Reject uses the existing captain `window.confirm` pattern with a translated final-decision warning. Decisions remove the row immediately, restore it with an error on RPC failure, and reload the selected month's board on success. Decisions are serialized to avoid duplicate reviews and conflicting rollbacks.
- The players entry renders immediately, keeps the link on count-loading errors, and shows a count only when positive. Both board and entry use unprefixed captain hrefs, matching the roster.
- Missing profiles or sessions no longer block the review list: missing names use «لاعب» / "Player", missing session dates are omitted and duration is unavailable. Existing session details are retained when only the profile is missing. Player/session ownership mismatches still throw. No ranks, notification, migration, or RPC files changed.
- Review verification: 13 feature tests pass with `npm test -- --configLoader native --pool threads src/features/rank-review/rank-review.test.ts`, including orphan fallbacks, ownership errors, unprefixed links and the immediately available entry. `npm run check` passes TypeScript and repository-wide ESLint, then release audit fails on sandbox `spawnSync git EPERM` before reaching tests. `npm run build` reports only Google Fonts fetch failures (Alexandria, Changa, Manrope).
- Earlier full-suite fallback verification was interrupted after stalling and reporting a missing `.next/static/chunks` artifact in `perf-budget.test.ts`; it was not repeated for these review fixes.
