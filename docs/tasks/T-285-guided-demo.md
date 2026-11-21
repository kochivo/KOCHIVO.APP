# T-285 — The guided demo: the mockup's idea, 100%, drawn with the real app's look

**Phase:** public site · **Depends on:** T-281, T-284 · **Status:** ready
Read `AGENTS.md`, `DESIGN.md` and `docs/tasks/V11-FIDELITY.md` first.

## Goal
On 2026-11-15 the owner approved the demo mockup `docs/mockups/landing/demo.html`, and the four additions shown in `docs/mockups/landing/demo-ideas.html`. Open both and play the whole tour before you start.

The owner wants this experience at `/demo` with every step and behaviour from the mockup. The visuals must be the real app's: the v11 captain workspace and the v3 player screens, using our components, tokens, buttons, popups and icons. The mockup's own CSS drawing must not be used.

## The experience (all of it must work)
1. **Opening question.** «قبل ما نبدأ، عندك كام لاعب؟» with the choices 1–5, 6–20, 21–40 and +40, plus «عدّي، ورّيني على طول».
   - The choice sets N to 5, 20, 40, 100, or 18 for skip.
   - Every number in the demo follows N: players, trained today (`round(N*.78)`), the home ring, the roster count and the captain card.
   - «من الأول» shows the question again.
2. **Two live screens side by side.** On the left is the captain workspace (home, inbox, players, player file, programs, food, assessments, money, add player). On the right is Mohamed's phone (workout, food, coach chat, me).
   - They are wired to each other, exactly as in the mockup state model (`S0()`, `go()`, `sendC()`, the `done` set logging, `renew`, `pay`, `invite`, `approve`, `swap`, `addex`, the rest timer).
   - A view switch shows one screen at a time below 980px.
3. **The guide card.** It walks through 13 steps. A step moves on when the visitor does the action it asks for (`fire(ev)`), or when they press next.
   - A ring highlights the target, and the card can be minimized and closed. On phones it becomes a bottom sheet, and the target scrolls into view above it.
   - The card is in our identity: a lime top edge, the slash behind it, a big outlined step number in Changa, and 13 skewed progress segments.
4. **The pulse.** Logging a set sends a lime dot from the phone's done button to the captain's live feed, with a ripple where it lands. Sending a message to Mohamed sends it from the composer to the phone's coach tab.
   - Use transform-only WAAPI or CSS.
   - Skip the pulse under reduced motion, or when either end is not visible.
5. **"يومك بالأرقام".** The last step shows three tiles: the number of distinct actions done, the elapsed time as m:ss, and N players.
   - Below them, it recommends a plan: ENTRY for N≤5, CHAMPION for ≤20, LEGEND for ≤40, otherwise EMPIRE. Prices come from `src/features/marketing/content.ts`.
   - Then «استكشف براحتك» and the primary button: «ابدأ مجاناً» for ENTRY, otherwise «ابدأ بـ {plan}», which links to `/#pricing`.
6. **Popups.** Every action shows the rich success popup (T-281) with the same titles as the mockup.

## Rules
- **Where it lives.** Build it in `src/features/demo/guided/`. Use small files: a state reducer, the step list, the guide card, the pulse, the intro, and the captain and phone panes. Each pane reuses the real presentational components where they render without Supabase.
  - Where a real component needs data hooks, write a thin demo wrapper that passes fixture data to the same presentational pieces. Do not fork their styling.
- **Nothing real happens.** No network, no Supabase, no `saveAndQueue`. The demo is pure client state.
  - The existing account-based demo (`demo-screen.tsx`, `start-demo.ts`, Turnstile) stays reachable from the last step as «جرّب بحساب تجريبي».
- **Labels.** The header shows a «ديمو · كل الأسماء والأرقام تجريبية» pill. These are the only fixture numbers allowed in the product.
- **Copy.** Every string lives in `src/features/demo/messages.ts` (`ar`, `arStd`, `en`). Take the Arabic from the mockup, and run the `unslop` checklist on the English. Use logical properties only. Touch targets are at least 48px.
- **Performance:** `/demo` stays within its 280 KB first-load budget. Load the captain pane's heavier views lazily.
- **Tests:**
  - the reducer (each step's event moves the step);
  - N scaling and plan choice;
  - the summary counts;
  - pulse skip conditions;
  - restart;
  - a render test for the intro and the last step.
  - Use injected `now`.

## Acceptance
- [ ] At 1440×900 and 390×844, the full 13-step tour plays from the question to the summary. The steps advance on the right actions, nothing overflows, and there are no console errors.
- [ ] It looks like KOCHIVO's real app, not like the mockup's drawing, and matches the mockup's layout and flow 1:1.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
