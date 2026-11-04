# T-071 — Templates: KOCHIVO templates vs my templates, blank templates, assign to many players

**Phase:** 3 · **Status:** ready (owner request, 2026-11-04)

## Today (`src/features/templates/components/templates-screen.tsx`)
- `/captain/templates` shows the read-only starter templates («قالب من KOCHIVO», "a KOCHIVO template"; `is_starter`) in the same grid as the captain's own templates.
- The captain's own templates only appear through «انسخ قالب جاهز» ("copy a ready template") or «احفظ كقالب» ("save as template") from a player's program. There is no way to start a template from scratch.
- `assign-sheet.tsx` assigns a template to **one** player (radio buttons).

## Changes
1. **Two sections** on the screen, kept under the existing program/meal segmented control:
   - **«قوالبي»** ("my templates"): the captain's own templates (`is_template and not is_starter`) with rename, delete, preview, copy and assign.
     - It comes first.
     - Its empty state reads «لسه ماعملتش قوالب» ("you haven't made any templates yet"), with the primary action «+ قالب جديد» ("+ new template") and a secondary «انسخ قالب جاهز» ("copy a ready template") that scrolls to the KOCHIVO section.
   - **«قوالب KOCHIVO»** ("KOCHIVO templates"): the starter templates, read-only, with preview, «اعمل نسخة» ("make a copy") into my templates, and assign.
   - Each section has a heading and a count.
2. **Blank template:** «+ قالب جديد» ("+ new template") in the my-templates header.
   - It creates an empty template of the current kind (program or meal plan): `is_template = true`, `player_id = null`, default title «قالب جديد» ("new template").
   - It opens the existing builder for it: program builder or nutrition builder.
   - Check that both builders and their save RPCs accept a template row with no player. If a builder hides player-only UI, hide "activate for player" in template mode and show «احفظ القالب» ("save template") as the primary action.
   - Use the existing data layer and RPCs where possible. A new RPC or migration is allowed only if a blank template cannot be created under current RLS; if needed, it is `0055_*` (0053 and 0054 are taken), with a PGlite test.
3. **Assign to many players:** `assign-sheet.tsx` becomes multi-select.
   - Checkboxes with at least 48 px rows, plus «اختار الكل» ("select all").
   - The primary button reads «عيّن لـ {n} لاعب» ("assign to {n} players").
   - It calls the existing per-player assign action for each selected player, sequentially or with small concurrency.
   - Results:
     - all succeed: a toast «اتعيّن لـ {n} لاعب» ("assigned to {n} players")
     - some fail: list the failed player names with retry, and keep the succeeded ones done
   - The template stays a template: each assignment is an independent copy, as today.
4. **Copy:** all strings go in `templates/messages.ts`, Egyptian Arabic and English.

## Out of scope
- Editing starter templates.
- Template sharing between captains.

## Tests
- Grouping: starter vs own, counts, own section first.
- The blank template action calls create with `is_template` and no player, then navigates to the builder URL.
- Assign sheet: multi-select, select all, partial failure keeps successes and lists failures.
- The builder in template mode hides player-only actions.

## Requirements
- No new dependencies.
- Tokens only, logical properties, 48 px targets.
- Files ≤ 250 lines (split `templates-screen.tsx` into section components).
- Optimistic UI as today.
- Loading, empty and error states for each section.

## Acceptance
- [ ] The screen shows «قوالبي» ("my templates") and «قوالب KOCHIVO» ("KOCHIVO templates") separately.
- [ ] A captain makes a template from scratch without any player and edits it in the builder.
- [ ] A captain assigns one template to several players in one go.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build` and the perf budget pass.
