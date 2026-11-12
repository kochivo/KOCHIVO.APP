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
