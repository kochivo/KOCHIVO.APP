# T-284 — The real landing page matches the approved v10 mockup, 100%

**Phase:** public site · **Depends on:** T-281 · **Status:** ready
Read `AGENTS.md`, `DESIGN.md` and `docs/tasks/V11-FIDELITY.md` ("What 100% means") first.

## Goal
On 2026-11-15 the owner approved the landing mockup `docs/mockups/landing/index.html`, called v10 (its `<title>` still says v9). The owner wants the real home page at `src/app/[locale]/page.tsx` to look and move exactly like it. Open the mockup in a browser at 1440px and at 390px, scroll it, and hover the buttons before you start.

## What must match
The mockup's sections are, in order:
1. A sticky header: the real logo, links, the language switch, and the «ابدأ مجاناً» primary button.
2. **Hero `#hero`.** The slogan stays the hero. Copy its full visual and motion as-is:
   - the words rise one by one;
   - the lime block wipes in behind `MOVE`, then the text color turns to `on-lime`;
   - `.hv` holds the halo, the grid that follows the pointer (`--mx`, `--my`), the three skewed bars with scroll parallax (`--py`) and the streak lines.
   - Reduced motion shows the final state with no motion.
3. The "inside the product" sections, which are real captain and player screens drawn in HTML and CSS, not images. This includes the before/after block `.vs`.
4. **Player `#player`.**
5. **Demo `#demo-sec`.** Its call to action goes to `/demo` (T-285).
6. **Pricing `#pricing`.** It shows ENTRY 0, CHAMPION 399, LEGEND 699 and EMPIRE 1,499 a month, with limits of 5, 20, 40 and 100 players. These must come from `src/features/marketing/content.ts`; never hard-code a second copy.
7. **FAQ `#faq`.**
8. **The final slogan `#final-slogan`.** It animates when it enters the view (IntersectionObserver).
9. The footer. Keep the «© Gym visual» credit there, and only there.

## Rules
- Reuse `src/features/marketing`. Rework `hero.tsx`, `slogan.tsx`, `features-grid.tsx`, `pricing.tsx`, `faq.tsx`, `final-cta.tsx`, `site-header.tsx`, `site-footer.tsx` and `landing.module.css` to match. Split files that would pass 250 lines.
- **Buttons:** use `buttonClass()` / `<Button>` (T-281), which already match the mockup's `.btn.go` and `.btn.ghost`.
- **Styles:** colors come from tokens. The mockup's hex values map to `bg`, `surface`, `line`, `ink`, `muted`, `lime` and so on. CSS-only motion, following the motion rules in `DESIGN.md`. No new dependencies.
- **Copy:** every string lives in `src/features/marketing/messages.ts` (`ar`, `arStd`, `en`). Take the Arabic from the mockup word for word. The English must be short and plain; run the `unslop` checklist on it.
- **Both languages:** English renders LTR with the same layout mirrored.
- **Phones:** at 390px, no horizontal scroll, the hero does not overlap, and every target is at least 48px.
- **Performance:** keep `/` within the 200 KB first-load budget. Hero motion is CSS plus one small client island for the pointer, parallax and in-view classes. That island must pause when the hero is off screen (`useInView`, T-282).
- **Data:** keep `InstalledAppRedirect`, the metadata and the Open Graph image as they are.

## Tests
- Update `marketing.test.ts` for the new sections, the prices from `content.ts`, and the footer credit.
- Add a test that the reduced-motion CSS covers the hero and the final slogan.
- Add a test that no `text-[Npx]` one-off values appear in the touched files.

## Acceptance
- [ ] Side by side with the mockup at 1440px and 390px, Arabic and English, a reviewer cannot tell which is which, apart from real content.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
- [ ] The final message lists any place that could not match and why.
