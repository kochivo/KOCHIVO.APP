# T-015f — Accessibility pass on the player gym flow and captain core screens

**Phase:** 5 · **Depends on:** T-015 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
Players use KOCHIVO mid-set with sweaty hands, often in bright light, and some use TalkBack/VoiceOver. Audit and fix accessibility on the screens that matter most, against AGENTS.md §4 and WCAG 2.2 AA.

## Screens in scope
- Player: home (`src/features/player-home`), focus mode and rest timer (`src/features/workout` or wherever focus mode lives; find it), nutrition today, progress, player shell / bottom nav, install sheet, PR burst.
- Captain: roster, inbox, program builder.

## What to check and fix
1. Every icon-only button has an Arabic `aria-label`; no duplicate or English labels.
2. Touch targets: at least `min-h-12`; gym steppers and done buttons at least 64px.
3. Focus: visible focus ring on every interactive element (use one shared token-based `focus-visible` style if missing); dialogs and sheets trap focus, close on Escape, and return focus to the opener.
4. Live regions: the rest timer announces only start, the last 10 seconds as a single announcement, and done; not every second. Sync status changes use `role="status"`. Errors use `role="alert"`.
5. Motion: every animation (PR burst, glow, timers, transitions) respects `prefers-reduced-motion`.
6. Semantics: headings in order, lists as `ul/ol`, steppers expose their value (`aria-valuenow` or an `output`), toggles use `aria-pressed` or `role="switch"`.
7. Language and direction: `lang="ar"` and `dir="rtl"` are set once at the root; numbers and English loanwords that must stay LTR use `<bdi>`, not `dir="ltr"` on whole blocks.
8. Contrast: `text-muted` on `glass` and on `glass-strong` meets 4.5:1 for body text. If a token fails, change the **token** in `globals.css`, not individual components, and record the before/after ratio in Notes.

## Files
- Only files in the screens above, plus shared `src/ui/*` components and `globals.css` tokens when the fix belongs there.
- `docs/A11Y.md` (new, short): what you checked, what you fixed, and anything left with a reason.
- Tests: add or update render tests for each fixed behaviour you can assert statically (labels, roles, the rest-timer announcement schedule as a pure function, reduced-motion class switches).

## Requirements
1. No new dependency (no axe). No visual redesign; keep layouts as they are.
2. Do not edit `src/app/globals.css` glass utilities (another card is changing them); only colour tokens if contrast fails.
3. Keep every file under 250 lines.

## Acceptance
- [ ] `docs/A11Y.md` lists every screen above.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Admin and marketing pages
- Screen-reader testing on a real device (the owner does that in T-016)
