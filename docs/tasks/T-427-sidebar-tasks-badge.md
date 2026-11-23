# T-427 — Sidebar Tasks badge shows an error string while loading

**Phase:** fix · **Depends on:** none · **Status:** ready

## Goal
The sidebar Tasks badge shows a number or nothing — never the error string "العدد مش متاح" (count unavailable). Live review (2026-11-22, kochivo.site, captain Ali Esmail, Arabic dark): during every page load the sidebar Tasks item reads "المهام — العدد مش متاح"; once loaded the badge vanishes entirely, unlike Inbox which correctly shows "2".

## Design decisions (read first)
1. **Number or nothing.** While the count is loading, or if its fetch fails, render no badge at all. Never render an error string in the badge slot, and never render it as visible text next to the item.
2. **Zero is also nothing.** A loaded count of 0 renders no badge (today's loaded behaviour), so loading, failed and zero all look the same: no badge. Only a count > 0 shows a number.
3. The string key `countUnavailable` in `captain-frame-messages.ts` must stop being used for visible UI. If a repo-wide grep shows no other use after the fix, remove the key from all three locales in that file (ar/arStd/en).

## Files
Create or modify only these:
- `docs/tasks/T-427-sidebar-tasks-badge.md`: this card
- `src/features/roster/components/captain-frame-nav.tsx`: the badge render path (`useTaskCount`, `useResource('captain:frame-counts', ...)`)
- `src/features/roster/components/captain-nav-groups.tsx`: the sidebar row that renders the badge (see design-audit 02-captain-core.md, desktop shell)
- `src/features/roster/hooks/use-task-count.ts`: the task-count loader, if the loading/error state it returns is what produces the string
- `src/features/roster/components/captain-frame-messages.ts`: remove `countUnavailable` if it becomes unused (verify with a repo-wide grep first)
- `src/features/roster/components/captain-frame-nav.test.ts`: update the test that currently expects "العدد مش متاح" (line ~38) and add the loading/error cases
- `src/features/roster/hooks/use-task-count.test.ts`: create if missing, for the loader's loading/error/success states

Do not edit any file outside this list. If the fix genuinely needs another file, implement everything else and report the file + lines + reason in your final message instead of editing it. Do not touch the staged log-cleanup entries, any T-421 file, any KO file (`src/features/ko-account/**`, `src/features/ko-entry/config.ts`, migrations 0164–0167, `src/types/app-database.ts`), and do not commit or push.

## Requirements
1. Loading state: the Tasks nav item renders with no badge and no error text (desktop sidebar and phone nav / More sheet, both render paths).
2. Failed fetch: same as loading — no badge, no error text. A retry may exist behind the scenes (the existing `useResource` retry), but it must not surface text in the badge slot.
3. Loaded count > 0: the badge shows the number (existing behaviour, keep it).
4. Loaded count 0: no badge.
5. Inbox badge behaviour is unchanged.
6. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log`, tokens only, logical RTL properties only, touch targets ≥ 48px, every user-facing string in `messages.ts` (ar/arStd/en), no emoji.

## Acceptance
- [ ] During load the sidebar Tasks item shows no badge and no "العدد مش متاح" anywhere on the page.
- [ ] With a failed count fetch the same holds.
- [ ] With 2 pending tasks the badge shows 2; with 0 it shows nothing.
- [ ] Desktop sidebar and phone nav both behave this way.
- [ ] `npm run check`, `npm run build` and `npx vitest run src/lib/perf-budget.test.ts` pass.

## Tests (deterministic, inject `now`, no real timers, no network)
- `captain-frame-nav.test.ts`: loading → no badge text; error → no badge text; count 2 → badge "2"; count 0 → no badge. Cover the desktop sidebar row and the phone nav path.
- `use-task-count.test.ts` (new if missing): loader returns loading, then a number, then an error, and the component states above follow from it.

## Out of scope
- Changing what the task count counts (that is T-429).
- The KO badge (T-429), the inbox badge, any other nav item.
- A live re-check on kochivo.site (not possible until deploy).

## Notes for reviewer
- The design audit (`docs/design-audit/02-captain-core.md`, desktop shell) already flagged this area: "Failed sidebar counts disappear visually → a blank badge can be read as no work waiting → distinguish unavailable counts from zero for all users." This card deliberately chooses the opposite, simpler behaviour the live review asked for (number or nothing), because the error string leaking into the UI is worse than a temporarily missing badge. If the owner wants an unavailable indicator later, that is a follow-up with its own design.

## References
- `src/features/roster/components/captain-frame-messages.ts:10` (`countUnavailable`)
- `src/features/roster/components/captain-frame-nav.tsx:18,36,39` (`useTaskCount`, frame-counts resource)
- `docs/design-audit/02-captain-core.md` (desktop shell, `/captain/*`)
