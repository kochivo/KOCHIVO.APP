# T-298: landing keeps the English slogan under browser translation; header shows language and theme toggles on phones

## Problem
The owner opened kochivo.site in Arabic, in Chrome on an iPhone.

1. **The slogan was mangled.** It came out as «يتحرس التالي لك E هنا. يبدأ».
   - The messages are already English in both locales (`src/features/marketing/messages.ts:70,100`).
   - `slogan.tsx` already sets `dir="ltr" lang="en"`.
   - Chrome's page translation still rewrites it, because nothing marks it as not to be translated.
   - The owner's decision: the slogan stays English, even on the Arabic page.
2. **No EN/AR switch and no dark/light toggle on the phone.**
   - `landing.module.css:228` sets `.headerEnd > :not(:last-child) { display: none; }` at 620px and below. That hides the language switch and the login link, so only the signup button is left.
   - The landing header has no theme toggle at all. `src/ui/theme-switch.tsx` already has a `compact` mode (a single icon button that cycles system, light and dark).

## Do
1. **Slogan.** On the slogan heading (both the hero and the final one), add `translate="no"` and `className` `notranslate`, so Chrome, Safari and Google Translate skip it.
   - Keep the `aria-label`, `dir="ltr"` and `lang="en"`.
   - Do the same for any other place on the landing that renders the slogan words, if one exists. Grep for `sloganFirst`.
2. **Header toggles on every width.**
   - Add `<ThemeSwitch compact />` to `site-header.tsx`, next to `<LanguageSwitch compact />`.
   - Import it from the leaf module `@/ui/theme-switch`.
   - At 620px and below, keep the language switch, the theme toggle and the signup button visible. Hide only the login link, if space requires it.
   - The row must fit at 360px with no horizontal scroll and no wrapping of the signup label. Tighten the gaps or the signup padding if needed. Use tokens and logical properties only.
   - Both toggles need a translated `aria-label`. ThemeSwitch compact likely has one already; check it.
   - Touch targets must be at least 44px high; keep `min-h-12` where it is already used.
3. **Theme correctness on the landing.**
   - Switching to light must actually change the landing: the logo already swaps through `theme-dark-only` and `theme-light-only`.
   - If the landing forces dark somewhere (for example a `data-theme` attribute on a wrapper, or hard dark tokens in `landing.module.css`), report it under Notes for reviewer. Do not restyle the landing.
   - The goal for this card is that the toggle exists and flips `html[data-theme]`.

## Files
- `src/features/marketing/components/slogan.tsx`
- `src/features/marketing/components/site-header.tsx`
- `src/features/marketing/components/landing.module.css`
- A test, either a new `src/features/marketing/landing-header.test.ts` or an existing marketing test:
  - the slogan markup has `translate="no"`;
  - the header renders both the language switch and the theme switch;
  - the 620px rule no longer hides the language switch.

  Source-reading tests are fine; follow how the existing marketing tests do it.

## Out of scope
- Restyling the landing.
- Other pages.
- The slogan text itself.
- `e2e/`.

## Gates
1. `npx vitest run src/features/marketing src/ui`
2. `npm run typecheck`
3. `npm run lint`
