# T-037 — First-login product tour (no dependency)

**Phase:** 3 · **Depends on:** T-033 and T-035 merged · **Status:** queued

## Goal
On the first sign-in, a short guided tour points the captain, or the player, at the few buttons that matter. It can be skipped at any time, it never shows again once finished or skipped, and it can be replayed from Settings.

## Decision
The owner chose our own tour over react-joyride (2026-11-03). **Build it ourselves; do not add react-joyride or any other dependency.**

## Files
- `src/ui/tour.tsx`, a tour component:
  - Takes steps of `{ target: string /* data-tour id */, title, body }`.
  - Dims the page and spotlights the target with a ring.
  - Shows a `glass-strong` card next to the target, positioned with logical sides so it flips correctly in RTL; on phones it docks at the bottom.
  - Buttons: next, back, skip, and done.
  - Keyboard: Escape skips, the arrow keys move between steps, and focus is trapped in the card.
  - Uses the `enter` animation and respects reduced motion.
  - If a target is missing or hidden, that step is skipped.
- Loading: `src/ui/tour-loader.tsx`. The tour code loads with `next/dynamic` only when a tour is due, so no route pays for it in its first-load JS.
- Tour state:
  - Store `tour_seen_at` per user.
  - Use `profiles` if it has a suitable settings JSON column. Otherwise add migration `0040_tour_seen.sql`: one nullable `timestamptz` column on `profiles`, an update grant for the owner only, and an RLS-safe update policy. Add a PGlite test in `supabase/tests/`.
  - Cache the state in `localStorage` too, so the tour never flashes before the server answers.
- Captain steps (about 5): the dashboard next-task hero, invite a player, the inbox, templates, and billing.
- Player steps (about 4): today's workout, logging a set, the nutrition tab, and the coach page and voice notes.
- Add `data-tour="..."` attributes to those targets. These are attributes only; no other change in those files.
- Settings: a "Replay the tour" row for both roles.
- Messages: every tour string, in Egyptian Arabic and English.
- Tests:
  - step navigation and skipping a missing target
  - the "seen" persistence
  - the dynamic loading
  - the perf budget is unchanged

## Requirements
1. No new dependencies.
2. The tour never blocks the app if it fails; on any error it closes silently, with a `console.warn`.
3. It never shows in the demo for the reviewer's automated checks unless asked; the demo may show it, but it must have a skip button.

## Acceptance
- [ ] A first login shows the tour once; skipping or finishing hides it for good; Settings can replay it.
- [ ] It is correct in Arabic RTL and in English, on a phone and on desktop.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
