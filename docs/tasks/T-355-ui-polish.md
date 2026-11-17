# T-355 — UI polish (landing, guided demo, login)

**Migration:** none. Client side only.

**Source:** `docs/tasks/UI-REVIEW-2026-11-17.md`, items P-4..P-9. On 2026-11-17 the owner asked to do all six.

## Items
1. **P-4 — landing plans on mobile are about 2,000px of scrolling**
   - Problem: under the mobile breakpoint the 4 plan cards stack one under the other, each with its full feature list.
   - Fix: on mobile only, show the plans as a horizontal swipe row (CSS scroll-snap, one card about 85% wide so the next card peeks). It must work in RTL: the first plan sits at the start edge. Desktop stays as it is.
   - No JavaScript carousel and no new dependency. Keyboard users can still reach every card (focusable buttons inside the cards are enough).
   - Test: a render test showing the mobile scroll-snap container class on the plans list.
2. **P-5 — the first FAQ item's arrow is not aligned with the others**
   - Find the cause (often a different default `open` state, a margin on the first child, or a rotate transform). Fix it so all arrows share one position.
3. **P-6 — the guided demo guide card covers content on desktop (steps 02 and 05)**
   - Fix: on desktop, place the guide card next to its target (the side with more room) instead of on top of it. Keep the minimize button. Mobile stays as it is.
   - The placement logic lives in `guide-spot.ts`; extend it and add cases to `guide-spot.test.ts`. The card must never leave the viewport.
4. **P-7 — the demo food photos are empty grey squares**
   - First check how the real app shows a food without a photo, and whether the demo foods point at images that exist.
   - If real images exist in the repo for these foods, wire them in. Otherwise, use the same fallback the real app uses (or a `lucide-react` food icon on a `glass` tile). No empty grey box, and no external image URLs.
5. **P-8 — short landing nav links on desktop are narrow** («أسئلة», FAQ)
   - Fix: add horizontal padding (logical properties) so each link is at least 48px wide. Do not change the header layout otherwise.
6. **P-9 — the login page has no way back to the home page**
   - Fix: make the KOCHIVO logo at the top of the login page a link to the locale home page (`/<locale>`). If there is no logo there, add a small quiet «الرئيسية» / "Home" link at the start side.
   - It needs a translated `aria-label` if it is icon or logo only. Strings go in ar, arStd and en. Do not change the login logic.

## Files (expected)
- `src/features/marketing/**`: pricing, FAQ, site header, landing CSS, messages, tests.
- `src/features/demo/guided/**`: guide card placement, food row or phone-food, tests.
- The login screen component only, for P-9.

## Out of scope
- Do not touch `package.json` or `package-lock.json`; Next is being upgraded separately.
- No migrations, billing, player or captain app screens.
- Do not change the slogan, the hero, or the footer credit «© Gym visual».

## Rules
- **Verify first:** re-check each item in the code before you fix it. If an item is not real, skip it and say why.
- **UI:** tokens only, logical properties, touch targets 48px or more, files 250 lines or fewer, every string in ar, arStd and en. Keep the dark brand look; change only what the fix needs.
- **Tests:** add a render or unit test for each fix that can be tested this way. Deterministic.
- **Gates:** `npm run check` and `npm run build`.
