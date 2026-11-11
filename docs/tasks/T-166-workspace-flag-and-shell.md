# T-166: Captain workspace behind a flag, shell and read-only plan

**Phase:** Captain workspace (owner approval 2026-11-11) · **Depends on:** T-165 · **Status:** implemented; reviewer verification pending

## Goal
Owner-approved redesign of the captain's player training screen. Mockups (read them first):
- `docs/mockups/captain-workspace/v4.html` (desktop)
- `docs/mockups/captain-workspace/v5-mobile.html` (phone)

Production must not change. Everything new sits behind a flag that is **off unless
`NEXT_PUBLIC_CAPTAIN_WORKSPACE === '1'`**. The owner sets it only in the Vercel Preview environment
(the `staging` preview).

This card builds the flag, the new feature, and the **read-only** layout:
- header and tabs;
- plan title and week strip;
- the day's exercise list.

Editing (T-169), the player file (T-167/T-168) and fit checks (T-170) come later. Leave clear slots for them.

## Files
- New `src/lib/captain-workspace-enabled.ts` + test (same pattern as `src/lib/ranks-enabled.ts`)
- New feature `src/features/captain-workspace/` (`index.ts`, `components/`, `hooks/`, `messages.ts`, tests)
- `src/app/[locale]/(captain)/captain/players/[playerId]/programs/page.tsx`: when the flag is on, render the
  workspace entry; when off, render exactly what it renders today. No other route changes.
- `docs/ARCHITECTURE.md` (one line for the new feature), this card

## Requirements
1. **Flag off = zero change.** Today's programs page and its imports are untouched when the flag is off.
   Add a test that renders the route's decision with the flag off and asserts the old `ProgramBuilder` path.
2. **Data:** reuse the existing program loading from `@/features/programs` through its public entry (export
   what you need from `programs/index.ts`, no deep imports). Do not change `programs` behaviour or its builder.
   Load the player's active, or latest draft, program as the current programs page does.
3. **Layout per the mockups, using tokens only** (`glass`, `glass-strong`, `bg-lime`, `text-muted`, …; no hex):
   - **Header:** breadcrumb (Players › name), tabs (Overview, Training, Nutrition, Check-ins, Payments) linking
     to the existing player routes/tabs, autosave status slot, one lime primary "Send to player" slot.
     The button can be inert in this card.
   - **Plan hero:** plan title, "week N of M" if the data has it, otherwise the plan type; a fit-score slot
     (empty placeholder component, T-170 fills it).
   - **Week strip:** 7 cells Sat→Fri from the program's weekdays.
     - A selected day has a lime underline.
     - Rest days are muted.
     - Each day shows sets and estimated minutes from `daySummary()` in `programs/summary.ts`, exported
       through the barrel.
     - Non-weekly programs show their day list in the same strip style.
   - **Day exercise list:** collapsed rows. Each row shows the exercise GIF/thumbnail from the existing
     exercise media helper, the name, the muscle/equipment, and the rep scheme "4 × 8-10" rendered LTR
     inside RTL text.
   - **Player-file slot:**
     - **Desktop (`lg:`):** a sticky start column 360px wide.
     - **Mobile:** a compact facts strip under the player name.
     - In this card it shows only name, age, current/target weight from the existing intake data, and a
       button that does nothing yet.
4. **Mobile first:**
   - Under `lg`, one column (`v5-mobile.html` screen 1): week cells compact, a fixed bottom bar with the
     primary action and a 56px add button.
   - Touch targets ≥ 48px.
   - Logical properties only.
5. Every string in `captain-workspace/messages.ts` (Egyptian Arabic + short English). Loading, error, and
   empty states (no program yet: an invitation to create one, linking to the existing creation flow).
6. Files ≤ 250 lines; one component per file; kebab-case.
7. **Tests:** flag parsing; route decision on/off; week strip mapping (weekly and non-weekly, rest days);
   LTR rep scheme rendering; empty/error states.

## Acceptance
Implementation plan (T-166 only): pin the flag and unchanged legacy route in tests; expose existing
program reads and summaries through the public barrel; build a server-loaded shell with a lazy
read-only day selector; verify Arabic/English states, weekday mapping and prescriptions; run all gates
and compare flag-off route gzip size. Preserve missing intake values and avoid fabricated week/fit data.

- [x] Flag off: the programs page renders byte-for-byte the same component tree as before (test).
- [ ] Flag on: the read-only workspace renders for a weekly and a non-weekly program on desktop and mobile widths.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npx vitest run`, `npm run build`,
  then `npx vitest run src/lib/perf-budget.test.ts` all pass. Report the captain programs route budget
  before/after (flag-off production bundle must not grow by more than 1 KiB).

## Out of scope
- Editing, autosave, sending (T-169); player file data and sheet (T-167, T-168); fit checks and KO (T-170).
- Any migration; the old `ProgramBuilder`; `src/app/globals.css`; `src/features/luxury-preview`.

## Implementation notes (2026-11-11)
- Existing program reads and `daySummary` are exported from `programs/index.ts` as explicitly allowed
  by requirement 2. The builder and data implementations are unchanged.
- Weekly program weekdays use Saturday = 0. Active programs take precedence; otherwise the first
  draft in the existing newest-first list is used. Archived programs are not current plans.
- The current program model has no current/total week fields, so the hero shows the plan type.
- Payments opens the existing profile intake view, which already includes the player's billing panel.
  Empty plans link to the existing template creation/assignment flow.
- Sending, adding, player-file and fit-score controls remain slots for the later cards.
- Desktop/mobile visual verification remains pending: Playwright's installed Edge launch reports
  `spawn EPERM`, and the computer-use browser host is unavailable.
- The mobile action bar clears the existing feedback/KO launchers without changing either feature.
- Read-only code review found no remaining implementation blockers after that clearance fix.

### Verification results
- `npx tsc --noEmit -p .`: exit 0. `npx eslint .`: exit 0. `git diff --check`: exit 0.
- Full Vitest fallback: `Test Files 461 passed (461)`; `Tests 3312 passed (3312)`.
- Final scoped tests including the post-build budget: `Test Files 6 passed (6)`; `Tests 25 passed (25)`.
- Release audit fallback: `1848 tracked and untracked files, 0 findings`.
- Full worker-thread build with flag explicitly `0`: compiled successfully; TypeScript finished;
  static generation and page optimization completed, exit 0. No checks were skipped by that fallback.
- Flag-off captain player programs route: **299,738 → 299,517 gzip bytes**
  (**292.71 → 292.50 KiB**, **−221 bytes**), measured from each completed build's
  `route-bundle-stats.json` with the budget test's per-chunk gzip method. Budgets are unchanged.

### Windows gate fallbacks
The standard Vitest commands fail loading config with `spawn EPERM`. Use the requested fallback:
`npx vitest run --maxWorkers=2 --configLoader native --pool=threads` (and the same options for the
post-build `src/lib/perf-budget.test.ts` invocation).

`npm run check` reaches the release audit after typecheck/lint, then fails at `spawnSync git EPERM`.
`npm run audit:release` fails at the same call. The fallback feeds PowerShell's
`git ls-files --cached --others --exclude-standard` output into the existing `scanFile`/`scanRoutes`
functions, preserving forbidden-env handling and also checking the new untracked files.

`npm run build` compiles but fails at the TypeScript subprocess (`spawn EPERM`). The following
in-memory worker-thread fallback runs the full build, including TypeScript and static generation,
without modifying Next config. Pipe it into `node` through stdin (not `node -e`):
```js
process.env.NEXT_PUBLIC_CAPTAIN_WORKSPACE = '0';
const c = require('next/dist/server/config-shared');
c.defaultConfig.experimental.workerThreads = true;
c.defaultConfig.experimental.useTypeScriptCli = false;
require('next/dist/cli/next-build').nextBuild(
  { mangling: true, experimentalBuildMode: 'default' }, process.cwd(),
);
```
