# Vercel Analytics Integration Plan

> **For agentic workers:** Execute inline; independent review before release.

**Goal:** Mount the owner's installed Analytics package globally without intercepting its endpoints.
**Architecture:** Mount a small lazy client boundary once in the locale root, loading the official Next integration separately. Extend the proxy matcher only for the reserved insights namespace; keep CSP and authentication unchanged elsewhere.
**Tech Stack:** Next.js, @vercel/analytics 2.0.1, Vitest.
**Spec:** `docs/tasks/T-113-vercel-analytics.md`.

- [x] RED: locale-root Analytics presence and proxy endpoint bypass regressions.
- [x] GREEN: mount Analytics once, reserve insights routes.
- [x] Independent review, full check (378 files / 2605 tests), production build and performance budget.
- [ ] Authorized publication and live endpoint verification.

Ruling: the direct root import exceeded the existing player-profile first-load budget (311.09 KiB against 310 KiB). Keep that budget unchanged and load the SDK through React lazy/Suspense in a dedicated chunk. Production build and performance budget pass with this implementation; verify live pageview tracking after deployment.

Independent review found no material issues in the final lazy wrapper or proxy integration. Supabase advisor comparison: 91 existing findings, zero new. Sentry remains unavailable in this chat. The owner's pre-existing package installation is included unchanged.
