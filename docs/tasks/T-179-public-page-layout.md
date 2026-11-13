# T-179: Public coach page, new layout (no database change)

**Phase:** Public page (owner approval 2026-11-11; design v2 approved 2026-11-13) · **Depends on:** T-166 (the flag) · **Status:** ready

## Goal
The approved design is `docs/mockups/landing/coach-page.html`. Match its layout and content. Its look is the app's own (owner decision 2026-11-13: public pages use the same style as the app): `Button` from `@/ui` (pill/rounded, lime primary), `glass` cards with the hairline border and `rounded-card`, the featured glass for the highlighted package, the page glow the app already uses, and the existing fonts. No new visual language, no skewed slashes. One-time entrance motion only. The older `docs/mockups/captain-workspace/public-page.html` is superseded.

Rebuild `/c/[slug]` as a short page that tells a visitor in ten seconds who the captain is, what they do, what it costs and how to start. This card uses only data that already exists:
- `loadPublicCoach`: name, bio, location, avatar, social;
- the published package catalog through the existing `fetchPackageCatalog(captainId)` (tiers with `features` and `is_featured`, packages, offers). RLS already exposes only a published catalog.

The page is behind `captainWorkspaceEnabled()`. When the flag is off, the page renders exactly what it renders today.

## Files
- `src/features/coach-page/components/` (new section files; `coach-page.tsx` becomes the flag switch), `messages.ts`, tests.
- `src/app/[locale]/c/[slug]/page.tsx` only if the switch must sit there; keep the route thin.
- Page-scoped styles: use `@theme` tokens. If a mockup color has no token, add the token to `globals.css` rather than a hex in a component.
- This card.

## Requirements
1. **Top bar:** the small KOCHIVO logo (`public/brand/logo-primary.png`) and «دخول اللاعبين» linking to the existing login. The page is the captain's, not a KOCHIVO ad.
2. **Hero:**
   - «كابتن موثّق على كوتشيفو» mark and the location;
   - the name, large, as in the mockup (first word chalk, the rest lime);
   - the bio's first paragraph as the tagline (the full bio goes in «عنّي»);
   - the avatar in the angled portrait card. No avatar: the first letter of the name, as in the mockup;
   - the primary «اطلب تشترك» using the existing `coachSignupHref(slug)`;
   - «كلّمني واتساب» when `social.whatsapp` is a valid https URL. Reuse the existing URL check and make it a pure, tested helper.
   - Empty named slots for T-181: specialties chips and the spots line.
3. **Request status.** The existing `requested` states (`sent`, `member`, `linked`) replace the CTAs with a status box. Keep today's copy and behaviour.
4. **Sections, in the mockup order:**
   - an empty named slot for the T-181 numbers strip;
   - «هنشتغل مع بعض إزاي»: 3 static steps;
   - «الباقات»: from the published catalog. One card per visible tier (max 3, catalog order) with its price, its `features` list inside the card, and «الأكثر طلباً» as a badge next to the name for `is_featured` (never over the price). Hide the section when nothing is published. Reuse the existing pricing logic (prices, offers); restyle only.
   - «كل حاجة في تطبيق واحد»: static app preview with sample content only, no player data;
   - «عنّي»: the full bio, the location, and social icon links. Each icon-only link has a translated `aria-label`. Empty named slot for T-181 facts (years, languages);
   - closing lime band «جاهز نبدأ؟» with the primary action;
   - footer «الصفحة دي معمولة على KOCHIVO».
5. **Phone.** Under `md` the hero CTAs are hidden and a fixed bottom bar holds «اطلب تشترك» and the WhatsApp button, with safe-area padding. It appears once the hero name scrolls away (a tiny client island is fine).
6. **Motion.** One-time entrances and hover states only; nothing loops; no blur or glow; `prefers-reduced-motion` turns all of it off.
7. **Performance.**
   - The page stays a Server Component apart from small client islands (the dock, the entrance observer).
   - The avatar `<img>` approach stays as it is.
   - Report the `/c/[slug]` first-load JS before and after. Flag off must not grow. Stay within the public route budget (200 KiB gzip).
8. **Rules.** Tokens only, logical properties, all strings in messages (`ar`, `arStd`, `en`), no emoji.

## Acceptance
- [ ] A flag-off test: today's component tree is unchanged.
- [ ] Tests for the WhatsApp helper (https only), each request state, a missing bio, a missing avatar, missing socials, no published catalog, and one featured tier.
- [ ] All gates pass.

## Out of scope
- New data (T-180): specialties, stats, years, languages, spots, waitlist (T-181).
- The OG image route.
- Any migration.
