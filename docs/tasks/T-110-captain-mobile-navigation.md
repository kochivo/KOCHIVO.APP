# T-110 — Captain mobile navigation and content clearance

**Status:** implemented and verified, 2026-11-06; publication authorized by the owner.

## Goal

Show four mobile captain destinations in order: Home, Players, Programs, Tasks. Keep the six-link desktop sidebar. Put shared safe-area-aware bottom clearance on the captain's main content and reuse it in the player wrapper without affecting workout focus mode. Highlight Renew with brand-green text/border and keep Freeze muted.

## Files

- `src/features/roster/nav.ts`, `components/captain-nav.tsx`, `components/captain-shell.tsx`
- `src/features/roster/captain-mobile-nav.test.ts`
- `src/features/roster/captain-shell.test.ts` — preserve the existing main-content contract without depending on an exact class string.
- `src/ui/bottom-nav.tsx`
- `src/app/globals.css`
- `src/features/player-shell/components/player-shell.tsx`
- `src/features/billing/components/billing-manager-card.tsx`
- `docs/superpowers/plans/2026-11-06-captain-mobile-navigation.md`

## Acceptance

Mobile captain nav has exactly four routes in the requested order and marks nested player routes correctly. Desktop retains Settings/Payments; no new dropdown is added. Items stay evenly distributed with 48px+ targets. Main content can scroll past the nav at 320/390px with 0/34px safe-bottom in RTL/LTR. Renew/Freeze callbacks and disabled guards remain unchanged; player nav and workout controls retain their destinations/behavior.

No database, dependencies, or global button palette changes are part of this task. Commit and publication follow the owner's standing instruction in this chat to apply and publish the requested changes.
