# T-222: Player v3 shell (pill bottom nav and the shared look)

**Phase:** Player v3 redesign (owner approved 2026-11-13) · **Depends on:** nothing · **Status:** ready · **Run first:** T-223 to T-227 build on it

## Goal
Give every player screen the v3 frame from `docs/mockups/player-v3/`: the floating pill bottom nav and the page spacing. Read `docs/mockups/player-v3/README.md` first; its shared rules are part of this card.

## Files
- `src/ui/bottom-nav.tsx`: add `variant?: 'bar' | 'pill'`. The default stays `'bar'`, so the captain nav does not change.
- `src/features/player-shell/components/player-shell.tsx`: use `variant="pill"` when `captainWorkspaceEnabled()`.
- `src/features/player-shell/nav.ts`: only if a label is missing.
- Tests next to these files.
- This card.

## Requirements
1. **The pill nav.** Match the `<nav>` in `01-home.html`:
   - It is fixed, `inset-inline: 16px`, `bottom: 16px` plus the safe-area inset, `h-[68px]`, `rounded-full`, `bg-surface-raised`, with a `border-line-soft` border. The items use `justify-around`.
   - The active item is a pill of height 52, `px-4`, `bg-ink text-bg`, with the icon (20px) and the label (13px, weight 800), and `aria-current="page"`.
   - Inactive items are `size-[52px]` round buttons, icon only (22px), `text-muted`, each with an `aria-label` equal to the item label.
   - It is RTL-safe and uses logical properties only.
2. **Page padding.** Player pages that show the nav keep `pb-[104px]` or more, so the last card is never hidden behind the nav. Check `/player`, `/player/nutrition`, `/player/progress` and `/player/captain`.
3. **Rest mood.** On rest days the nav must follow `data-mood='rest'` automatically (the active pill turns light blue and the background navy). It does that if you use tokens only. Add a test that renders the nav inside `data-mood='rest'` and checks that the class names are token-based (no hex values).
4. **Keep.** The shell header, the settings link, the WhatsApp link, the sync runner, and the `showsNav()` rule (no nav during a workout or onboarding) all stay as they are.

## Acceptance
- [ ] Tests:
  - the pill variant marks only the active item with `aria-current` and a visible label;
  - inactive items have an `aria-label`;
  - the bar variant output is unchanged (snapshot or class check).
- [ ] At 390×844, `/player` matches the nav in `01-home.html`.
- [ ] `npm run check` and `npm run build` pass. The route bundle stays under the 200 KiB perf budget.

## Out of scope
The content of any screen (T-223 to T-228), the captain nav, and the icons themselves.
