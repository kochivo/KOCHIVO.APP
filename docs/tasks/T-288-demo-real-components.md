# T-288 — The demo renders the real app's components with demo data

**Phase:** demo fidelity · **Depends on:** T-286 · **Status:** ready
Read `AGENTS.md`, `DESIGN.md`, `docs/tasks/V11-FIDELITY.md` and `docs/tasks/T-285-guided-demo.md` first.

## Why
The owner asked on 2026-11-15 why the demo does not look like the real system.

The guided demo (`src/features/demo/guided/*`) is a separate copy built from the old demo mockup. It does not use the real captain or player components, so it drifted. Today:

| Area | Real app on a phone | Demo |
|---|---|---|
| Captain navigation | Bottom tab bar: الرئيسية · المهام · الوارد · اللاعبين · المزيد (`roster/components/captain-frame-nav.tsx`) | Top tabs: الرئيسية · الرسايل · اللاعبين |
| Home hero | KO morning summary and the count of today's tasks (`dashboard/home/home-hero.tsx`) | «16 من 20» ring |
| Home cards | Four ring tiles plus the money-owed card (`home-tiles.tsx`, `home-side-cards.tsx`) | Three small tiles |
| Home tasks | Task list (`home-task-list.tsx`) | «مين محتاجك النهارده» |
| Labels | «الوارد» | «الرسايل» |

Every later change to the real app widens the gap.

## Goal
Each demo screen renders **the same presentational components as the real screen**, fed with the demo fixture data and the demo reducer state. A visitor sees the real product. Any future change to a real screen shows up in the demo with no demo edit.

The guided tour stays the same: its 13 steps, the guide card, the targets, the toasts, the intro picker and the summary. Also keep the phone and desktop split and the «ديمو · كل الأسماء والأرقام تجريبية» label.

## Approach: split view from data, do not fork
Most real screens are async server components that call `getT`/`getLocale` and load data, for example `HomeTiles`, `HomeHero` and the task list. The demo is a client island driven by a reducer, so it cannot render them as they are.

For each real screen the demo needs:
1. **Extract a pure view component.**
   - Props are the data plus the already-translated strings, or a `t` passed in.
   - Navigation is a prop: `href` for the real app, `onSelect` for the demo.
   - No data loading, no server imports, no `getT`.
   - Name it `<thing>-view.tsx` next to the original.
2. **The real server component becomes a thin wrapper.** It loads data and translations, then renders the view. Production markup and classes stay byte-for-byte the same where possible. Keep or extend the existing render tests to prove it.
3. **The demo renders the same view** with fixture data mapped from `state.ts`. Delete the demo's own copy of that screen (`captain-home.tsx`, `demo-ring.tsx`, `demo-row.tsx` and so on) once nothing uses it.
4. **Navigation chrome:**
   - The demo's captain pane uses the real captain frame nav: the bottom tab bar on phones, the side groups on desktop.
   - Extract a pure `CaptainFrameNavView` (items, active key, counts, `onSelect`) from `captain-frame-nav.tsx`. The real nav keeps its data hook.
   - The player phone uses the real player shell tab bar (`player-shell`) the same way.

### Screens to cover

| Demo screen | Real screen |
|---|---|
| Captain home | Hero, tiles, side cards, task list |
| Tasks | Captain tasks list |
| Inbox and chat | Workspace inbox list and conversation |
| Players | Roster list and row |
| Player file | Header and overview |
| Programs | Program list and editor rows |
| Nutrition | Plan editor view (read-only rows are enough) |
| Money | Billing summary and money-owed rows |
| Add player | Invite sheet |
| Player phone: workout | Real workout set rows and stepper |
| Player phone: food | Real food panel |
| Player phone: coach chat | Real coach chat |
| Player phone: me | Real «أنا» screen |

If a real screen cannot be split safely inside this card, keep the demo copy for that screen only and list it under "left as copy" with the reason.

## Hard rules
- **Perf:** `/demo` stays within its 280 KB budget (it is about 213 KB now). Captain and player routes must not grow by more than 1 KB each. A view file must never import a feature's `server.ts` barrel, Supabase clients, or `'use server'` actions. The demo must not import feature barrels that reach server code. Import the view leaf files directly. This broke the build twice before, which is why `src/features/demo/server.ts` exists.
- **No behaviour change in the real app.** Same markup, same classes, same strings, same links.
- **Demo data is labelled as demo.** It never reads or writes Supabase. «جرّب بحساب تجريبي» stays as is.
- **Copy:** reuse the real message keys, so labels match («الوارد», not «الرسايل»). Demo-only text (guide steps, toasts) stays in `demo/guided/messages.ts`.
- **Tour targets:** keep each `data-demo-target` on the new elements. Pass it through the view's props, or wrap the view in an element that carries it.
- RTL logical properties, tokens only, the T-278 spacing and type scale, the T-275 clickable cues.

## Files
- `src/features/demo/guided/*`
- The real components listed above, in `dashboard/home`, `roster/components`, `captain-workspace`, `inbox`, `billing`, `meal-plans/components`, `workout`, `player-shell`, `player-home` and `chat`. Only to split view from data.
- Their tests.

## Acceptance
- [ ] At 390px and 1440px, every demo screen is visually the same as the real screen with the same data. The reviewer compares screenshots side by side.
- [ ] The full 13-step tour still plays with no console errors and no horizontal scroll.
- [ ] A test asserts the demo imports the shared view components (not demo copies) for the home, the nav and the workout.
- [ ] Existing tests for the real screens pass unchanged, or are updated only where a file moved.
- [ ] `npm run check` and `npm run build` pass, and the perf budgets hold.
- [ ] The final message has a table: demo screen, real view used, left as copy (yes/no and why).

## Out of scope
- New demo steps or new content.
- The KO morning-summary strip redesign. When it lands, the demo picks it up through the shared hero view.
