# T-020 — White-label: branding table, contrast rule, and dynamic manifest

**Phase:** 3 · **Depends on:** T-001, T-003 (player knows their captain) · **Status:** draft
**Delegate to:** Codex

## Goal
A captain can set a gym name, a logo, and one primary color. Their players then see that brand:
- The buttons use the captain's color.
- Installing the PWA gives an app with the gym's name and logo.

Captains without branding keep the KOCHIVO look.

## Files
- `supabase/migrations/0014_captain_branding.sql` (new)
- `supabase/tests/rls-branding.test.ts` (new)
- `src/lib/contrast.ts` (new): pure WCAG contrast helpers
- `src/lib/contrast.test.ts` (new)
- `src/features/branding/` (new feature: `index.ts`, `data/get-branding.ts`, `components/brand-style.tsx`, `branding.test.ts`)
- `src/app/manifest/[captainId]/route.ts` (new): a thin route that returns the manifest JSON

## Requirements
1. **Table `public.captain_branding`.**

   | Column | Type and constraint |
   |---|---|
   | `captain_id` | `uuid primary key references public.profiles(id) on delete cascade` |
   | `gym_name` | `text`, 2–40 chars |
   | `logo_path` | `text`, nullable. A path in a new public-read bucket `brand-logos`, under `<captain_id>/`. |
   | `primary_hex` | `text`, check `~ '^#[0-9A-Fa-f]{6}$'` |
   | `created_at`, `updated_at` | with the usual trigger |

2. **Contrast is enforced in the database**, not only in the UI.
   - Add a SQL function `public.contrast_on_dark(hex text) returns numeric`. It computes the WCAG contrast ratio against `#0B0E11`.
   - Add a check: `public.contrast_on_dark(primary_hex) >= 4.5`.
   - The TypeScript `contrastRatio(a, b)` in `src/lib/contrast.ts` must return the same value. Test both on the same 6 sample colors.

3. **Text color on the brand color.**
   - `onColor(hex)` returns the token `--color-on-lime` (dark) or `--color-ink` (light), whichever has the higher contrast.
   - The UI never stores this. It is derived.

4. **RLS**
   - The captain can select, insert, and update their own row.
   - The captain's active players can select it.
   - Anyone can read `brand-logos` objects, because logos are public by nature. Only the owner can write under their own folder.
   - The manifest route reads the row with the user's session. If there is no session or no branding, it returns the default KOCHIVO manifest.

5. **Brand style**
   - `brand-style.tsx` renders a `<style>` that overrides `--color-lime` and `--color-on-lime` on `:root`.
   - It does this only for a player whose captain has branding. Components keep using `bg-lime`, so no component changes.
   - The hex is validated again before it is injected into CSS, so nothing else can be injected.

6. **Manifest and iOS**
   - The player layout links `/manifest/<captainId>`. The manifest's `name`, `short_name`, `theme_color`, and `icons` come from the branding row.
   - `apple-mobile-web-app-title` and `apple-touch-icon` follow the same data.
   - `start_url` and `scope` stay `/`.

7. **Plan gating** (which plan may use branding) is **not** in this card. It is an owner decision, so leave a single `canUseBranding(plan)` stub that returns `true` and is easy to change.

## Acceptance
- [ ] A dark color (`#1A237E`) is rejected by the database, and `#F2B544` is accepted
- [ ] TS and SQL contrast values match on the 6 sample colors, to 2 decimals
- [ ] The RLS tests cover:
  - the owner
  - a player of the owner
  - another captain (can read nothing)
  - a player of another captain (can read nothing)
  - logo uploads only into the owner's own folder
- [ ] The manifest route returns the default when there is no branding
- [ ] `npm run check` and `npm run build` pass

## Out of scope
- The settings form UI (later card)
- Custom domains
- Changing the captain's own dashboard colors (only the player app is branded)
