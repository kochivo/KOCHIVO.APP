# Player v3: the approved player screens

The owner approved these 11 screens on 2026-11-13 and said: "هنعتمدها بالظبط مش عاوز فيها اي غلطه". Build each one so it matches its file here, 1:1, at 390×844.

The files are design-canvas exports. Read them as plain HTML with inline styles. Ignore `support.js`, `<x-dc>` and the `DCLogic` script; links inside point to other mockups, not to app routes.

| # | Mockup | App route | Card |
|---|--------|-----------|------|
| 1 | `01-home.html` | `/player` (training day) | T-223 |
| 11 | `11-rest.html` | `/player` (rest day) | T-223 |
| 2 | `02-day.html` | `/player/workout/[dayId]` (overview) | T-224 |
| 3 | `03-set.html` | `/player/workout/[dayId]` (focus / set logging) | T-224 |
| 4 | `04-done.html` | `/player/workout/[dayId]` (finish) | T-224 |
| 5 | `05-food.html` | `/player/nutrition` | T-225 |
| 6 | `06-progress.html` | `/player/progress` | T-226 |
| 9 | `09-history.html` | `/player/history` | T-226 |
| 8 | `08-captain.html` | `/player/captain` | T-227 |
| 10 | `10-profile.html` | `/player/settings` | T-227 |
| 7 | `07-medals.html` | `/player/rank` | T-228 (blocked) |

## Shared rules (every card)

**Tokens.** Map the mockup colors to the existing tokens in `src/app/globals.css`. Do not add a hex value to any component.

| Mockup | Token |
|--------|-------|
| `#0a0b0c` | `bg-bg` |
| `#141516` | `bg-surface` |
| `#1b1c1e` | `bg-surface-raised` |
| `#26282a` | `bg-line` |
| `#f4f4f1` | `ink` |
| `#a6abb0` | `muted` |
| `#80858b` | `faint` |
| `#b6e94f` / `#101418` | `lime` / `on-lime` |
| `#60a5fa` | `water` |
| `#f5ac78` | `sore` |
| `#e3b448`, `#f6d77e`, `#3d2e0c` | `gold-2`, `gold-4`, `gold-face-1` |

- A card border of `rgba(255,255,255,.07)` maps to `border-line-soft`.
- If a color has no token, stop and list it under Notes. Do not invent one.

**Rest day.** `data-mood='rest'` already turns the whole UI blue: `lime` becomes `calm`, and the background and surfaces turn navy. `11-rest.html` shows exactly that result. Do not add new rest colors; use the tokens and the mood does the rest.

**Shape.**
- Cards: `rounded-[22px]` to `rounded-[28px]`, as in each mockup.
- Pills and buttons: fully rounded.
- Big numbers: the Manrope numeric font that already exists (`font-numeric` or the current equivalent).
- The brand slash, a skewed bar in the hero card, appears only on the home hero (lime, or calm on rest days) and the done screen.

**Bottom nav.**
- It is a floating pill at the bottom: `inset-inline: 16px`, `bottom: 16px`, `h-[68px]`, rounded, `bg-surface-raised`.
- The active item is an ivory pill (`bg-ink text-bg`) with icon and label. Inactive items are 52px round icon-only buttons with a translated `aria-label`.
- Keep the four items and the KOCHIVO icon set from `player-shell/nav.ts`.
- This is a new `variant="pill"` on `src/ui/bottom-nav.tsx`. The captain nav keeps the current look.

**One primary action.** Each screen has exactly one lime (or calm) filled button: the one in the mockup. Everything else uses an outline (`border-line-soft`) or a quiet style.

**Feature flag.** The v3 look replaces the current v6 branch (`captainWorkspaceEnabled()`). The non-v6 legacy branch stays as it is.

**Nothing disappears.** If a screen today has a feature the mockup does not show, keep it below the mockup content in the same style, and list it under Notes. Never delete a working feature to match a picture.

**Only real data.**
- Every number on a mockup is sample data. Bind it to the real source named in the card.
- Where the mockup shows something that has no backend yet, the card says what to do, usually a disabled control with «قريباً». Never fake it.

**Copy.** Every string goes in messages for `ar`, `arStd` and `en`. The mockup Arabic is the `ar` text exactly.
