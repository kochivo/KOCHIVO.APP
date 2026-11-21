# KOCHIVO premium design concept

A reviewable, local-only visual proposal covering **all 36 existing page routes**. The application and its database are unchanged.

## Visual direction

- Existing Kochivo neutrals and lime, with dark and light appearances.
- Matte opaque surfaces, quieter borders, fewer cards, more room around content.
- Two existing font families: Manrope and Alexandria. Clear labels and restrained type hierarchy.
- An editorial public homepage, a list-first captain workspace, and a task-first player experience.
- Native controls, logical RTL properties and at least 48px action heights. Mobile workout controls are larger.
- The public brand slogan and `© Gym visual` footer attribution are retained.

## Explore

```text
node docs/mockups/premium/build.mjs
node docs/mockups/premium/server.mjs
```

Open [the preview](http://127.0.0.1:4320). The first selector changes the area; the second shows each page within that area. Navigation inside the concept works as well. Appearance can be switched using the labeled light/dark button.

`kochivo-premium.html` is the self-contained conversation fragment; `index.html` is the standalone browser wrapper. Both are generated from the authored files. All data is fictional and all changes stay in memory. Invitation, OTP, review, subscription and onboarding actions are visual simulations and do not contact a server.

## Coverage

| Area | Pages |
|---|---|
| Public | Homepage, captain profile, demo selector, KO coming-soon |
| Authentication | Login/signup state, invitation/code state, forgot password, reset password |
| Captain | Dashboard, roster, player overview, assigned programs, assigned nutrition, player preview, inbox, templates, program builder, meal-plan builder, team ranking, billing, settings |
| Player | Home, workout/rest state, nutrition/alternatives, progress/check-in/InBody states, history, rank, captain/subscription, settings, onboarding |
| System | Captain approval pending, offline, suspension, admin, design specimen, KO developer preview |

The model test discovers every current `src/app/**/page.tsx` and verifies that a matching concept exists, including dynamic routes.

## Files

| File | Responsibility |
|---|---|
| `messages.ts` | Egyptian Arabic copy, page names and sample data |
| `model.mjs` | Route coverage and pure roster search |
| `model.test.mjs` | Coverage, fallback and search tests |
| `ui.mjs` | Shared visual primitives, tables, inputs and typography structure |
| `public.mjs`, `auth.mjs` | Public pages and authentication concepts |
| `captain.mjs`, `player.mjs`, `system.mjs` | Page-specific content and navigation shells |
| `app.mjs` | In-memory navigation, representative interactions and optional host design controls |
| `styles.css` | Tokens extracted from the app and shared primitives |
| `public.css`, `auth.css`, `captain.css`, `player.css` | Area-specific visual styling |
| `responsive.css` | Narrow-screen layout adjustments |
| `frame.html` | Preview controls, product surface and dialog |
| `build.mjs` | Embeds existing fonts, brand assets, palette, renderers and the concept photograph |
| `server.mjs` | Local preview server, port 4320 |
| `verify.mjs` | Every-page browser QA and representative interaction checks |
| `review/` | Page screenshots and the current validation report |

## Image asset

`assets/editorial-strength.png` was generated using the built-in imagegen tool; `assets/editorial-strength.jpg` is the compressed website derivative. This is an illustrative image, not a photograph of an actual Kochivo client or a demonstration of bench-press technique.

Prompt: Premium editorial fitness photograph, landscape, black and white, cropped athlete's chalk-covered hands gripping a dark barbell in a real-textured matte gym, no visible face, side light, dark negative space for Arabic text, no text, logos, UI, colored lighting, neon, particles or cinematic smoke.

## Verify

```text
node --test docs/mockups/premium/model.test.mjs
node docs/mockups/premium/verify.mjs
npm run check
npm run build
```

Browser QA checks all pages in light and dark at 1024, 390 and 320px, as well as search, empty state, workout logging/rest, meal alternatives, invitation/onboarding, local review responses, the program builder and the mobile captain menu. Project check/build results are reported separately; unrelated application failures are outside this design task's scope.
