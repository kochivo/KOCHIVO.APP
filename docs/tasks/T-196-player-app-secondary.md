# T-196: Player app secondary screens (mockup v6-rest: «تطبيق اللاعب ٢»)

**Phase:** Player app v6 (owner: "100% UI/UX and backend") · **Depends on:** T-195 · **Status:** ready
**Migration:** none expected. **Flag:** behind `captainWorkspaceEnabled()`; flag off byte-identical.

Read first: `docs/mockups/captain-workspace/v6-rest.html` (screen «تطبيق اللاعب ٢», eight phones) and `docs/mockups/captain-workspace/v6-spec.md`. Use the player shell from T-195.

## Files
- `src/features/onboarding/` (player intake), `src/features/readiness/` (morning questions), `src/features/workout/` finish screen only, `src/features/forms/` player answer flow only (`answer-flow`, `answer-entry`, `player-form-page`, `pending-forms`), `src/features/ranks/`, `src/features/body-scans/`, `src/features/supplements/`, `src/features/notifications/`, player part of `src/features/settings/`, and tests.
- Thin player routes for these pages. Messages (`ar`/`en` only). This card.

## Requirements
1. **أول مرة:** one question per step with «{n} من {total}», progress bar, «تخطّى» where optional, big option cards (selected = lime border + lime-soft), primary «التالي». Same intake data and validation as today.
2. **سؤالين الصبح:** sleep chips, soreness chips, readiness result card (glass-strong) with the suggested decision, primary «تم». Same data and rules as today.
3. **آخر التمرين:** trophy, «خلّصت {day}», duration · sets · volume, tiles (نقط, رقم قياسي), effort 1–10 chips with «سهل جدًا / أقصى مجهود», primary «ابعت للكابتن», secondary «شارك» (existing share card).
4. **جاوب تقييم:** one question per page, «{n} من {total}», progress bar, question types (number, choice, scale, text, photo with camera/gallery), «رجوع» + primary «التالي» / «ابعت الإجابات» at the end, note «إجاباتك بتتحفظ لو النت فصل» (local draft as today). Renamed to التقييمات.
5. **رتبتك:** rank card (badge, tier, points, bar to next), «سباق التاج الشهر ده» list with the player's own row highlighted and the prize line, «لوحة الشرف» row. Keep celebrations and share.
6. **InBody والمكملات:** InBody card with three values and deltas, «ضيف InBody» (existing upload/PDF/photo), history; «مكملات النهارده» rows with big ticks (existing schedule times). Supplements also appear inside الأكل (T-195 links here).
7. **الإشعارات:** header with «علّم الكل كمقروء», rows with icon colour by type and unread dot, deep links as today.
8. **حسابي:** profile row (coach and days left), language chips (مصري / فصحى / English per T-184 flag rules), units, workout reminder time, install app, logout, KO «قريبًا» card.
9. Feature inventory per `v6-spec.md` for all eight screens.
10. Copy every Arabic string from the mockup exactly. `ar` + `en` only.

## Acceptance
- [ ] Matches the eight phones at 390×844, differences listed.
- [x] Feature inventory, nothing dropped.
- [x] Offline: assessment draft and readiness answers survive offline (tests).
- [ ] Flag off byte-identical; all gates pass; budgets unchanged.

## Feature inventory

| Screen | Existing features and destination |
|---|---|
| First intake | Welcome, captain name, preparing/success moments remain. Name, sex, birth year/age, height, weight, optional target weight, training weekdays, session duration, experience, injuries, medical conditions and advisory, allergies, optional notes/count become individual question pages. Existing bounds, validation, exclusive “none”, session draft, offline warning, send errors/retry, back and final save remain. |
| Morning questions | All six sleep values and five soreness values remain chips. Daily-check local write/outbox remains; existing weighted score and suggested keep/reduce/rest appear in the result card. Water, rest-day advice, tomorrow, saved/pending indicators and decision overrides remain in their existing surrounding panels. |
| Workout finish | Expected points and eligibility reasons, next-tier hint, locally saved message/home remain after sending. Effort 1–10, optional 500-character note, skip, pending lock and save error remain. Summary reads the actual local session/sets; share uses existing rank share. |
| Assessment answer | Request title, one question per page, progress, number/text/scale/choice/multi/yes-no/photo types, required validation, uploaded-photo state, upload errors, submission lock/errors/retry, answered/reviewed/unavailable states remain. Browser draft and clear-after-success remain. Add step count, back, close and offline note. Pending list retains due dates, loading/error/retry. |
| Rank | Badge/tier, lifetime points, progress/legend stars, rank/crown share, tier journey, crown prize/eligibility/rules/reset/gap/position, anonymous team leaderboard with own row, hall history/loading/empty/error/retry, points log, level-up celebration remain. Journey, race details and points log use expandable sections below the mockup’s main cards. |
| InBody/supplements | Three latest values, deltas/trend/target, no-delta state, upload PDF/photo/metrics, history, signed files and delete confirmation/error remain. Captain first/latest comparisons and overdue/regressing alerts stay unchanged. Supplements retain schedule grouping, dose/notes, large ticks, optimistic local day logs, midnight/focus/online refresh, loading/error/retry; add player empty state. |
| Notifications | Bell/dialog close/outside dismiss, unread count, mark-all/single read, pending lock, save error, loading/empty/error/retry, relative times and existing deep links remain. Player rows gain type colour and unread dot; captain dropdown stays unchanged. |
| Account | Profile/avatar/name/phone editing and timezone flag rules remain in expandable profile form. Language/style flag rules, glass/theme, install, push settings, tour replay, export, account deletion/demo exclusions and sign-out remain. Add captain/access profile summary and KO coming-soon card. Captain settings stay unchanged. |

## Implementation plan

- [x] Capture pre-change flag-off rendered hashes; add failing v6 rendering and offline persistence tests.
- [x] Add feature-local ar/en v6 messages and gated single-question intake using existing schema/draft/save.
- [x] Restyle morning questions/result and workout finish using existing score and local session data.
- [x] Restyle assessment answer and pending list while retaining draft/upload/submission behavior.
- [x] Arrange rank, InBody, supplements, notification and player account cards; preserve additional features in expandable sections.
- [x] Run every requested gate, review scoped diff and record backend/visual differences (blocked gates remain acceptance gaps below).

## Backend findings

- Intake has no goal column or mutation input. The mockup goal choices cannot truthfully be saved; the existing intake fields are retained as individual questions instead. The actual question count therefore differs from the illustrative six.
- Readiness uses the existing weighted 0–100 score (including water), not a new 1–10 scoring rule.
- Workout points remain the existing eligibility-based preview; never the mockup’s illustrative +40.
- `profiles.units` already exists and is writable under owner RLS. `settings/data/player-units.ts` validates metric/imperial, verifies Auth, restricts the write to the authenticated player and confirms the saved value. No schema change. Existing workout/log screens still use their current measurement units; changing those screens is outside this card.
- There is no per-player workout reminder time column or supported time-setting mutation. The reminder row describes the existing plan-based reminders; no fake time picker or unsaved “6 بالليل”.
- Notifications have no voice-reply type today. Existing supported types, real payloads, relative timestamps and deep links are retained; the mockup’s voice notification is not fabricated.
- The existing image-sharing endpoint supports rank/crown only. Finish “شارك” uses that endpoint, with native share/download and actual errors. No workout-specific image endpoint was invented. It follows the existing ranks flag.
- Assessment photos still require a successful online upload. Text/numeric/choice/scale/yes-no drafts and uploaded-photo paths survive offline as before; unuploaded files are not claimed to be stored offline.

## Implementation files

- Onboarding: `intake-entry.tsx` gates lazy `intake-v6.tsx`; `intake-question.tsx` renders one field; `v6-steps.ts` uses the existing schema; `chip-group.tsx` gains selected option cards. Existing wizard stays intact.
- Readiness: `morning-questions.tsx`, `questions-sheet.tsx`, `readiness-row.tsx`, `daily-panel.tsx` retain existing writes and pass the actual water goal; `morning-result.tsx` shows the existing score/suggestion.
- Workout finish: `session-feedback.tsx`, `finish-hero.tsx`, `finish-share.tsx`, `data/finish-summary.ts` show actual local duration, set count, volume and records; retain feedback, skip and completion. No workout-day/focus-screen edits.
- Assessments: `answer-flow.tsx` adds count, camera/gallery, offline note and pill navigation; `pending-forms.tsx` uses التقييمات and an empty state. Existing shared/captain question renderer and submission logic stay intact.
- Rank: `rank-screen.tsx`, `rank-v6.tsx`, `rank-hero.tsx`, `team-board.tsx` arrange the compact rank, race, own-row highlight, expandable hall/history/details and existing celebrations/share.
- InBody: `scan-section.tsx` and `scan-metrics.tsx` group latest values/deltas/date range into the strong card while retaining upload/history/delete and all captain variants.
- Supplements: `player-supplements.tsx` uses scheduled rows with big ticks, dose/timing/notes and an empty state; existing cache/outbox stays intact.
- Notifications: `notification-dropdown.tsx` gates the player header, typed icon tiles, unread dots and relative-time alignment. Flag-off/captain markup is hash checked.
- Account: `settings-screen.tsx` lazy-loads `player-account.tsx` only for the flagged player route; `player-preferences.tsx` preserves T-184 language choices and saves real units. Profile edits and existing additional controls remain accessible.
- Copy: feature-local `v6-messages.ts` and workout `finish-messages.ts` contain ar/en only. No standard Arabic files were edited.
- Tests: `v6-secondary.test.ts`/snapshot, `v6-legacy.test.ts`/snapshot, `v6-offline.test.ts`, `answer-v6.test.ts`, `v6-steps.test.ts`, `finish-summary.test.ts`, `player-units.test.ts` cover original markup hashes in ar/en, displayed flow, storage reopen/isolation, validation, summaries and owner-bound writes.

## Visual differences and verification limits

- Mockup captions/demo notes are excluded from product UI. Actual data replaces illustrative names, dates, points, scan values and counts. Intake uses 13 existing fields, not the mockup’s six illustrative goal steps.
- All 1–10 effort values remain available (the mockup only illustrates 5–10). Optional workout note and skip remain. Additional rank/account/history features remain in expandable sections rather than disappearing.
- Install uses the existing platform-aware installer and its current translated copy; unsupported platforms do not get a nonfunctional install button. KO is a coming-soon card.
- 390×844/1440×900 browser comparison is **not verified**: Playwright Chromium is absent, and attempting the installed Edge channel fails with `spawn EPERM`. Mockup markup was read in full for app2.
- `npm run build` fails because Turbopack cannot resolve the worktree’s external `node_modules/next` symlink within its filesystem root. `npx next build --webpack` also fails with `spawn EPERM`. No config/dependency/budget change was made.
- `npm run check` reaches release audit after passing typecheck/lint, then stops on `spawnSync git EPERM`. The standalone audit has the same restriction. A shell-fed execution of the same `scanFile`/`scanRoutes` rules scans tracked and new files instead.
- Default Vitest and default perf-budget invocation fail during config load with `spawn EPERM`. Use the requested `--maxWorkers=2 --configLoader native --pool=threads` fallback. Perf-budget fallback skips because the failed build produced no route-bundle stats; this is not a verified budget pass.
- Independent review caught an unconditional notification header class change; fixed and checked against hashes generated from the original HEAD components. No other important regression was reported.

## Gate summary

- `npx tsc --noEmit -p .`: PASS (exit 0).
- `npx eslint .`: PASS (exit 0).
- `npm run check`: BLOCKED at release audit, `spawnSync git EPERM`; preceding typecheck/lint pass.
- `npm run audit:release`: BLOCKED, `spawnSync git EPERM`. Shell-fed same-rule fallback: `Release audit fallback: 2239 files, 0 findings` (includes new files).
- `npx vitest run`: BLOCKED loading config, `spawn EPERM`.
- `npx vitest run --maxWorkers=2 --configLoader native --pool=threads`: PASS, `Test Files 571 passed | 1 skipped (572)`; `Tests 3754 passed | 1 skipped (3755)`.
- `npm run build`: FAIL, Turbopack cannot resolve external linked Next package. `npx next build --webpack`: BLOCKED, `spawn EPERM`.
- `npx vitest run src/lib/perf-budget.test.ts`: BLOCKED config load, `spawn EPERM`. Same native/threads fallback: `Test Files 1 skipped (1)`; missing build stats, so budgets are unverified.
- `git diff --check`: PASS. Every changed/new source file is at or below 250 lines. No dependency, migration, budget, standard Arabic, captain-screen or shared-ui changes; no commit.
