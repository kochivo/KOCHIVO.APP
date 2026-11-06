# Exercise Library Mobile Implementation Plan

**Goal:** Make search, muscle filters, and the last exercise usable on a narrow screen.
**Architecture:** Update the existing picker/drawer presentation and translated placeholder; retain state and callbacks.
**Tech Stack:** Next.js, React, Tailwind v4, existing tokens.
**Spec:** `docs/tasks/T-108-exercise-library-mobile.md`.

## Review focus

RTL/LTR horizontal scrolling; full button labels and focus rings; 48px targets; last-row visibility; existing search/add/filter behavior.

- [x] Use a single horizontally scrollable pill row with padding and nonshrinking buttons.
- [x] Add localized search placeholder and consistent vertical gaps; add `pb-24` to results and scroll clearance to drawer.
- [x] Verify mobile overflow/scrolling, final item reachability, placeholder and add/filter interactions with the real demo.
- [x] Run full checks/build and independent review alongside T-109.

No new class-string tests for this reversible styling change. No shared Chip, database, dependency, or deployment changes.

## Verification record

- Real demo at 360×800: filter strip height 64px; all 13 buttons have 48px targets; horizontal strip content 938px within a 284px viewport, without page overflow.
- Search, Core/All selection, and exercise addition worked. English search placeholder and light theme were also checked.
- Results have 96px trailing padding; the final exercise bottom was 666px on an 800px screen after scrolling to the end.
- Independent review: no Important/Critical findings. The requested 16px gaps apply between sections; result rows intentionally use 12px.
- Initial full check caught the messages file exceeding the 250-line limit; grouped the related search-label/placeholder entries per locale. Retry passed.
- `npm run check`: passed, 375 test files / 2585 tests; release audit: 0 findings. `npm run build`: passed, 49 static pages. `git diff --check`: passed.
- Owner subsequently approved committing and publishing T-107, T-108, and T-109 on 2026-11-06.
