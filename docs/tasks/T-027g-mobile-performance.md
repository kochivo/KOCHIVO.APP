# T-027g — Mobile polish and performance

**Phase:** 4 · **Depends on:** T-027b, T-027c–f (merged) · **Status:** ready

## Goal
KOCHIVO is used one-handed in the gym, on cheap Android phones and on iPhones. Every screen
must work at 360px width without horizontal scroll, respect safe areas, and feel instant:
small JavaScript, no layout shift, lazy heavy media.

## Files
Create or modify only these:
- Any file in `src/app/**`, `src/features/**/components/**`, `src/ui/**`, `src/app/globals.css`, or `next.config.ts` where you fix a finding. List every file in your report.
- `src/lib/perf-budget.test.ts` (new): reads `.next` build output after `npm run build` only if the directory exists. Otherwise skip with `it.skipIf`. It asserts the first-load JS budget below.
- `docs/PERFORMANCE.md` (new): what you measured, before and after numbers, and what is left

## Requirements
1. **Mobile layout** at 360×740 and 390×844, in both `dir` values and both themes:
   - No horizontal scroll anywhere. Long English words and long Arabic names wrap or truncate with `min-w-0` and `truncate`.
   - Fixed bars (bottom nav, focus-mode controls, sheets) use `env(safe-area-inset-*)` padding.
   - Use `100dvh`, not `100vh`.
   - Inputs are at least 16px font size, so iOS does not zoom on focus.
   - `touch-action: manipulation` on buttons, so there is no 300ms delay or double-tap zoom on steppers.
   - `-webkit-tap-highlight-color: transparent`, with the visible focus style kept.
   - Sheets and dialogs scroll inside themselves (`overscroll-behavior: contain`), and the page behind does not scroll.
   - Touch targets are at least 48px. Gym steppers and done buttons are at least 56px.
   - Keyboards: the focused field stays visible when the soft keyboard opens (the login, renew, and check-in forms).
2. **Performance:**
   - Run `npm run build` and record first-load JS per route in `docs/PERFORMANCE.md`. Budget: marketing `/` ≤ 180 kB, player routes ≤ 220 kB, captain builder routes ≤ 260 kB (gzip, as Next reports).
   - `next/dynamic` for heavy client parts that are not visible at first paint: charts in progress, the PR confetti, the form-check camera, the exercise picker dialog, the Turnstile widget, admin tables.
   - Exercise GIFs: `loading="lazy"`, `decoding="async"`, explicit `width`/`height` (no CLS), and a static placeholder until the image is in view. Only the current exercise in focus mode loads eagerly.
   - Images go through `next/image` where the source allows it. Otherwise plain `img` with the attributes above.
   - Fonts: check each `next/font` loads only the needed subsets and weights. Drop unused weights.
   - The `glass` blur: confirm the solid fallback triggers on weak devices. Avoid more than ~3 stacked blurred layers on one screen; flatten any nested glass inside glass.
   - The marketing animations stay CSS-only and respect `prefers-reduced-motion`.
   - Add `loading.tsx` skeletons for the slow server routes (captain roster, player detail, program builder, admin) if they are missing.
   - Look for client components that could be server components (no state or effects), and move them.
   - Look for request waterfalls in server components (sequential `await` of independent queries) and use `Promise.all`.
3. **No behavior or copy changes.** Do not add dependencies. Do not touch `supabase/**`.

## Acceptance
- [ ] `docs/PERFORMANCE.md` has a before and after table of first-load JS per route, and the budgets are met (or each miss is explained).
- [ ] A grep finds no `100vh` and no input class under 16px.
- [ ] Existing tests pass, and the perf budget test passes after build.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- New features, copy, theme tokens, i18n strings.

## References
- `AGENTS.md` §4, `docs/A11Y.md`, `src/lib/glass-mode.ts`
