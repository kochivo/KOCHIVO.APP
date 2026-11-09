# Local KO Preview Implementation Plan

> **For agentic workers:** Execute inline; obtain one independent review before completion. No publication is authorized.

**Goal:** Run the approved KO floating teaser locally for captain and player, without showing it in Beta.
**Architecture:** A small client feature checks development mode and exact loopback hostname before rendering. Shells lazy-load it only in development. A protected /dev/ko page permits immediate role review without authentication or production data. Use real generated transparent avatars and existing native dialog primitives.
**Tech Stack:** Next.js, React, Tailwind, native dialog, Vitest, Playwright.
**Spec:** `docs/tasks/T-114-local-ko-preview.md`.

- [x] RED: loopback/development gate, role copy, expression order and non-chat teaser tests.
- [x] GREEN: localized widget, assets, shell integration and dev preview.
- [x] Browser verification: roles/locales/mobile/desktop/safe areas, expressions, dismissal and reduced motion; independent review.
- [x] Full check/build/perf, verify production hides widget/preview, restart loopback dev server. No commit/push/deploy.

Ruling: position KO at the logical start edge while existing Feedback uses the end edge. This avoids competing floating controls without moving existing feedback.

## Verification ledger

- RED: policy module did not exist; GREEN: 14 policy tests pass. Localized non-chat panel and SSR guard tests plus shell suites passed (31 focused tests).
- Browser: 16 role/locale/mobile/safe-area cases passed. All three expressions, Escape/focus return, desktop outside dismissal and no form/input were verified. Request monitor observed zero non-GET requests. Reduced motion enabled. Three avatar PNGs have alpha transparency.
- The shared global `dialog:modal` max-block-size/padding overrode panel bounds on mobile. Local inline max-block-size/padding now applies a safe-top/nav-aware bound without changing shared dialogs. Header stays sticky when content scrolls.
- The existing native-sheet source contract expects the `sheet` class explicitly at the call site; added it, and the targeted sheet/KO suites passed (18 tests).
- Independent review: no material findings, including final public API imports and development-conditional shell render sites.
- Bind localhost, not 127.0.0.1: Next's development canonical host handling produced a self-redirect with the latter. The proxy/auth code is unchanged; localhost is loopback-only.
- No commits, staging, push, deployment, database/auth/environment changes are authorized or performed.
- Production build and performance budget passed. The preview import must live inside a positive development-only branch; an early notFound() guard alone still retained its compilation graph. Production HTTP verification: both role-preview URLs return 404; login returns 200 with no KO launcher markup. Existing captain feedback/install loading remains unchanged.
- Final `npm run check` passed: 380 files / 2622 tests, lint, typecheck and tracked-file audit. Six Vitest workers avoided local memory pressure. Final `npm run build` and post-build performance budget passed. Dev preview restarted at `http://localhost:3101/dev/ko`, bound only to loopback. HEAD remains `65fac62`.
