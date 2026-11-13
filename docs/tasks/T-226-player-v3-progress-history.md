# T-226: Player v3 progress and history

**Phase:** Player v3 redesign · **Depends on:** T-222 · **Status:** ready

## Goal
Match `docs/mockups/player-v3/06-progress.html` on `/player/progress` and `09-history.html` on `/player/history` exactly (v6 branch). Read `docs/mockups/player-v3/README.md` first.

## Files
- `src/features/progress/components/*` (progress-screen, weight-overview, line-chart, rank-overview, checkin-sheet).
- `src/features/workout/components/history-screen.tsx`, `history-workout.tsx`, `history-sets.tsx`, and a new `history-calendar.tsx`.
- Their messages files.
- Tests.
- This card.

## Progress (`06-progress.html`)
1. **Header.** Title «تطورك» and a segmented control شهر / 3 شهور (`aria-pressed`). It filters both charts.
2. **Weight card.**
   - «وزنك», the latest weight (40px), «كجم», and a `water`-tinted chip «زدت <x> كجم» or «نزلت <x> كجم» for the selected range.
   - A line in `water` with an end dot.
   - An outline «سجّل وزن النهارده» that opens the existing check-in sheet.
   - Data comes from check-ins.
3. **Strength card.**
   - «قوتك», chips for the main lifts (existing `mainLifts`; the selected chip is lime).
   - The best top-set weight, and «+<x> من أول البرنامج» in lime, from `trendDelta`.
   - A lime line with an end dot.
4. **History row.** «كل تمارينك اللي فاتت», the total session count, and a chevron. It links to `/player/history`.

**Keep** the gallery, the check-in history and the rank overview below, in the same card style, and list them in Notes.

**Empty states:** «سجّل وزنك أول مرة» and «لسه مافيش تمارين كفاية للرسم».

## History (`09-history.html`)
1. A back button and the title «تمارينك».
2. **Month calendar card.**
   - The month name, and «<done> من <planned> الأسبوع ده».
   - Weekday headers starting Saturday (سبت حد اتنين تلات أربع خميس جمعة).
   - Day cells 40px tall:
     - trained = lime fill;
     - missed (a planned day in the past with no session) = `sore` outline;
     - today = ring (`box-shadow` ring in `ink`; lime fill too if trained today).
   - A legend: اتمرنت / فاتك / النهارده.
   - Swiping or arrows change the month. Use `localDate()` with the player timezone.
3. **Session list.**
   - A date tile (day number and short month), the day title, and «<min> د · <sets> مجموعة».
   - A gold «رقم قياسي» badge when the session had a PR.
   - Tapping opens the existing session detail (history-sets).

## Acceptance
- [ ] Tests:
  - calendar cell states (trained, missed, today, today-trained) for an injected `now`;
  - the week starts on Saturday;
  - the weight chip direction and amount;
  - the range toggle filters points;
  - the PR badge;
  - empty states.
- [ ] At 390×844 both screens match their mockups.
- [ ] `npm run check` and `npm run build` pass, within the perf budget.

## Out of scope
New metrics, body scans, muscle analytics, and migrations.
