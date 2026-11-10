# T-151 — KO's morning digest for the captain

**Phase:** KO agent · **Depends on:** T-123, T-139 · **Status:** ready (owner request 2026-11-10)

## Goal
The KO feed lists cards one by one. After this card it opens with a short digest, written from the same data:
«3 لاعيبة غابوا أسبوع · 2 اشتراكهم بيخلص · أحمد كسر رقمه في السكوات · التاج مع سارة 86٪». One glance, then
the cards below.

## Files
Create or modify only these:
- `src/features/ko-feed/digest.ts` (new, pure): builds digest lines from feed items, the current
  `team_leaderboard` rows, and yesterday's PR events.
- `src/features/ko-feed/data/load-digest-extras.ts` (new): reads yesterday's counted `pr` rows of the
  captain's players from `points_log` (RLS already allows it) and the leaderboard via `loadLeaderboard` from
  `@/features/ranks`.
- `src/features/ko-feed/components/ko-digest.tsx` (new), `src/features/ko-feed/components/ko-feed.tsx`,
  `src/features/ko-feed/hooks/use-ko-feed.ts`, `src/features/ko-feed/messages.ts`, `src/features/ko-feed/index.ts`
- Tests: `src/features/ko-feed/digest.test.ts` (new) and render tests.
- This task card.

## Requirements
1. Deterministic text, no AI call. At most four lines, in this order, each only when non-zero: inactive
   players, subscriptions ending or ended, new records yesterday (name and exercise for one, count for more),
   crown leader with adherence (only when someone qualifies).
2. «النهارده كله تمام» / "All clear today" when nothing applies.
3. Captain only. Players' feed is unchanged.
4. Shown as a `glass-strong` card at the top of the feed with the KO avatar; it is not dismissible and has no
   action button (the cards below keep their actions).
5. "Yesterday" uses `localDate()` with an injected `now` in tests.
6. If the extras fail to load, show the digest from feed items only; never block the feed.

## Acceptance
- [ ] Unit tests: each line on and off, ordering, singular/plural Arabic, one vs many PRs, crown line only when
  qualified, all-clear, extras failure.
- [ ] Render tests ar and en.
- [ ] `npm run check` and `npm run build` pass (known sandbox limits).

## Out of scope
- Push notification of the digest, AI-written text, SQL changes.

## Implementation notes

- Added deterministic localized digest lines, with distinct-player counts for inactivity and subscriptions;
  inactivity follows the existing feed's five-day threshold. Crown qualification comes from `is_crown`.
- Captain routes render a passive `glass-strong` card using the supplied KO avatar. Player routes keep
  their existing feed. Extras refresh independently, so failures or slow requests never block feed cards.
- Counted PRs are filtered by captain and Cairo yesterday's `earned_on`; exercise IDs come from the
  existing `session:exercise` source key. Missing Arabic exercise names fall back to English.
- Added unit, loader, and Arabic/English render coverage. Focused suites: 26 tests passed using
  `--configLoader native --pool threads` (default runner is blocked by sandbox `spawn EPERM`).
- Production build is blocked only by fetching Alexandria, Changa, and Manrope from Google Fonts.
- `npm run check` passed typecheck and lint, then stopped at the release audit's sandbox-denied
  `spawnSync git EPERM`. A broader native/thread test run reported `src/lib/perf-budget.test.ts`
  failing and then made no further visible progress; it was stopped without a full-suite pass.
  An isolated rerun confirmed stale bundle stats reference a missing `.next/static/chunks` file (ENOENT).
- Review: a PR row whose player or exercise is missing is skipped, so the rest of the digest still shows.
