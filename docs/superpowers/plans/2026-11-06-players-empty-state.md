# Players Empty State Implementation Plan

> **For agentic workers:** Implement this single scoped task inline; request one independent review before completion.

**Goal:** Make the empty captain roster compact, centered, and consistent with KOCHIVO's dark theme.

**Architecture:** Add a roster-specific presentation component and retain the shared empty state for other screens and search results. The roster owns invitation state and passes its existing callback and demo flag to the new component.

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4, existing KOCHIVO tokens and Lucide icons.

**Spec:** `docs/tasks/T-107-players-empty-state.md` and the owner's UI instructions.

## Global Constraints

- No new dependencies, database operations, global styles, or inline UI copy.
- Use logical spacing and existing `ink`, `muted`, `faint`, `lime`, and surface tokens.
- Keep the invitation action, demo behavior, and shared components intact.
- Implementation was left uncommitted for review; the owner subsequently authorized commit and publication on 2026-11-06.

## Review Focus

- At 360px, Arabic heading and step descriptions wrap without horizontal overflow.
- English uses the same centered layout and natural list alignment.
- Dark and light themes retain readable heading, body, and button contrast.
- A keyboard user can focus and activate the same invitation action.
- An empty demo still displays its existing restrictions and omits onboarding steps.

### Task 1: Scoped empty roster presentation

**Files:** the two roster components in the task card; a temporary development preview route, removed after verification.

**Interfaces:** `PlayersEmptyState({ demo, onInvite }: { demo: boolean; onInvite: () => void })` consumes the existing roster translations and invitation callback.

- [x] Render the existing empty roster in the temporary preview; confirm the boxed steps and bright CTA before changing presentation.
- [x] Implement the dedicated component with centered responsive height, a bounded content column, compact unboxed steps, and secondary dark button styling.
- [x] Replace only the `players.length === 0` presentation in `RosterScreen`.
- [x] Verify RTL/LTR, 360px/1440px, dark/light, no horizontal overflow, keyboard invitation opening, and unchanged demo restrictions in the browser.
- [x] Remove the temporary preview route; run `npm run check` and `npm run build`.
- [x] Request an independent review of the final diff and resolve material findings.

## Verification record

- Browser baseline: step boxes were 48px high with a raised surface.
- Updated browser checks: all eight locale/theme/viewport combinations passed; steps are 24px high with transparent backgrounds, no horizontal overflow, and content centered within 2px.
- Keyboard Enter on the invitation button opens the existing dialog. Empty demo omits the steps and preserves the restricted invitation dialog, including at 360px.
- Independent review found one light-theme interaction contrast issue. Fixed hover text and focus outline to use `lime-ink`; its light-mode text color has 6.22:1 contrast against white. No other Important/Critical findings.
- Existing semantic and feature tests plus browser checks cover this presentation-only change; no new tests that mirror Tailwind class names.
- `npm run check`: passed (typecheck, ESLint, release audit with 0 findings, 372 test files / 2574 tests passed).
- `npm run build`: passed; 49 static pages generated. Temporary preview route is absent from the final source and production route table.
- `git diff --check`: passed. Owner approved committing and publishing the verified changes on 2026-11-06.
