# T-218: Homepage redesign (owner-approved mockup, app style)

**Phase:** Public pages (owner approval 2026-11-13) · **Depends on:** none · **Status:** ready

## Goal
Rebuild the KOCHIVO homepage (`src/app/[locale]/page.tsx`, `src/features/marketing/`) to match `docs/mockups/landing/kochivo-landing.html`. The page should feel modern and credible, never "AI-generated": real logo, real features only, light on phones.

The look is the app's own (owner decision 2026-11-13): `Button` from `@/ui`, `glass` cards with the hairline and `rounded-card`, the featured glass for the highlighted plan, the page glow the app uses, the existing fonts and tokens. No new visual language.

## Files
- `src/features/marketing/` (components, `content.ts`, `messages.ts`, tests). Replace or remove sections as listed below; keep `site-header`, `site-footer`, `installed-app-redirect`, `faq` and `pricing` files, reshaped.
- `src/app/[locale]/page.tsx`: only the section list; keep the route thin.
- `globals.css` only for a missing token.
- This card.

## Requirements
1. **Header:** the real logo (`public/brand/logo-primary.png`), section links (يوم الكابتن · المميزات · الباقات · أسئلة), «دخول», primary «ابدأ مجاناً». A thin lime reading-progress line on top; the header gets slimmer after the hero. Phone: logo and primary only.
2. **Hero:**
   - kicker «للكباتن الأونلاين»;
   - the slogan as the `h1`, exactly «YOUR NEXT / MOVE STARTS / HERE.» in English, MOVE in lime (owner rule: the slogan never changes);
   - the Arabic line «خطوتك الجاية بتبدأ من هنا» and the sub line from the mockup;
   - CTAs «ابدأ مجاناً · لحد 5 لاعبين» and «شوف إزاي بيشتغل»; «لاعب ومعاك دعوة؟ ادخل من هنا»;
   - two tilted phone previews (player logging a set, captain «محتاجين منك») with sample data marked «بيانات مثال», two small notification cards that pop in once, the stepper that ticks 62.5 → 65 once, and a subtle pointer parallax on fine pointers only.
3. **«ليه كوتشيفو»:** before/after cards; the "after" ticks land one by one.
4. **«يوم كابتن عادي»:** the pinned-phone scroll story 9:02 → 10:15 → 10:16 → 10:20 with the step rail under the phone. Under `md` the phone pins at the top and the steps scroll under it.
5. **«كل اللي محتاجه»:** the numbers strip (1,300+ تمرين · أكل مصري · 3 ضغطات; counts up once), then the feature cards 01–06 with icons from the existing icon set, plus 07 «KO مساعدك» and 08 «ترتيب اللاعيبة» each marked «قريباً».
6. **Pricing:** the four plans from the existing pricing source (ENTRY, CHAMPION, LEGEND, EMPIRE). Each plan lists its own features inside the card, so a plan can later get its own extras. LEGEND is featured with «الأكثر طلباً» as a badge next to the tier name, never over the price. EMPIRE's line is «لو عندك عدد كبير من اللاعبين». The note «مفيش تجديد تلقائي…» stays. **No white-label strip** (remove `white-label-strip.tsx` from the page).
7. **FAQ:** the four questions in the mockup. Remove the offline question.
8. **Closing card** «ابدأ بأول لاعب النهارده.» and the footer with the logo and «© Gym visual» (owner rule: the credit lives only here).
9. **Copy rules:** never mention working offline anywhere on this page. No emoji. All strings in `messages.ts` (`ar`, `arStd`, `en`).
10. **Motion and weight:** one-time entrances and hover/press states only; nothing loops; no blur on large areas; `prefers-reduced-motion` turns all of it off. Client JS only in small islands (progress line, story observer, counters, parallax). Stay within the public route budget (200 KiB gzip) and report before/after.

## Acceptance
- [ ] Tests: the slogan text is exact; no offline wording in any locale; no white-label strip; each plan renders its own feature list; LEGEND badge outside the price; «قريباً» on KO and ranking; the footer credit is present.
- [ ] Reduced motion: no animation classes applied.
- [ ] `npm run check` and `npm run build` pass; budgets reported.

## Out of scope
- The coach public page (T-179, T-181).
- New pricing data or plan changes.
- Testimonials or any invented numbers.
