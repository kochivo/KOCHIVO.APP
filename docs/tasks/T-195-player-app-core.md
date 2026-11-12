# T-195: Player app core screens (mockup v6-rest: «تطبيق اللاعب»)

**Phase:** Player app v6 (owner: "100% UI/UX and backend") · **Depends on:** T-187 · **Status:** ready
**Migration:** none expected. **Flag:** behind `captainWorkspaceEnabled()` (the new player look ships with the captain workspace); flag off byte-identical, except the T-187 check-in fix which is already live.

Read first: `docs/mockups/captain-workspace/v6-rest.html` (screen «تطبيق اللاعب», five phones) and `docs/mockups/captain-workspace/v6-spec.md`. The player app is mobile-first: verify at 390×844 and 375×812, and make sure desktop (centred column, as today) still looks right.

## Files
- `src/features/player-shell/` (bottom nav: الرئيسية، الأكل، تطوري، الكابتن; header with bell and avatar; sync indicator).
- `src/features/player-home/` (home), `src/features/workout/` (workout day screen), `src/features/nutrition/` (player food day), `src/features/progress/` (تطوري), `src/features/voice-notes/` + `src/app/[locale]/(player)/player/captain/page.tsx` (الكابتن), and tests.
- Thin player routes for these pages. Messages (`ar`/`en` only). This card.
- Do **not** edit onboarding, readiness sheet, workout finish, assessment answer flow, ranks, body-scans, supplements, notifications or player settings (T-196 owns them); link to them as they are.

## Requirements
1. **الرئيسية:** date line, «صباح الخير يا {name}», a small synced indicator and the week counter («ابدأ النهارده | 0 من 3 الأسبوع ده») in the header; one primary card = the current next task (today's workout «ابدأ التمرين» / continue / meal / check-in / waiting from T-187); «جاوب على سؤالين الصبح» row; two tiles الأكل (meals done / total) and المية (litres / goal, tap to add 250 مل); 7-day strip. Keep everything the current home has (voice note banner, rest day, tomorrow preview, streak).
2. **التمرين:** top bar with back, «{day} · {n} من {total}», timer; exercise name (English), small line (muscle · sets × reps · rest · last time), image/video; set rows with big weight and reps boxes and a big done button (≥56px), current set highlighted lime; rest timer card. Keep: exercise list («الحركات»), history («السجل»), swap/alternatives, notes, RIR/failure, video, offline logging through `saveAndQueue()`.
3. **الأكل:** «أكلك النهارده», two strong tiles (سعرات، بروتين), meals list with big tick boxes and food lines, captain note card. Keep: meal swaps, extra food logging, day type (training/rest), supplements entry point (T-196 styles the supplements card), offline.
4. **تطوري:** weight card with chart and «نزلت … · فاضل … للهدف», pending assessment card with primary «جاوب», rank card (links to T-196 rank screen), «سجل تماريني». Keep: photos before/after, measurements, check-in history and captain replies, InBody entry point.
5. **الكابتن:** captain header with reply-time hint, latest voice reply with player and text, upcoming assessments, «اسأل الكابتن» text + mic. Keep every current captain page feature.
6. Feature inventory per `v6-spec.md` for all five screens.
7. Copy every Arabic string from the mockup exactly. `ar` + `en` only.

## Acceptance
- [ ] Matches the five phones at 390×844 (and sane on desktop), differences listed.
- [ ] Feature inventory, nothing dropped.
- [ ] Offline: logging a set and ticking a meal offline then syncing still works (tests).
- [ ] Unit tests for new derived values (week counter, tiles, primary card choice).
- [ ] Flag off byte-identical; all gates pass; budgets unchanged (player routes are budget-sensitive: lazy-load charts and media).

## Feature inventory

Inventory from the current components, before implementation:

| Screen | Existing feature/data/action/state | Destination |
|---|---|---|
| Shell | Four navigation destinations and active state; notification bell; settings; install button/sheet; feedback; development KO preview | Four mockup destinations; bell/avatar header; existing install/feedback/KO controls retained |
| Shell | Per-user local database, sync runner, offline warning, parked retry, captain context refresh, subscription ending/ended/archived warning, WhatsApp renewal, loading/error/retry, no-captain and pending/frozen waiting room | Existing shell lifecycle and access guards retained |
| Home | Cairo/profile date, time-sensitive named greeting, avatar progress ring, streak/week counter, streak detail sheet, rank chip, sync status and retry | Date/greeting/week header; streak sheet and rank retained |
| Home | Intake/start/continue/meal/check-in/unheard voice/done/waiting task priority, tomorrow preview, remote-error offline fallback, loading/error/retry | Single primary task card; separate unheard voice banner retained |
| Home | Readiness decision/reduction/rest, water, morning questions, rest mood, stretch and tomorrow hint | Morning row opens existing readiness content; water tile; rest content retained |
| Home | This/next week strip, selectable past/future dates, completion dots, day preview, weekly rest, program expiry, exercise/set/time counts, train anyway, cardio, missing-program contact | Seven-day strip plus existing date preview and workout details below it |
| Home | Today/past/future nutrition summaries, nullable targets, next meal, completed counts, stale cached data, loading/error/empty/contact; pending assessments | Food tile and retained selected-day summary; pending assessments retained |
| Workout | Back, sync/parked retry, media status, reduced-day banner, set progress, lazy PR celebration and finish/feedback | Mockup top bar/set rows; existing completion components unchanged |
| Workout | Exercise names, target ranges/failure/RIR, last-time sets, image/lightbox, video, exercise history | Exercise heading/media and detail links; English name in v6 |
| Workout | Set edit, last-time prefill, weight/reps steppers, bodyweight toggle, validation/focus, done/busy, offline queue, cross-midnight recovery | Large current-set row, completed rows/edit, controls and validation retained |
| Workout | Rest announcement, extend/skip/sound/flash, wake lock, next exercise, form-check upload, cardio; loading/error/empty/expired | Rest card and existing supporting sections retained |
| Nutrition | Plan title, sync/parked retry, stale refresh, kcal/protein/carbs/fat totals and fallback targets | Two strong kcal/protein tiles; secondary carbs/fat retained |
| Nutrition | Meal/item order, food photos/name/grams, alternative cycling, macros, eaten/undo/busy/error, optimistic local logging | One meal list with large checkboxes and expandable food/swap details |
| Nutrition | Loading/error/retry, missing plan/meal empty/contact, supplements | Existing states and supplements entry retained |
| Progress | Workout history link; main-lift selection, top-weight chart, local strength error/retry/empty | History row and secondary strength section |
| Progress | Weight/waist/body-fat charts, four-week deltas, check-in loading/error/retry/empty, weekly sent state | Weight card first; measurements and existing states retained below main cards |
| Progress | Before/after gallery, measurement table, pose/week comparison, check-in history/text/audio captain replies, check-in sheet/photos, muscle analytics and InBody | Existing gallery/history/entry points retained without changing answer flow |
| Captain | Captain name/avatar, bio/location/social links, subscription state/start/end, validated WhatsApp link, missing phone state, loading/error/retry/empty | Captain header plus secondary profile/contact card |
| Captain | Voice list, signed audio playback, duration/date/unheard state, listened mutation, playback error, empty/check-in action, load error/retry | Voice replies before secondary profile card; existing audio behavior retained |

## Implementation plan

- [x] Add deterministic tests for v6 derived home tiles/task presentation and offline set/meal replay.
- [x] Implement flag-gated shell/header and home composition; retain flag-off markup.
- [x] Implement flag-gated workout set rows and food summary/list using existing writes.
- [x] Reorder progress and captain sections to match the mockup; preserve secondary features and lazy charts/media.
- [ ] Run all requested gates and inspect mobile layouts at 390×844 and 375×812 plus desktop; record differences and backend gaps.

## Backend findings awaiting scope decision

- Existing meal_logs stores assigned meal completion/swaps only; no extra-food record payload exists.
- nutrition_plans has no captain-note column or separate training/rest targets in the current snapshot.
- voice_notes insert assigns captain_id to the authenticated sender and is designed for captain-to-player audio. There is no player question inbox table in the current feature.
- No reply-time SLA is stored. The mockup's “بيرد عادة خلال يوم” cannot be presented as a measured captain promise without a product decision.

## File-by-file implementation record

Paths below are relative to `src/features/` unless stated otherwise.

| File | Change |
|---|---|
| `player-shell/components/player-shell.tsx` | Flagged account avatar icon and flat bottom navigation styling; existing lifecycle/access guards retained |
| `player-shell/nav.ts` | Flagged exact food/progress labels |
| `player-shell/messages.ts` | Egyptian/English navigation/account strings only |
| `player-shell/components/captain-screen.tsx` | Captain header, voice replies, assessments, question row, expandable existing profile/contact/subscription information |
| `player-shell/components/captain-question.tsx` | Question draft and explicitly labelled WhatsApp text/audio entry points; no in-app message storage claimed |
| `player-shell/question-messages.ts` | Egyptian/English question controls and external-app explanation |
| `player-shell/components/player-assessments.tsx` | Pending assessments with due dates, loading/empty/error/retry states and answer links |
| `player-shell/components/player-assessments-entry.tsx` | Flagged lazy public boundary |
| `player-shell/data/player-assessments.ts` | One bounded pending-assessment query under existing player RLS |
| `player-shell/v6-messages.ts` | Assessment and captain-header copy; reply-time text is the owner-approved generic hint, not measured telemetry |
| `player-shell/index.ts` | Public assessment entry export |
| `player-home/components/home-screen.tsx` | New task/morning/tile composition; existing previews, rest controls, secondary workout/nutrition information retained |
| `player-home/components/greeting.tsx` | Removes the extra greeting avatar only for v6; date, timed greeting, streak counter and sheet retained |
| `player-home/components/next-task-card.tsx` | Flagged task-specific actions and workout/time summary |
| `player-home/components/next-task-slot.tsx` | Supplies real workout summary; separate unheard-voice banner and coached-rest input |
| `player-home/components/morning-row.tsx` | Mockup morning row opens unchanged readiness content |
| `player-home/components/home-tiles.tsx` | Food completion and water tiles using existing local meal/daily-check data |
| `player-home/components/week-strip.tsx` | Compact seven-day dots; retains selectable dates and week paging in disclosure |
| `player-home/data/add-water.ts` | Transactional 250ml addition to existing daily_checks/saveAndQueue contract; explicit timezone and stable ID |
| `player-home/data/program-snapshot.ts` | Flagged body-part read/cache for offline exercise headers; old snapshot shape/query retained with flag off |
| `player-home/next-task.ts` | Optional rest-day suppression of workout primary task; default behavior unchanged |
| `player-home/v6-summary.ts` | Pure tile and primary-card presentation derivations |
| `player-home/messages.ts`, `player-home/v6-messages.ts` | Egyptian/English home copy only |
| `workout/components/focus-screen.tsx` | Flagged exercise counter, timer, set rows, exercise-list/history entries; existing finish flow unchanged |
| `workout/components/set-rows.tsx` | Editable current-set inputs, completed-set editing, 56px done controls, bodyweight and validation |
| `workout/components/workout-clock.tsx` | Elapsed clock from actual first-set session start |
| `workout/components/exercise-header.tsx` | Flagged English exercise name, prescription/rest, large media and captain notes |
| `workout/components/exercise-lightbox.tsx` | Optional large image with existing reduced-motion protection |
| `workout/components/rest-panel.tsx` | Compact flagged rest timer retaining extend/skip/sound controls |
| `workout/v6-messages.ts` | Egyptian/English workout copy |
| `workout/exercise-muscle.ts` | Guarded muscle metadata reader tolerant of older cached snapshots |
| `nutrition/components/nutrition-screen.tsx` | Flagged title, two macro tiles and unified meal list; existing supplements retained |
| `nutrition/components/macro-tiles.tsx` | Strong calorie/protein tiles, over-target warning and retained carbs/fat totals |
| `nutrition/components/day-type.tsx` | Training/rest label derived from actual cached schedule and logged sessions |
| `nutrition/components/meal-card.tsx` | Flagged large tick/food summary; original photos, macros, swaps and completion controls in disclosure |
| `nutrition/v6-messages.ts` | Egyptian/English nutrition copy |
| `progress/components/progress-screen.tsx` | Flagged weight/assessment/rank/history order; all existing measurements, galleries, replies, analytics and InBody retained |
| `progress/components/weight-overview.tsx` | Lazy weight chart, real baseline/goal, initial-read error/retry |
| `progress/components/rank-overview.tsx` | Existing rank policy/points query with real next-tier progress and rank link |
| `progress/data/weight-goal.ts` | Existing intake baseline/target query |
| `progress/weight-summary.ts` | Pure loss/gain/remaining-goal calculations |
| `progress/v6-messages.ts` | Egyptian/English progress copy |
| `voice-notes/components/player-voice-notes.tsx` | Flagged context-reply text loading alongside existing audio; listened state retains reply text |
| `voice-notes/components/voice-note-list.tsx` | Optional actual captain text below related recording; captain-side callers unchanged |
| `voice-notes/data/player-replies.ts` | Batched context reads from existing check-ins/form requests, no per-note queries |
| `player-home/v6-summary.test.ts` | Week counter, distinct eligible meal counts and primary-action derivation |
| `player-home/v6-snapshot.test.ts` | Offline muscle cache and unchanged flag-off snapshot shape |
| `player-home/next-task.test.ts` | Regression: coached rest does not offer starting a workout |
| `player-home/water-sync.test.ts` | Concurrent taps, morning-answer preservation, Cairo midnight and queued water replay |
| `player-home/v6-flag-off.test.ts` | Eight byte-level rendered-markup hashes recorded from original HEAD components, then verified against modified flag-off components |
| `nutrition/offline-workout-meal.test.ts` | Real IndexedDB set/meal writes, network failure, reload, ordered replay and no duplicate resend |
| `nutrition/macro-tiles.test.ts` | Macro visibility and over-target warning |
| `workout/set-rows.test.ts` | Current/completed set controls, rest blocking and validation |
| `workout/exercise-muscle.test.ts` | New, old and malformed cached metadata |
| `workout/exercise-lightbox.test.ts` | Regression for reduced motion in large image mode |
| `progress/weight-summary.test.ts` | Loss/gain/missing-goal calculations |
| `progress/weight-overview.test.ts` | Regression for failed initial check-in fetch |
| `docs/tasks/T-195-player-app-core.md` | Inventory, plan, file record, verification and explicit acceptance gaps |

## Notes for reviewer / acceptance gaps

**This implementation is not ready to mark T-195 complete.** No dependencies, budgets, schema, core offline files, standard Arabic files, captain features, or shared UI files were changed. No commit/branch/push was made.

- Scope clarification was requested for missing backend capabilities; no expanded-file authorization received during implementation. Extra-food logging, stored nutrition captain note and configurable nutrition training/rest targets remain unimplemented. They were not features of the original nutrition screen.
- The question row explicitly opens the existing captain WhatsApp contact for text/audio. It is not the mockup's in-app player message/mic backend; a missing contact shows an explanation and disabled mic.
- The original workout snapshot contained no muscle field. V6 now caches the existing exercises.body_part field during refresh; older caches omit that line until refreshed. There is no current player exercise-swap/alternative list or mutation to preserve; that requested capability remains absent. Original history, RIR/failure target, notes, video, edit, prefill, form-check and cardio features remain.
- Mockup additions use real data rather than the sample player, exercises, meals, week/assessment counts, timestamps and rank thresholds. Rank policy remains the existing one.
- Extra existing features stay below the primary mockup sections or in disclosures: morning readiness panel, food photos/swaps, workout steppers, week paging, captain contact/subscription details. Measurements retain their original weight/body-fat/four-week views below the new weight overview.
- The clock starts with the first logged set, preserving the existing rule that opening a workout does not create a training session.
- Browser verification at 390×844, 375×812 and desktop could not run: Playwright Edge launch fails with `spawn EPERM`. Mockup markup was read. Exact visual equivalence is unverified.
- `npm run build` fails because Turbopack cannot resolve linked `node_modules/next` outside the worktree root. `npm run build -- --webpack` also fails, with `spawn EPERM`. No build configuration was changed.
- `npm run check` reaches the release audit after successful typecheck/lint, then fails with `spawnSync git EPERM`. `npm run audit:release` fails at the same subprocess. A shell-git fallback invoking unchanged `scanFile`/`scanRoutes`, including untracked files, reports 0 findings.
- Default `npx vitest run` and `npx vitest run src/lib/perf-budget.test.ts` fail at config loading with `spawn EPERM`. The requested fallback is `npx vitest run --maxWorkers=2 --configLoader native --pool=threads`; the performance test with those same flags skips because no successful build produced route stats. Budgets are unchanged, not verified.
- Standard-Arabic coverage currently reports player-home 95/100 and player-shell 39/42. Only ar/en additions were made as instructed; reviewer reconciliation is required. No coverage test was disabled or relaxed.

## Final verification summary

- `npx tsc --noEmit -p .`: exit 0.
- `npx eslint .`: exit 0.
- `npm run check`: typecheck and lint pass; audit subprocess fails with `spawnSync git EPERM`.
- `npm run audit:release`: blocked by the same `spawnSync git EPERM`; shell-git fallback using the original audit rules reports `Release audit (shell git fallback): 2212 files, 0 findings`.
- `npx vitest run`: blocked at config loading by `spawn EPERM`. Final requested fallback (`npx vitest run --maxWorkers=2 --configLoader native --pool=threads`): `Test Files 1 failed | 563 passed | 1 skipped (565)`; `Tests 2 failed | 3742 passed | 1 skipped (3745)`. Both failures are the standard-Arabic coverage cases identified above.
- `npm run build`: fails resolving linked Next.js outside Turbopack's worktree root. `npm run build -- --webpack`: fails with `spawn EPERM`.
- `npx vitest run src/lib/perf-budget.test.ts`: blocked at config loading by `spawn EPERM`; adding `--maxWorkers=2 --configLoader native --pool=threads` runs but reports `Test Files 1 skipped (1)` / `Tests 1 skipped (1)` because no route build stats exist.
- Playwright Edge: `browserType.launch: spawn EPERM`; no mobile/desktop screenshot signoff.
- `git diff --check`: clean. Review's two regressions (initial weight-read failure and large-image reduced motion) are fixed and covered by passing regression tests. Subsequent metadata/day-type review found no further actionable bug.
