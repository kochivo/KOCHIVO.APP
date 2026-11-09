# T-132 — Drag and drop to reorder exercises in the builder

**Phase:** Builder polish · **Depends on:** none · **Status:** implemented (verification limits below)

## Goal
In the program and template builder, the captain reorders a day's exercises by holding a handle
and dragging the card up or down. Today they open the "⋯" menu and tap «طلّع لفوق» or «نزّل لتحت»
once per step, which is slow for a long day. Drag must work with touch on a phone, which is the
main device, and with a mouse.

## Files
Create or modify only these:
- `src/features/programs/draft.ts`: add pure `reorderExercise(draft, dayId, id, toIndex)`. It keeps superset groups valid, using the existing `cleanGroups` rules.
- `src/features/programs/hooks/use-drag-reorder.ts`: new.
  - Pointer Events logic: pointerdown on the handle, `setPointerCapture`, pointermove, and pointerup/pointercancel.
  - Computes the target index from the row midpoints.
  - Edge auto-scroll near the top and bottom of the viewport.
  - No dependency.
- `src/features/programs/components/drag-handle.tsx`: new icon button (lucide `GripVertical`) with the a11y described below.
- `src/features/programs/components/exercise-row.tsx`: render the handle and accept the drag props.
- `src/features/programs/components/day-editor.tsx`: wire the hook to the exercise list.
- `src/features/programs/messages.ts`: new strings only (Egyptian Arabic plus short English).
- `src/features/programs/programs.test.ts` and a new `src/features/programs/drag-reorder.test.ts`.
- This task card.

## Requirements
1. **Handle:**
   - Each exercise card has a grip handle at the inline-start of its header row.
   - The handle is at least 48×48px and has `touch-action: none`. The rest of the card keeps normal scrolling.
   - Dragging starts only from the handle, so scrolling the page on a phone never starts a drag.
2. **While dragging:**
   - The dragged card lifts (`glass-strong`, slight scale, shadow) and follows the pointer on the Y axis only.
   - The other cards slide to open a gap at the target spot, with a CSS `transform` transition.
   - No layout jump.
   - Under `prefers-reduced-motion` there are no transitions; cards just swap.
3. **Drop:**
   - On pointerup, call `update(draft => reorderExercise(draft, day.id, id, toIndex))` once.
   - Dropping in the same place causes no update.
   - pointercancel or Escape restores the original order.
   - The save stays the builder's existing flow, which is optimistic and local first.
4. **Superset:** if a linked superset pair gets split by the move, the result must match what `moveExercise` does today for the same case (`cleanGroups`). Add a unit test for it.
5. **Keyboard and screen readers:**
   - The handle is a `button` with the label «اسحب لترتيب: {name}، {position}» / "Drag to reorder: {name}, {position}".
   - With the handle focused, ArrowUp and ArrowDown move the exercise one step, using `moveExercise`, and keep focus on the handle.
   - An `aria-live="polite"` line announces «{name} بقى رقم {position}» / "{name} is now {position}".
   - Keep the existing «طلّع لفوق / نزّل لتحت» items in the ⋯ menu as a fallback.
6. **RTL and limits:**
   - Logical properties only.
   - Use tokens; no hex values.
   - Every file stays under 250 lines.
   - Do not use `Math.random`.
   - Drag applies only within one day. Moving between days is out of scope.
7. **Cardio:** cardio rows keep their current buttons.

## Acceptance
- [x] Unit tests:
  - `reorderExercise` covers first to last, last to first, a same-index no-op, an unknown id no-op, positions renumbered 1..n, and the superset cleanup;
  - the pure target-index helper of the hook covers midpoints, clamping and an empty list.
- [x] UI tests (renderToStaticMarkup style, as in the other programs tests):
  - the handle renders with its translated label in ar and en, and has `touch-action`/`touch-none`;
  - there are no `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-` classes;
  - the menu move items still exist.
- [ ] Existing programs and templates suites pass.
- [ ] `npm run check` and `npm run build` pass (a sandbox Google Fonts failure is a known limit).

## Out of scope
- Dragging days, cardio rows or exercises between days.
- Any new dependency (no dnd-kit and similar).
- Changes to how the program is saved.

## Implementation notes
- Added immutable direct reordering with clamped destinations and `cleanGroups`; split pairs stay linked, matching the existing `moveExercise` behavior.
- Pointer capture is confined to the 48px grip. Document-space row midpoints and measured heights drive the preview and viewport edge scrolling; Escape, cancellation and lost capture discard it.
- Only a changed drop updates the draft. Arrow keys use `moveExercise`, retain the keyed handle, and announce the new position in Arabic or English. Menu controls and cardio are unchanged.
- Transitions apply only to neighboring rows during a drag and respect reduced motion; clearing the preview at drop does not animate a second displacement.
- Tests cover draft reordering, target boundaries, translated markup, menu fallback, keyboard announcements, pointer lifecycle, variable heights and scrolling with injected animation frames.
- Verification: TypeScript and ESLint pass. The scoped programs/templates run has 160 passing tests and one existing template heading assertion failure (`templates/empty-states.test.ts:42`); the protected template component was left untouched. `npm run check` stops at the audit's sandbox-blocked `git` subprocess (`EPERM`); the same audit rules with a direct Git pipe report 1,628 tracked files and zero findings. `npm run build` fails only on fetching Alexandria, Changa and Manrope from Google Fonts.
- Full suite (`npm test -- --configLoader native --pool threads --maxWorkers 2`): 402 files passed, one failed, one skipped; 2,850 tests passed, one failed, one skipped. The sole failure is the same template heading assertion. The native loader and threads avoid sandbox-blocked subprocesses; animation frames in the new tests are injected, with no timers or network.
