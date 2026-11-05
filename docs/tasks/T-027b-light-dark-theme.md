# T-027b — Light and dark theme

**Phase:** 4 · **Depends on:** none · **Status:** ready

## Goal
Today the app is dark only. Users get three choices: **follow the device** (default), **light**,
or **dark**. The choice applies before first paint, with no flash. Every screen must stay readable
in both themes and keep the KOCHIVO identity (lime as the only action color, glass surfaces).

## Files
Create or modify only these:
- `src/app/globals.css`: light token set and theme-aware glass and mesh
- `src/lib/theme-mode.ts` (new): pure `themeMode({ stored, prefersDark })` plus `themeBootScript`. Follow `src/lib/glass-mode.ts` exactly.
- `src/lib/theme-mode.test.ts` (new)
- `src/app/layout.tsx`: boot script, `color-scheme`, and `themeColor` per scheme
- `src/ui/theme-switch.tsx` (new): a Segmented with `جهازك` / `فاتح` / `غامق`, written to `localStorage['kochivo.theme']`
- `src/ui/index.ts`: export it
- `src/features/settings/components/settings-screen.tsx`: add the switch next to the existing glass toggle
- `src/features/marketing/components/site-header.tsx`: a compact icon button that cycles the theme, with an Arabic `aria-label`
- `src/ui/contrast.test.ts`: the same contrast checks for the light tokens
- Any component file that hard-codes a dark-only color through `rgb(...)` or `#hex` in a class. List each file in your report.

## Requirements
1. **Tokens.** `html[data-theme='light']` redefines every `--color-*` in `@theme`, so `bg-bg`, `text-ink`, and the rest work unchanged.
   - Suggested light values: `bg #f6f7f4`, `bg-deep #eceee8`, `surface #ffffff`, `surface-raised #f0f2ed`, `line #d9ddd4`, `ink #12161a`, `muted #535b63`.
   - `lime` stays the fill color. Contrast test lime text on light: if it fails, add a `--color-lime-ink` token (≈ `#4a7a00`) for lime *text* and use it via a `text-lime-ink` class on light only. Do not hand-edit every component; prefer making `text-lime` resolve to a readable value per theme.
   - `on-lime` stays dark in both themes.
2. **Glass utilities** use variables instead of literal white or black:
   - `--glass-tint`
   - `--glass-tint-raised`
   - `--glass-strong-tint`
   - `--glass-hairline`
   - `--glass-highlight`

   In light mode glass is white with a dark hairline. `glass-strong` must still give high contrast for big numbers. The solid fallback (`data-glass='solid'`) works in both themes.
3. **The mesh background** (`.mesh` and `body::before` gradients) gets light variants. Gradient colors become variables, not hex literals inside the gradient.
4. **Boot script:**
   - It sets `data-theme` on `<html>` before paint, and sets `style.colorScheme`.
   - In system mode it listens to `matchMedia('(prefers-color-scheme: dark)')` changes.
   - When `localStorage` is unavailable, it falls back to the system theme.
5. **Metadata:** `viewport.themeColor` becomes the array form with `media` for light and dark.
6. **The switch** updates `data-theme` immediately, with no reload. It is keyboard accessible, and its options are at least 48px tall.
7. **Contrast:** check every token pair already tested in dark against the light tokens too, to WCAG AA (4.5 for text, 3 for large text and UI).
8. **Check the screens:** walk them all (marketing, login, player home, focus mode, captain roster, program builder, nutrition, settings, admin, demo banner) in light mode, and fix any text that becomes unreadable. List the files you fixed.

## Acceptance
- [ ] Unit tests for `themeMode`: stored light/dark win, `system` follows `prefersDark`, and junk input falls back to system.
- [ ] Contrast test passes for both themes.
- [ ] There is no flash of the wrong theme. Explain how the boot script guarantees this.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- English and LTR (a separate card is running in parallel and will also touch `layout.tsx`, `settings-screen.tsx`, and `site-header.tsx`. Keep your edits to those three files small and self-contained.)
- Changing layout, spacing, or copy.

## References
- `src/lib/glass-mode.ts`, `src/features/settings/components/glass-toggle.tsx`, `AGENTS.md` §4
