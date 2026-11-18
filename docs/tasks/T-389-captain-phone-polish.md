# T-389: Captain phone polish after the first live look

**Migration:** none. **Owner report 2026-11-18:** the captain phone design went live and looks messy. Live screenshots: `docs/mockups/captain-phone/live-2026-11-18/01.png`–`11.png` (home, More, tasks, players, programs, exercises, meal plans, foods, assessments, subscriptions, packages). Target look: `docs/mockups/captain-phone/c5-*.dc.html`. Phone only (below `md`); the desktop must not change.

## Problems (from the screenshots)
1. **Page header breaks into rows.** The shared page bar puts the title, a search icon, a chevron, a lime button and a second button on 2–3 rows (02–11). On «الباقات» the lime «باقة جديدة» covers the title (11). On «الأنظمة الغذائية» and «مكتبة الأكل» the title, + button and search stack.
2. **Double titles.** «المهام» shows twice with two search buttons (03). «التمارين» then «مكتبة التمارين» (06).
3. **Duplicate actions.** Programs shows «اطلب من KO» twice and two button rows (05). A search icon in the header next to a full search field (06, 07, 08).
4. **Floating buttons cover content.** The feedback button (!) and the KO «قريبًا» bubble sit on top of cards and rows on every page (01, 06, 07, 11), and a lime page button shows behind the + button in the bottom bar (01).
5. **More page leftovers.** Under «حسابي» there is an old search field, a bell and a collapsed «حسابي» row (02).
6. **Home.** Two empty states for the same thing («مفيش مهام. عاش يا كابتن» and «مفيش تنبيهات») (01). «التزام 19% +19%» shows a change against nothing.
7. **Segmented controls wrap** («مش متعيّنة 4» on two lines, 07).

## Files
- `src/ui/page-bar-*.ts(x)`, `src/features/roster/components/**` (phone shell, top bar, More)
- `src/features/feedback/components/feedback-button.tsx`, `src/features/ko-preview/components/ko-widget.tsx`, `ko-teaser*.tsx`
- the page headers of: captain home and tasks (`captain-workspace`, `dashboard/home`), programs/templates, exercises library, meal plans and foods library, forms (assessments), billing (subscriptions, packages)
- `src/ui/segmented*` only if needed for no-wrap, messages, tests

## What to build (phone only)
1. **One-row page header:** title (and one short subtitle line) on the start side; on the end side at most **one** icon button plus an optional ⋯ menu that holds every other action. The main page action (new package, new food, new plan, add player, new assessment…) is a single lime icon button with a translated `aria-label`, never a text pill that can cover the title. Never wrap; long titles truncate.
2. **No duplicate header:** a page that renders its own heading block does not also show the page-bar title on the phone. Hide the header search icon when the page already shows a search field.
3. **Programs:** one row of actions only; «اطلب من KO» once (in the ⋯ menu).
4. **Floating buttons:** on the phone the feedback button moves into More («ابعت ملاحظة») and is not floating. The KO bubble sits above the bottom bar on the end side, small (48px), and never overlaps the bar; page content gets bottom padding of bar height + safe area + 16px so the last card is fully visible. No page button renders behind the bottom bar.
5. **More:** remove the leftover search/bell/«حسابي» block; put search and the notifications bell in the More header (bell keeps its dot).
6. **Home:** one empty state when there are no tasks and no alerts; hide the change chip when there is no previous value.
7. **Segmented controls:** never wrap; scroll sideways when needed.
8. Keep every action reachable; nothing removed, only moved.

## Rules
- Below `md` only; desktop markup unchanged (add a test that renders a page bar at desktop and compares).
- v6 flag only; flag-off hashes unchanged. Strings in ar, arStd getter, en. Tokens, logical properties, 48px targets, files ≤ 250 lines, `<dialog>` has `sheet`.

## Done when
- Tests cover: header single row with at most one icon + menu, no duplicate title on tasks and exercises, More has no leftover block, feedback not floating on phone, content bottom padding, one home empty state, segmented no-wrap.
- `npm run check` passes.
