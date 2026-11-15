# T-282 — Keep every animation and the glass look, but make them light on phones

**Phase:** polish · **Depends on:** none · **Status:** ready
Read `AGENTS.md`, `docs/ARCHITECTURE.md` and `docs/tasks/V11-FIDELITY.md` first.

## Goal
The owner wants to keep every animation and the v11 glass look, but the system must not feel heavy on phones (owner decision 2026-11-15). Removing animations is not the fix. The fix is to make each one cheap.

The main costs today:
- `backdrop-filter: blur(24px)` on every `glass` and `glass-strong` surface (`src/app/surfaces.css`). Each blurred layer repaints whatever is behind it while scrolling.
- Looping animations that keep running when the element is off screen or the tab is hidden:
  - `marketing-float` and `rank-shine` in `globals.css`;
  - the KO typing dots and the KO breathing.
- Large blurred orbs (`src/ui/orbs.tsx`) that sit behind the scrolling content.

## Requirements
1. **Glass without live blur where it is expensive.**
   - On touch devices (`@media (hover: none) and (pointer: coarse)`), surfaces must look the same but cost far less. Use the liquid-glass fill from the mockup:
     - `linear-gradient(160deg, rgb(255 255 255/.075), rgb(255 255 255/.025) 45%, rgb(255 255 255/.04))`;
     - over a slightly lifted solid surface;
     - plus the existing inset highlight and shadow.
   - Exceptions, which keep a smaller blur (≤12px):
     - sticky headers and bars;
     - the bottom nav;
     - sheets and dialogs that sit over content.
   - Desktop keeps the current blur.
   - The existing `html[data-glass='solid']` switch keeps working.
   - Light theme must keep its contrast. Run `contrast.test.ts` and `surface-depth.test.ts`.
2. **Orbs:** render them as static radial gradients, without `filter: blur()`.
   - On phones, put them in a `position: fixed` layer behind the app with `contain: strict`, so they are painted once and not on every scroll.
3. **Motion rules**, written into `V11-FIDELITY.md` and enforced by a test that scans the CSS and TSX:
   - Animate only `transform` and `opacity`. Never width, height, top, left, box-shadow or filter in a keyframe. A meter that grows uses `scaleX`.
   - Pause a looping animation whenever its element is off screen:
     - use `animation-play-state: paused` by default;
     - turn it on with a tiny shared `useInView` hook (IntersectionObserver), or with a CSS class set by it.
   - Also pause loops while `document.hidden`.
   - Durations stay at or under 400ms for UI feedback. Entrance sequences run once.
   - `prefers-reduced-motion: reduce` removes all non-essential motion. This already exists; extend it to anything new.
   - Use `will-change` only while an animation runs, never permanently.
4. **Keep every existing animation.** Same timing and same look on desktop. The change is only how they run.
5. **Lists:** long lists in the captain workspace (players, inbox, library, food search) get `content-visibility: auto` with a sensible `contain-intrinsic-size`, so off-screen rows are not laid out.
6. **Measure:** add a short note to `docs/perf/` with before and after numbers for the player home and the captain home, taken at 390px with 4× CPU slowdown in Edge DevTools:
   - the scripting and rendering time of a 3-second scroll;
   - the long tasks.
   The numbers are approximate; the point is to catch regressions.
7. Tests:
   - the CSS scan for forbidden keyframe properties;
   - loops are paused when not in view (the hook unit test, with an injected observer);
   - the touch media query produces no `backdrop-filter` above 12px on the listed surfaces.

## Files
- `src/app/surfaces.css`, `src/ui/orbs.tsx`, a new `src/lib/use-in-view.ts`, the components with looping animations (`ko-typing.tsx`, `ko-widget.tsx`, `ko-avatar.tsx`, the rank badge, the marketing phone), and the list containers that need `content-visibility`.
- `src/app/globals.css`: only the keyframes and reduced-motion sections. T-281 adds a `controls.css` import there; do not remove it.
- `docs/tasks/V11-FIDELITY.md` (the motion rules section) and `docs/perf/`.

## Acceptance
- [ ] On a phone the app looks the same, and scrolling the captain home and the player home no longer stutters at 4× CPU slowdown.
- [ ] No looping animation runs off screen or in a hidden tab.
- [ ] `npm run check`, `npm run build` and the perf budget pass.

## Out of scope
- Button styles and toasts (T-281), spacing (T-278), new animations and layout changes.
