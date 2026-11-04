# T-060 — Surface depth v2: true black, lime orbs, cut-glass cards

**Phase:** 3 · **Depends on:** — · **Status:** ready (owner design review, 2026-11-04)

## Problem
The dark theme looks flat. The page background leans dark green and is the same everywhere, so cards do not lift off it.

## Rule
All of this happens in **tokens and utilities**: `src/app/globals.css` `@theme`, `src/app/surfaces.css`, and the primitives in `src/ui`.
- Components keep using `bg-bg`, `glass`, `glass-strong`, `text-ink`, `text-muted`, `bg-lime` and so on.
- No hex, no `white/[x]` and no arbitrary shadows inside feature components (AGENTS.md §4).
- The **light theme stays as it is**; change only the dark values.
- The brand lime stays `#b6e94f` (brand is fixed). Use it for the glow instead of the reviewer's sample `rgb(197 255 34)`.

## Changes (dark theme)
1. **Background:**
   - Set `--color-bg` to true black (about `#050505`) and `--color-bg-deep` to `#000`.
   - Remove the green tint from the page background, `mesh` and `--page-glow`.
   - Add 2–3 very faint lime orbs (radial gradients, `--color-lime` at about 5% alpha, about 120 px blur equivalent) in fixed corners of the app shell and behind hero or primary cards.
     - Make them one `bg-orbs` utility or a single `<Orbs />` primitive in `src/ui`, used once in the root layouts (marketing, captain, player).
     - Use `pointer-events: none` and `aria-hidden`.
     - Use no animation, or only a very slow drift disabled under `prefers-reduced-motion`.
2. **Glass cards:**
   - `glass`: about 2% white fill, `backdrop-blur-xl`, a 1 px hairline border at about 8% white, and shadow `0 4px 24px -8px rgb(0 0 0 / 0.5)`.
   - `glass-strong`: the same, a little denser (about 4% fill, about 12% border) for big numbers and focus panels.
   - Keep the existing inset highlight only if it still reads well.
   - Define `--glass-fill`, `--glass-border` and `--glass-shadow` tokens so light mode keeps its own values.
3. **Recessed inputs:**
   - `Stepper`, `TextField` and the other number or time inputs in `src/ui` (reps, rest and so on) look sunk in: about 40% black fill, a 1 px border at about 4% white, and an inner shadow.
   - Add a `recessed` utility in `surfaces.css` and use it in the primitives only.
4. **Type contrast:**
   - `--color-ink` becomes pure white in dark mode, for headings and numbers.
   - `--color-muted` becomes about 50% white or zinc-400 (`#a1a1aa`), for secondary text such as «90 ثانية» and day names.
   - Check that muted text on the new black still passes WCAG AA (4.5:1) and adjust if not.
5. **Accent discipline:**
   - Primary `Button` (lime) gets a soft glow, `0 0 15px` lime at about 20%, through a `--shadow-lime-glow` token.
   - Lime appears only on the primary action, active or selected states, and focus rings.
   - Grep `src/features` for decorative lime (`text-lime` and `bg-lime` that are not the action or active state) and list them in "Notes for reviewer". Change a feature file only when it is a one-word token swap (e.g. `text-lime` to `text-ink`) that does not change any logic.

## Out of scope
Layout changes, new components beyond orbs and recessed, and the light theme.
Do not edit `src/features/programs`, `src/features/progress`, `src/features/inbox` or `src/features/supplements` (other agents are working there). List what they need under "Notes".

## Tests
- Keep the existing UI token tests passing and update them if they assert old values.
- Add a test that `globals.css` dark tokens contain no green-tinted background and that the muted/bg contrast ratio is at least 4.5.

## Acceptance
- [ ] Dark pages are true black with faint lime orbs.
- [ ] Cards show a crisp hairline edge.
- [ ] Inputs look recessed.
- [ ] Lime is used only for the primary action and active states.
- [ ] The light theme is unchanged.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
