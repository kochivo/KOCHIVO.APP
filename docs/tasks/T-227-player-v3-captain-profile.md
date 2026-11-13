# T-227: Player v3 captain screen and profile

**Phase:** Player v3 redesign · **Depends on:** T-222 · **Status:** ready

## Goal
Match `docs/mockups/player-v3/08-captain.html` on `/player/captain` and `10-profile.html` on `/player/settings` (player view) exactly, v6 branch. Read `docs/mockups/player-v3/README.md` first.

## Files
- `src/features/player-shell/components/captain-screen.tsx`, `captain-question.tsx`, and new files as needed.
- `src/features/voice-notes/components/player-voice-notes.tsx` and `voice-note-list.tsx` (player view only).
- `src/features/settings/components/player-account.tsx`, `player-preferences.tsx`, `settings-screen.tsx` (player branch only).
- Their messages files.
- Tests.
- This card.

## Captain (`08-captain.html`)
1. **Header.** Captain avatar (photo or initial on `lime-soft`), «كابتن <name>», and «كابتنك من <duration>» (from the existing join date).
2. **Pending assessment card.** Gold border, a clipboard icon, «الكابتن مستني منك <form title>», and «<n> أسئلة · <min> دقايق». It links to `/player/forms/[requestId]`.
   - It comes from the existing player assessments. Show only the oldest pending one.
   - With none pending, hide the card.
   - Keep the full assessments list reachable below the thread; list it in Notes.
3. **The thread.** It shows only real items, oldest to newest, with day separators («النهارده», «امبارح», a date):
   - **Captain voice notes**: a bubble on the start side, a lime play button, the waveform, and the duration. Use the existing player voice-notes data and player; marking as heard works as today.
   - **Captain text replies** to the player's check-ins and form checks, if that data is readable by the player today. If it is not, leave them out and say so in Notes. Do not add a migration.
   - The player bubbles from the mockup («تمام يا كابتن», the PR share) are **not** stored in the app today. **Do not show player bubbles.**
4. **Composer.** Above the nav: the input «اكتب للكابتن» and a 52px mic button.
   - The behaviour stays exactly as `captain-question.tsx` today: send opens WhatsApp with the text; the mic opens WhatsApp; the "no contact" state stays disabled with its hint.
   - Restyle only.
5. **Keep** the renewal entry and the no-captain screen, and list them in Notes.

## Profile (`10-profile.html`)
1. A back button and the title «حسابي».
2. **Identity card.** Avatar (64px, the existing avatar picker opens on tap), the full name, «مع كابتن <name> · <plan name>», and «الاشتراك لحد <date>» (existing billing data; hide the line if unknown).
3. **Three stat tiles.**
   - Total sessions.
   - Streak in `sore`.
   - Rank name in gold, using the existing rank name until T-228.
4. **Settings list.** One card with rows at least 60px tall, divided by `border-line-soft`:
   - اللغة: segmented عربي / English (existing language setting; arStd stays reachable where it is today, so list how in Notes).
   - الشكل: segmented غامق / فاتح (the existing theme setting).
   - فكّرني بالتمرين: a switch with «كل يوم تمرين الساعة <time>» (the existing reminder; if the time is not editable today, show the switch and the default time only).
   - الوزن بـ: كيلو / رطل (the existing imperial setting).
   - ازاي تستخدم التطبيق: a link to the existing player guide or product tour.
5. **Keep everything else under a second card**, «المزيد», in the same row style: timezone, light visuals, export data, delete account, and any other existing row. List them in Notes.
6. **«سجّل خروج»** at the bottom, quiet text style (not danger red, not lime), 52px tall. Use the existing `SignOutButton`.

## Acceptance
- [ ] Tests:
  - the pending assessment card shows only the oldest pending one and hides with none;
  - the thread renders only captain items and orders them by time;
  - the composer still builds the same WhatsApp URL;
  - every setting row is wired to the existing setting;
  - no existing setting is lost (compare the old and new row lists);
  - sign-out is present.
- [ ] At 390×844 both screens match their mockups.
- [ ] `npm run check` and `npm run build` pass, within the perf budget.

## Out of scope
In-app player messages (no backend), player voice recording (no backend), and migrations.
