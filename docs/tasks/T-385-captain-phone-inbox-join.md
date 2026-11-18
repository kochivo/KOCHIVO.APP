# T-385: Captain phone inbox, chat and join requests

**Migration:** none. Mockups: `c5-04-inbox`, `c5-05-thread`, `c5-08-join`.

## Files
- the captain inbox and chat components (find them from `src/app/[locale]/(captain)/captain/inbox` and `/join`), their messages, tests. Do not touch the player chat (player-shell).

## What to build
1. **Inbox:** title with new count; filter chips الكل / مش مقروء / صوت / صور; rows with avatar, name, last message preview (voice shows «رسالة صوت 0:24»), time, unread dot.
2. **Thread:** header with player and subscription days left; bubbles; the alternative-exercise card when the existing data has one; quick replies; composer with voice. Existing send, voice and polling stay.
3. **Join request:** one card per request: source and time, age, weight, height, goal, package and price, payment state, injuries; actions ارفض and a lime وافق وابدأ.

## Rules for every captain-phone card
- **Phone only.** Apply the new look below the `md` breakpoint (`max-md:` / the existing phone checks). The desktop at `md` and up must render exactly as today. Owner decision 2026-11-18: «سيب شكل الديسكتوب زي ما هو، هنعدل على شكل الفون بس».
- Only the v6 workspace (`NEXT_PUBLIC_CAPTAIN_WORKSPACE=1`). Flag-off markup and its hash tests stay unchanged.
- Keep every action and data that works today; this is a new look, not fewer features. Do not change queries, writes, ids or RLS. No migrations, no dependencies.
- Strings in ar, arStd (const outside `defineMessages` + `get arStd()` behind `NEXT_PUBLIC_INTERNATIONAL`) and en. Tokens only, logical properties, targets ≥ 48px, files ≤ 250 lines, every `<dialog>` has the `sheet` class, `localDate(x, timezone)` always gets a timezone.
- Match the mockups in `docs/mockups/captain-phone/` (open the .dc.html files at 390px; `00-all.png` is the overview) 1:1 at 360px and 390px.

## Done when
- Tests cover what is listed above, and a test proves the desktop markup did not change (class or structure check under md).
- `npm run check` passes.
