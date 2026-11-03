# T-015e — Glass blur fallback for weak phones

**Phase:** 5 · **Depends on:** T-015 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
`backdrop-filter` is heavy on low-end Android phones, and the gym screens scroll long lists of `glass` cards. Give weak devices, and users who ask for less transparency, solid surfaces with the same contrast. Nothing changes on capable devices.

## Files
- `src/app/globals.css`:
  - read the current `glass`, `glass-raised`, `glass-strong` utilities and their `@supports not (...)` fallback first
  - make the same solid fallback also apply when `html` has `data-glass="solid"`, and under `@media (prefers-reduced-transparency: reduce)`
  - keep one source of truth: the three solid surfaces must not be written out twice (share the selectors in one rule)
- `src/lib/glass-mode.ts` (new): a pure `glassMode(input)` returning `'solid' | 'blur'` from `{ deviceMemory?: number; hardwareConcurrency?: number; saveData?: boolean; stored?: string | null }`:
  - `stored` `'solid'` or `'blur'` wins (a user choice)
  - else `solid` when `saveData`, or `deviceMemory <= 2`, or `hardwareConcurrency <= 4` **and** `deviceMemory` is unknown or `<= 4`
  - else `blur`
- `src/lib/glass-mode.test.ts` (new): every branch above, including missing values.
- An inline boot script that sets `document.documentElement.dataset.glass` **before paint**, so the page never flashes blur and then switches:
  - put it in the root layout `src/app/layout.tsx` as a small `<script>` with the logic inlined from `glassMode` (export the function's source or a tiny serialised version from `glass-mode.ts`; do not duplicate the thresholds by hand)
  - read the stored choice from `localStorage` key `kochivo.glass` inside `try/catch`
  - no React state, no hydration mismatch (the attribute lives on `html`, and add `suppressHydrationWarning` to `html` if needed)
- Settings: in the existing settings screen, add one toggle «شكل أخف للموبايلات الضعيفة» that writes `kochivo.glass` (`solid` / `blur`) and updates `data-glass` at once. Find the settings component; keep it under 250 lines (split a small `glass-toggle.tsx` component if needed).

## Requirements
1. No new dependency. Tokens only. RTL logical properties. Arabic strings.
2. Solid surfaces keep text contrast at least as high as the blur version.
3. The toggle is a real switch: `role="switch"`, `aria-checked`, at least 48px tall, Arabic label.

## Acceptance
- [ ] `glass-mode.test.ts` passes, and a render test shows the toggle flips `data-glass`.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Redesigning any screen
- Measuring real FPS (the owner tests on a device in T-016)
