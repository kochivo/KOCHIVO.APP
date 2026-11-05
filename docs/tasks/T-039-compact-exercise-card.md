# T-039 — Compact exercise card in the program builder

**Phase:** 3 · **Depends on:** T-031 merged · **Status:** ready

## Problem
In the captain's program builder, each exercise card (`src/features/programs/components/exercise-row.tsx`) uses the gym-size `Stepper` (76px buttons, `text-4xl`/`6xl` numbers). Three or four of them per card make the card break and wrap badly.

## Decision
- The gym `Stepper` stays big for the player's workout screen (AGENTS.md: gym controls are bigger). The builder gets a **compact** variant.
- Tokens only: no `bg-[#…]`, no `border-white/10`. Use the existing `glass`, `border-line`, `rounded-card` (1.5rem ≈ `rounded-2xl`) and `p-4`.

## Files
- `src/ui/stepper.tsx`: add `size?: 'gym' | 'compact'` (default `'gym'`, so current callers do not change).
  - Compact: buttons `size-8` visually, but each keeps a 48px hit area (`min-h-12 min-w-12` with the icon centred, or a padded wrapper) to keep the touch-target rule; number `text-lg font-bold`; label `text-xs text-muted`; no `glass-strong` panel, just a tight row.
- `src/features/programs/components/exercise-row.tsx`:
  - One clean row for sets, rep range (min–max, or the "fixed reps" toggle) and rest: `grid grid-cols-3 gap-3 items-start` on phones and up; nothing wraps under 360px wide.
  - Card: `glass rounded-card border border-line p-4`.
  - Keep every existing handler and aria-label; this is layout only.
- `src/ui/ui.test.ts` (compact variant renders, default unchanged) and the programs render test.

## Requirements
- RTL logical properties only. No new dependencies. No logic changes. Files under 250 lines.

## Acceptance
- [ ] At 360px and 390px wide, an exercise card shows sets, reps and rest on one aligned row with no overflow.
- [ ] The player's workout steppers look exactly as before.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
