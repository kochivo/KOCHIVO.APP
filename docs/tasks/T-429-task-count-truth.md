# T-429 — Contradictory task counts (KO badge vs dashboard/queue)

**Phase:** fix · **Depends on:** none · **Status:** ready

## Goal
One source of truth for the pending/urgent task count, shared by the KO button badge, the `/captain` dashboard and the `/captain/tasks` queue. Live review (2026-11-22, kochivo.site, captain Ali Esmail, Arabic dark): the KO button badge says "مهمتين مستعجلين" (two urgent tasks, badge 2) while the dashboard and the task queue both say 0 pending tasks ("مفيش مهام", "خلصت كل المهام").

## Design decisions (read first)
1. **The queue is the truth.** The dashboard and the queue already agree (0). Whatever the KO badge counts must become the same number the queue shows. Do not change the queue or dashboard count to match the badge.
2. **Find the badge's source before changing anything.** The badge strings live in `src/features/ko-feed/messages.ts` (`badge.one/two/few/...`). The count itself is loaded somewhere in `src/features/ko-feed/` (see `data/`, `hooks/`, `digest.ts`, `rank.ts`) and rendered by the KO launcher. The most likely causes are: the badge counts a different set than the queue (e.g. digest items such as inactive players, not pending tasks), or it counts a stale/cached feed. Identify the exact source and say which it is in Notes for reviewer.
3. **Empty means hidden.** When the shared count is 0, the badge must not render (no "0", no stale "2").

## Files
Create or modify only these:
- `docs/tasks/T-429-task-count-truth.md`: this card
- `src/features/ko-feed/ko-feed.tsx` and/or `src/features/ko-feed/data/*` and/or `src/features/ko-feed/hooks/*`: the loader that produces the badge count (edit only the file(s) that actually own it)
- `src/features/ko-feed/digest.ts`: only if the badge count is derived from the digest (do NOT edit it — T-436 owns it; see below)
- `src/features/ko-feed/messages.ts`: only if a badge string must change (the strings themselves are probably fine)
- `src/features/captain-workspace/queue/tasks-model.ts`: read-only reference for what the queue counts, unless the unification must be implemented here (report first if so)
- `src/features/dashboard/home/tasks.ts`: read-only reference for what the dashboard counts
- Tests: `src/features/ko-feed/ko-feed.test.ts` and `src/features/captain-workspace/queue/tasks-model.test.ts` (extend for the shared-count cases)

Do not edit any file outside this list. In particular: do NOT edit `src/features/ko-preview/components/ko-teaser.tsx` (T-428 owns it — read it only to find where the badge renders), do NOT edit `src/features/ko-feed/digest.ts` (T-436 owns it — if the badge count comes from the digest, report the exact file + lines + the fix needed and implement everything else), and do not touch the staged log-cleanup entries, any T-421 file, any KO file (`src/features/ko-account/**`, `src/features/ko-entry/config.ts`, migrations 0164–0167, `src/types/app-database.ts`). If the badge count comes from a KO file, report the exact file + lines instead of editing it. Do not commit or push.

## Requirements
1. With an empty task queue, the KO badge renders nothing (no count, no "مهمتين مستعجلين").
2. With N pending tasks in the queue, the KO badge shows N — the same N the dashboard hero and the queue show.
3. The badge count updates when the queue changes (no stale count surviving after tasks are done; the existing polling/refresh mechanism must cover it — if it cannot, say so in Notes for reviewer).
4. No change to what counts as a task in the queue or on the dashboard.
5. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log`, tokens only, logical RTL properties only, touch targets ≥ 48px, every user-facing string in `messages.ts` (ar/arStd/en), no emoji.

## Acceptance
- [ ] Empty queue → dashboard 0, queue empty state, KO badge hidden. (This is the live-review case.)
- [ ] Queue with 2 pending tasks → dashboard 2, queue 2, KO badge 2.
- [ ] Completing all tasks clears the badge (no stale 2).
- [ ] `npm run check`, `npm run build` and `npx vitest run src/lib/perf-budget.test.ts` pass.

## Tests (deterministic, inject `now`, no real timers, no network)
- `ko-feed.test.ts`: badge count is 0/hidden when the queue is empty; badge count equals the queue count when tasks exist; the badge count derives from the same source as the queue (mock the shared loader once and assert both consumers see it).
- `tasks-model.test.ts`: keep the queue-count cases green.

## Out of scope
- The sidebar Tasks badge (T-427) — different badge, different loader.
- Changing the definition of an urgent task.
- The KO chat, KO memory, KO usage (T-422–T-426).
- A live re-check on kochivo.site (not possible until deploy).

## Notes for reviewer
- State here which source the badge was counting before the fix (digest items? stale feed? a different query?) and which source it counts now.

## References
- `src/features/ko-feed/messages.ts:20,25,45` (badge strings)
- `src/features/ko-feed/` (`data/`, `hooks/`, `digest.ts`, `rank.ts` — count loader lives here)
- `src/features/captain-workspace/queue/tasks-model.ts`, `src/features/dashboard/home/tasks.ts` (queue/dashboard counts)
