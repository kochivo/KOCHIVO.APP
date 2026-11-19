# T-412: Floating buttons never cover a screen's main action (native feel)

Owner report, 2026-11-19, with a screenshot:
- On the phone program editor, the KO launcher sits on top of the lime «احفظ وابعت للاعبين (1)» bar and covers part of it. The owner says several places do this.
- The owner wants every screen to feel like a native app.

## Rule (same idea as the existing `body:has([data-chat-composer]) [data-floating-fab] { display: none; }` in `globals.css`)
**On phones (below `md`), while a screen shows a fixed or sticky bottom action bar, hide every floating button (`[data-floating-fab]`).** That covers the KO launcher and the feedback button.
- They come back as soon as the bar leaves the page.
- Desktop is unchanged.

## What to build
1. **Add `data-action-bar` to each fixed or sticky bottom action bar.** Use the element that holds the main action:
   - `captain-workspace/training/editor-header.tsx`: the phone «احفظ وابعت» button (when `phoneDay`).
   - `captain-workspace/components/mobile-actions.tsx`.
   - `roster/components/captain-frame-nav.tsx`: the pinned action / failed bar.
   - `roster/components/invite-form.tsx` footer.
   - `settings/components/captain/save-bar.tsx`.
   - `onboarding/components/intake-wizard.tsx` footer.
   - `player-shell/components/start-gate-screen.tsx`: the `next` bar.
   - `player-shell/components/captain-question.tsx`: the v3 fixed card.
   - `workout/components/workout-overview.tsx`: the bottom start bar.
   - `workout/components/workout-set.tsx`: the sticky done button.
   - Search the rest of `src/features` for any other `fixed`/`sticky` bottom bar that holds a button, and add it. Skip sheets and dialogs: they already sit above the launcher. List what you added in the notes.
2. **In `src/app/globals.css`,** next to the existing rule:
   ```css
   @media (width < 48rem) { body:has([data-action-bar]) [data-floating-fab] { display: none; } }
   ```
   - Use the project's breakpoint syntax and the `md` value already used in the file.
   - A bar hidden with `hidden`, `display:none` or `max-md:hidden` must not hide the launcher on screens where the bar is not visible. Check how each bar is hidden and only put the attribute where the bar is actually shown on phones. For example, use a conditional attribute when the bar renders only on `phoneDay`.
3. **No overlap anywhere else.** On phones the launcher must stay clear of the bottom nav and the centre «+» diamond (captain) / centre dumbbell (player).
   - Check the current `phonePosition` classes against `captain-phone-nav.tsx` and the player tab bar heights.
   - Fix the bottom offset if they touch.

## The look must not change
Nothing is restyled. Floating buttons only hide on those screens, plus the offset fix if it is needed.

## Out of scope
- The KO panel itself (T-409 just landed).
- KO logic.
- No new dependency.

## Tests
- A source test, in the style of `src/ui/sheet-surfaces.test.ts`: every file in the list above contains `data-action-bar`.
- `globals.css` contains the `[data-action-bar]` rule inside a phone media query.
- The existing floating-button tests stay green.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features src/app`
- `npx vitest run src/ui src/features/ko-preview src/features/ko-entry src/features/feedback src/features/captain-workspace src/features/roster src/features/settings src/features/onboarding src/features/player-shell src/features/workout`

Report in the AGENTS.md final format, with the list of bars that got the attribute.
