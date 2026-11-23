# T-435 — Minor polish bundle: dead void, slow player-file open, late thumbnails

**Phase:** fix · **Depends on:** none · **Status:** ready

## Goal
Three small live-review findings, one card: (a) `/captain` desktop leaves a large dead black void in the middle column below "دوّر على لاعب" when scrolled; (b) opening a player file from the roster is slow (~4 s before navigation starts, both widths); (c) exercise thumbnails in the player file show as dark placeholders for several seconds before loading.

## Design decisions (read first)
1. **(a) Void.** The home layout is `src/features/dashboard/components/workspace-home.tsx` (middle column). Find what is supposed to fill that column space: if a panel is missing, collapsed, or only renders under a condition that is false on this account, restore/rebalance it; if the column is intentionally sparse, reduce the void by letting a neighbouring panel span or by tightening the column. Do not add a new feature to fill it.
2. **(b) Slow navigation — investigate honestly.** ~4 s before navigation *starts* points at the tap handler or the prefetch, not the destination page. Note that roster rows and nav links all use `prefetch={false}` (`src/features/roster/components/roster-row-view.tsx:42`, `captain-frame-nav-view.tsx:24`, `captain-nav-groups.tsx:23,42`). Investigate: is the delay the disabled prefetch, a blocking load in the tap handler, or the player-file server load itself? Improve it if it is a code issue (e.g. enable prefetch for roster row links where safe). If the 4 s is server/data-bound rather than fixable here, say so plainly in Notes for reviewer with the evidence, and do NOT fake a fix. A measured statement beats a hopeful one.
3. **(c) Thumbnails.** Exercise thumbnails in the player file (`src/features/captain-workspace/player-file/overview-activity.tsx` and the thumbnail component it uses) show dark placeholders for seconds. Improve the loading state: a skeleton shaped like the image (per DESIGN.md states), eager loading for visible images, or a lighter placeholder — whichever the code supports. Do not change the images themselves or their source.

## Files
Create or modify only these:
- `docs/tasks/T-435-minor-polish-bundle.md`: this card
- (a) `src/features/dashboard/components/workspace-home.tsx` (middle column layout; the home views it composes only if the void comes from one of them — report the file if so)
- (b) `src/features/roster/components/roster-row-view.tsx` (prefetch on the player-file link, if that is the fix) and the player-file route loader `src/app/[locale]/(captain)/captain/players/[playerId]/page.tsx` (read-only investigation; edit only if the load itself must be split/lazy)
- (c) `src/features/captain-workspace/player-file/overview-activity.tsx` and the exercise thumbnail component it renders (name the file in Notes for reviewer)
- Tests for the touched areas (extend existing tests under `src/features/dashboard/`, `src/features/roster/`, `src/features/captain-workspace/player-file/`; create focused tests where none cover the change)

Do not edit any file outside this list. Do not touch the staged log-cleanup entries, any T-421 file, any KO file (`src/features/ko-account/**`, `src/features/ko-entry/config.ts`, migrations 0164–0167, `src/types/app-database.ts`). If a fix genuinely needs another file, implement everything else and report the file + lines + reason in your final message instead of editing it. Do not commit or push.

## Requirements
1. (a) The middle column below "دوّر على لاعب" no longer shows a large dead black void on `/captain` desktop when scrolled (or the void is materially reduced with a stated reason if it cannot be removed).
2. (b) Player-file navigation from the roster is faster if the cause is in code; if it is server/data-bound, Notes for reviewer says so with evidence and no code change pretends otherwise.
3. (c) Exercise thumbnails in the player file show a proper loading state and appear faster (or the placeholder no longer reads as a broken dark box).
4. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log`, tokens only, logical RTL properties only, touch targets ≥ 48px, every user-facing string in `messages.ts` (ar/arStd/en), no emoji.

## Acceptance
- [ ] (a) Desktop `/captain` scrolled: middle column void gone or reduced, stated which.
- [ ] (b) Navigation delay investigated with a stated cause; fixed in code if fixable, stated as server-bound with evidence if not.
- [ ] (c) Thumbnails load with a proper loading state.
- [ ] `npm run check`, `npm run build` and `npx vitest run src/lib/perf-budget.test.ts` pass.

## Tests (deterministic, inject `now`, no real timers, no network)
- (a) Home layout test asserting the middle column renders its panel(s) in the scrolled state, if the fix is structural.
- (b) If prefetch is enabled, a test asserting the roster row link carries prefetch; if the cause is server-bound, no test pretends otherwise — record the finding in Notes.
- (c) Thumbnail test asserting the loading state renders (skeleton, not a bare dark box) before the image loads.

## Out of scope
- The hero ring (T-434), the empty-state 100% (T-430), the KO button overlap (T-428) — same screens, different bugs.
- Adding new panels or features to fill the void.
- A live re-check on kochivo.site (not possible until deploy).

## Notes for reviewer
- State for (b) the measured cause (prefetch off / handler blocking / server load) and what, if anything, changed it.
- Follow-up done by the coordinator after the worker's report (2026-11-22): the worker found (b) server/data-bound and named the fix — start `loadActivity` concurrently in `src/features/captain-workspace/player-file/file-content.tsx:50-62`. Done: `loadActivity(playerId, today)` now starts in the same `Promise.all` as `loadSummary`/`unreadCounts` (it only needs `playerId` + `today`), gated by `needsActivity` for overview/nutrition tabs; error semantics unchanged (the `try/catch` still renders `FileState` on any failure; `Promise.all` swallows later settlements, so no unhandled rejection). New test `src/features/captain-workspace/player-file/file-content-load.test.ts` asserts the shared `Promise.all` (source assertion, the repo's usual pattern for server-load ordering). Targeted tests 7/7, ESLint exit 0, `tsc --noEmit` exit 0. The remaining sequential stages (profile → timezones → claims → summary) are unchanged; a live timing re-check still needs a real device after deploy.
- (a) Done: `WorkspaceActivity` moved from the 330px side column into the middle (1fr) column, below `SmartAlerts`, in `workspace-home.tsx`. The middle column only held the task list (a one-line empty state at 0 tasks) plus alerts, while the side column held finder + money + activity (capped at 5 events, ~380px) + week chart + confirmations — a ~600–1000px void below the middle column once scrolled. Moving the activity panel rebalances both columns to within ~one panel height on 0-task and busy accounts alike. No new panel, no new strings. Layout test `src/features/dashboard/workspace-home-layout.test.ts` pins the order (activity renders after alerts, before the finder).
- (b) Measured cause: **server/data-bound, not the tap handler and not prefetch.** Evidence: the real roster row is a plain `<Link prefetch={false}>` — `RosterRow` never passes `onSelect`, so there is no blocking tap handler (`onSelect` only exists for the demo shell path). Prefetch is deliberately off: `src/features/roster/list-prefetch.test.ts` asserts `prefetch={false}` on all 6 roster-row links because prefetching every row trips the host's per-IP rate limit (429) — enabling it is not a fix. The player-file route already has `loading.tsx` and streams through `<Suspense fallback={<FileState/>}>`, but the overview content needs ~5 sequential server stages before first paint: `readPlayerProfile` → timezone lookups → `currentClaims()` → `Promise.all([loadSummary, unreadCounts])` → `loadActivity`, with `loadSummary` itself doing 9 parallel queries plus a dependent form query (`src/features/captain-workspace/player-file/load-summary.ts`, `load-activity.ts`). No code change was made here: nothing in the allowed files can shorten that chain, and no change here should pretend otherwise.
- (b) Fix needing a file outside this card's list: split/lazy the player-file overview load in `src/features/captain-workspace/player-file/file-content.tsx:50-62` — start `loadActivity(playerId, today)` concurrently with `loadSummary`/`unreadCounts` instead of awaiting it after them, or give the overview sections their own `<Suspense>` boundaries so the header paints before the activity feed resolves. Not edited (outside this card's Files list).
- (c) implemented 2026-11-22, thumbnail component is `src/ui/exercise-image.tsx` (used by `overview-activity.tsx`): the last-workout thumbnails now pass `eager`, so the real GIF URL renders server-side with `loading="eager"` instead of waiting for the IntersectionObserver + lazy load; the placeholder is now a pulsing skeleton (`animate-pulse bg-surface-raised`, shaped by the reserved aspect-ratio box) that clears to transparent once the image loads. Also fixed in the same component: with `prefers-reduced-motion` the observer setup returned early without ever showing the image, so those users kept the dark box forever — it now loads immediately. Other `ExerciseImage` callers keep the lazy + observer behaviour. No image or image source changed. Tests: new `src/features/captain-workspace/player-file/exercise-thumbnail.test.ts` (3 tests, incl. rendering `OverviewActivity` itself). Items (a) and (b) were not touched by this worker.

## References
- `src/features/dashboard/components/workspace-home.tsx`
- `src/features/roster/components/roster-row-view.tsx:42` (`prefetch={false}` on the player-file link)
- `src/features/captain-workspace/player-file/overview-activity.tsx` (exercise thumbnails)
