# T-064 — iPhone safe areas and mobile sizing

**Phase:** 3 · **Depends on:** none · **Status:** ready (owner iPhone screenshot, 2026-11-04)

## Problem
- On iPhone, when KOCHIVO is opened from the home screen (standalone PWA), the iOS status bar (clock, signal, battery) draws **on top of** the landing header: the hamburger, «ابدأ مجاناً» and the logo.
- The cause:
  - `src/app/[locale]/site-metadata.ts` sets `statusBarStyle: 'black-translucent'`, and `layout.tsx` sets `viewportFit: 'cover'`, so the page extends under the status bar.
  - Only `dialog:modal` (globals.css) and `workout/components/focus-screen.tsx` respect `env(safe-area-inset-top)`.
  - The marketing `site-header.tsx` (sticky, `top-0`, `h-16`), the captain shell (`player-shell/components/captain-screen.tsx` and the captain layout and sidebar) and the player shell (`player-shell.tsx`) do not.
  - The same is true for auth pages and any other top-level layout.
- The Arabic eyebrow «للكباتن الأونلاين» uses `.marketing-eyebrow { letter-spacing: .2em }`. Letter-spacing breaks Arabic letter joining, so it looks broken.

## Changes
1. **Tokens:** in `globals.css` add `--safe-top: env(safe-area-inset-top, 0px)` and `--safe-bottom: env(safe-area-inset-bottom, 0px)` next to `--safe-start` and `--safe-end`. Use them below instead of repeating `env()`.
2. **Marketing header:**
   - The sticky header adds `padding-block-start: var(--safe-top)`, keeping its 4 rem content row. Its translucent background must cover the status-bar area, so content scrolling underneath never shows through text.
   - The mobile menu panel height becomes `calc(100dvh - 4rem - var(--safe-top))` and still sits right under the header.
   - Any in-page anchor offset or `scroll-margin` that assumes 4 rem must include the safe top.
3. **App shells:** every top-level screen container that starts at the top of the viewport (the captain screen and sidebar, the player shell, the auth layout, onboarding, suspended, offline, admin, demo, the public coach page `/c/[slug]`) gets `padding-block-start: max(<current top padding>, var(--safe-top))`, or the sticky header in it gets the safe top like the marketing header. Find them by reading `src/app/[locale]/**/layout.tsx` and the shell components. Do not double-pad screens that already handle it (`focus-screen`, dialogs).
   - Bottom-fixed bars already use `env(safe-area-inset-bottom)`. Switch them to `var(--safe-bottom)` only if the change is trivial.
4. **Arabic letter-spacing:**
   - Never apply letter-spacing to Arabic text. In `globals.css` add `:lang(ar) .marketing-eyebrow, [dir='rtl'] .marketing-eyebrow { letter-spacing: 0; }`.
   - Grep `src` for `tracking-` and `letter-spacing` and apply the same rule wherever the text can be Arabic: use `ltr:tracking-…` or a `:lang(ar)` reset. Keep tracking for Latin-only brand text such as «COACH BETTER».
5. **Mobile sizing pass** at widths 360, 375, 390 and 430 px, on the landing page, login, the captain dashboard, the player home, a workout and settings:
   - nothing overflows horizontally
   - no text overlaps
   - header and primary buttons never wrap onto two lines
   - touch targets are ≥ 48 px
   - the hero headline (`YOUR NEXT MOVE STARTS HERE.`) uses a `clamp()` size that fits 360 px without clipping
   - fix only what is actually broken, using tokens and logical properties

## Tests
- A CSS test that `globals.css` defines `--safe-top` and that `.marketing-eyebrow` has a `letter-spacing: 0` rule for Arabic.
- `site-header.test.ts`: the header uses the safe top, and the menu panel height subtracts it.
- A test (static source check like the existing ones) that each top-level shell or layout container you changed references `--safe-top`.

## Requirements
- Use tokens and logical properties only.
- Files ≤ 250 lines.
- No new dependencies.
- Do not change `statusBarStyle` or `viewportFit`: the edge-to-edge look is intended. The fix is the padding.
- Do not edit `src/features/programs` (another agent is redesigning it) or `src/features/notifications` / `settings-screen.tsx` (another agent is adding push).

## Acceptance
- [ ] On an iPhone home-screen app, the status bar sits on the header's background, never over buttons or the logo, on landing, captain and player screens.
- [ ] Arabic eyebrows render joined.
- [ ] No horizontal overflow at 360–430 px on the listed screens.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build` and the perf budget pass.
