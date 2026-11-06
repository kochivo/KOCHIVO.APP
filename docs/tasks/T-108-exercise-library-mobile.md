# T-108 — Exercise library mobile layout

**Status:** implemented and verified, 2026-11-06. Owner subsequently authorized commit and production publication.

## Goal

Give the mobile exercise library a readable search placeholder, a padded horizontally scrollable row of muscle-group pills, consistent 16px gaps between the search/filter/results sections, and 96px of trailing list clearance. Result rows use 12px spacing.

## Files

- `src/features/programs/components/exercise-picker.tsx`
- `src/features/programs/components/exercise-drawer.tsx`
- `src/features/programs/messages.ts`
- `docs/superpowers/plans/2026-11-06-exercise-library-mobile.md`

## Acceptance

Arabic and English placeholders use translations. Filter buttons keep their labels, pressed state, 48px targets, keyboard access, and filtering behavior. The last exercise can scroll clear of bottom overlays. No global Chip/theme changes, dependencies, database changes, commits, or publication.
