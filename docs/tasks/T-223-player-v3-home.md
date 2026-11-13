# T-223: Player v3 home, training day and rest day

**Phase:** Player v3 redesign · **Depends on:** T-222 · **Status:** ready

## Goal
Rebuild `/player` (the v6 branch of `player-home/components/home-screen.tsx`) so it matches `docs/mockups/player-v3/01-home.html` on a training day and `11-rest.html` on a rest day, exactly. Read `docs/mockups/player-v3/README.md` first.

## Files
- `src/features/player-home/components/*` (home-screen, today-card, home-tiles, greeting, weekly-rest-card, and any new file you need, one component each, under 250 lines).
- `src/features/player-home/messages.ts`, `standard/messages.ts`.
- Tests in `src/features/player-home/`.
- This card.

## Training day (`01-home.html`), top to bottom
1. **Header.** Avatar button (links to `/player/settings`), «صباح الخير» / «مساء الخير» from the existing greeting logic, the player's first name, and a bell button that links to `/player/captain`. The bell shows a lime dot only when there is an unheard captain voice note (existing voice-notes data).
2. **Today card.**
   - Label «تمرين النهارده», then the day title (30px, weight 900).
   - Three chips: exercise count, estimated minutes (existing estimate if there is one; otherwise drop this chip), and «فيه تسخين» only when the day has warm-up items.
   - The brand slash.
   - The lime «يلا نبدأ» button (62px tall, play icon) to `/player/workout/[dayId]`. This is the only lime button on the screen.
3. **Bento 2×2.**
   - **Food:** ring with today's eaten percent and «الجاي: <next meal>», linking to `/player/nutrition`.
   - **Water:** glasses done out of goal, 8 small bars, linking to the water control.
     - Use the readiness water data and `waterGoalMl`.
     - Glasses are 250 ml, the same step the water glass already adds.
   - **Streak:** «مكمّل بقالك» / number in `sore` / «يوم ورا بعض», from the existing streak data, linking to `/player/history`.
   - **Week:** «الميدالية الجاية» / `done / planned` this week in gold / «تمارين الأسبوع», linking to `/player/rank`.
     - Use the existing week sessions. Medals themselves are T-228; until then this tile shows the weekly count only.
4. **Captain row.** Captain avatar initial, «كابتن <name>», the latest captain voice note («رسالة صوتية · 0:24»), and a play button that opens `/player/captain`.
   - Load the notes with `listVoiceNotes` from `@/features/voice-notes`; it is now exported.
   - No text replies here.
   - Hide the row when the player has no voice note.

## Rest day (`11-rest.html`)
The screen sits inside `data-mood='rest'`, as it does today. Header as above (no dot logic change).
1. **Rest card.**
   - «النهارده» / «يوم راحة», the moon icon (lucide `Moon`, dark on the calm slash), and the slash in `calm`.
   - The line «العضل بيكبر وإنت مرتاح. نام كويس، واشرب ميه، وكُل أكلك.»
   - A chip «الراحة مش هتقطع الـ<n> يوم بتوعك» with n = current streak. Show it only if rest days really do not break the streak in `streak` logic; if they do, leave the chip out and say so in Notes.
2. **Tomorrow card.** Date tile «بكره» with the day number, the next training day title, and «<n> تمارين · <m> دقيقة». It links to that day's preview.
   - If tomorrow is also rest, show «بكره كمان راحة» with no link.
3. **Bento.** Food and water only, as on training day.
4. **Primary button.** «سجّل أكلك» (calm, 62px, plus icon) to `/player/nutrition`. This is the only filled button.

## Keep (no feature may disappear)
Everything the home shows today must still be reachable:
- the readiness morning questions and coach-rest decision;
- the next-task slot;
- the week strip and day preview;
- the weekly-rest card;
- the product tour anchors (`data-tour-*`).

Put what is not in the mockup **below** the mockup content, in the same card style, and list each item in Notes. Do not change readiness logic.

## Acceptance
- [ ] Tests:
  - the training-day home shows exactly one lime button;
  - the rest-day home shows «يوم راحة», the tomorrow card and «سجّل أكلك» and no «يلا نبدأ»;
  - the streak chip appears only under the rule above;
  - the captain row is hidden with no captain content;
  - the water glasses math (ml → glasses).
- [ ] At 390×844 the two states match `01-home.html` and `11-rest.html`.
- [ ] `npm run check` and `npm run build` pass, within the perf budget.

## Out of scope
Medals (T-228), the nav (T-222), and new data sources or migrations.
