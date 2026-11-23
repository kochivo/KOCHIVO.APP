# T-434 — Hero progress ring cut off on phone

**Phase:** fix · **Depends on:** none · **Status:** ready

## Goal
The "مهام النهارده" progress ring on `/captain` fits inside the viewport at phone width. Live review (2026-11-22, kochivo.site, captain Ali Esmail, Arabic dark, phone ~382 CSS px): the ring is sliced by the left edge of the viewport; only its right half is visible, and the page does not scroll horizontally to reveal it. No other horizontal scrolling was found on any screen at either width.

## Design decisions (read first)
1. **The ring must fit, not be revealed by scrolling.** The page correctly has no horizontal scroll; the fix is to make the ring fit within the phone viewport (shrink the ring, fix the grid/flex sizing that pushes it past the edge, or reflow the hero at phone width) — never by enabling horizontal scrolling.
2. **Find what pushes it out.** The phone hero is `src/features/dashboard/home/phone-home-hero.tsx` with the ring in `src/features/dashboard/home/home-ring.tsx`. Likely causes: a fixed-width grid column, a `min-w` that exceeds the viewport, a negative margin, or the ring's size plus its side content exceeding 100vw minus page padding. Measure from the code (grid/flex widths, ring size, `page-x` padding) and fix the sizing, not the symptom.
3. **Desktop is fine — keep it that way.** The desktop hero (`home-hero-view.tsx`) is not cut off; do not change its layout.

## Files
Create or modify only these:
- `docs/tasks/T-434-hero-ring-cut-off-phone.md`: this card
- `src/features/dashboard/home/phone-home-hero.tsx`: the phone hero layout
- `src/features/dashboard/home/home-ring.tsx`: the ring component (size/sizing, only if the ring itself must shrink or become responsive)
- `src/features/dashboard/home/home-hero-view.tsx`: read-only reference for the desktop hero; edit only if the phone hero shares sizing with it (report first if so)
- Tests under `src/features/dashboard/home/` for the phone hero (`phone-home.test.ts` — extend; create a focused test if none covers the ring)

Do not edit any file outside this list. Do not touch the staged log-cleanup entries, any T-421 file, any KO file (`src/features/ko-account/**`, `src/features/ko-entry/config.ts`, migrations 0164–0167, `src/types/app-database.ts`). If the fix genuinely needs another file, implement everything else and report the file + lines + reason in your final message instead of editing it. Do not commit or push.

## Requirements
1. At ~390 CSS px the full ring is visible inside the viewport (no slice at the left edge, no horizontal scroll).
2. The ring keeps its number/label readable at phone width.
3. Desktop hero unchanged; no other phone screen gains horizontal scrolling.
4. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log`, tokens only, logical RTL properties only, touch targets ≥ 48px, every user-facing string in `messages.ts` (ar/arStd/en), no emoji.

## Acceptance
- [ ] Phone hero: the ring is fully visible within the viewport (verify by reasoning from the layout widths + a test; a live re-check is not possible until deploy).
- [ ] The page still has no horizontal scrolling at phone width.
- [ ] Desktop hero unchanged.
- [ ] `npm run check`, `npm run build` and `npx vitest run src/lib/perf-budget.test.ts` pass.

## Tests (deterministic, inject `now`, no real timers, no network)
- Phone hero test: the hero/ring renders with the fitting layout classes/widths at phone width (assert the container constrains the ring within the viewport: no fixed width wider than the viewport, no negative offset pushing it out). Keep existing phone hero tests green.

## Out of scope
- The empty-state 100% contradiction (T-430) — same hero, different bug; do not mix the fixes.
- Any other phone layout issue.
- A live re-check on kochivo.site (not possible until deploy).

## Notes for reviewer
- State what pushed the ring out (fixed width / grid / margin) and what the fix changes.

## References
- `src/features/dashboard/home/phone-home-hero.tsx`, `src/features/dashboard/home/home-ring.tsx`
- `DESIGN.md` (Spacing: `page-x` 16/24; Layout: captain phone bottom nav)
