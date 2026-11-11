# T-172: Player forms tab: timeline and answer comparison

**Phase:** Captain suite (owner approval 2026-11-11) · **Depends on:** T-168 · **Status:** implemented; reviewer build pending

## Goal
The design is screen 2 («فورمز اللاعب») in `docs/mockups/captain-workspace/suite.html`.

Inside the player workspace, add a «فورمز» tab. It shows every form the player answered, newest first. The selected form's answers are compared with the previous form of the same kind. This card ships it for the forms that already exist: onboarding (`player_intake`) and weekly `check_ins`. Custom forms plug in later through the same adapter (T-178).

## Files
- `src/features/captain-workspace/` (new `forms/` subfolder or files), messages, tests.
- The workspace header tabs: add «فورمز», reachable via `?view=forms` on the existing programs route. Do not add a new route.
- `src/features/player-file/` only for new pure helpers (the `compareSnapshots` described below), with tests.
- This card.
- Reviewer-approved exception: `src/features/inbox/index.ts`, public re-exports only. `export { listInbox, reviewItem } from './data/inbox';` follows the messages export to match T-171; `mediaUrls` is also re-exported from its existing module.

## Requirements
1. **`compareSnapshots(current, previous)`** (pure). Per answered key it returns:
   - `{key, value, previousValue?, delta?, direction: 'better'|'worse'|'same'|'new'}`.
   - Direction rules: weight and waist are `better` when they move toward the target weight's direction. Injuries added are `worse`. Everything else is `same` or `new`.
2. **Timeline.**
   - At the top, an automatic weekly check-in card. For now it is a static fact: «every week», plus the latest due date if the data has it.
   - Under it, the list of forms with kind, date and status (new or reviewed), plus a one-line summary from `compareSnapshots`.
   - The selected item is highlighted. On the phone the list and the detail stack, and the detail opens on tap.
3. **Detail:**
   - Each Q/A row shows the previous value and a coloured delta (lime better, warn worse, muted same).
   - Check-in photos are shown as signed thumbnails, using the existing gallery signing (one `createSignedUrls` call).
   - An injury answer is highlighted as danger, with a button «شوف التمارين» that selects the training view.
4. **Reply.** The reply box and «اتراجع وابعت» reuse the existing check-in review action (`captain_reply`, `reviewed_at`). They are optimistic, with a rollback and a toast on error.
5. **States.** Empty («لسه مفيش فورمز»), loading and error states are required. Touch targets ≥ 48px.

## Acceptance
- [x] Unit tests for `compareSnapshots`: the weight direction for cut and bulk targets, a new injury, the same value, and a first form.
- [x] A test that the reply calls the existing review action and rolls back on failure.
- [x] Required local gates pass (TypeScript, ESLint, full Vitest fallback); the flag-off route tree and budget configuration are unchanged. The production build and measured flag-off budget are reviewer-owned under the approved junction exception.

## Out of scope
- Custom forms and requests (T-176…T-178).
- The «فكّره» reminder button: render it disabled with a tooltip, it is wired in T-178.
- Migrations.

## Implementation plan
- Add and test pure snapshot comparison in `player-file/`, including cut/bulk, waist, injuries, missing targets and first answers.
- Add `captain-workspace/forms/` adapters and authenticated loading for completed intake and all check-ins; compare only the same kind. Reuse existing signing and review actions through a public entry.
- Test optimistic review and rollback, then implement the responsive timeline, answer detail, photos and translated states.
- Select Forms with `?view=forms` inside the existing workspace; preserve the training view and flag-off route.
- Run every requested gate and inspect the scoped diff. Do not commit or change budgets.

## Implementation notes
- The flag-gated workspace reads `?view=forms` through a client view selector under the existing Suspense boundary. Forms loads lazily; the programs route and flag-off tree are unchanged and covered by tests.
- Completed intake and all check-ins load through paginated authenticated reads. Adapters compare only the previous form of the same kind, using intake target context without inventing answered fields. Desktop shows the latest detail; on phones, tapping a timeline row opens and focuses the stacked detail.
- Replies bind the existing `reviewItem` action. A shared submission lock prevents overlapping reviews; failure reconciliation also survives navigation and preserves newer authoritative reviews. Failures restore the old reply/status, retain the draft, and show an inline error and toast.
- Photos reuse `mediaUrls` and its single batch signing call. Automatic recovery ignores errors from the stale thumbnail batch. All new copy lives in `forms/messages.ts`.
- Check-ins have no structured injury or due-date columns. Intake injuries are displayed; notes are not interpreted as injuries, and no due date is invented.
- Independent code review found no remaining Critical or Important issues after the rollback regressions were fixed.
- No dependency, migration, build configuration, budget, queue, inbox route, branch or commit changes.
- Build is skipped by reviewer instruction because `node_modules` is a junction. The reviewer runs the production build and measured flag-off budget in the main tree. The budget test skips locally because build stats are absent; no ceiling was changed.

## Verification
- `npx tsc --noEmit -p .`: passed (exit 0).
- `npx eslint .`: passed (exit 0).
- `npx vitest run --maxWorkers=2 --configLoader native --pool=threads`: **479 passed | 1 skipped (480) files; 3434 passed | 1 skipped (3435) tests**. The skip is the build-dependent budget test. The run includes comparison, real action binding and signing, two-form locking, navigation rollback and newer-review preservation regressions.
- `npx vitest run src/lib/perf-budget.test.ts --maxWorkers=2 --configLoader native --pool=threads`: 1 skipped because no route bundle stats exist.
- Default Vitest commands hit Windows `spawn EPERM`; the supplied native/threads fallback above was used.
- `npm run check` / `npm run audit:release`: blocked by `spawnSync git EPERM` at the audit step. The same audit rules were run with paths supplied by shell `git ls-files --cached --others --exclude-standard -z`: **Release audit fallback: 1914 files, 0 findings**.
- `npm run build`: skipped as explicitly instructed by the reviewer. No build workaround or budget adjustment was made.
- `git diff --check`: passed. Every new source file is below 250 lines. No commit was created.
