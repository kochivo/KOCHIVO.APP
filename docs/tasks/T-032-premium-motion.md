# T-032 — Premium motion, depth and breathing room (design-system pass)

**Phase:** 3 · **Depends on:** none · **Status:** ready

## Goal
The app works, but it feels stiff, like an admin panel. Make it feel fluid and premium everywhere:
- soft micro-interactions on everything pressable
- smooth entrances for screens, dialogs and drawers
- layered glass with a faint lime glow behind active elements
- more breathing room

Do it **at the design-system level** (tokens in `globals.css`, plus the shared primitives in `src/ui`), so every screen picks it up without touching feature files. Two other cards are editing `src/features/meal-plans` and `src/features/programs` right now, so do not edit any file under `src/features/`.

## Files
Create or modify only these:
- `src/app/globals.css`, motion and depth tokens:
  - `@utility press`, for pressable surfaces:
    - transition limited to `transform, box-shadow, background-color, border-color, opacity`; **not** `transition-all`, which is slower on low-end Android
    - 300 ms `ease-out`
    - `active:scale-95`, as a soft press
    - a hover lift of `-translate-y-1` with a slightly stronger shadow, **only inside `@media (hover: hover) and (pointer: fine)`**, so phones never get sticky hover
  - `@utility enter`: fade-in plus an 8 px slide-up, about 280 ms ease-out, for mounting screens, dialogs, sheets, drawers and cards. Reuse or replace the existing `empty-state-in` keyframe.
  - `@utility glow`: a tight lime glow for the primary button only:
    - a 1px lime ring at about 25% alpha, plus a close shadow of about `0 4px 14px` at about 16% alpha; on hover, about `0 6px 18px` at 22%
    - the owner rejected a wide halo, so no large blur radius and no big background orb behind buttons
    - selected chips, segments and nav items get the ring or tint only, with no spread shadow
    - use the colour token through `color-mix()` or a CSS variable, not hex in components
  - glass layering:
    - `glass` stays the base
    - `glass-raised` is a bit lighter
    - `glass-strong` is the most opaque
    - make the steps between them visible, in both dark and light themes
    - keep text contrast passing `src/ui/contrast.test.ts`
  - every new animation and transition is disabled under `prefers-reduced-motion: reduce`
  - `--radius-card` (1.5rem) and `--radius-control` (1rem) already equal `rounded-3xl` and `rounded-2xl`; keep them, and make sure the primitives use them
- `src/ui/button.tsx`, `icon-button.tsx`, `chip.tsx`, `segmented.tsx`, `glass-card.tsx`, `switch-track.tsx`, `bottom-nav.tsx`:
  - apply `press` to pressable variants
  - apply `glow` to the primary button and to selected or active states (selected chip, active segment, active nav item)
  - `GlassCard` gets a slightly larger default padding when the caller passes no padding class, plus an optional `interactive` prop that adds `press`
  - replace the existing `transition-colors duration-150`
- `src/ui/stepper.tsx`: the gym steppers get the press scale only, with **no hover lift**. They are large touch controls and must stay rock-solid while a player is training.
- `src/ui/responsive-dialog.tsx`: dialogs and sheets mount with `enter`. If it supports a side position, it slides in from the inline-end side. No layout change.
- `src/ui/empty-state.tsx`, `error-state.tsx`, `loading-state.tsx`, `route-loading.tsx`:
  - use `enter`
  - give the loading state a soft shimmer or pulse instead of static text, if it can be done in CSS only
- `src/app/[locale]/template.tsx` (new): wraps page content in a `<div className="enter">`, so every route change fades and slides in. It must stay thin, with no logic; check it does not break the scroll position or `loading.tsx`.
- `src/ui/ui.test.ts` (and `a11y.test.ts` if needed):
  - tests that the primitives carry `press`, `glow` and `enter`
  - a test that `globals.css` disables them under reduced motion

## Requirements
1. Use tokens and utilities only, with no hex values in components. Lime stays the only action colour.
2. Hover lift only on fine pointers. On touch devices only the press-scale applies.
3. No JavaScript animation library and no new dependencies. Everything is CSS. The perf budget test must still pass.
4. Do not change any component's API in a breaking way; all existing call sites must keep compiling.
5. RTL-safe: no physical `left`/`right` in new code.
6. Do not touch `src/features/**`, the marketing landing styles (`.marketing-*`), or the migrations.

## Acceptance
- [ ] Buttons, chips, segments, cards marked `interactive`, and nav items lift on desktop hover and press-scale on tap.
- [ ] Every route, dialog and empty state fades and slides in; nothing animates with reduced motion on.
- [ ] The active and primary elements have a faint lime glow, in both dark and light themes.
- [ ] `src/ui/contrast.test.ts` and the new ui tests pass.
- [ ] `npm run check`, `npm run build`, and the perf budget test after the build all pass.

## Out of scope
- Per-screen padding and layout changes inside `src/features/**` (a follow-up card after T-030 and T-031 land).
- The marketing landing page.
