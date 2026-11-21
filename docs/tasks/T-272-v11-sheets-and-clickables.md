# T-272 — v11 look for every captain sheet and dialog, plus clickable primitives

**Phase:** captain v11 fixes · **Depends on:** none · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first, including its new last two sections.

## Goal
The owner reported that secondary screens still look like the old app. One example is the program generator sheet «اختار تفاصيل البرنامج» on `/captain/templates`: a flat old panel, old chips, and a browser scrollbar.

This card brings every captain popup to the v11 look in one shared place, so each screen does not need its own fix. It also adds the small shared parts that make clickable things look clickable.

## Files
- `src/app/surfaces.css` and/or `src/app/globals.css`:
  - styles scoped to `html:not([data-theme='light']) [data-area='captain']` for `dialog`, `[role='dialog']` and `.sheet`;
  - a v11 panel: glass-strong, 24px radius, the gradient rim used by `.glass-strong`, and a thin dark scrollbar;
  - a backdrop dim plus blur, but without blur on large layers (T-237 perf rules).
- `src/ui/responsive-dialog.tsx`: optional `title`, `onClose` and `footer` props that render the v11 header (title plus a close icon with a translated aria-label) and a sticky footer. Existing callers keep working unchanged.
- `src/ui/chip.tsx`: inside the captain area, match the v11 `.chip` (38px pill, `lime-soft` when pressed).
- New `src/ui/row-link.tsx`: a row with hover and pressed states and a trailing `dir-icon` chevron.
- New `src/ui/disclosure.tsx`: a `<details>` wrapper whose chevron rotates.
- New `src/ui/edit-in-place.tsx`: an inline text field that reads as editable (field surface plus pencil).
- `src/features/program-generator/components/brief-sheet.tsx`: adopt the header and footer as the reference example.
- Tests in `src/ui/`.

## Requirements
1. Player screens and the light theme must not change. Scope every rule to `[data-area='captain']`.
2. Keep native `<dialog>` behaviour: focus return, Escape, and the mobile modal.
3. No new dependency, no hex values. Use only the existing tokens.
4. Perf: no `backdrop-filter` on cards, and no infinite animation. Every route stays inside its budget.

## Acceptance
- [ ] On `/captain/templates`, the generator sheet looks like a v11 glass panel, with a header, a close button, v11 chips and a lime main action in a sticky footer.
- [ ] Other captain sheets (renew, collect, package, alternatives, assignment) pick up the panel look with no per-file change.
- [ ] `RowLink`, `Disclosure` and `EditInPlace` have tests: chevron present, `aria-expanded`, focus ring class.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Using the new primitives on each main screen. That is T-275.
- Secondary routes (T-273, T-274).
