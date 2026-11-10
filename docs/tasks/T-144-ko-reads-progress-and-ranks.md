# T-144 — KO answers about progress, ranks and the team

**Phase:** KO agent · **Depends on:** T-143 (landed), T-139, T-142 · **Status:** ready (owner request 2026-11-10)

## Goal
KO can only read the plan and the meal plan today. Players will ask «أنا ماشي كويس؟», «فاضلي كام على التاج؟»,
«ليه تمريني ما اتحسبش؟»; captains will ask «مين واقع من لاعيبتي؟», «أحمد عامل إيه؟». After this card KO
answers these from real data, read-only.

## Files
Create or modify only these:
- `src/features/ko-account/intents.ts`: new read tools and their role lists.
- `src/features/ko-account/read-progress.ts` (new): data reads and reply text for the new tools.
- `src/features/ko-account/execute.ts`: dispatch to the new reads.
- `src/features/ko-account/messages.ts`
- Tests: `src/features/ko-account/read-progress.test.ts` (new).
- This task card.

## Tools
1. **`my_progress`** (player): from `my_points()` and the player's own data through RLS: rank and lifetime
   points, points to the next rank, this month's adherence and done/planned, crown position and what is
   missing (`crown_needs_workouts` or `crown_gap`), workouts in the last 7 days, and the latest InBody date.
2. **`why_not_counted`** (player): the latest `points_log` workout row with status `pending` or `rejected`
   in the last 14 days, and the reason in plain words: too short, or sets missing (compare the session's
   duration and logged set count with the plan the same way `award_session_points` does; keep the thresholds
   in one exported constant pair in `read-progress.ts` with a comment pointing to migration 0081). If none:
   say every recent workout counted.
3. **`player_summary`** (captain, uses the screen context or a named player): last workout date, workouts
   this month vs planned, adherence, rank, open swap requests, subscription end date. Two to four short lines.
4. **`team_summary`** (captain): players inactive 7+ days (names), subscriptions ending in 7 days,
   this month's crown leader and their adherence, players with zero workouts this month. Use existing RPCs
   (`captain_roster`, `team_leaderboard`, `ko_feed`) where they already return the data; no new SQL.

## Requirements
- Read-only: none of these tools writes, previews or needs confirmation.
- Tool descriptions are precise enough that Gemini picks `why_not_counted` for «ليه التمرين ما اتحسبش»
  and `my_progress` for general "how am I doing" questions.
- Replies are short Egyptian Arabic / plain English from `messages.ts`, numbers through `formatNumber`,
  no medical advice, no invented numbers: a missing value is omitted, not guessed.
- A player can never read another player's data; a captain only their own roster (RLS is the guard;
  add a test that a named player outside the roster yields the existing "not found" reply).

## Acceptance
- [x] Unit tests with a mocked Supabase client: each tool's reply in ar and en; missing data omitted;
  `why_not_counted` for too-short, sets-missing and none; captain outside-roster refusal; role lists
  (players never get captain tools and vice versa).
- [ ] `npm run check` and `npm run build` pass (known sandbox limits).

## Out of scope
- New SQL or RPCs, KO writing anything, the morning digest (T-151).

## Implementation notes

- Added four read-only intents with separate player/captain allowlists and an execution-time role guard. Player reads always filter by the authenticated player; captain screen context is rechecked against `captain_roster`, and explicit names take precedence.
- Progress uses `my_points`, completed sessions over seven Cairo calendar dates (including today), and the latest InBody scan. Captain summaries use `captain_roster` and `team_leaderboard`; direct pending-swap counts avoid the eight-alert limit and dismissals in `ko_feed`.
- Not-counted explanations use the latest pending/rejected workout ledger row over fourteen Cairo dates, live plan duration/sets, and nondeleted own set logs. The exported threshold pair tracks migration 0081; recorded rejections remain visible even when current logs meet the thresholds.
- Replies use localized messages, shared rank names, `formatNumber`, and shared date formatting. Missing metrics are omitted; unavailable session details do not produce an invented reason. No SQL, writes, previews, dependencies, or confirmation flow changes.
- Added deterministic mocked-client tests for both locales, role lists/guards, roster refusal, missing values, scoring boundaries, and current-screen/name resolution.
- Validation: the 19 new tests pass with a process-local workaround for Vite's blocked `net use` probe; typecheck and lint pass. `npm run check` stops at the release audit's sandbox-blocked `spawnSync git EPERM`; piping the Git file list into the unchanged audit gives `1703 tracked files, 0 findings`. `npm run build` fails only fetching Alexandria, Changa, and Manrope from Google Fonts.
- Feature regression run with that workaround: `Test Files 6 passed (6)`, `Tests 51 passed (51)`. An additional full-suite attempt was stopped after several minutes without results; no full-suite pass is claimed.
