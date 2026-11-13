# T-214: KOCHIVO engraved icon set for navigation and main actions

**Phase:** v6 polish · **Status:** ready · **Depends on:** none · **Migration:** none
**Owner decision:** 2026-11-13. The owner picked style **E, "محفورة / Engraved"** from the icon preview. The app should not look AI-made.
**Flag:** the new icons render only when `captainWorkspaceEnabled()`. Flag-off output stays byte-identical, with the same Lucide icons.
**Rules:** follow AGENTS.md in full.
- No new deps: hand-written SVG React components.
- Keep files under 250 lines.
- Tokens only; no hex in components. The ivory and hatch colors come from new `@theme` tokens (see below).
- No Get-Content/Set-Content. Do not commit.

## The style (match it exactly)
- **Grid:** 24×24 viewBox, drawn to sit inside a 2px padding.
- **Two stroke weights:**
  - main outline `1.5`, round caps, round joins, `fill: none`, `stroke: currentColor`;
  - fine details `0.9`.
- **One hatched accent per icon:** a single small shape filled with an SVG `<pattern>` of thin diagonal lines (rotate 45°, spacing 2.2 user units, line width 0.7). Its outline is the fine `0.8` stroke. This is the signature; every icon has exactly one.
- **Color:**
  - Idle: icon `currentColor` from a new token `--color-ivory-muted` (about `#8a877f`); hatch from `--color-ivory-hatch` (about `#cfc8b4`).
  - Active (selected nav item): icon in `--color-ivory` (about `#ede6d3`). The hatch and the accent outline switch to `lime`.
- No glow, no gradients, no drop shadows, no emoji.
- **Pattern ids:** each icon renders its own `<defs><pattern>` with an id from React `useId()`, so many icons on one page never collide. Works in server and client components.
- **Props:** `{ className?: string; active?: boolean } & Omit<SVGProps<SVGSVGElement>, 'children'>`.
  - Default `aria-hidden="true"`.
  - Use `focusable="false"`.
- RTL: icons are not mirrored, except arrows that show direction ("send" stays as drawn).

### Reference geometry
Start from the owner-approved preview geometry below; keep its proportions. Draw the remaining icons in the same hand.
```
home:     <path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/>                      accent: rect x10 y14 w4 h6
players:  <path d="M3.5 20v-1c0-3.1 2.4-5.3 5.5-5.3s5.5 2.2 5.5 5.3v1"/><path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2"/><path d="M17.5 13.9c1.9.6 3 2.3 3 4.6V20"/>   accent: circle cx9 cy8 r3.4
training: <path d="M8 12h8"/><rect x16 y7 w3.5 h10/><path d="M2.5 10v4M21.5 10v4"/>          accent: rect x4.5 y7 w3.5 h10
food:     <path d="M3.5 12.5h17a8.5 8.5 0 0 1-17 0Z"/><path d="M12 9v3.5"/>                 accent: leaf <path d="M12 9c0-3 2-5 5.5-5 0 3-2 5-5.5 5Z"/>
forms:    <rect x5 y4.5 w14 h16/><path d="m8.5 13 2.5 2.5 4.5-5"/>                           accent: rect x9 y2.5 w6 h3.5
followup: <path d="M3.5 13.5 6 5h10"/><path d="M20.5 11v9h-17v-6.5h5l1.5 2.5h4l1.5-2.5h5"/>  accent: circle cx19.5 cy5.5 r2.6
billing:  <rect x3 y6 w18 h12.5/><path d="M3 10.5h18"/>                                       accent: rect x6 y13.5 w5 h2.2
settings: <path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><rect x6 y15 w4 h4/>                      accent: rect x14 y5 w4 h4
template: <rect x3.5 y4 w17 h5/><rect x3.5 y12 w7 h8/>                                        accent: rect x13.5 y12 w7 h8
send:     <path d="M20.5 3.5 3.5 10.5l7 3 3 7Z"/>  fine: <path d="m10.5 13.5 5-5"/>          accent: small triangle near the tail
camera:   <path d="M3.5 7.5h4l2-2.5h5l2 2.5h4V19h-17Z"/><circle cx12 cy13 r3.4/>              accent: rect x16.6 y9.3 w2 h2
gallery:  <rect x3.5 y4.5 w17 h15/><path d="m3.5 17 5-5 4 4 3-3 5 5"/>                        accent: circle cx15.5 cy9 r1.8
```
The live preview is "KOCHIVO الأيقونات والشاشات", style E. The reviewer has it; the geometry above is the source of truth.

## Icons (20)
Add them in `src/ui/icons/`, one file per icon, kebab-case: `ko-home.tsx`, `ko-players.tsx`, and so on. Also add:
- a shared `ko-icon.tsx` (the SVG wrapper, pattern and accent helper);
- an `index.ts` barrel.

| Icon | Used for |
|---|---|
| home | captain home, player home |
| players | captain roster |
| followup | captain follow-up (`/captain/inbox`) |
| training | training plans (`/captain/templates`) |
| meal-plans | meal plans library |
| foods | foods library |
| forms | assessments (`/captain/library/forms`) |
| billing | subscriptions and payments |
| settings | settings |
| template | template avatar in the training editor header |
| player-food | player nutrition tab |
| progress | player progress tab |
| captain-chat | player "captain" tab |
| plus | primary add actions |
| send | send actions |
| camera | photo capture in the player answer flow and assessment preview |
| gallery | pick from gallery |
| invite | invite player |
| mic | voice note |
| play | start workout |

## Where to use them (flag on only)
1. Captain nav, desktop and mobile:
   - `src/features/roster/nav.ts`: pick the KO icon when `captainWorkspaceEnabled()`, else the current Lucide icon.
   - Widen the icon type: `LucideIcon | KoIcon`. Use a shared `NavIcon` type exported from `src/ui/icons`.
   - `captain-nav.tsx` passes `active` to KO icons, so the active state switches to lime hatch.
2. Player bottom nav: `src/features/player-shell/nav.ts` and its renderer, same pattern.
3. Primary action buttons that already show an icon on v6 screens: add, send, invite, start workout, voice note, camera and gallery. Replace the Lucide icon in those buttons only.
   - List every replaced call site in your report.
   - Small utility icons (close X, chevrons, arrows, trash, check) stay Lucide.
4. Training editor template avatar (`editor-header.tsx`): use `KoTemplate` instead of `LayoutTemplate`.
   - That file is changed by T-210 in another branch, which is not landed yet. If `LayoutTemplate` is not there in your checkout, skip this item and say so.

## Tokens
Add to `globals.css` `@theme`:
- `--color-ivory: #ede6d3`
- `--color-ivory-muted: #8a877f`
- `--color-ivory-hatch: #cfc8b4`

Add matching light-theme values if `globals.css` has a light theme block: darker ivory browns with the same contrast intent.

## AGENTS.md
Update the icon rule in section 4 to:
> Icons come from `lucide-react`, except navigation and main action buttons on v6 screens, which use the KOCHIVO set in `src/ui/icons` (owner decision 2026-11-13).

## Acceptance
- [ ] Render tests (`renderToStaticMarkup`):
  - every icon renders one `<pattern>` with a unique id per instance (two icons on one page give two different ids);
  - every icon has `aria-hidden="true"`;
  - the active state uses the lime token class.
- [ ] Nav tests: flag on → KO icons, flag off → the same Lucide icons as today.
- [ ] Icon-only buttons still have translated aria-labels.
- [ ] Bundle: no route gets bigger than +1 KiB gzip; all routes stay within `src/lib/perf-budget.test.ts` budgets. Do not add exceptions or raise budgets.
- [ ] Flag-off output unchanged.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.

## Out of scope
- Utility icons, the public marketing site, the logo and `brand/`.
- T-210, T-211 and T-212 work.
