# T-179: Public coach page, new layout (no database change)

**Phase:** Public page (owner approval 2026-11-11; design v2 approved 2026-11-13) · **Depends on:** T-166 (the flag) · **Status:** ready

## Goal
The approved design is `docs/mockups/landing/coach-page.html`. Match its layout and content. Its look is the app's own (owner decision 2026-11-13: public pages use the same style as the app): `Button` from `@/ui` (pill/rounded, lime primary), `glass` cards with the hairline border and `rounded-card`, the featured glass for the highlighted package, the page glow the app already uses, and the existing fonts. No new visual language. The one brand accent kept from the mockup is the lime skewed slash from the logo, behind the hero portrait and the closing card (owner decision 2026-11-13); it is decorative (`aria-hidden`) and cuts in once. One-time entrance motion only. The older `docs/mockups/captain-workspace/public-page.html` is superseded.

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
- [x] A flag-off test: today's component tree is unchanged.
- [x] Tests for the WhatsApp helper (https only), each request state, a missing bio, a missing avatar, missing socials, no published catalog, and one featured tier.
- [ ] All gates pass.

## Out of scope
- New data (T-180): specialties, stats, years, languages, spots, waitlist (T-181).
- The OG image route.
- Any migration.

## Implementation review notes (2026-11-13)
- The legacy render tree is preserved behind the disabled flag. A literal environment guard also allows the new client islands to be removed from flag-off builds.
- New sections are server-rendered; the mobile dock and duration buttons are small client islands. Published day-based packages keep their duration choices and billing offer calculations. Request states suppress signup actions throughout the new layout.
- The specialties, spots, numbers and facts slots remain empty for T-181. No response-time or availability promises are invented.
- Focused verification: `8 passed` coach-page test files, `41 passed` tests, using `--configLoader native --pool threads`. Including the safe-area regression suite: `9 passed` files, `55 passed` tests. The full alternate run had `702 passed` files and `4403 passed` tests, plus one skipped test and a safe-area failure; that failure was fixed and verified by the targeted rerun. Repository typecheck and lint passed during the gate run. Release rules, including new files, reported `Release audit: 2767 files, 0 findings` through a shell pipeline.
- `npm run check` is blocked in the release audit by `spawnSync git EPERM`; the default Vitest loader also encounters child-process restrictions. `npm run build` fails before compilation with `Could not find the Next.js package (next/package.json)`: this worktree's `node_modules` resolves outside the Turbopack root. A webpack attempt encounters `spawn EPERM`.
- `/c/[slug]` first-load JS: before unavailable; after (flag off) unavailable; after (flag on) unavailable. Both baseline and modified production builds fail before producing route bundles, so the 200 KiB gzip budget and flag-off size equality remain unverified.
- Browser rendering of the reference and implementation remains unverified: the browser access host is unavailable, and native Edge access was not approved. The reference HTML and styles were read directly.
- Reviewer (2026-11-13): in the main checkout `npm run check` passes (only the known `demo` load flake)
  and `npm run build` passes. Flag-off render checked locally on `/ar/c/aly` (legacy page, no sideways scroll).
  The flag-on page is still to be checked visually on staging.
