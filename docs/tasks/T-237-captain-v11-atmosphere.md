# T-237 — Captain workspace: v11 look (light, glass rim, glow), light on weak phones

**Phase:** captain v11 · **Depends on:** none · **Status:** ready

## Goal
The whole captain workspace gets the look the owner approved in the v11 mockup:
- a soft lime light at the top, and two coloured lights at the bottom (lime and the rest-day blue `--color-calm`);
- glass cards with a fine bright rim;
- a lime glow on the main button.

It must stay smooth on cheap Android phones, so we draw the effect in a cheap way and switch it off where the device asks for that. The player area does not change.

## Files
Create or modify only these:
- `src/app/surfaces.css`: a captain-scoped aurora utility, and a rim on featured or strong glass inside the captain area
- `src/app/globals.css`: captain-scoped token values only (a new `[data-area='captain']` block, next to the existing `[data-mood='rest']` block)
- `src/app/[locale]/(captain)/captain/layout.tsx`: add `data-area="captain"` to the existing `bg-glow` wrapper. Nothing else changes in that file.
- `src/ui/orbs.tsx`: only if a second decorative layer element is needed (it stays `aria-hidden`)
- `src/app/surfaces.test.ts` or the existing CSS or token test file, whichever exists: tests for the new rules

## Requirements
1. **Scope.** Every rule lives under `[data-area='captain']` and dark theme only, the same way `bg-aurora` uses `theme-dark-only`. Player screens, the public site and the light theme render exactly as before.
2. **Background light** (captain only):
   - Lime glow at the top end: `color-mix(in srgb, var(--color-lime) ~16%, transparent)`.
   - A lime orb at the bottom start.
   - A blue orb at the bottom end using **`--color-calm`**, the same blue as the player rest day: `color-mix(... var(--color-calm) ~12%, transparent)`.
   - A faint 44px grid that fades out with a radial mask, around 2.5% white.
   - **Draw it with static `radial-gradient` layers on the existing fixed `bg-aurora` layer.** Do not use `filter: blur()` on any large element. Do not animate `background`.
3. **Optional slow drift.**
   - Only `transform` on that one fixed layer, over 30s or more, `alternate`.
   - Switch it off for `prefers-reduced-motion: reduce`, `html[data-glass='solid']`, and screens narrower than 768px.
4. **Glass rim.** `glass-featured` and `glass-strong` inside the captain area get a 1px gradient rim: white about 22% at the top start, fading to transparent, then to lime about 12% at the bottom end.
   - Use the same `::before` mask technique `glass-featured` already uses.
   - Don't add a rim to plain `glass` rows or list items (too many paints).
5. **Blur budget.**
   - Inside the captain area, real `backdrop-filter` stays only on the sidebar, the mobile bottom nav, sheets and dialogs.
   - Cards (`glass`, `glass-strong`) in the captain area use their fill colour without backdrop blur. The look stays the same because the background is soft.
   - Reuse the existing `--glass-blur-filter` variable to turn it off. Do not fork the utilities.
6. **Primary action glow.**
   - The lime primary button in the captain area uses the existing `--shadow-lime-glow`, and `--shadow-lime-glow-hover` on hover.
   - Still one primary action per screen. No glow on secondary buttons.
7. **Fallbacks stay intact.**
   - `html[data-glass='solid']`, `@supports not (backdrop-filter)` and `prefers-reduced-transparency` all show solid surfaces with no rim.
   - Text contrast on cards stays AA. Check muted text on the brightest part of the light.
8. Tokens only. No hex values in components. Colours come from the existing palette plus `color-mix`.

## Acceptance
- [ ] On `/captain` in dark mode: lime light at the top, lime and blue at the bottom, rim on featured cards, glow on the main button. `/` (player) looks unchanged.
- [ ] No `filter: blur` on large layers, and no `backdrop-filter` on captain cards (checked by a CSS test that reads the built rules or the source).
- [ ] The drift is off under reduced motion, under the solid-glass setting, and below 768px (CSS test).
- [ ] The light theme and the player area are unchanged (test or snapshot of the token blocks).
- [ ] `npm run check` and `npm run build` pass.
- [ ] In the final message, the implementer notes the screens they compared against the mockup.

## Out of scope
- Any layout or content change on captain screens. Those are T-233 to T-236.
- Player screens, the light theme, the landing page.
- New colours outside the existing palette.

## References
- Mockup: `docs/mockups/captain-workspace/v11-prototype.html` (the «wow» look: `.orbs`, gradient glass rim, `.btn.go` glow).
- Existing code: `src/ui/orbs.tsx`, `src/app/surfaces.css` (`bg-aurora`, `glass-*`), `src/app/globals.css` (`[data-mood='rest']` uses `--color-calm`).
- Owner note 2026-11-14: the blue is already used for the player rest day, so it is part of the brand.
