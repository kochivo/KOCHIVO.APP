# T-059 — Exercise library: active filter, added state, toast

**Phase:** 3 · **Depends on:** T-057 merged (same feature folder) · **Status:** ready (owner request, 2026-11-04)

## Current state
In `src/features/programs/components/exercise-picker.tsx` and `exercise-drawer.tsx`:
- The muscle filter buttons set `aria-pressed`, but use the `ghost` variant, so the active one does not look different.
- `ExercisePicker` accepts `usedExerciseIds` but ignores it.
- After «ضيف», the drawer only updates a small `role="status"` line, so there is no clear feedback.

## Changes
1. **Active filter:** the selected muscle (and «تماريني») shows a lime active state with tokens only: lime border, a `bg-lime/15`-style token tint or the existing selected token, and lime text. Keep `aria-pressed`. Make sure «الكل» is active when no muscle is selected.
2. **Added state:**
   - An exercise already in the current day (`usedExerciseIds`, plus anything added in this drawer session) shows a check icon with «اتضاف» in place of «ضيف».
   - Pressing it again still adds another copy: some programs repeat an exercise. Pressing «ضيف» again on an added exercise asks nothing; it just adds and keeps the state.
   - The change is instant (optimistic).
3. **Toast:** each add shows our own `useToast().success(t('exerciseAdded', { name }))` («تمت إضافة التمرين»). Keep the polite live region, or remove it if the toast already announces, so screen readers do not hear it twice.
4. Tests: added-state derivation from `usedExerciseIds` and session adds; active filter state for «الكل», a muscle and «تماريني».

## Requirements
- No new dependencies.
- Messages in `messages.ts`.
- Tokens only.
- 48 px targets.
- Files under 250 lines.
- Translated `aria-label`s.
- Keep the «© Gym visual» attribution.

## Acceptance
- [ ] The active filter is obvious at a glance.
- [ ] Added exercises show a check.
- [ ] A toast appears on every add.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
