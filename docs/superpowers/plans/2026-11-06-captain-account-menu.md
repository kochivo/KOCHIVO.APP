# Captain Account Menu Implementation Plan

> **For agentic workers:** Implement inline with executing-plans; obtain independent code review before publication.

**Goal:** Restore discoverable mobile access to Settings and Payments.
**Architecture:** A small client component in the shared captain header uses the native auto popover with a labeled trigger, existing localized navigation labels and existing destinations. Theme tokens and logical positioning preserve RTL and light/dark behavior.
**Tech Stack:** Next.js, React, Tailwind, native Popover API, Vitest, Playwright.

- [x] Write a failing localized markup/target regression.
- [x] Implement the account popover and wire it into the mobile header.
- [x] Verify toggle, outside/Escape dismissal, links and mobile geometry; request independent review.
- [ ] Run check/build/performance, publish and verify live assets/routes.

## Verification

RED: new component import initially failed before implementation. GREEN: 13 focused tests passed. Full check passed: 377 files, 2595 tests, TypeScript, ESLint and release audit. Independent review found no material issues. Browser verified RTL/LTR at 320/390px: both links, native Escape with focus return, outside dismissal and close-on-link-click; desktop has six links and mobile four. Demo entry returned unavailable, so the actual shared shell and PageContainer were rendered in a temporary preview route, removed before successful production build. No database changes; zero new Supabase advisor findings. Sentry remains connected only in Claude and cannot be monitored here.
