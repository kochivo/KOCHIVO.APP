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
- [ ] Feature inventory in this card, nothing dropped.
- [ ] Unit tests: task ordering and primary choice, tile maths (timezone-aware month), inbox filters and counts, "send and open next".
- [ ] Flag off byte-identical; all gates pass; budgets unchanged.

## Out of scope
- Players list and player file (T-188). Database changes.
