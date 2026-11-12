# T-199: Player sees the warm-up first (mockup v6-program-editor, screen «اللاعب بيشوف إيه»)

**Phase:** Unified program editor (owner approved 2026-11-12) · **Depends on:** T-197 · **Status:** ready
**Migration:** none. **Flag:** none needed: with an empty warm-up nothing renders, so existing players see no change.

Read first: `docs/mockups/captain-workspace/v6-program-editor.html` (phone screen), `AGENTS.md`.

## Files
- `src/features/workout/` (a new `warmup-card.tsx`, the ramp line on the first heavy exercise, messages `ar` + `arStd` + `en`, tests).
- `src/features/player-home/` only where today's workout card is rendered, to show the warm-up time.
- This card.

## Requirements
1. Before the first exercise of today's session, show the amber card «1 · سخّن الأول» with total minutes, one row per item (check box, name, amount + unit), ticking stored locally per session (no server write; use the existing local session state, key by session stable id). Then the exercises card labelled «2 · التمارين».
2. Primary button while unfinished items remain: «كمّل التسخين». Once all are ticked, or the player taps «تخطّي التسخين» (secondary text button), the normal workout flow continues exactly as today.
3. If `warmup.ramp` is on, show under the first non-bodyweight exercise: «تسخين: 50% × 10 · 70% × 5 · 85% × 2», using `rampSets()` from T-197 with the player's last working weight (existing last-performance data) to show kg when known.
4. Empty warm-up (no items, ramp off) renders nothing. Offline workout must keep working (warm-up comes from the same cached program snapshot).
5. Touch targets ≥ 48px, logical properties only, numbers via existing formatters.

## Out of scope
The captain editor (T-198). Logging warm-up as sets.

## Acceptance
- [ ] Matches the phone mockup at 390×844.
- [ ] Tests: empty → nothing, ticks persist across reload of the same session, skip continues, ramp kg rounding with and without known weight.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.
