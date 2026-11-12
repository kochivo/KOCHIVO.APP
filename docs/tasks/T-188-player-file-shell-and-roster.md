# T-188: One player file and the new players list (mockup v6, screens ٧ and ٨)

**Phase:** Captain workspace v6 (owner approval 2026-11-12: "نفس الشكل 100%") · **Depends on:** T-187 · **Status:** implemented; reviewer verification pending
**Migration:** none. **Flag:** everything here is behind `captainWorkspaceEnabled()`. Flag off stays byte-identical (test).

## Goal
Today a player has two pages: the old profile page (البيانات، التطور، الخطة، المتابعات، التحليل، الجاهزية) and the new workspace that only opens from «البرامج» or «الأكل», which has its own tabs. The owner wants **one** player file that looks exactly like mockup screen ٨, and a players list that looks exactly like screen ٧. This card also creates the shared UI parts the next three cards reuse.

Read first: `docs/mockups/captain-workspace/v6-owner-review.html` (screens ٧ and ٨) and `docs/mockups/captain-workspace/v6-spec.md`.

## Files
- New shared UI in `src/ui/`: `underline-tabs.tsx`, `fact-row.tsx`, `save-status.tsx` (plus tests and their `messages.ts` strings), as described in `v6-spec.md`.
- `src/features/roster/` (players list screen, filters, row, row menu, join requests filter) and tests.
- `src/features/coach-page/` only where the join-requests list is rendered, so it can show inside the new filter.
- `src/features/captain-workspace/` (new `player-file/` folder for the shell: header, tabs, overview tab, check-ins tab) and its entry exports.
- `src/features/player-profile/` read-only reuse: data loaders and existing analysis/readiness/progress components may be imported through its public entry and restyled by wrapping. Do not change player-profile behaviour for flag off.
- Routes (thin): `src/app/[locale]/(captain)/captain/players/[playerId]/page.tsx`, `.../programs/page.tsx`, `.../nutrition/page.tsx`, and new `.../assessments/page.tsx` and `.../checkins/page.tsx` (each: flag off → current behaviour or `notFound()` for the new ones; flag on → the shell with the matching tab).
- This card.

## Requirements
1. **Players list = screen ٧.**
   - Header: «اللاعبين», subline «{active} لاعب نشط · {free} أماكن فاضية في باقتك» (from the existing plan limit data), primary «ضيف لاعب» (opens the existing invite flow).
   - Filter chips with counts: نشطين، محتاج برنامج، متأخرين، اشتراكه هيخلص، and «طلبات انضمام» in lime **only when there is at least one request**. Choosing it shows the existing join requests list in place of the table. No join-requests card under the table anymore.
   - Search field in the same row.
   - Table columns: اللاعب (avatar, name, small goal · level), آخر تمرين، الخطة (program title + small line that says what is missing, e.g. «مفيش نظام أكل لسه»), الاشتراك («باقي {n} يوم»), and a ⋯ menu (شوف كلاعب، أرشفة).
   - **The whole row opens the player file.** Remove the per-row «البرامج / الأكل / شوف كلاعب» links.
   - Empty, loading and error states per `v6-spec.md`.
2. **Player file shell = screen ٨ header and tabs**, used by every tab:
   - Header: avatar, breadcrumb «اللاعبين ‹», name, status chip, «باقي {n} يوم» + small «جدّد» (existing renew flow), «شوف كلاعب».
   - Underline tabs in this order: نظرة عامة · التمرين · الأكل · التقييمات · المتابعات. Each tab is its own route (above), so links and back button work.
   - Replace the workspace's current own header/tabs with this shell. The التمرين and الأكل tabs keep their current content for now (T-189 and T-190 redesign them); التقييمات shows the existing player forms tab content (T-191 redesigns it).
3. **نظرة عامة tab = screen ٨ body.**
   - Three status cards: التمرين / الأكل / التقييمات, each with title, one line, and one button. The card for whatever is missing gets the warn border and the **only** primary button on the screen (e.g. «اعمل نظام أكل»). If nothing is missing, no card is primary.
   - «بياناته» card with fact rows: الهدف، الوزن · الطول · السن، الخبرة، أيام التمرين، إصابات · حالات طبية · حساسية (and any other intake facts the old «البيانات» tab shows, as more fact rows).
   - «التطور» card with tiles (الوزن with bar to goal, الالتزام this week). Anything else the old «التطور» tab shows (charts, photos, history) goes below as more cards built per `v6-spec.md`.
   - The old big green renew card is gone (renew is in the header).
4. **المتابعات tab** (not in the mockup, same system): check-ins list, then «التحليل» and «الجاهزية» sections from the old page, each restyled as `v6-spec.md` cards. Keep all their data and behaviour.
5. Old «الخطة» tab content is covered by التمرين and الأكل; drop it under the flag.
6. Create `underline-tabs`, `fact-row` and `save-status` in `src/ui/` exactly as `v6-spec.md` says, and use them here.
7. Copy every Arabic string from the mockup exactly. `ar` + `en` only; do not touch `arStd`.

## Acceptance
- [ ] Flag on: screens match mockup ٧ and ٨ at 1440×900 and 390×844 (differences listed with reasons).
- [x] Flag off: players list and player page byte-identical (tests).
- [x] Row click opens the file; join requests filter appears only with requests.
- [x] Every old tab's information is reachable in the new file (see Feature inventory).
- [x] Unit tests for filters/counts, "what is missing" logic and the primary-card choice.
- [ ] All gates pass; route budgets unchanged.

## Out of scope
- Content of the التمرين (T-189), الأكل (T-190) and التقييمات (T-191) tabs.
- Database changes.

## Feature inventory

| Current feature / data / state | Destination |
|---|---|
| Player search, clear-search/filter action, all/late/ending filters, avatars, names, last activity, program, subscription date | Screen ٧ searchable roster, counted filters, empty-result reset button, row and subscription detail |
| Invite flow, captain first name, demo restriction, empty onboarding instructions | Screen ٧ primary invite action and existing invite sheet |
| Archive confirmation, optimistic removal, rollback, per-player error | Row overflow menu, same archive action |
| Pending activation, freeze/unfreeze, session balances, renewal | Player-file header billing control opens existing billing manager |
| Open task count | Roster player cell |
| Join requests, accept/decline, optimistic rollback, activation after acceptance, errors | Counted join-requests filter; existing list |
| Plan usage and capacity | Roster header capacity subline |
| Profile avatar/name, breadcrumb, player preview, WhatsApp | Unified file header |
| Intake: age, sex, height, weight, target, experience, training days, duration, injuries, medical, allergies, notes | Overview facts; missing intake reminder retained |
| Weight summary/change/to-target, weight/body-fat charts, photos and photo errors, InBody scans, missing-data reminders | Overview progress cards below summary tiles, built per v6-spec |
| Active program/nutrition summaries and links, builder, calculator, workspace facts/history, mobile actions | Training and food routes, existing content retained |
| Captain supplements: list, assign/edit/remove, loading and mutation errors | Food route below the existing content; existing supplements component loaded separately |
| Forms timeline/details, review, answers, photos and recovery | Assessments route, existing forms content |
| Check-in dates, review status, weight/waist, notes/replies, inbox action, reminders, voice notes | Check-ins route, existing list then analysis/readiness cards |
| Muscle analysis and readiness data, loading/empty/error states | Check-ins route sections, built per v6-spec |
| Legacy profile tabs and roster rendering | Unchanged flag-off branches |

## Implementation plan

1. Add tested shared underline tabs, fact rows and save status with ar/en messages.
2. Add deterministic roster filter/count and missing-card choice tests, then implement their models.
3. Add flag-on roster entry with bulk metadata/capacity reads and join-requests filter; preserve legacy branch.
4. Add shared routed player-file header, overview and check-ins; reuse existing content through public entries.
5. Verify all requested gates and document visual verification limits and feature destinations.

## Public entries and file map

- `src/ui/underline-tabs.tsx`: route links, one current page, underline selection; `fact-row.tsx`: definition rows with hairlines; `save-status.tsx` and `save-status/messages.ts`: saved/saving/error/retry in ar/en. Shared-part tests are in `v6-parts.test.ts`.
- `roster/components/roster-screen-entry.tsx`: server flag gate. The legacy screen and row remain unchanged. `roster/v6/roster.tsx`, `player-row.tsx`, `types.ts`, and `messages.ts`: v6 roster, full-row link, native overflow menu, request-filter composition, optimistic archive and reset action. `data/v6-roster.ts`: cached existing roster/plan reads plus bulk metadata reads. Models and tests cover filters, counts, HTML parity, list states, metadata errors and no N+1 reads.
- `coach-page/components/join-requests.tsx`: suppresses the old card under the flag. The existing list gains an optional successful-resolution callback so the chip count updates while final-request activation stays mounted. Its entry and loader are exposed through the existing public barrel.
- `captain-workspace/player-file/file-entry.tsx`, `file-content.tsx`, `file-header.tsx`, `file-state.tsx`, and `types.ts`: streamed shell, header, route tabs and states. **Import `PlayerFileEntry` from `@/features/captain-workspace/server`.** The existing training `WorkspaceEntry` remains in the primary public entry; isolating these public entries keeps training-builder chunks out of food and inbox routes.
- `load-summary.ts`, `profile-data.ts`, and `read-player-file.ts`: authorized existing profile/file reads, request-local reuse, subscription, workout adherence and assessment summary. No schema changes or player-write changes.
- `overview.tsx`, `overview-facts.tsx`, `status-cards.tsx`, `progress-summary.tsx`, `progress-history.tsx`, `model.ts`, and `messages.ts`: overview cards, all intake facts/history, primary-card choice and preserved progress data.
- `checkins.tsx`, `checkin-list.tsx`, `profile-section.tsx`, `reminder.tsx`, `voice-entry.tsx`, and `voice-content.tsx`: check-ins, existing replies/inbox actions, voice reminders/recorder focus, analysis and readiness sections.
- `assessments-entry.tsx`, `deferred-section-entry.tsx`, `progress-media-entry.tsx`, `supplements-entry.tsx`, `billing-entry.tsx`, and `plan-context.tsx`: existing content/components behind loading boundaries; preserve forms, charts/photos, scans, supplements and billing controls. `player-profile/` is entirely unchanged.
- Existing profile/programs/nutrition routes select the shell under the flag. New assessments/checkins routes return `notFound()` with the flag off. Their companion loading files satisfy the mandatory route-loading gate. Old profile-tab and `view=forms` URLs redirect to the matching new route.

## Verification and Notes for reviewer

- Automated scope checks: no dependency, budget, schema, standard-Arabic, player-profile, dashboard, inbox, billing, settings or player-app source changes. No commit, push or branch created. All new feature files are below 250 lines.
- Browser verification at 1440×900 and 390×844 is **not complete**: `npm run dev -- --hostname 127.0.0.1 --port 3188` hit `spawn EPERM`; direct `startServer()` also reached `spawn EPERM`. Playwright Chromium is absent; launching installed Edge with `channel: 'msedge'` also hit `spawn EPERM`. The mockup markup was read in full for screens ٧ and ٨, plus the follow-up screen in `v6-rest.html`.
- Intended differences to review visually: tabs wrap and cards stack on small screens to maintain 48px targets/no page overflow; WhatsApp, sex, notes, data history, full progress/history/photos/scans, voice notes and plan metadata remain as extra v6 cards/actions because existing features cannot disappear. Status dates/titles/numbers use real data rather than sample literals. Missing food targets are not invented; the existing calculator remains available in the food tab. Renew opens the existing subscription controls, which retain activation, renewal and freeze/unfreeze.
- “نشطين” includes all non-archived roster relationships, preserving access to expired/pending/frozen players. Their subscription state and session balances are in the file header and billing controls.
- Existing billing behavior noticed out of scope: its renewal manager closes the renewal sheet before the save completes; this card reuses it unchanged. Training/food/assessment content redesign remains T-189/T-190/T-191.
- `npx tsc --noEmit -p .` and `npx eslint .` pass. `npm run check` reaches the release audit, then the normal audit cannot spawn Git (`spawnSync git EPERM`). The same `scanFile`/`scanRoutes` rules were run with `git ls-files --cached --others --exclude-standard` supplied through a shell pipe, including all new files: **0 findings**.
- Final focused verification: **Test Files 56 passed (56); Tests 316 passed (316)** with `npx vitest run src/features/captain-workspace src/features/roster src/features/coach-page src/ui/v6-parts.test.ts src/lib/shared-surface-imports.test.ts --maxWorkers=2 --configLoader native --pool=threads`.
- Normal `npx vitest run` cannot load its default config because of `spawn EPERM`; tests use the brief's exact fallback: `npx vitest run --maxWorkers=2 --configLoader native --pool=threads`.
- Final full fallback suite summary: **Test Files 3 failed | 561 passed (564); Tests 6 failed | 3758 passed (3764)**. The six failures are precisely the four standard-Arabic assertions and two out-of-scope nutrition-route fixtures described below. All offline/RLS tests pass. The roster reset regression test was included in this run.
- Standard-Arabic failures are intentionally left for reconciliation: `src/core/i18n/coverage.test.ts` requires arStd for the three new message files, and `dictionary-gating.test.ts` requires complete standard dictionaries. The brief explicitly forbids adding/editing arStd or `standard/`.
- `src/features/meal-plans/components/calculator-route.test.ts` has two old flag-on fixtures expecting the former root component and no mock for the new server shell. The new T-188 route tests verify the shell and retained calculator/plan child; the out-of-scope meal-plans tests were not edited.
- Normal `npm run build` compiles successfully but its spawned TypeScript CLI fails with `spawn EPERM`. A completed production build, including all 61 static pages and the new dynamic routes, was obtained with the following temporary **in-memory** worker/API type-check fallback (no config file edits):

  ```powershell
  $env:NEXT_PUBLIC_CAPTAIN_WORKSPACE='1'
  node -e "process.execArgv=[];const c=require('next/dist/server/config-shared').defaultConfig;c.experimental.useTypeScriptCli=false;c.experimental.workerThreads=true;process.argv=['node','next','build'];require('next/dist/bin/next')"
  ```

- The post-build budget gate passes with its ceiling unchanged: `npx vitest run src/lib/perf-budget.test.ts --maxWorkers=2 --configLoader native --pool=threads`. Measured gzip KiB: roster 230.96; overview/assessments/checkins 244.60; training 305.87; food 307.64; inbox 253.47 (captain ceiling 310).
