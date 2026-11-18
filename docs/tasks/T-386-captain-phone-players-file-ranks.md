# T-386: Captain phone players, player file and leaderboard

**Migration:** none. Mockups: `c5-06-players`, `c5-07-player-file`, `c5-09-leaderboard`.

## Files
- the captain players list (from `/captain/players`), `src/features/captain-workspace/player-file/**`, `src/features/rank-review/components/**` (phone only; the desktop leaderboard from T-379 stays), messages, tests.

## What to build
1. **Players:** count line («40 لاعب · 31 اتمرنوا الأسبوع ده»), search, chips الكل / محتاجينك / ماشيين تمام / بيخلص with counts, rows with goal, days left or the problem, and a status tag.
2. **Player file:** header (name, goal, package, days left), tabs نظرة عامة / البرنامج / الأكل / المتابعات / الفلوس; overview: weight with change, commitment, streak, this week dots, pain alert card, last workout with PR, and one lime «عدّل البرنامج». Charts use the T-375 chart in compact mode.
3. **Leaderboard:** month title, period chips (الشهر ده / الأسبوع / كل الوقت) that never wrap, a first-place card, then ranked rows with points.

## Rules for every captain-phone card
- **Phone only.** Apply the new look below the `md` breakpoint (`max-md:` / the existing phone checks). The desktop at `md` and up must render exactly as today. Owner decision 2026-11-18: «سيب شكل الديسكتوب زي ما هو، هنعدل على شكل الفون بس».
- Only the v6 workspace (`NEXT_PUBLIC_CAPTAIN_WORKSPACE=1`). Flag-off markup and its hash tests stay unchanged.
- Keep every action and data that works today; this is a new look, not fewer features. Do not change queries, writes, ids or RLS. No migrations, no dependencies.
- Strings in ar, arStd (const outside `defineMessages` + `get arStd()` behind `NEXT_PUBLIC_INTERNATIONAL`) and en. Tokens only, logical properties, targets ≥ 48px, files ≤ 250 lines, every `<dialog>` has the `sheet` class, `localDate(x, timezone)` always gets a timezone.
- Match the mockups in `docs/mockups/captain-phone/` (open the .dc.html files at 390px; `00-all.png` is the overview) 1:1 at 360px and 390px.

## Done when
- Tests cover what is listed above, and a test proves the desktop markup did not change (class or structure check under md).
- `npm run check` passes.
