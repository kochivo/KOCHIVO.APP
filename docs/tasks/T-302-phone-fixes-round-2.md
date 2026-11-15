# T-302: phone fixes, round 2 (player home, player facts header, finish screen)

The owner sent 4 iPhone screenshots of the live site, in `docs/tasks/T-302-shots/`. Open every one before starting.

The live site does not have T-299 yet. T-299 already added captain floating-button clearance (`.captain-content`, `--captain-content-clearance`) and the captain status-bar strip in `captain-workspace-frame.tsx`. So the overlap in `3-training-tab.png` on the captain side is already handled. Check that, but do not redo it.

## Fix
1. **`2-training-facts.png`: the player name is written one letter per line. This is the worst bug.**
   - Where: the player facts card in the program builder, `src/features/captain-workspace/training/training-facts.tsx`.
   - The chips (Lower back), "Full player file" and the expand button take the whole row, so the name column shrinks to about 1ch and every letter wraps.
   - Fix the header layout:
     - the name and the summary line («28 years · Male · Just starting») take the full width on the first row;
     - the chips, the full-file link and the expand button go on a wrapping row below it on narrow widths.
   - Never let text columns shrink below readable width: use `min-w-0` with a sensible basis, plus `flex-wrap` or grid.
   - Check every branch of that component: missing intake, expanded and collapsed.
2. **`1-player-home.png`: the floating KO launcher («قريبًا») and the feedback button cover the last card** («جاوب على سؤالين الصبح») above the player bottom nav.
   - Give the player shell content the same kind of bottom clearance T-299 gave the captain: a shared variable, so the last card can scroll fully clear of both floating buttons and the nav.
   - Find where the player shell mounts them: `src/features/player-shell/components/player-shell.tsx` and `FeedbackButton`.
3. **`1-player-home.png`: the bell button top-start of player home shows a tiny icon inside a big 64px box.**
   - Make the icon the normal size for that button (like other icon buttons, about 20–24px).
   - Keep the touch target and the translated `aria-label`.
4. **`4-finish.png`: the finish screen shows total lifted as «0.7ط».**
   - Make the volume read naturally: below 1000 kg, show kilograms (for example «700 كجم» / «700 kg»); from 1000 kg, show tons with a full unit word («1.2 طن» / «1.2 t»).
   - Update `volumeInTons` (or replace it with a pure `formatVolume` helper) and the messages in ar, arStd and en.
   - Unit test the helper at 0, 700, 999, 1000 and 1250.
5. **Check the player status bar.** In the installed app, check whether player screens also scroll under the iOS status bar the way the captain screens did. If they do, reuse the same strip approach for the player shell. If the player shell already handles it, leave it alone and note that.

## Rules
Phone first: 360, 390 and 430px with no horizontal scroll. Tokens only, logical properties, the T-278 spacing tokens, the T-275 click cues, targets of at least 48px. Strings go in messages for all three locales. Keep the current look.

## Files
- `training-facts.tsx`
- The player shell, or wherever its floating buttons and content wrapper live
- The player home header bell
- `finish-hero.tsx` and the workout messages
- Shared CSS only if needed
- Tests for each fix: render or source tests, plus the pure volume helper

## Out of scope
SQL, admin, landing, and anything else. Note other problems you see under Notes for reviewer.

## Gates
1. `npx vitest run src/features/captain-workspace src/features/player-home src/features/player-shell src/features/workout src/ui`
2. `npm run typecheck`
3. `npm run lint`
