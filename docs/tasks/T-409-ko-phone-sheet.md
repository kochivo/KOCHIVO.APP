# T-409: KO takes the screen on phones

Owner approved the mockup on 2026-11-19: `docs/mockups/ko/phone-sheet/phone-sheet.png`. The HTML is `docs/mockups/ko/phone-sheet/index.html`.
- The left phone is the target.
- The emoji in the mockup stand in for the real lucide icons. Keep the current icons.

Owner report: on the phone the KO panel is small, and the chat log is only 240 px tall (`max-h-60`), about 3 messages. Using it is annoying.

## What to build

### Phone (below `lg`)
- **The account KO panel opens as a bottom sheet that covers almost the whole screen.** This is `KoPanel` when `account` or `interactive` is set.
  - It is anchored at `inset-x-0 bottom-0`, and its top sits at `var(--safe-top)` plus a small gap of about 12 px.
  - It has rounded top corners only (`rounded-t-card`) and no side gutters.
  - The page behind is covered by the existing backdrop.
- **Grabber:** a small bar centred above the header, `h-1 w-10 rounded-full bg-line`, purely visual (`aria-hidden`).
  - Dragging the sheet down by more than about 80 px from the grabber or the header closes it through the existing `onClose`. Use pointer events only, with no new dependency.
  - Respect `prefers-reduced-motion`: no follow-the-finger translate, just close on release.
  - The ✕ button stays.
- **Layout is a flex column filling the sheet height:**
  - header (sticky, as today);
  - context bar (as today);
  - the chat log, which becomes `flex-1 min-h-0 overflow-y-auto` instead of `max-h-60`;
  - suggestions;
  - the composer pinned at the bottom.
  - The sheet itself must not scroll; only the log scrolls.
- **Bigger text and controls on the phone:**
  - Bubbles use `text-base` with a slightly taller line height.
  - The composer input and its camera, mic and send buttons are 56 px (`min-h-14`, or the closest existing token or size class).
  - Bottom padding includes `var(--safe-bottom)` (or the project's equivalent safe-area token).
- **Keyboard:** when the on-screen keyboard opens, the composer stays visible above it. Use `100dvh` and `visualViewport` if needed, with no dependency. The log keeps the latest message in view.
- «امسح المحادثة» (T-407) stays in the header next to ✕, as it already is.

### Desktop (`lg` and up)
- The floating panel keeps its place, width and look.
- Only the chat log changes: it fills the panel's height (`flex-1 min-h-0`) instead of `max-h-60`, so a long conversation uses the full panel.

### Standalone `/ko` page
- The log uses the available height there too, using the same `flex-1 min-h-0` rule inside a full-height column.
- Nothing else changes.

## The look must not change otherwise
- Use the same colors, glass, header, bubbles, cards, credit meter, quick buttons and composer style.
- Use only existing tokens and classes. Arbitrary values are allowed only where today's code already uses them (safe-area calc).
- Logical properties only. Touch targets of at least 48 px.
- The demo KO widget (non-account) is untouched.

## Files
- `src/features/ko-preview/components/ko-panel.tsx`
- `src/features/ko-preview/components/ko-chat.tsx`. It must stay under 250 lines; move the composer into `ko-composer.tsx` if needed.
- `src/features/ko-preview/components/ko-message.tsx` for the text size.
- A new `src/features/ko-preview/hooks/use-sheet-drag.ts` for the drag-to-close.
- `src/app/[locale]/ko/page.tsx`, only if the full-height column needs it.

## Out of scope
- Route, Gemini or data changes.
- The KO launcher button.
- The demo widget.
- No new dependency. No `.env*` changes.

## Tests (deterministic)
- `use-sheet-drag`:
  - a drag over the threshold calls close;
  - a short drag does not;
  - reduced motion still closes on release.
- Panel:
  - on the account panel the log has `flex-1` and no `max-h-60`;
  - the grabber is `aria-hidden`;
  - ✕ still closes;
  - targets are at least 48 px.
- Keep every existing ko-preview test green.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ko-preview`
- `npx vitest run src/features/ko-preview src/core/i18n/coverage.test.ts`

Report in the AGENTS.md final format, with a one-line description of every visible change.
