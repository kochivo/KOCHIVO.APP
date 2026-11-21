# T-238 — Captain v11: always dark, sidebar, top bar and mobile nav

**Phase:** captain v11 fidelity · **Depends on:** T-237 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first. It is part of this card.

## Goal
Make the frame around every captain screen match the v11 mockup exactly:
- the captain area is always dark;
- the sidebar has the mockup groups, counters and captain card;
- the top bar on every page has the search and the bell;
- the mobile bottom nav has 4 tabs plus a "more" sheet.

## Files
- `src/app/[locale]/(captain)/captain/layout.tsx`
- `src/features/roster/components/captain-shell.tsx`, plus new files next to it under `src/features/roster/components/` (for example `captain-nav-groups.tsx`, `captain-more-sheet.tsx`, `captain-top-bar.tsx`)
- `src/features/roster/messages.ts` (or the shell's messages file)
- the theme boot code, `src/lib/theme-mode.ts`, only if forcing dark on captain routes needs it
- tests next to the changed files

## Requirements
1. **Always dark.**
   - Captain routes always render in the dark theme, whatever the device or stored setting. The player area and the public site keep the current behaviour.
   - Do it without a flash of the light theme on load.
   - Hide the theme switch inside the captain area. The mockup has none.
2. **Sidebar.** Copy `sideHTML()` and `NAV`:
   - The logo goes at the top.
   - Four groups:
     - شغلي: الرئيسية، المهام، صندوق الوارد
     - لاعبيني: اللاعبين، طلبات الانضمام، الترتيب، الاشتراكات والدفعات
     - مكتبتي: برامج التمرين، مكتبة التمارين، الأنظمة الغذائية، مكتبة الأكلات، الفورمات
     - حسابي: الإعدادات
   - Counter badges come from real counts: open tasks, unread chats, pending join requests, and payments waiting for confirmation.
   - The active item follows the `PARENT` map. For example, a player file highlights اللاعبين.
   - The captain card sits at the bottom: avatar, name and player count.
   - Keep the plan footer (`sidebarFooter`) that already exists.
3. **Top bar.** Copy `header()`:
   - the page title;
   - the search field «دور على لاعب أو صفحة» with the `Ctrl K` hint, which opens the existing command palette if there is one, otherwise a simple palette for players and pages;
   - the bell, with an unread dot, linking to the notifications page (T-250);
   - the page's action buttons on the end side.
   - On mobile the search becomes an icon button.
4. **Mobile.**
   - The bottom nav has exactly `MOB`: الرئيسية، المهام (counter)، الوارد (counter)، اللاعبين, plus a «المزيد» button.
   - «المزيد» opens a bottom sheet with the remaining items as tiles, grouped as in `sheetHTML()`.
5. Links for pages built in later cards (المهام, الإشعارات, طلبات الانضمام) point to their routes. Until a route exists, its item is hidden, not broken.

## Acceptance
- [ ] Captain pages are dark even when the device is in light mode. Player pages still follow the device.
- [ ] The sidebar, top bar and mobile nav match the mockup at desktop and at 390px.
- [ ] The counters show real numbers, with tests for the count mapping.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- The content of any screen (T-239 to T-251).

## References
- Mockup: `sideHTML`, `sheetHTML`, `header`, `NAV`, `MOB`, `PARENT`, and the `.side`, `.bar`, `.mob` CSS.
