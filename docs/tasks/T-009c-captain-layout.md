# T-009c — Captain layout: one shell for every captain page, active link from the path

**Phase:** 3 · **Depends on:** T-009, T-010, T-011, T-012 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
Every page under `/captain` gets the same sidebar (desktop) and bottom nav (mobile), and the current page is marked as active. Today only `/captain` itself renders `CaptainShell`, and the active link is hard-coded to «اللاعبين». The inbox, the program builder, and the nutrition builder have no nav at all. Several links point to routes that do not exist yet.

## Files
- `src/features/roster/nav.ts` (new, pure):
  - `captainLinks` lists only the destinations that exist or are being built now, in this order:
    - اللاعبين `/captain` (Users)
    - المهام `/captain/inbox` (Inbox)
    - الاشتراكات `/captain/billing` (CreditCard)
    - الإعدادات `/captain/settings` (Settings)
  - `captainNav(pathname)` marks the active link:
    - `/captain` is active on exact match, and also for `/captain/players/*`, `/captain/programs/*`, and `/captain/nutrition/*`, because the builders are opened from a player
    - every other link matches its own prefix
  - `mobileCaptainNav(pathname)` returns the same 4 items.
- `src/features/roster/components/captain-nav.tsx` (new, `'use client'`): uses `usePathname()` and renders both:
  - the desktop link list, styled exactly as in `captain-shell.tsx` today, with `aria-current="page"` on the active link
  - the mobile `BottomNav` with `className="lg:hidden"`
- `src/features/roster/components/captain-shell.tsx`: keep the layout, the KOCHIVO link, and `SignOutButton`. Replace the hard-coded `links`/`mobileLinks` and their rendering with `<CaptainNav />`. Remove the TODO comment.
- `src/app/(captain)/captain/layout.tsx` (new, thin): `<CaptainShell>{children}</CaptainShell>`
- `src/app/(captain)/captain/page.tsx`: drop the `CaptainShell` wrapper (the layout provides it). Keep everything else.
- `src/features/roster/roster.test.ts`: add `captainNav` cases:
  - `/captain` → اللاعبين
  - `/captain/players/x/programs` → اللاعبين
  - `/captain/nutrition/abc` → اللاعبين
  - `/captain/inbox` → المهام
  - `/captain/billing` → الاشتراكات
  - `/captain/settings/x` → الإعدادات
  - unknown → none

## Requirements
1. No visual change to the roster page except that the active state now follows the path.
2. Do not edit `src/features/inbox/**`, `programs/**`, or `meal-plans/**`. If any page there renders its own outer `<main>` with padding that now doubles up with the shell, write it under «Notes for reviewer» rather than changing it.
3. The `/captain/billing` and `/captain/settings` pages are being built in parallel by other tasks. Linking to them is expected; do not create them.
4. Files are under 250 lines, use tokens only, use RTL logical properties, have targets ≥ 48px, and use Egyptian Arabic.

## Acceptance
- [ ] The new `captainNav` tests pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Inbox badge counts
- Templates, programs, and nutrition index pages (T-017)
- The billing and settings pages
- `src/features/roster/index.ts`. Its exports stay as they are; another task adds to it.
