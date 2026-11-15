# T-301: redesigned admin dashboard UI

## Goal
Build the admin page the owner approved: `docs/mockups/admin/admin-v1.html`. Open it at 1440px and at 390px. Match its layout and content. The «موجود» and «جديد» tags are mockup notes only; do not render them.

A parallel card, T-300, builds the data (SQL plus fetchers). This card builds the UI only, against the shared types in `src/features/admin/dashboard-types.ts`, which are already written. Do not change those types.

## Current state
- `src/features/admin/components/admin-screen.tsx` (props: captains, plans, audit, kpis, requests, search, offset).
- The other components are `kpi-row.tsx`, `captains-table.tsx`, `activate-panel.tsx`, `suspend-dialog.tsx`, `captain-requests.tsx`, `ko-waitlist-count.tsx` and `audit-list.tsx`.
- Messages are in `src/features/admin/messages.ts`; check whether a standard-Arabic file exists, as in other features.
- Do not touch `src/app/[locale]/admin/page.tsx`. The reviewer wires it.

## New props on `AdminScreen` (all optional, so the page keeps compiling)
- `dashboard?: { data: AdminDashboard | null; error: string | null }`
- `activity?: AdminCaptainActivity[]`, for the current page of captains.
- `loadDetail?: (captainId: string) => Promise<{ data: AdminCaptainDetail | null; error: string | null }>`, called when a row opens the side panel.

When a prop is missing or has an error, show the existing screen parts and a calm error or empty state for the new parts. Never crash.

## Build
1. **Top bar.**
   - The logo, the «الإدارة» chip and sign-out (keep the existing form action).
   - Search: keep the existing behavior. Ctrl/Cmd+K focuses it.
   - «تصدير CSV»: a client-side download of the loaded captain rows (name, email, tier, players, limit, plan end, state, last active). Escape CSV properly. No new dependency.
2. **"Needs a decision today" strip.** Four cards from `dashboard.actions`. Each card filters the table when tapped:
   - pending captains scrolls to the requests block;
   - expiring soon, over limit and quiet each set the matching table tab.

   A card with a count of 0 is calm (muted), not lime.
3. **KPI row.** Five tiles: mrr (with a small sparkline only if you have the data; otherwise skip it), captains, paid with %, players, and active captains.
   - Each shows its delta against `previous`. Lime when the number went up; danger only for active captains going down.
   - Numbers use `formatNumber` and the `num` style, with `dir="ltr"` on number pairs such as `38 / 40`.
4. **Signups chart.** 30 bars per series (captains, players) from `dashboard.signups`. Plain divs or inline SVG; no chart library.
   - Below the chart, one line naming the peak day.
   - Give the chart an accessible summary: a `figcaption` or `aria-label`.
5. **Captains table, redesigned.**
   - Tabs with counts from `dashboard.stateCounts`: all, paid, free, expiring soon, expired, unconfirmed, suspended.
   - Columns: captain (avatar initial, name, email), plan chip, players with a usage bar (amber at 90% and over), last active (relative, from `activity`), ends, state chip, and one context action:
     - «جدّد» (renew) when the plan is expiring;
     - «رقّي» (upgrade) when over the limit;
     - «فعّل» (activate) for a free captain;
     - «رجّع» (restore) for a suspended one;
     - otherwise «فتح» (open).
   - The action opens the side panel.
   - Below 720px the table becomes cards, as in the mockup.
   - Keep pagination, and keep the empty state with clear search.
   - The "expiring soon" tab filters the loaded rows by `activity.expiringSoon`. Note this limitation in the code if it applies.
6. **Captain side panel.** It replaces the current `ActivatePanel` placement and reuses its activation logic; do not duplicate the RPC call.
   - Three stats from `loadDetail`: players, trained this week, total paid.
   - Tier picker with prices, month chips 1/3/6/12 (keep the existing 1–12 limit), the payment reference, and the total line: «699 × 3 شهور · تبدأ بعد آخر يوم في الباقة الحالية» when a paid period is active.
   - The primary button «فعّل {tier} لـ {n} شهور».
   - «رسالة واتساب جاهزة»: a link to `https://wa.me/<digits>?text=<encoded>`, built from `detail.phone`, digits only.
     - Write the message in all 3 message sets (ar, arStd, en): a short renewal reminder with the tier and end date.
     - When there is no phone, show the button disabled with a hint.
     - It only opens WhatsApp; nothing is sent automatically.
   - Suspend and restore use the existing `SuspendDialog`.
   - «تاريخه»: the history list from `detail.history`.
   - Loading and error states. Escape closes the panel.
7. **Right column.**
   - Join requests: the existing `CaptainRequests`, restyled to the mockup.
   - Plan mix: a donut drawn with inline SVG.
   - KO waitlist: the existing component.
   - System health: cron jobs and failures, pending deletions, and one static line saying that leaked-password protection is an owner setting.
8. **Audit list.** Keep it, restyled as the mockup's timeline.

## Rules
- AGENTS.md applies: max 250 lines per file, one component per file, kebab-case names.
- Tokens only, no hex. Logical properties. The T-278 spacing scale and the T-275 click cues. Touch targets of at least 48px.
- Every string goes in messages (ar, arStd, en). No emoji. Apply plain wording to English.
- Keep the admin dark glass look (v11). Lime is the only action color, with one primary per view.
- Respect `prefers-reduced-motion`. No heavy animation.

## Tests
- Render tests with fixture `AdminDashboard` and `AdminCaptainDetail` data:
  - the strip counts, and calm styling at 0;
  - the KPI deltas;
  - the chart has 30 bars per series;
  - the tab counts;
  - the context action per state;
  - the CSV escaping (pure helper);
  - the WhatsApp link builder (pure helper: digits only, encoded text, disabled without a phone);
  - the screen still renders with no dashboard prop.

## Out of scope
SQL, the data fetchers, `src/app`, and other features.

## Gates
1. `npx vitest run src/features/admin src/ui`
2. `npm run typecheck`
3. `npm run lint`
