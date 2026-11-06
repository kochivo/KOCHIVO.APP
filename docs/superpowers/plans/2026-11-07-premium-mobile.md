# Approved Premium Mobile Implementation Plan

> **For agentic workers:** Execute inline with executing-plans; request one independent review before publication.

**Goal:** Apply the approved mobile UI while keeping every existing destination and data behavior.
**Architecture:** Reuse current navigation, InBody calculation and theme tokens. Add a profile navigation component with four primary segments plus two secondary links, and scope visual changes to captain shell, billing actions and library picker.
**Tech Stack:** Next.js, React, Tailwind, Vitest, Playwright.
**Spec:** `docs/tasks/T-112-premium-mobile.md`.

## Constraints and rulings

- Tokens and logical properties only; no dependency or database changes. Retain light mode and dark mode.
- Use `max(3rem, safe-top)` once, rather than two competing top-padding classes; sticky header and Account popover share that inset.
- Existing global bottom clearance is already at least 7rem with safe-area support. Retain it and verify geometry.
- Existing InBody latest-value logic and four-item captain navigation already meet the request. Verify their regression tests instead of rewriting them.
- Preserve analysis/readiness links below the four-segment control; removing existing features was not requested.

## Steps

- [x] RED: write a localized profile navigation regression covering four primary links, both secondary destinations and exactly one active destination.
- [x] GREEN: implement profile navigation, safe top spacing, action emphasis, dark search and white thumbnail backgrounds.
- [x] Verify real components with deterministic browser data, RTL/LTR, safe areas, themes, active navigation, search/filter and billing dialog; remove review fixtures.
- [x] Independent review, check/build/perf and release audit.
- [ ] Authorized publication and live verification.

## Verification ledger

- Navigation RED: missing component before implementation; GREEN: localized primary/secondary destinations and unique active state pass.
- First-scan hint RED: repeated three times; GREEN: a single shared hint, recorded values remain visible, comparisons/missing/zero cases preserved.
- Browser: 16 RTL/LTR × 320/390px × safe-top 0/59px × safe-bottom 0/34px cases; no document overflow, last content 32–38px above nav. Actual shell is wrapped in the production PageContainer. Account popover stays below the safe inset and dismisses; Renew dialog opens; both themes checked. Library search, muscle filter, add callback, visible search padding and white thumbnail background verified.
- Review used actual components with deterministic server-action transport fixtures, not production data. Temporary routes and fixtures removed before final gates. Sample exercise media is illustrative in screenshots; shipping media paths/lazy loading are unchanged.
- Independent review: no material issues, 73 focused tests plus 13 after the metric refinement passed.
- Full check: TypeScript, ESLint, release audit and 378 files / 2597 tests passed. Existing safe-area test now follows the shared captain token and verifies its safe-top calculation.
- Production build and performance budget passed; staged release audit: 1495 tracked files, zero findings.
- Supabase advisor comparison: 91 pre-existing findings, zero new. Sentry unavailable in this chat, as already confirmed by owner.
