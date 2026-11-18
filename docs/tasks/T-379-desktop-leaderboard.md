# T-379: Leaderboard page, tidier (v6 captain, desktop)

**Migration:** none. **Owner decision 2026-11-18:** match screen 3 of canvas page «الاشتراكات والأكل والترتيب» (`docs/mockups/desktop-fixes/h5-03-ranks.dc.html`).

## Problem
- The podium is broken: a giant lone «1», a small avatar, a tiny medal.
- «جايزة التاج: شهر مجاني» shows twice.
- The period switch «كل الوقت» wraps onto two lines.
- Every row starts with an odd «لسه».

## Files
- `src/features/rank-review/components/**`, `src/features/rank-review/**/messages.ts`, tests

## What to build
1. Header subtitle: month name and days left. The period switch (الشهر ده / كل الوقت) sits in the header actions and never wraps.
2. Main column:
   - a leader card for first place (amber tint, engraved number, avatar, name, workouts and medal, points on the end side). Hide it when nobody has points;
   - a table: rank, player, medal, workouts, points with the change since last week when the data has it. Players with 0 points stay in the table in order. Remove the «لسه» prefix.
3. Side column:
   - this month's prize once, with an «عدّل» button that opens the existing prize editor;
   - next month's prize card, with «حددها» when it is not set;
   - a small «النقط بتتحسب إزاي؟» card built from the existing points rules (do not change any points maths).
4. Empty state when the team has no players.

## Rules for this card
- Desktop layout stays as it is today (sidebar, header, page width). Only the page content changes. Phone layouts must keep working.
- Change only the v6 workspace view (`NEXT_PUBLIC_CAPTAIN_WORKSPACE=1`). The flag-off markup and its hash tests stay unchanged.
- Strings in ar, arStd (behind the `NEXT_PUBLIC_INTERNATIONAL` getter, as in other v6 message files) and en. Tokens only, logical properties only, 48px targets, files under 250 lines.
- No migrations, no new dependencies, no data writes changed.

## Done when
- Tests cover: the prize renders once, no «لسه» text, the leader card hidden at 0 points, and the period switch markup has no wrap.
- `npm run check` passes.
