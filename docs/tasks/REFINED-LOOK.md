# Refined look: shared rules for T-364 to T-368

The owner approved the 25-screen mockup on 2026-11-17. The request was: «اعمل ده بالألوان وال active ده... منغير ما حاجة تبوظ... والشكل يبقى 100%».

## Reference
- Mockup page per screen: `docs/mockups/refined/all-<id>.html`. Open it in a browser; it is the source of truth for layout, order and sizes.
- Screenshot per screen: `docs/mockups/refined/all-<id>.png` (captain at 1440×900, player at 390×844).
- Captain ids:
  - c01 home, c02 tasks, c03 inbox, c04 players, c05 player file, c06 join;
  - c07 leaderboard, c08 programs, c09 builder, c10 exercises, c11 meal plans, c12 foods;
  - c13 check-ins, c14 subscriptions, c15 packages, c16 settings.
- Player ids:
  - p1 today, p2 workout, p3 food, p4 progress, p5 coach;
  - p6 rank, p7 check-in, p8 rest day, p9 account.

## Already done in T-363 (use these, do not restyle them)
- Tokens:
  - Page background `--color-bg` is #090a0b.
  - `glass` cards now use the mockup gradient (`.045 → .018`) and the `.07` border.
  - `rounded-card` is 18px.
  - `--shadow-control-primary` has the lime glow.
  - New colors `text-info` and `bg-info-soft`.
- Utilities in `src/app/refined.css`:
  - `ko-strip`: the lime KO band, for KO summaries only.
  - `cut-corner` and `cut-corner-sm`: the clipped top corner, for hero cards and the brand tile.
  - `engraved`: the outlined, hatched lime number, for **one** hero number per screen.
  - `nav-slash`: the slanted lime bar for the active nav item.
  - `hairline-cells`: thin dividers between cells of one card.
  - Tags `tone-lime`, `tone-warn`, `tone-danger`, `tone-info` and `tone-neutral`. They map to the mockup's `t-li`, `t-am`, `t-co`, `t-bl` and `t-gr`. Use them with `rounded-md px-inline text-micro font-semibold`.
- Primitives:
  - `StatStrip` from `@/ui/stat-strip` is the mockup's `stats()` row: one card with equal cells, a number, a unit, an optional 4px bar, a note and a signed delta. Use it wherever the mockup shows a row of numbers. Never use a row of separate number cards.
  - `ProgressBar thin` is the mockup's 4px `.bar`.
- Captain sidebar:
  - Groups are شغلي / فريقي / مكتبتي / فلوسي, with a new «الباقات» item.
  - The active item uses the slash.
  - Badges are soft pills.
  - The profile card opens settings.

## Mockup class → app class
| Mockup | App |
|---|---|
| `.card` | `glass rounded-card` (or `GlassCard`) |
| `.ko` | `ko-strip` |
| `.btnp` (lime) | `Button` with `variant="primary"`. **One per screen.** |
| `.btn` | `Button` with `variant="secondary"` |
| `.seg` | the existing `Segmented` from `@/ui/segmented` |
| `.row` (list row, 58px, top hairline) | `flex min-h-14 items-center gap-stack border-t border-line-soft px-card` |
| `.ch` (card header) | `flex items-center gap-inline px-card pt-card pb-stack`, title `text-md font-bold` |
| `.n` numbers | `font-display font-extrabold tabular-nums tracking-tight` |
| `.mu` / `.fa` | `text-muted` / `text-faint` |
| `.in` search field | the existing field components |

## Hard rules (every card)
- **Behavior does not change.** The same data, queries, mutations, routes, offline writes (`saveAndQueue`), permissions and tests. This is a visual and layout pass.
- If the mockup shows something the app has no data for, do not build it and do not fake it. Leave it out and list it under "Notes for reviewer". Examples:
  - coupons;
  - «وقتك الأسبوع ده»;
  - KO suggested replies;
  - invite-link stats;
  - the team-today dot grid.
- If an existing feature is missing from the mockup, keep it. Place it where it fits the mockup's structure.
- No empty space:
  - No lone half-width card.
  - No card holding only a button.
  - Grids fill their row.
  - Use `StatStrip` for any number row.
- Layout and spacing:
  - Spacing uses scale tokens only: `p-card`, `px-stack`, `gap-inline`, `gap-card-gap`, `mt-stack`, `p-section`, `min-h-12`. Raw `p-3` or `gap-2` fails `src/ui/spacing-system.test.ts`.
  - No `text-[NNpx]`.
- Follow `AGENTS.md` in full:
  - tokens only, no hex;
  - logical properties;
  - 48px touch targets;
  - strings in the feature's `messages.ts` (`ar`, `arStd`, `en`);
  - lucide icons, and KO icons for nav and main actions;
  - 250 lines per file at most;
  - one component per file.
- Light theme must still render correctly. Don't hard-code dark-only colors.
- Mobile:
  - Captain screens collapse to one column under 760px.
  - Player screens are designed at 390px and must also fit 360px.
- Update or add tests for the changed components (rendered markup, such as `StatStrip` being used and the one-primary-button rule). Keep every existing test passing; change an old assertion only when it checked the old look, and say which ones.
