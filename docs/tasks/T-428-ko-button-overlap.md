# T-428 — KO floating button overlaps page content

**Phase:** fix · **Depends on:** none · **Status:** ready

## Goal
The KO assistant floating button never covers interactive page content. Live review (2026-11-22, kochivo.site, captain Ali Esmail, Arabic dark): the button is fixed at bottom-left and collides with whatever content sits there, moving with scroll — 6 verified spots:
- `/captain` desktop: covers the "جمعة" (Friday) label of the "تمارين الفريق" weekly chart.
- `/captain/inbox` desktop: covers about a third of the green Send button in the message composer.
- `/captain` phone: covers the left end of the "دوّر على لاعب" search field.
- Player file phone: covers the tail of the "اليوم الأول · 4 نوفمبر" date in "آخر تمرين", and covers the "الكل" pill of the weight-chart period selector.
- `/captain/inbox` phone: covers the voice-record (microphone) button in the composer.
- `/captain/billing` phone: covers the left part of Hesham's "حدد باقة" button.

## Design decisions (read first — they are load-bearing)
1. **Do not hide the button.** It stays visible and reachable on every captain screen, desktop and phone. Hiding it, making it appear only on hover, or moving it off-screen is not a fix.
2. **Fix it in one shared place, not six.** The repo already has the clearance mechanism: `src/app/globals.css` defines `--nav-clearance`, `--page-bottom-clearance` and `--captain-content-clearance` (the last already accounts for nav height + the 3.25rem launcher + 3rem). Find where that clearance is — or is not — applied as bottom padding on captain screens, and make the captain shell apply it consistently so content can always scroll clear of the button. Prefer the shared captain layout (`src/app/[locale]/(captain)/captain/layout.tsx`) over editing each screen.
3. **Find which launcher is actually rendered.** `ko-teaser.tsx:92` renders one branch fixed at `end-page-x bottom-page-y` (bottom-left in RTL) and another at `start-...`; `ko-widget.tsx:66` renders at `start-...`. Determine which component the captain screens actually mount (teaser vs widget) and fix the one in use; if both are in use, fix both the same way. The opened panel (`ko-panel.tsx`, `ko-teaser-panel.tsx`, `ko-teaser-corner.tsx`) must stay consistent with the button position.
4. **The composer exception.** The inbox composer (Send button, mic button) sits at the bottom of its own scroll area; bottom padding on the page alone may not clear it. If the composer needs its own clearance, add it in the composer, not by moving the button.
5. DESIGN.md already requires this: "The composer and floating buttons sit above the nav and never cover content." This card implements that sentence.

## Files
Create or modify only these:
- `docs/tasks/T-428-ko-button-overlap.md`: this card
- `src/features/ko-preview/components/ko-teaser.tsx`: the launcher in use on captain screens (position)
- `src/features/ko-preview/components/ko-widget.tsx`: same, if it is the launcher in use
- `src/features/ko-preview/components/ko-panel.tsx`: keep the opened panel consistent with the button (only if its position must move with the button)
- `src/features/ko-preview/components/ko-teaser-panel.tsx` and `ko-teaser-corner.tsx`: same, only if the in-use launcher opens them
- `src/app/[locale]/(captain)/captain/layout.tsx`: apply the shared bottom clearance for captain screens, if that is the one-place fix (read-only investigation first; edit only if the clearance is missing here)
- `src/app/globals.css`: only if a clearance token itself is wrong or missing (report the exact lines if so; prefer not to touch it)
- Tests for the touched launcher/panel components under `src/features/ko-preview/` (create if missing)

Do not edit any file outside this list — in particular do not edit the dashboard, inbox, billing or progress screens, and do not touch the staged log-cleanup entries, any T-421 file, any KO file (`src/features/ko-account/**`, `src/features/ko-entry/config.ts`, migrations 0164–0167, `src/types/app-database.ts`). If the fix genuinely needs another file, implement everything else and report the file + lines + reason in your final message instead of editing it. Do not commit or push.

## Requirements
1. At desktop width the button does not cover the "جمعة" chart label on `/captain` or any part of the Send button in the inbox composer. Content scrolls clear of it.
2. At phone width (~390 CSS px) the button does not cover the search field on `/captain`, the date or the "الكل" pill in the player file, the mic button in the inbox composer, or the "حدد باقة" button on billing.
3. The button remains visible, ≥ 48px, and opens its panel on every captain screen, desktop and phone.
4. The opened panel does not cover the button itself in a way that traps the user (existing behaviour, keep it).
5. No new dependency; no change to KO behaviour, counts or badge (T-429); no change to the bottom nav.
6. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log`, tokens only, logical RTL properties only, touch targets ≥ 48px, every user-facing string in `messages.ts` (ar/arStd/en), no emoji.

## Acceptance
- [ ] All six spots from the Goal are clear of the button at their widths (verify by reasoning from the layout + a test that asserts the clearance; a live re-check is not possible until deploy).
- [ ] The button is still reachable and opens the panel on desktop and phone.
- [ ] No other captain screen regresses (the clearance is shared, so a change here must not push content off-screen elsewhere).
- [ ] `npm run check`, `npm run build` and `npx vitest run src/lib/perf-budget.test.ts` pass.

## Tests (deterministic, inject `now`, no real timers, no network)
- A test for the launcher component(s) asserting the fixed position classes/clearance it renders (the in-use branch), and that the button keeps its accessible label and ≥ 48px target.
- If the fix lands in the captain layout, a test asserting the layout renders the clearance class/token on its content wrapper.
- Keep existing ko-preview tests green.

## Out of scope
- The KO badge count (T-429) and KO chat behaviour.
- The inbox composer itself, except its bottom clearance if decision 4 requires it (report it if so).
- Any per-screen padding edits (the fix must be shared, per decision 2).
- A live re-check on kochivo.site (not possible until deploy).

## Notes for reviewer
- The clearance tokens already exist (`--captain-content-clearance` in `globals.css:183`), which suggests the intended design was "content padded clear of the launcher" and some screen(s) lost it. The most likely outcome is a one-place layout fix, not six screen fixes.
- If investigation shows the launcher is `ko-widget.tsx` (bottom-start in RTL = bottom-right) while the live review saw it bottom-left, say so: the two launchers may be mounted on different screens, and both may need the same treatment.

## References
- `src/app/globals.css:180-183` (`--nav-clearance`, `--page-bottom-clearance`, `--captain-content-clearance`)
- `src/features/ko-preview/components/ko-teaser.tsx:46,92-93`, `ko-widget.tsx:25,66`, `ko-panel.tsx:56-58`
- `DESIGN.md` (Layout: captain phone — "floating buttons sit above the nav and never cover content")
