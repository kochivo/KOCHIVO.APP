# T-112 — Approved mobile dark UI

Owner approved the proposed dark mobile preview on 2026-11-07. Implement safe top padding, primary Renew/subdued Freeze, four primary profile segments, dark search with an icon, clean muscle pills and white exercise thumbnails. Preserve Account menu, captain bottom four/desktop six, one-scan InBody values and all billing/search behavior. Preserve analysis/readiness as secondary profile links. Keep existing theme switching; no forced dark mode, dependencies, auth/schema changes or data mutations.

## Files

- `src/app/globals.css` — safe-top and media background tokens.
- `src/features/roster/components/captain-shell.tsx`, `captain-account-menu.tsx` — safe wrapper/sticky header/popover positioning.
- `src/features/billing/components/billing-manager-card.tsx` — action emphasis.
- `src/features/player-profile/components/profile-screen.tsx`, `profile-tabs.tsx` — responsive primary/secondary navigation.
- `src/features/player-profile/profile-tabs.test.ts` — navigation coverage.
- `src/features/programs/components/exercise-picker.tsx` — search/icon/thumbnail UI.
- `src/features/body-scans/components/scan-metrics.tsx`, `scan-metrics.test.ts` — compact metric units and one shared comparison hint for a single scan.
- `src/lib/safe-areas.test.ts` — follow the shared captain top-inset token while retaining the safe-area contract.
- This task card and `docs/superpowers/plans/2026-11-07-premium-mobile.md`.

Temporary `src/app/[locale]/mobile-review/page.tsx` and `src/features/mobile-review-fixture/**` may render the actual shared components with deterministic sample data for browser review if demo is unavailable; remove them before final checks/build/publication.

## Acceptance

320/390px RTL/LTR, safe-top 0/59px and safe-bottom 0/34px: no overlap/horizontal document scroll, header and Account dropdown below notch, last content above nav. Four primary profile links fit without scrolling; analysis/readiness remain accessible with unique active state. Renew dialog and frozen/busy guards stay intact. Search/filter/add behavior stays intact and images retain lazy/reduced-motion behavior. One record shows measurements and no invented delta. Verify full checks/build/perf and obtain independent review. Publish under standing owner authorization. Sentry remains unavailable here (owner confirmed Claude connection).
