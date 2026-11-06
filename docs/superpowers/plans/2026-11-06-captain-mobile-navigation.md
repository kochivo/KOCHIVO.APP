# Captain Mobile Navigation Implementation Plan

**Goal:** Reduce mobile navigation to four clear destinations and keep page-end content/actions accessible.
**Architecture:** Derive a captain-only mobile navigation list from existing navigation metadata; keep the shared renderer generic and desktop unchanged. Introduce a shared bottom-clearance token, apply it to captain main/player wrapper, and style the existing billing actions using theme-aware tokens.
**Tech Stack:** React, Next.js, Tailwind v4, Vitest, Playwright review.
**Spec:** `docs/tasks/T-110-captain-mobile-navigation.md`.

## Review focus

Four captain-only destinations and their active states; unchanged player nav; mobile safe-area and desktop spacing; visible final rows with fixed program action bar; Renew/Freeze behavior and light-theme contrast.

- [x] Write/run a failing regression for four ordered captain destinations and preserved active states.
- [x] Add the mobile list and wire it only to captain BottomNav; distribute items evenly.
- [x] Move captain clearance onto main using a shared token with at least 7rem and the nav/safe-area calculation; retain no-nav workout behavior.
- [x] Give Renew lime-ink text and a token-based lime border; keep Freeze muted.
- [x] Verify responsive geometry, safe-bottom 0/34px, RTL/LTR, light/dark, and billing controls with the real UI. Run focused/full checks and production build; obtain independent review.

No class-string tests are added for the reversible styling; navigation behavior receives a regression test. Publication follows the owner's existing apply-and-publish instruction in this chat.

## Verification record

- RED: the new mobile-nav regression initially failed because the dedicated mobile destination helper did not exist.
- GREEN: 125 focused tests passed. Independent review also ran captain-nav, captain-shell, and builder UI suites (18 tests passed); no Important/Critical findings.
- Real demo, RTL/LTR, widths 320/390px, safe-bottom 0/34px: exactly four evenly sized links, minimum 64.5×56px; no horizontal overflow; main padding 112/140px; last content 32–38px above the nav.
- Desktop keeps six destinations. Renew retains its dialog and frozen/busy guards. Its measured dark/light text colors are brand lime and accessible dark green; Freeze remains muted. No billing mutation was submitted.
- Full check passed: TypeScript, ESLint, release audit, 376 test files / 2593 tests. Production build passed. Supabase advisor comparison: 91 existing findings, zero new findings.
- Publication authorized by the owner's standing instruction. Sentry monitoring remains unavailable in this chat; the owner confirmed the connection is in Claude.
