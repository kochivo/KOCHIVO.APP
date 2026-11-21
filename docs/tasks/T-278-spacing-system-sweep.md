# T-278 — One spacing system for the whole site

**Phase:** polish · **Depends on:** T-272 · **Status:** ready
Read `docs/tasks/V11-FIDELITY.md` first.

## Goal
The owner asked on 2026-11-14 that spacing be consistent everywhere: sections, header, footer, cards, lists and buttons. Today every screen picks its own `p-*`, `gap-*` and `space-y-*` values, so the screens feel uneven. Some show large empty gaps, as in the player food panel. Others are cramped.

This card defines one spacing scale and moves every screen onto it, without changing layouts or features.

## The scale
Add these tokens to `src/app/globals.css` `@theme`, next to the existing `--spacing-card` and `--spacing-card-gap`, and document them in `V11-FIDELITY.md`:

| Token | Mobile | ≥760px | Used for |
|---|---|---|---|
| `page-x` | 16px | 24px | side padding of every page and of the header and footer |
| `page-y` | 16px | 24px | top and bottom padding of the page content |
| `section` | 24px | 32px | gap between page sections |
| `card` (exists) | 16px | 20px | padding inside a card or sheet |
| `card-gap` (exists) | 12px | 16px | gap between cards in a grid or list |
| `stack` | 8px | 12px | gap between rows inside a card |
| `inline` | 8px | 8px | gap between a button and its neighbours, icon and label |

## The type scale (added 2026-11-15, see `DESIGN.md`)
Add these to `@theme` as `--text-*` tokens and replace every one-off `text-[Npx]` in `src/features` and `src/app`. Today there are about 400 of them, for example `text-[13px]` ×70, `text-[19px]` ×60 and `text-[11.5px]` ×43.

| Token | Size | Replaces |
|---|---|---|
| `text-micro` | 11.5px | `text-[9.5px]`–`text-[11.5px]` |
| `text-xs` | 12px (exists) | `text-[12px]`, `text-[12.5px]` |
| `text-row` | 13px | `text-[13px]`, `text-[13.5px]` |
| `text-sm` | 14px (exists) | `text-[14px]` |
| `text-md` | 15px | `text-[15px]`, `text-[16px]` |
| `text-title` | 19px | `text-[18px]`–`text-[20px]` |
| `text-h` | 24px | `text-[22px]`–`text-[28px]` |
| stat tokens (exist) | 24–60px | `text-[30px]` and larger numbers |

Keep the existing `text-stat*` tokens. Leave alone sizes inside SVG charts, and the marketing slogan's `clamp()`. The same scan test that checks spacing also fails on any new `text-[Npx]` in `src/features` or `src/app`.

Buttons:
- every button is at least 48px high (`min-h-12`);
- primary and secondary buttons use horizontal padding of 20px;
- icon buttons are 48 by 48;
- chips are 38px high.

Header and footer use `page-x`. The header has one fixed height per breakpoint, and the content never touches the screen edge.

## Files
- `src/app/globals.css` (tokens only)
- `src/ui/` primitives (button, chip, icon-button, card wrappers, page shell)
- The captain workspace, player app and public site components that set their own padding or gaps
- Their tests

Change spacing classes only.

## Requirements
1. **Primitives first:** page shell, card, sheet, list row and button. Most screens then follow without per-file edits.
2. **Then sweep per area**, in this order:
   - captain v11 screens;
   - player app;
   - public site (landing, coach page, login, welcome, footer).
   Replace one-off values (`p-[18px]`, `gap-2.5`, `space-y-5`, …) with the scale.
3. **Remove empty gaps:**
   - no section with a fixed min-height that leaves blank space;
   - no list row that grows taller than its content because of padding stacking.
4. **RTL:** logical properties only.
5. **Light theme and the player screens stay visually the same**, apart from spacing.
6. **Perf:** no route grows beyond its budget.
7. **Final message:** a table with the columns area, file, before and after. List anything that looked intentional and was left alone.

## Acceptance
- [ ] The tokens exist and are documented. No new one-off spacing values remain in touched files.
- [ ] The header, footer and page content line up on the same side padding on every page, at 390px and at desktop.
- [ ] A test asserts that the page shell and card primitives use the tokens.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Layout redesigns, new features, colour or type changes.
- The meal plan editor (T-276) and assessment editor (T-277). They follow the scale when they are built.
