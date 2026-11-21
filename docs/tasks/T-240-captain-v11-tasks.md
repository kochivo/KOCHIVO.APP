# T-240 — Captain v11: tasks page

**Phase:** captain v11 fidelity · **Depends on:** T-238 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first. It is part of this card.

## Goal
A new page, `/captain/tasks`, that matches the mockup `tasks` screen exactly. It holds everything waiting for the captain in one place, with a detail pane and a reply.

## Files
- `src/app/[locale]/(captain)/captain/tasks/page.tsx` (thin route), plus `loading.tsx` and `error.tsx`
- `src/features/captain-workspace/queue/*`. Reuse the existing queue model, loader and review dialog. New files are allowed here.
- `src/features/captain-workspace/queue/messages.ts`
- `src/features/captain-workspace/index.ts` / `server.ts`: the entry for the new screen only
- tests in the queue folder

## Requirements
1. **Header:** «المهام», with the subtitle «كل اللي مستني منك، مترتب بالأهم».
2. **Tabs, each with a real count:**
   - الكل
   - فيديوهات: form-check videos waiting for review
   - متابعات: check-ins waiting for review
   - غياب: players with no session for 5 or more days
   - تبديل: exercise swap requests
   - تجديد: subscriptions ending within 7 days
   - بدون برنامج: active players with no program
3. **List** (`g21`, start column):
   - Each row shows avatar, name, short text, a tag pill on desktop, and one action button. The first row's button is lime; the others are glass.
   - The button labels and actions:
     - رد: reply to a video
     - ابعتله: message an absent player
     - راجع: open a check-in
     - وافق: approve a swap
     - فكّره: send a renewal reminder
     - ادّيله برنامج: open the program builder for that player
4. **Detail pane** (end column):
   - The player name and goal, with «افتح الملف».
   - For a video: the video player, the player's text, and the KO note if one exists.
   - For a check-in: the photos, plus weight, adherence and sleep from the answers.
   - For anything else: the text.
   - At the bottom, a compose box with a mic icon and «ابعت الرد».
5. **Mobile:**
   - The list shows first. Tapping a row opens the detail, with a «كل المهام» back button, exactly like `S.taskOpen` in the mockup.
6. **Empty state:** a full ring, «خلصت كل المهام», and «عاش يا كابتن. أي حاجة جديدة هتظهر هنا.».
7. Order the tasks by priority, the same way the mockup lists them:
   1. videos
   2. absent
   3. check-ins
   4. swaps
   5. renewals
   6. no program

   Within each kind, oldest first.
8. Sending a reply or doing an action uses the existing mutations (chat send, swap approve, review). It is optimistic, and the task leaves the list.

## Acceptance
- [ ] Desktop and 390px match the mockup `tasks`, including the mobile list and detail switch.
- [ ] There are tests for the task kinds, the counts, the order and the empty state.
- [ ] `npm run check` and `npm run build` pass, and the route stays within 310 KiB.

## Out of scope
- Home (T-239). It links here.
