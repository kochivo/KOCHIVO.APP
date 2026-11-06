# T-107 — Players empty state polish

**Status:** implemented and verified, 2026-11-06. Owner subsequently authorized commit and production publication.

## Goal

Center the captain's empty roster content, replace boxed onboarding steps with a compact vertical list, and use a dark, subtly lime-bordered invitation button. Give the heading stronger contrast and hierarchy.

## Files

- `src/features/roster/components/players-empty-state.tsx` — dedicated presentation for the empty roster, using existing translations and design tokens.
- `src/features/roster/components/roster-screen.tsx` — use the dedicated presentation only when the roster is empty.
- `docs/superpowers/plans/2026-11-06-players-empty-state.md` — implementation and verification record.
- Temporary, removed before completion: `src/app/[locale]/dev/players-empty-preview/page.tsx` — render the actual roster with an empty fixture for local visual verification.

## Acceptance

- Center content horizontally and vertically in a responsive container; compact internal spacing.
- Three ordered steps, muted text, subtle localized numbers, no rectangular step surfaces.
- Dark New Player button with a subtle lime border and hover text, minimum 48px touch target, visible keyboard focus.
- Bold, high-contrast heading; RTL and English layout both work at narrow widths.
- Invitation callback, demo restrictions, populated roster, search empty state, and shared `EmptyState` retain their behavior.
- Run existing tests, `npm run check`, `npm run build`, and local browser visual checks. No class-string unit tests for this reversible presentation change.

## Out of scope

No database, authentication, dependency, global theme, copy, deployment, or shared empty-state changes.
