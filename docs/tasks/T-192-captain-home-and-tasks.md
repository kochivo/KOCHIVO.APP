# T-192: Captain home and tasks inbox (mockup v6-rest: «الرئيسية», «المهام»)

**Phase:** Captain workspace v6 (owner: "100% UI/UX and backend") · **Depends on:** T-187 · **Status:** ready
**Migration:** none expected. **Flag:** behind `captainWorkspaceEnabled()`; flag off byte-identical.

Read first: `docs/mockups/captain-workspace/v6-rest.html` (screens «الرئيسية» and «المهام») and `docs/mockups/captain-workspace/v6-spec.md` (all sections, including Feature inventory and Backend rules). Reuse `underline-tabs`, `fact-row`, `save-status` from `src/ui/` if they already exist; if they do not exist yet (T-188 runs in parallel), build local equivalents inside your feature and note it so the reviewer can merge them.

## Files
- `src/features/dashboard/` (home screen, next tasks, tiles, activity) and tests.
- `src/features/inbox/` (tasks inbox list + detail + quick replies + voice reply + "send and open next") and tests.
- `src/app/[locale]/(captain)/captain/page.tsx` and `.../inbox/page.tsx` (thin).
- Messages (`ar`/`en` only) in those features. This card.
- Do **not** edit `src/features/roster/`, `src/features/coach-page/`, `src/features/captain-workspace/` (T-188 owns them). Render join requests in the inbox through the coach-page public entry as it is.

## Requirements
1. **Home = mockup «الرئيسية».**
   - Date line, greeting «صباح الخير يا كابتن {name}», secondary «ضيف لاعب».
   - Four tiles: لاعيبة نشطين (n من limit), التزام الأسبوع (% + bar), متابعات مستنياك, اتدفع الشهر ده (sum of payments this month in the captain's timezone).
   - «اعمل إيه النهارده»: ordered tasks from `captainNextTasks` (review, no program, no meal plan, renew/ending, dues, late), each with icon colour, one line, small line, and one button. **Only the first task's button is primary.**
   - «آخر حاجات حصلت»: latest player events (workout finished, assessment answered, weight logged), max 5, from existing data in one query.
   - Zero players: one card «ضيف أول لاعب» with the existing 3-step onboarding.
2. **Tasks = mockup «المهام».**
   - Filter chips with counts: الكل، check-ins، تقييمات، طلبات انضمام.
   - Split view: list (avatar, name, kind · time ago, coloured flag pill: weight change, high soreness, assessment, request) and detail panel.
   - Check-in detail: header with «افتح ملفه», photos (front/side/back, existing lazy loading), fact rows (weight + delta, waist + delta, sleep 7-day avg, player note), «رد سريع» chips (existing quick replies), «رد بصوتك» (existing voice reply), text reply, primary «ابعت وافتح اللي بعده».
   - Assessment detail: answers as fact rows, photo answers as thumbnails, same reply area.
   - Join request detail: existing accept/decline.
   - Mobile: list first, detail as a full screen with back.
3. Feature inventory per `v6-spec.md` for both screens (everything the current dashboard and inbox do must still be reachable).
4. Copy every Arabic string from the mockup exactly. `ar` + `en` only; do not touch `arStd`.

## Acceptance
- [ ] Matches the two mockup screens at 1440×900 and 390×844 (differences listed).
- [x] Feature inventory in this card, nothing dropped.
- [x] Unit tests: task ordering and primary choice, tile maths (timezone-aware month), inbox filters and counts, "send and open next".
- [ ] Flag off byte-identical; all gates pass; budgets unchanged.

## Out of scope
- Players list and player file (T-188). Database changes.

## Feature inventory

| Existing feature / state | v6 destination |
|---|---|
| Captain name, plan badge and invitation dialog | Date/greeting header, secondary invitation; plan remains in shell and additional tools |
| First-player invitation, program and nutrition onboarding | Single three-step onboarding card |
| Next task, next-task preview, program/review/renew/payment/inactivity actions | Ordered today list, all tasks reachable, first action primary |
| Active/late/ending/open-task statistics | Four headline tiles; late/ending remain in additional home tools |
| Smart alerts, show more, billing links, dropout radar, WhatsApp reminders | Additional home tools, built per v6-spec |
| Player search, normalized Arabic matching, recent-player links, clear/no-match | Additional home tools, original finder preserved |
| Public coach link and join requests with accept/decline | Additional home tools; inbox requests use coach-page public component |
| Dashboard loading, failure and zero-player states | Suspense, error card and onboarding |
| Open/reviewed inbox, check-ins and form videos | Split inbox, type chips; video type and reviewed history retained |
| Triage grouping/filtering, all six flags, stable urgency ordering | List flags and additional inbox tools |
| Weight/waist and historical deltas, 7-day sleep/soreness, notes | Detail fact rows |
| Private photos/video, lazy signing, retry and expired-link recovery | Detail media, existing loaders retained |
| Quick replies, optional text, mark reviewed without text, send-only | Reply area; send-only remains secondary |
| Voice recording, upload, unsent navigation/unload guards, duplicate upload guard | Reply area, existing recorder and guard |
| Optimistic review, rollback, drafts, double-submit prevention, send-next/caught-up | Review flow retains input on failure and advances after success |
| Responsive dialog, opener focus, close, mobile full-screen detail | Split desktop detail, mobile full-screen with back |
| Existing workspace queue search, renewal reminders, metrics, pagination and assessment links | Additional inbox tools via unchanged public QueueEntry |
| Loading, empty, filtered-empty, retry, reviewed reply/no-reply | Same states built from v6 cards |

## Implementation plan

**Goal:** Flag-gated home and split tasks inbox matching v6-rest, retaining the inventory above.
**Architecture:** Keep legacy components unchanged for flag-off; add feature-local server reads and lazy client islands. Reuse public feature entries and existing RLS/RPCs.
**Spec:** `docs/mockups/captain-workspace/v6-spec.md`, `v6-rest.html`.

- [x] Test v6 task order/primary choice, month boundaries and adherence arithmetic, filter counts and next-item selection.
- [x] Implement home data, tiles, ordered tasks and activity; preserve additional tools and onboarding.
- [x] Implement split inbox, assessment detail, existing media/replies/voice and public join-request component.
- [x] Run all requested gates; document exact failures and visual verification limitations.

Constraints: no dependencies, schema, budget, standard Arabic or changes outside this card's file list. Flag-off rendering stays unchanged.
Review focus: timezone month rollover; missing measurements; mutation rollback/draft preservation; mobile back/focus; mixed-type send-next and empty lists.

## Notes for reviewer

- No dependencies, migrations, budget changes, commits, or changes to standard Arabic. New ar/en copy is in feature-local `workspace-messages.ts` files for the reviewer's standard-Arabic reconciliation.
- `src/ui/fact-row.tsx` was absent: `inbox/components/workspace-fact.tsx` is the minimal local equivalent. Neither screen needs underline tabs or save-status.
- Preserved tools absent from the mockup are in expandable home/inbox sections. The video chip and secondary send-only action remain reachable. The existing public `JoinRequests` component renders its complete accept/decline list in request detail; selecting one request does not filter that public component's rows. No deep imports or coach-page edits were introduced.
- Voice replies to assessments are ordinary player voice notes: the existing voice API supports check-in/video context only. Check-in/video voice context and upload retry guards remain unchanged.
- Windows blocks `next build` at its TypeScript worker with `spawn EPERM`, after successful compilation. Standalone `npx tsc --noEmit -p .` passes. Dev startup and Playwright Edge launch also return `spawn EPERM`; authenticated PostgREST execution and visual comparison at 1440×900 / 390×844 remain unverified. Mockup markup was read in full for both screens.
- `npm run audit:release` hits `spawnSync git EPERM`. Equivalent fallback: pipe native `git ls-files` to Node and run the unchanged `scanFile` / `scanRoutes` exports from `scripts/release-audit-rules.mjs`: **Release audit fallback: 2178 tracked files, 0 findings**.
- Default Vitest hits `spawn EPERM` in the config loader. Used the requested `npx vitest run --maxWorkers=2 --configLoader native --pool=threads` fallback. Scoped dashboard/inbox tests pass, including draft retention after failure, triage preservation, and unchanged flag-off inbox tree.
- The out-of-scope `src/features/captain-workspace/queue/route.test.ts` still expects `QueueEntry` as the flag-on route root; T-192 now renders `WorkspaceInbox` and retains `QueueEntry` in additional tools. Reviewer must reconcile this old expectation. The perf-budget test cannot read a chunk referenced by stale `.next/diagnostics/route-bundle-stats.json` after the interrupted build; budgets were not edited.

### Verification summary

- `npx tsc --noEmit -p .`: passed (exit 0).
- `npx eslint .`: passed (exit 0).
- `npm run check`: typecheck and lint pass; stops at release audit's `spawnSync git EPERM`.
- `npm run audit:release`: blocked as above; unchanged-rules fallback: **2178 tracked files, 0 findings**.
- `npx vitest run`: config-loader `spawn EPERM`; requested native/threaded fallback: **Test Files 2 failed | 563 passed (565); Tests 2 failed | 3754 passed (3756)**. Both failures named above.
- Scoped dashboard/inbox fallback: **Test Files 22 passed (22); Tests 103 passed (103)**, including both complete flag-off route-tree regressions.
- `npm run build`: **Compiled successfully**, then TypeScript-worker `spawn EPERM`; reproduced both with flag unset and `NEXT_PUBLIC_CAPTAIN_WORKSPACE=1`.
- `npx vitest run src/lib/perf-budget.test.ts`: default config-loader EPERM; native/threaded fallback fails with missing `2ue262tig0ml5.js` referenced in stale bundle statistics. No budget modifications.
- `git diff --check`: passed. Feature line-limit check: **79 files checked, none over 250 lines**.
- Independent read-only review caught draft retention and triage preservation gaps; both were fixed and rechecked. Visual/browser and live authenticated query verification remain pending because dev/browser process launches are blocked.
