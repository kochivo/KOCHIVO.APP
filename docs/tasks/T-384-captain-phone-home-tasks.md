# T-384: Captain phone home and tasks

**Migration:** none. Mockups: `c5-01-home`, `c5-02-tasks`.

## Files
- the captain home and the task queue components under `src/features/captain-workspace/components/` and `src/features/captain-workspace/queue/`, `src/features/dashboard/home/` (phone parts only), their messages, tests. Do not touch `player-file/` (T-386).

## What to build
1. **Home:** greeting and date; a hero card «{n} حاجات مستنياك» with time estimate, the first task, chips by type (تقييمات، دفعة، مستنيك) and one lime «ابدأ المهام»; a stat row (التزام with change, اتمرنوا x من y, دخل الشهر); «محتاجين نظرة» list, each row with one action (ابعت رسالة / رد / سجّل دفعة).
2. **Tasks «واحدة واحدة»:** header with open and done counts; one task card at a time (player, type, time, the facts, the player's note, the KO suggestion when present) and the approve-and-reply action; swipe or next/prev to move between tasks. Uses the existing queue data and actions.

## Rules for every captain-phone card
- **Phone only.** Apply the new look below the `md` breakpoint (`max-md:` / the existing phone checks). The desktop at `md` and up must render exactly as today. Owner decision 2026-11-18: «سيب شكل الديسكتوب زي ما هو، هنعدل على شكل الفون بس».
- Only the v6 workspace (`NEXT_PUBLIC_CAPTAIN_WORKSPACE=1`). Flag-off markup and its hash tests stay unchanged.
- Keep every action and data that works today; this is a new look, not fewer features. Do not change queries, writes, ids or RLS. No migrations, no dependencies.
- Strings in ar, arStd (const outside `defineMessages` + `get arStd()` behind `NEXT_PUBLIC_INTERNATIONAL`) and en. Tokens only, logical properties, targets ≥ 48px, files ≤ 250 lines, every `<dialog>` has the `sheet` class, `localDate(x, timezone)` always gets a timezone.
- Match the mockups in `docs/mockups/captain-phone/` (open the .dc.html files at 390px; `00-all.png` is the overview) 1:1 at 360px and 390px.

## Done when
- Tests cover what is listed above, and a test proves the desktop markup did not change (class or structure check under md).
- `npm run check` passes.
