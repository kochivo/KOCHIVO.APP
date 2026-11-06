# T-101 — Captain desktop home: edge sidebar and first-run layout

**Phase:** V1 polish · **Depends on:** T-094 · **Status:** ready (owner approved the mockup on 2026-11-06)

## Goal
On a 1920px screen the captain area today floats in the middle: the whole shell is capped at 1600px, the sidebar is a glass card with an empty strip beside it, the plan chip sits far away from the greeting, and a new captain sees two very wide cards with little inside. After this card the sidebar is pinned to the screen edge, the plan lives in the sidebar, and a new captain (0 players) sees a stats row, a 3-step start card, and a side column with the page link and join requests.

Mockup (desktop, 1920, RTL), reading from the start side (right):
```
| sidebar 248px, full height, border-e  | content, padded, inner max ~1640px centered            |
| KOCHIVO                               | Greeting h1 + intro                         [bell]      |
| nav items                             | [stat][stat][stat][stat]                                |
|                                       | [ 3-step start card (1.6fr) ] [ page link card (1fr) ]  |
|                                       |                               [ join requests      ]  |
| ---- plan: name, used of limit, bar   |                                                         |
```

## Files
Create or modify only these (plus their tests):
- `src/ui/page-container.tsx`: the `captain` variant stops capping the width at `lg` (no max width, no horizontal padding at `lg`); below `lg` unchanged.
- `src/features/roster/components/captain-shell.tsx`: edge sidebar, content padding, and a `sidebarFooter?: ReactNode` slot.
- `src/app/[locale]/(captain)/captain/layout.tsx`: passes the sidebar plan to the shell.
- `src/app/[locale]/(captain)/captain/page.tsx`: passes `JoinRequests` and the page-link card into the dashboard as slots instead of rendering `JoinRequests` after it.
- `src/features/billing/components/plan-badge.tsx` (+ a new `plan-sidebar.tsx` if cleaner) and `src/features/billing/index.ts`: export the plan display through the index; fix the existing deep import in `captain/page.tsx`.
- `src/features/dashboard/components/dashboard-screen.tsx`, a new `start-steps-card.tsx`, `dashboard/messages.ts`.
- `src/features/coach-page/components/join-requests.tsx` (drop the `my-6` outer margin; the parent sets the spacing), a new `coach-link-card.tsx` (+ a small client `copy-link-button.tsx`), the data read for the captain's `public_slug`, `coach-page/messages.ts`, `coach-page/index.ts`.

## Requirements
1. **Shell at `lg` and up:**
   - The sidebar is flush with the start edge of the viewport, full viewport height and sticky, `w-60` or close to it.
   - It is not a floating rounded glass card. Use a quiet surface plus a `border-e border-line`.
   - The brand sits at the top and the nav sits below it. The `sidebarFooter` slot sits at the bottom (`mt-auto`), separated by a top border.
   - The content column is `flex-1 min-w-0` with one gutter (around `px-12`, `pt-9`). Its inner wrapper is `mx-auto w-full max-w-[1640px]`.
   - The bell row stays as it is. Remove any spacing that only existed for the old plan chip so the greeting does not drift down.
   - Below `lg`, everything (mobile top bar, bottom nav, paddings) looks exactly as today.
2. **Sidebar plan (`lg` only):**
   - Show the plan name, then "used of limit" (reuse the existing `myPlan`/`usage` strings), then a thin progress bar (`bg-surface-raised` track, `bg-lime` fill, `text-warn`/`bg-warn` when full). Give the bar an accessible label.
   - The whole block links to `/captain/billing`.
   - Error state: reuse `PlanBadgeError`. Loading state: `fallback={null}` is fine.
   - Below `lg`, the plan chip stays in the dashboard header as today, but is hidden at `lg` (`lg:hidden`) so it is not shown twice.
3. **Dashboard, 0 players** (replaces the single `NextTaskCard` in that branch):
   - Header.
   - The same 4 stat cards as the normal branch, showing zeros.
   - A grid with `lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]`:
     - **Start side: `StartStepsCard`** (`glass-strong`).
       - Title «ابدأ مع أول لاعب في 3 خطوات», subtitle «كل خطوة بتاخد دقيقة أو اتنين».
       - It is a real sequence, so it gets numbered steps with dividers:
         1. «ضيف أول لاعب ليك» / «اكتب اسمه، وابعتله لينك الدعوة على واتساب», with the existing `InviteButton` as the only lime action on the screen. The step number is in a lime circle.
         2. «اختار له برنامج» / «من قوالب البرامج الجاهزة، أو اعمل برنامجك».
         3. «حدد خطة الأكل» / «السعرات والبروتين، واللاعب يسجّل أكله من الموبايل».
       - Steps 2 and 3 are muted and have no buttons.
       - Write short plain English equivalents.
     - **End side: a column** containing the page-link card, then the join requests.
   - Below `lg`, the same blocks stack in this order: stats, steps, link, requests.
   - Keep `data-tour="captain-home"` on the steps card so the product tour still finds it.
4. **Dashboard with players:**
   - Unchanged, except the join requests slot moves into the end column above `PlayerFinder`, and the page-link card is not shown.
5. **`CoachLinkCard`:**
   - Title «لينك صفحتك», subtitle «أي حد يفتحه يقدر يطلب يتدرب معاك».
   - If the captain has a valid `public_slug`, show `kochivo.site/c/<slug>` in an LTR box with a copy button. Copy the full `https://kochivo.site/c/<slug>`. Show the status «اتنسخ» or the copy-failed text in a `role="status"`, and reuse the same approach as `public-slug-field.tsx`.
   - If there is no slug, show «اختار لينك لصفحتك من الإعدادات» with a secondary link to `/captain/settings`.
   - Read errors show a short inline error. The card must never break the dashboard.
6. **`JoinRequests`:**
   - The empty state reads «لسه مفيش طلبات. أول ما حد يطلب من لينك صفحتك هيظهر هنا», with a lucide `Inbox` icon in a dashed circle.
   - Keep the existing list and error behaviour.
7. **Rules:**
   - Tokens only, logical properties, `min-w-0` on grid and flex children, `min-h-12` targets.
   - All strings in `messages.ts` (ar + en).
   - Western digits are fine where the app already uses `formatNumber`.
   - Captain perf budget 310 KB: the copy button is the only new client code, so keep it tiny.

## Tests
- Shell render test:
  - the sidebar classes (edge, full height, `border-e`)
  - the `sidebarFooter` slot renders
  - no `max-w-[1600px]` on the captain container at `lg`
  - the player `PageContainer` is unchanged
- Dashboard test for 0 players: stats, the 3 steps in order, exactly one lime action, and the slots rendered in the end column.
- Dashboard test with players: the requests slot renders and the link card does not.
- `CoachLinkCard`: the with-slug, no-slug, and error states.
- Plan sidebar: the full and not-full states, and the link to billing.
- Update the existing `captain-shell.test.ts`, `page-container.test.ts`, and dashboard tests that assert the old classes.

## Out of scope
- Player screens, the other captain pages' content, nav items, new data or migrations, the streak/pricing/check-in cards (T-098 to T-100).

## Acceptance
- [ ] At 1920 the sidebar touches the right edge in Arabic and the left edge in English. There is no empty strip outside it.
- [ ] At 1280 and 1440 there is no horizontal scroll. At 375 and 768 it looks as today.
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npm run build`, `npx vitest run --maxWorkers=2` (includes the perf budget).
