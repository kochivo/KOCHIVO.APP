# T-040 — One-row mobile header with a menu

**Phase:** 3 · **Depends on:** none · **Status:** ready

## Problem
On phones the marketing header (`src/features/marketing/components/site-header.tsx`) breaks into two or three rows: logo and sign-up, then language, theme and login, then the links.

## Decision
- Tokens only. The owner's sketch used `bg-[#0a0a0a]/80 border-white/10 text-white`; use the matching tokens instead (`glass-strong` or `bg-bg/80 backdrop-blur-md`, `border-line`, `text-ink`) so light mode keeps working.

## Files
- `site-header.tsx`:
  - A single row on every width: `flex flex-nowrap items-center justify-between h-16`, sticky or `fixed top-0 inset-x-0 z-50`, `backdrop-blur-md border-b border-line`. If it becomes fixed, add top padding to the page so nothing hides under it.
  - Phones (below `md`): logo, the one primary «اعمل حسابك» button, and a menu button (`Menu` / `X` from lucide-react, translated `aria-label`, `aria-expanded`, `aria-controls`).
  - `md` and up: the links, language, theme and login inline as today (`hidden md:flex`).
- `src/features/marketing/components/site-menu.tsx` (new, client): the mobile panel. Holds the nav links, login, language and theme. Closes on link click, on Escape and on outside click; focus moves into it on open and back to the button on close; `glass-strong` panel under the header.
- `src/features/marketing/messages.ts`: "open menu" and "close menu".
- Tests: header renders one row of controls on mobile markup, the menu toggles and closes on Escape.

## Requirements
- Touch targets 48px. RTL logical properties only. No new dependencies.
- The landing page's first-load JS must stay within the perf budget: the menu is a tiny client component.

## Acceptance
- [ ] At 360px and 390px the header is one row, nothing wraps, and every control is reachable from the menu.
- [ ] Desktop looks as before.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
