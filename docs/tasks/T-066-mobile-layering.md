# T-066 — Mobile layering: opaque sheets, nav clearance, builder header, coach-profile header, remind button

**Phase:** 3 · **Depends on:** T-063, T-064 (merged) · **Status:** ready (live bugs the owner reported on iPhone, 2026-11-04)

## Problems (live, iPhone Safari, captain screens)
1. **Sheets are see-through.**
   - The exercise library (`programs/components/exercise-drawer.tsx`) and the custom food sheet (`meal-plans/components/custom-food-sheet.tsx`) use `glass-strong`.
   - On iOS the page underneath shows through: page titles, the sticky «احفظ وابعت للاعب» ("save and send to player") bar and the bottom nav are all readable on top of the sheet's fields.
   - The close button sits under the status bar.
2. **Program builder title collapses.**
   - In `programs/components/builder-header.tsx` the first column is `min-w-0 flex-1` (basis 0).
   - On a phone the button column takes the row, and «مصمم البرنامج» ("program builder") and «اسم البرنامج» ("program name") break one or two letters per line.
3. **Content and fixed bars collide with the bottom nav.**
   - The builder's fixed activate bar (`bottom-[calc(6.5rem+…)] z-30`) covers the «أيام البرنامج» ("program days") card.
   - The builder steps hint shows through the nav.
   - On the nutrition builder, the «+ أكلة جديدة» ("+ new food") / «اقفل البحث» ("close search") controls overlap the nav.
   - On the player profile, the «سجّل رسالة صوتية» ("record a voice message") card ends up under the nav.
   - Scrollable captain pages need bottom space so the last content scrolls clear of the nav and any fixed action bar.
4. **Coach player-profile header under the status bar.**
   - On `/captain/players/<id>` after scrolling, the KOCHIVO header and bell overlap the iOS clock and battery.
   - The sticky captain header needs `pt-[var(--safe-top)]` plus its background, the way T-064 did the marketing header (`captain-shell.tsx` / `captain-nav.tsx`, and check the player shell too).
5. **«ابعت تذكير صوتي» ("send a voice reminder") does nothing.**
   - In `player-profile/components/checkins-tab.tsx` (also `intake-tab.tsx` and `progress-tab.tsx`), the EmptyState action is only a hash link `#voice-recorder-<id>`, so tapping it gives no visible result.
   - Make it scroll the voice recorder into view smoothly (reduced motion: instant) and move focus to its record button.
   - From the other tabs it should navigate to the check-ins tab and do the same on arrival.

## Changes
- Add an opaque sheet surface token in `globals.css` (for example `.sheet`: solid `bg-surface`/`bg-bg`, border, no translucent backdrop-filter) and use it for **all** native `<dialog>` sheets and drawers. Grep `showModal` and `ResponsiveDialog`.
  - Keep `::backdrop` dark (`bg-bg-deep/80` or stronger).
  - Full-height sheets get `pt-[max(1rem,var(--safe-top))]` and `pb-[max(1rem,var(--safe-bottom))]` so the close button and the last button sit inside the safe area.
- Builder header: the title column must not shrink below full width on mobile (`basis-full sm:basis-auto` or similar). The buttons wrap under it.
- Captain and player shells: one shared bottom padding for the page content that clears the nav plus the safe area. Screens with a fixed action bar add that bar's height.
  - The fixed builder activate bar sits directly above the nav with no overlap; the nav keeps its z-index below sheets.
  - Use tokens, not magic numbers spread around: one CSS var such as `--nav-clearance`.
- Sticky captain/player headers get the safe top.
- Remind action: a small client component (`remind-button.tsx` in player-profile) that does the scroll and focus. The EmptyState action supports `onClick` if it does not already.

## Out of scope
- Server-action error messages (T-067).
- Any visual redesign beyond the fixes above.

## Tests
- Unit test the remind button: it calls `scrollIntoView` and focuses the recorder button; with no recorder on the page it navigates to the check-ins tab URL with the hash.
- A test that every `<dialog>` sheet uses the opaque sheet class: a source grep test is fine, like the existing token tests.
- Builder header renders its title column with the full-width class.

## Requirements
- No new dependencies.
- Tokens only, logical properties, 48 px targets.
- Files ≤ 250 lines.
- Strings in `messages.ts`.

## Acceptance
- [ ] On a 390×844 viewport, no sheet shows page content through it; the close button is below the status bar.
- [ ] The builder title is on one line; the activate bar covers no content; the last card scrolls clear of the nav on the builder, nutrition and player-profile screens.
- [ ] The coach header never overlaps the status bar.
- [ ] «ابعت تذكير صوتي» ("send a voice reminder") visibly takes the coach to the recorder.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2` and `npm run build` pass.
