# T-003b — Public landing page

**Phase:** 1 · **Depends on:** T-UI-01 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
`/` becomes the public site that sells KOCHIVO to captains. It follows the approved mockup board `docs/mockups/Landing.dc.html` section by section. It loads fast on a mid-range Android phone, because most captains will see it from a WhatsApp link.

## Files
- `src/features/marketing/` (new):
  - `index.ts`
  - `content.ts`: every string and number on the page, typed, as the single place to edit copy
  - `marketing.test.ts`
  - `components/`: one file per section: `site-header.tsx`, `hero.tsx`, `slogan.tsx`, `preview-toggle.tsx`, `preview-player.tsx`, `preview-captain.tsx`, `stats-strip.tsx`, `how-it-works.tsx`, `features-grid.tsx`, `player-section.tsx`, `pricing.tsx`, `white-label-strip.tsx`, `faq.tsx`, `final-cta.tsx`, `site-footer.tsx`
- `src/app/page.tsx`: replace the placeholder. It only composes the marketing sections.
- `src/app/globals.css`: you may **add** the animation keyframes and utilities (requirement 4) at the end of the file. Do not change existing tokens.

## Requirements
1. **Match the mockup.** Read `docs/mockups/Landing.dc.html`. Its inline styles are the visual spec. Translate them to the Tailwind tokens and utilities (`glass`, `glass-strong`, `bg-lime`, `text-muted`, `rounded-card`, and so on), with no hex values. Copy the Arabic and English copy exactly as written there, into `content.ts`.
2. **Slogan.**
   - `YOUR NEXT / MOVE / STARTS HERE.` on three lines.
   - Manrope 800, uppercase, `dir="ltr"`, aligned to the start of the RTL page.
   - `MOVE` is outlined (text stroke in ink).
   - `STARTS HERE` is lime.
   - The Arabic line «خطوتك الجاية بتبدأ من هنا» sits under a lime beam line.
   - Size: about 84px on desktop and 52px at 700px or less. Use `clamp()`.
3. **Preview toggle.** «شوف كلاعب / شوف ككابتن» switches between two phone previews.
   - This is the only client component (`'use client'`) apart from FAQ if needed. Prefer `<details>` for FAQ, so it needs no JS.
   - Label it «معاينة توضيحية · بيانات مثال». Never show fake testimonials or fake user counts.
4. **Light animation**, CSS only:
   - The slogan lines rise in with stagger.
   - `MOVE` gets a one-time fill sweep.
   - The beam grows.
   - The phone floats slowly.
   - Sections reveal on scroll with `animation-timeline: view()` inside `@supports`, so older browsers just show them.
   - Everything is off under `prefers-reduced-motion: reduce`.
   - Use no JS animation libraries.
5. **Pricing** comes from `content.ts`:
   - ENTRY 0 ج (5 players)
   - CHAMPION 399 ج (20)
   - LEGEND 699 ج (40), marked «الأكثر طلباً»
   - EMPIRE 1,499 ج (100)

   Add the line «مفيش تجديد تلقائي. التفعيل بيتم على واتساب». Prices are pending owner confirmation, which is why they live in one file.
6. **Links.**
   - «ابدأ مجاناً» → `/login?tab=signup`
   - «جرّب الديمو» → `/login` for now, with a `TODO(T-012c)` comment
   - «لاعب ومعاك دعوة؟» → a short note that the player opens the link they received
   - WhatsApp contact → `https://wa.me/` with the number taken from `content.ts`. Use the placeholder `201000000000` and add a comment for the owner.
7. **Footer.** It must contain the exercise media attribution «© Gym visual» (AGENTS.md §4).
8. **Performance and SEO.**
   - Use `next/image` for images.
   - The page stays server-rendered except the toggle.
   - Add a `metadata` export with an Arabic title and description, and Open Graph.
   - No layout shift from fonts (fonts already come from `layout.tsx`).
9. **Accessibility.**
   - One `h1` (the slogan, with an `aria-label` holding the sentence in normal case).
   - Landmarks: `header`, `main`, `footer`.
   - Focus rings stay visible.
   - Touch targets are at least 48px.

## Acceptance
- [ ] `marketing.test.ts` checks:
  - `content.ts` has 4 plans with increasing prices and player limits
  - every FAQ item has a question and an answer
  - the footer text includes «© Gym visual»
  - the static markup of `page.tsx`'s sections (rendered with `renderToStaticMarkup`) contains exactly one `<h1`
- [ ] No `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, or `text-left`, and no hex, under `src/features/marketing/`
- [ ] `npm run check` and `npm run build` pass
- [ ] `/` is listed as static (○) in the build output

## Out of scope
- Real demo accounts (T-012c)
- Analytics
- The English version
- Changing any `src/ui` primitive (if one is missing, compose inside marketing and note it)
