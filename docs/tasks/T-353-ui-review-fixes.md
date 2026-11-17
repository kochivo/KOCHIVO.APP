# T-353 — UI review fixes (landing, login, guided demo)

**Migration:** none. This card changes the client side only.

**Source:** `docs/tasks/UI-REVIEW-2026-11-17.md`, with screenshots in `docs/tasks/ui-review-2026-11-17/`. On 2026-11-17 the owner asked to fix U-1..U-7 and P-1..P-3.

## Items
1. **U-1 — the landing header on mobile hides «دخول»**
   - Problem: the login link is `display:none` under the mobile breakpoint, and there is no menu. A returning captain only sees «ابدأ مجاناً».
   - Fix: keep a visible login link on mobile, either next to the main button as a quiet secondary link or in a small menu. Lime stays the only primary action. Touch targets are 48px or more.
   - Test: a render test showing the login link on the mobile markup.
2. **U-2 — the demo's mobile captain bottom bar floats in mid-screen**
   - Problem: on short steps (05, 08) the bar sits in mid-screen with an empty band under it.
   - Fix: pin it to the bottom of the demo phone or viewport, in the same way the real captain shell does it.
3. **U-3 — in the demo's tasks list, «ابعت رسالة» overlaps the subtitle on mobile** (the «عمر خالد» row)
   - Fix: let the row wrap, or move the button under the text on narrow widths. Nothing may overlap at 360px or wider.
4. **U-4 — the demo chart title runs into the number**
   - Problem: it reads «الوزن في 8 أسابيع-3.4كجم».
   - Fix: put a space or separate element between them, and keep the signed number in one bidi-isolated unit so the minus sits right in RTL (`dir="ltr"` or `<bdi>` on the number).
5. **U-5 — English strings in the arStd block of `src/features/demo/guided/messages.ts`**
   - Problem: `exercises`, `library` and `bench` are in English inside the arStd block.
   - Fix: translate them into simple standard Arabic, following `docs/I18N-STYLE.md`.
   - Test: arStd has no Latin-only exercise names in these keys.
6. **U-6 — the landing and the demo disagree on how long the demo takes**
   - Problem: the landing says 3 minutes, and the demo says 4.
   - Fix: use one number in `src/features/marketing/messages.ts` and the demo (all three styles). Use the one the demo actually shows: 4.
7. **U-7 — the demo summary (step 13) has three wording problems**
   - "20 Player" must be plural. Use plural-aware strings in all three styles.
   - The timer value (mm:ss, for example "0:17") is labelled "Minutes". Use a label that fits mm:ss, such as «الوقت» / "Time".
   - The summary says «سجّل مجموعة وصلت» even when the visitor skipped that step. Show that line only when the set step was really done. This is driven by the guided state, so add a test in `state.test.ts` or next to it.
8. **P-1 — on desktop, the landing hero phone covers the «متأخر» KPI card**
   - Fix: adjust the layout so the KPI number is fully visible at 1366×850 and 1280×800.
9. **P-2 — the footer credit line mixes its order in RTL**
   - Fix: add `dir="ltr"` (or `<bdi>`) on the «KOCHIVO © · Gym visual ©» line.
   - The «© Gym visual» credit must stay in the public footer. Do not move or remove it.
10. **P-3 — the landing «فلوسك واضحة» card wraps badly on mobile**
    - Problem: «نوفمبر» falls alone onto a new line, and «دفع 1,000 من 2,000» wraps.
    - Fix: tighten the layout or wording so each label fits on one line at 390px.

## Files (expected)
- `src/features/marketing/**`: landing header, hero, money card, footer, messages.
- `src/features/demo/guided/**`: bottom bar, tasks row, chart title, summary, messages, state tests.
- Login only if U-1 needs a shared link component. Do not change the login logic.

## Out of scope
- T-354 (freeze requests) runs in parallel. Do not touch billing, player-shell or any migrations.
- P-4..P-9 stay as they are.
- Do not change the slogan.

## Rules
- **Verify first:** re-check each item in the code before you fix it. Use the screenshots if they help. If an item is not real, skip it and say why.
- **UI:**
  - Use tokens only and logical properties.
  - Touch targets are 48px or more.
  - Files have 250 lines or fewer.
  - Every string goes in ar, arStd and en.
  - Keep the dark brand look. Do not restyle anything beyond what the fix needs.
- **Tests:** add a render or unit test for each fix that can be tested this way. Tests must be deterministic.
- **Gates:** `npm run check` and `npm run build`.
