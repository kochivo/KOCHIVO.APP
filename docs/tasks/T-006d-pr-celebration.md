# T-006d — PR celebration in Focus Mode

**Phase:** 2 · **Depends on:** T-006 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
When the player logs a set that beats their best for that exercise, Focus Mode shows a short, joyful «رقم جديد!» moment with lightweight confetti and the old vs the new best. It must never slow down or block logging the next set.

## Definition of a PR
For the same `exercise_id`, compared with every earlier non-deleted local `set_logs` row (any session, excluding the row being saved):
- **Weight PR:** `weight_kg` is strictly greater than the previous max weight (with reps ≥ 1).
- **Reps PR:** the same weight as the previous max, and more reps than any earlier set at that weight.
- The first time an exercise is ever logged is **not** a PR (no history to beat).
- Editing an old set never triggers a PR.

## Files
- `src/features/workout/pr.ts` (pure):
  - `detectPr(history, set)` returns `{ kind: 'weight' | 'reps', previous: { weight_kg, reps } } | null`
  - `history` is the earlier rows for that exercise
- `src/features/workout/data/pr-history.ts`:
  - `prHistory(db, exerciseId, excludeId)` reads local `set_logs` (Dexie) for that exercise, skipping deleted rows and `excludeId`
  - no network
- `src/features/workout/components/pr-burst.tsx` (client):
  - a `glass-strong` toast-style panel over the top of the focus screen: «رقم جديد!» and «{old} ← {new}» (for example «80 كجم × 5 ← 82.5 كجم × 5»), with `role="status"` and `aria-live="polite"`
  - auto-hides after 2.5 s, and also closes on tap
  - confetti: about 24 absolutely positioned small spans animated with CSS keyframes, defined in the component with Tailwind arbitrary animation or a `<style>` scoped by a unique class, using token colors (`bg-lime`, `bg-warn`, `bg-ink`). No canvas library and no dependency.
  - `prefers-reduced-motion: reduce` shows no confetti, only the panel (use `motion-safe:`/`motion-reduce:` variants)
- `src/features/workout/hooks/use-focus-session.ts`:
  - in `complete`, after `logSet` succeeds and only when not editing, read `prHistory` and call `detectPr`
  - expose `pr` and `dismissPr` from the hook
  - a PR check failure is ignored silently and must never surface an error or undo the set
  - keep every existing behavior and dependency list correct
- `src/features/workout/components/focus-screen.tsx`: render `<PrBurst>` when `pr` is set. This is the only change there.
- `src/features/workout/workout.test.ts`:
  - `detectPr` covers: first ever, heavier, same weight with more reps, same weight with equal reps, lighter, reps 0, and history with deleted rows already filtered out
  - with fake-indexeddb, `prHistory` excludes the given id and deleted rows

## Requirements
1. Timers come from the component (`setTimeout`), and tests use pure functions only. No real timers in tests.
2. Use Egyptian Arabic, tokens only, and RTL logical properties. The confetti layer has `pointer-events-none` and `aria-hidden`.
3. Files are under 250 lines (`use-focus-session.ts` is close: if adding the PR logic would pass 250, move it into a small `hooks/use-pr.ts`).

## Acceptance
- [ ] The tests above pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Sending PRs to the captain
- Server-side PR records
- Sounds or vibration
- Changes to `log-set.ts`
