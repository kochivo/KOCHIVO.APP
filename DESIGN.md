# DESIGN.md — how KOCHIVO looks, moves and reads

Every screen follows this file. `AGENTS.md` has the engineering rules, and
`docs/tasks/V11-FIDELITY.md` explains how to match a mockup. When a task card and this
file disagree, the card wins for that task. Then update this file in the same diff.

## Who it is for
- **Captains** (coaches) work on a laptop or a phone between sessions. They need speed, clear
  numbers and one obvious next action.
- **Players** use a phone in the gym, often with one hand and tired. They need big
  targets, big numbers and few words.
- Arabic (RTL) is the default. Egyptian Arabic is `ar`; simple standard Arabic is `arStd`.
  English is short and plain.

## Identity
- Dark surfaces with one action color, lime. Lime marks what you can press or what just
  succeeded, never decoration.
- The KOCHIVO slash (a −36° skew) is a background graphic only. Never use it as a button or
  card shape.
- The real logo comes from `public/`. Never redraw it.
- Icons: `lucide-react` by default. On v6/v11 screens, navigation and main actions use the
  engraved KOCHIVO set in `src/ui/icons`.
- No emoji, no stock illustrations, no 3D icons, and no "AI look": generic gradients,
  glowing blobs everywhere, or a big number with a tiny label as the only idea.

## Tokens (source of truth: `src/app/globals.css` `@theme`)
Use utilities, never hex in components.

| Group | Tokens |
|---|---|
| Surfaces | `bg`, `bg-deep`, `surface`, `surface-raised`, `line`, `line-soft` |
| Text | `ink` (primary), `muted` (secondary), `faint` (hints only, never body) |
| Action | `lime`, `lime-soft`, `on-lime`, `lime-top`/`lime-bottom` (button gradient) |
| State | `danger`, `warn`, `calm`; each has a `-soft` fill for tiles |
| Radius | `rounded-card` (cards, sheets), `rounded-control` (buttons, inputs), `rounded-full` (chips, avatars) |

### Type scale
Fonts: Alexandria for Arabic text, Changa for Arabic display, Manrope for Latin and every
number (tabular figures). Use only these sizes. One-off `text-[13px]` values are being
removed (T-278).

| Token | Size | Use |
|---|---|---|
| `text-micro` | 11.5px | tags, badges, chart axes |
| `text-xs` | 12px | meta lines, timestamps, helper text |
| `text-row` | 13px | list rows, table cells, card body on dense captain screens |
| `text-sm` | 14px | default body, form labels, buttons |
| `text-md` | 15px | row titles, sheet body |
| `text-title` | 19px | card and sheet titles |
| `text-h` | 24px | page titles |
| `text-stat*` | 24–60px | big numbers only (existing stat tokens) |

Weights: 400 body, 600 titles and buttons, 800 stats and the slogan. Line height is 1.6
for Arabic body and 1.2 for numbers.

### Spacing (T-278)
`page-x` 16/24, `page-y` 16/24, `section` 24/32, `card` 16/20, `card-gap` 12/16,
`stack` 8/12, `inline` 8 (mobile / ≥760px). Do not use any other padding or gap value.

## Surfaces
Three glass levels:
- `glass` for cards;
- `glass-strong` for big numbers, focus panels and toasts;
- `glass-featured` for the one highlighted plan.

Sheets and dialogs use the opaque `sheet` surface (tested). Nested panels use `recessed`.
On touch devices glass is a gradient fill without live blur. Only sticky bars, the bottom
nav and overlays keep a blur, and it is at most 12px (T-282).

## Controls (T-281)
- **One button component.** Use `<Button>` for buttons. For links, use
  `buttonClass({ variant, size, block })`.
- **Variants.** `primary` is the lime gradient; use one per screen. `secondary` is liquid
  glass. `ghost` and `danger` also exist.
- **Sizes.** `sm` is 40px and only inside dense rows. `md` is 48px and the default. `lg`
  is 56px for gym controls. Steppers and done buttons can be larger.
- **Icon-only buttons.** Use `<IconButton>`, 48×48, with a translated `aria-label`.
- **Clickable things look clickable:** pointer, hover, pressed state (`scale(.97)`) and a
  focus ring (V11-FIDELITY).
- **Feedback after an action.** Call `toast.success({ title, detail, icon })` with an icon
  tile, a bold title and one muted detail line. Errors use the danger tint.

## Motion (T-282)
- Animate only `transform` and `opacity`, never layout, shadow or filter.
- UI feedback lasts at most 400ms. Entrances run once.
- A loop runs only while it is on screen and the tab is visible (`useInView`).
- One orchestrated moment per screen at most, such as the hero slogan or a success popup.
  No fade-up on every section.
- `prefers-reduced-motion` removes everything that is not essential.

## Layout
- **Captain desktop:** a sidebar, a top bar with the page title and one primary action, and
  content in a 12-column grid.
- **Captain phone:** a bottom nav. The composer and floating buttons sit above the nav and
  never cover content.
- **Player:** phone first, with a bottom nav of 4 tabs. The main action sits in reach of
  the thumb.
- **RTL:** logical properties only (`ms-`, `pe-`, `start-`, `text-start`). Icons that point
  a direction use `.dir-icon`.
- **Lines and targets:** body lines stay under about 70 characters. Touch targets are at
  least 48px.

## States
Every list has an empty state that says what to do next. Every async view has a loading
state (skeleton shaped like the content) and an error state with a retry. Real data only:
never show sample numbers in the product.

## Writing
- Every string lives in a feature's `messages.ts` in `ar`, `arStd` and `en`.
- Use sentence case and plain verbs. A button says what happens ("Save program"), and its
  popup uses the same verb ("Program saved").
- No filler, no hype, no exclamation marks, no em dashes. Run the `unslop` checklist on
  English copy before landing it.

## Performance budgets
First-load gzip limits are 200 KB on public pages, 300 KB on player pages and 310 KB on
captain pages (`src/lib/perf-budget.test.ts`).
- No new dependencies. That includes animation and component libraries such as Motion,
  shadcn/ui, Aceternity, Spline and 3D or illustration packs. Use them as references only.
- Import `src/ui` leaf modules, not the `@/ui` barrel, in public routes.

## Before you say done
Compare the screen with its mockup at 1440px and at 390px, in Arabic and English, and in
dark and light themes. Then run `npm run check`, `npm run build` and the perf budget test.
