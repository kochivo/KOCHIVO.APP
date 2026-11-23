# T-430 — Empty state claims 100% completion with zero tasks

**Phase:** fix · **Depends on:** none · **Status:** ready

## Goal
With zero tasks, `/captain` must not claim 100% completion. Live review (2026-11-22, kochivo.site, captain Ali Esmail, Arabic dark, desktop): the hero says "خلصت مهام النهارده" and the progress ring/bar reports 100% completion ("تقدم مهام النهارده: 100"), while weekly adherence is 0% with a -25% badge. A vacuous 100% next to a 0% adherence warning sends opposite signals.

## Design decisions (read first)
1. **Zero tasks is not 100% done, it is nothing to do.** When `count === 0`, do not render the progress bar/percentage at all. The hero already has the neutral empty copy (`t('emptyHero')`) — let that carry the state, with no percentage beside it.
2. **The likely culprit is `taskProgress(completed, count)`.** `home-hero-view.tsx` renders `<ProgressBar value={taskProgress(completed, count)} max={1}>` unconditionally. A 0/0 division (or a "no tasks means done" default) producing 1 is the vacuous 100%. Fix the call site (do not render when count is 0); fix `taskProgress` itself too if 0/0 returns 1, so no other caller can show a vacuous 100%.
3. **Check the phone hero too.** `phone-home-hero.tsx` / `home-ring.tsx` render the same hero on phone. If they show the same vacuous percentage, apply the same rule there.
4. **Adherence badge.** The weekly adherence line (`teamStatus(adherence)`, 0% with a -25% badge) is a separate signal. If the -25% is also vacuous (a delta against a previous week with no data), neutralise it for the empty case as well and note it. If it is a real delta, leave it alone.

## Files
Create or modify only these:
- `docs/tasks/T-430-empty-state-100-percent.md`: this card
- `src/features/dashboard/home/home-hero-view.tsx`: do not render the progress bar/percentage when `count === 0`
- `src/features/dashboard/home/tasks.ts`: `taskProgress` — 0/0 must not return 1 (if it does today)
- `src/features/dashboard/home/phone-home-hero.tsx` and `src/features/dashboard/home/home-ring.tsx`: same rule on the phone hero, if they render a percentage/ring for the empty case
- `src/features/dashboard/home/messages.ts` and `standard-messages.ts`: only if a string must change or a new empty-state string is needed (ar/arStd/en)
- Tests under `src/features/dashboard/home/` for the hero (`phone-home.test.ts`, `adherence.test.ts`, `live-fixes.test.ts` — extend the ones that cover the hero; create a focused test if none covers the empty case)

Do not edit any file outside this list. Do not touch the staged log-cleanup entries, any T-421 file, any KO file (`src/features/ko-account/**`, `src/features/ko-entry/config.ts`, migrations 0164–0167, `src/types/app-database.ts`). If the fix genuinely needs another file, implement everything else and report the file + lines + reason in your final message instead of editing it. Do not commit or push.

## Requirements
1. `count === 0` → hero shows the empty copy and no progress bar, no percentage, no ring value claiming completion (desktop and phone).
2. `count > 0` → behaviour unchanged: the progress bar shows `completed / count`.
3. `taskProgress(0, 0)` returns 0 (or is never called with count 0 — state which in Notes).
4. Adherence: 0% adherence still shows honestly; the -25% badge is neutralised only if it is vacuous (state the finding in Notes).
5. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log`, tokens only, logical RTL properties only, touch targets ≥ 48px, every user-facing string in `messages.ts` (ar/arStd/en), no emoji.

## Acceptance
- [ ] Zero tasks, desktop: hero reads as "nothing to do", no 100%, no progress bar.
- [ ] Zero tasks, phone: same.
- [ ] Two tasks, one done: progress shows 50%.
- [ ] `npm run check`, `npm run build` and `npx vitest run src/lib/perf-budget.test.ts` pass.

## Tests (deterministic, inject `now`, no real timers, no network)
- Hero tests: count 0 → no progress element/percentage in the output; count 2 completed 1 → progress 0.5; `taskProgress(0, 0)` → 0.
- Adherence tests: keep existing cases green; add the empty-case expectation if the badge is neutralised.

## Out of scope
- The contradictory KO badge count (T-429) and the sidebar badge (T-427).
- Redesigning the hero or the adherence metric.
- A live re-check on kochivo.site (not possible until deploy).

## Notes for reviewer
- State whether `taskProgress(0, 0)` returned 1, and whether the -25% adherence badge was vacuous or real.

## References
- `src/features/dashboard/home/home-hero-view.tsx` (ProgressBar, `taskProgress(completed, count)`, `teamStatus(adherence)`)
- `src/features/dashboard/home/tasks.ts` (`taskProgress`)
- `src/features/dashboard/home/phone-home-hero.tsx`, `home-ring.tsx` (phone hero)
