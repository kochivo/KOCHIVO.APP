# T-045 — Premium surface system (glass, glow, motion, sizing)

**Phase:** 3 · **Depends on:** T-041, T-044 merged · **Status:** ready
**Follow-ups:** T-046 (captain screens) and T-047 (player screens) apply this system screen by screen.

## Why
The owner approved a direction (mockups shared on 2026-11-03) and gave strict rules so the app stops looking flat and templated. This card builds the shared system only: tokens, `src/ui` primitives and the app shell. Screens adopt it in T-046/T-047.

## Owner rules, translated to tokens
Components never write `bg-white/[0.02]` or hex. Each rule becomes a token or utility in `src/app/globals.css`, with a light-mode variant.

1. **Depth**
   - `bg-glow`: a faint radial lime light at the top of the page over `bg`. Dark: lime at about 14% fading to transparent by 65%. Light: about 6%. Applied once on the app shell background, never on cards. It replaces the current `mesh` where `mesh` is used as a page background.
   - `glass` (default card): surface at 2% white, `backdrop-blur-xl`, 1px border at 8% white, inset top highlight `inset 0 1px 0` at 10% white. Light mode: white at 60%, border at `line-soft`, a softer highlight.
   - `glass-strong` (hero card, focus-mode panel, big numbers): about 5% white, 12% border, a stronger highlight. It must still pass `src/ui/contrast.test.ts`; update that test only if the measured pair changes, and keep the AA thresholds.
   - Remove flat grey fills from `GlassCard`, `Segmented`, `TextField` and `BottomNav` in favour of these utilities.
   - Glow on buttons stays tight, on the primary only. The owner rejected wide button glows earlier.
2. **Responsive layout**
   - New `PageContainer` in `src/ui/page-container.tsx`: `mx-auto w-full max-w-7xl px-4 md:px-6`.
   - New `CardGrid` in `src/ui/card-grid.tsx`: `grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3`.
   - Use both in the captain and player layouts under `src/app/[locale]/(captain|player)/**/layout.tsx`. Routes stay thin.
3. **Type and button sizing**
   - Body defaults to `text-sm`, and `text-base` from `md`. Section headings are `text-base md:text-lg` with `tracking-tight`, using `font-display`.
   - Exception: gym numbers (weights, reps, calories, money totals, the focus-mode stepper) stay large, in `font-display` with `tabular-nums`. Add a `Stat` primitive (`src/ui/stat.tsx`, sizes `md` and `lg`) for them.
   - `Button`: `w-full md:w-auto` by default, with a `block` prop that keeps it full width on desktop (sheets, the focus mode). `min-h-12` stays; gym controls stay bigger.
   - Muted text uses `text-muted`. Tune the `--color-muted` value only if contrast tests allow.
4. **Micro-interactions**
   - `hover-lift` utility: `transition-all duration-300 ease-out`, and inside `@media (hover: hover)` it adds `-translate-y-1` and the glass hover fill (4% white). Touch phones get no hover jump; they keep `press`.
   - `GlassCard` (when interactive) and `Button` use it.
   - Respect `prefers-reduced-motion`: no translate, colour change only. Extend the existing reduced-motion block.
5. **Spacing**
   - Cards: `p-3` or `p-4` on mobile, `md:p-6`. Build this into `GlassCard` (`padding` prop: `sm` = `p-3 md:p-4`, `md` = `p-4 md:p-6`).

## Files
- `src/app/globals.css`: the utilities above, with the dark and light values. Keep the file under 250 lines; if it grows past that, move the surface utilities to `src/app/surfaces.css` and import it.
- `src/ui/glass-card.tsx`, `button.tsx`, `segmented.tsx`, `text-field.tsx`, `bottom-nav.tsx`: adopt the utilities.
- New `src/ui/page-container.tsx`, `card-grid.tsx` and `stat.tsx`, exported from `src/ui/index.ts`.
- Captain and player shell layouts: `bg-glow` plus `PageContainer`.
- Tests in `src/ui/ui.test.ts`:
  - `Button` is full width on mobile and `md:w-auto`, unless `block`.
  - `GlassCard` padding classes.
  - `Stat` renders `tabular-nums`.
  - `hover-lift` is defined inside `@media (hover: hover)` and turned off under reduced motion (read the CSS file as text).
- Keep `contrast.test.ts` green.

## Out of scope
- Restyling individual screens. Leave that to T-046 and T-047; only shared primitives and shells change here.
- New fonts or dependencies. Keep Alexandria, Changa and Manrope.
- The marketing site (`.marketing-wrap`) unless a shared primitive changes it. Check that it still looks right.

## Requirements
- Tokens only, no hex or `white/[x]` in components. RTL logical properties. Files under 250 lines. No new dependencies.
- The perf budget must pass.

## Acceptance
- [ ] Every app page gets the glow background and constrained width with no screen code changes.
- [ ] Cards and buttons lift on desktop hover and stay still on touch.
- [ ] Light mode looks intentional, not washed out.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
