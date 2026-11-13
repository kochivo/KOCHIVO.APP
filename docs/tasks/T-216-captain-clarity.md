# T-216: Button clarity on captain screens, plus the food edit sheet bug (T-211 phase 2, part 2 of 3)

**Phase:** v6 fixes · **Status:** ready · **Depends on:** none · **Migration:** none
**Owner decision:** 2026-11-13. The owner approved the T-211 audit list (`docs/tasks/T-211-audit-result.md`) and the bugs from their staging screenshots.
**Rules:** follow AGENTS.md in full.
- No new deps.
- Keep files under 250 lines.
- Tokens only; logical properties only.
- All strings go in `messages.ts`, with all three styles: `ar`, `arStd` and `en`.
- No Get-Content/Set-Content. Do not commit.

**Parallel work:** parts 1 (T-215) and 3 (T-217) run at the same time in other checkouts. Touch **only** the files listed under "Your files" below.

## Your files
- `src/features/dashboard/**`
- `src/features/roster/**`, except `components/captain-shell.tsx` and `captain-shell.test.ts`, which belong to T-215.
- `src/features/captain-workspace/**`, except `captain-workspace/forms/**`, which belongs to T-215, and `captain-workspace/training/**`, which is the training editor and is not to be touched.
- `src/features/player-profile/**`
- `src/features/player-preview/**`
- `src/features/templates/**`
- `src/features/program-generator/**`
- `src/features/meal-plans/**`
- `src/features/supplements/**`, both captain and player files.
- `src/features/inbox/**`
- `src/features/voice-notes/**`
- `src/features/rank-review/**`
- `src/features/ko-preview/**`

## A. Screenshot bug: the food edit sheet is cut off on desktop
`meal-plans/components/custom-food-sheet.tsx` renders `ResponsiveDialog` without `modal`.
- On desktop, `ResponsiveDialog` then calls `dialog.show()` (non-modal), so the dialog is **not** in the top layer.
- Its `fixed inset-0 m-auto` box is then laid out inside a glass ancestor (backdrop-filter creates a containing block).
- In the owner's screenshot, «عدّل الأكلة» opens in the middle column, cut off at the bottom with no visible save button, while the page shows on both sides.

Fix:
- Pass `modal` so it always uses `showModal()`.
- Make the content scroll inside the dialog, with the save button always reachable (a sticky footer or `max-h-[90dvh] overflow-y-auto`).
- Check every other `ResponsiveDialog`/`sheet` in your files that is a form overlay (not a side detail panel). Apply the same fix where the same bug exists, and list them.
- Add a test that the custom food sheet renders a modal dialog.

## B. Button clarity, from the approved T-211 audit
Fix **every row** in these audit sections that sits in your files:
- "Captain home"
- "Roster"
- "Player file"
- "Training — library and generator"
- "Nutrition"
- "Follow-up"
- the supplement rows, including the `player-supplements.tsx` retry rows from "Player app"

The rules:
- `secondary` → `Button variant="secondary"`, or, for `Link`/`<a>`, the same look. Reuse an existing secondary link style if one exists; otherwise apply the same classes Button secondary uses: `glass`, a border, rounded-full, `min-h-12`.
- `icon-button` → the existing `IconButton` from `src/ui`, keeping the translated `aria-label`.
- `link style` → lime text plus underline on hover/focus, `min-h-12` touch target.
- `keep`, add chevron → add a lucide `ChevronDown` that rotates when open (`group-open:rotate-180`).
- Destructive actions (delete or archive) → secondary with danger text and a danger border token, if one exists in `globals.css`. Check first, and add no new hex.
- Owner-seen extras on the player nutrition page:
  - «+ أكلة جديدة مش في المكتبة» becomes a secondary button with a plus icon;
  - the meal «…» and the food «✕» become `IconButton`.
- KO feed: when several «وافق» actions show, only the first actionable card keeps lime. The others use secondary.

**Skip legacy-only rows:** components that render only when `captainWorkspaceEnabled()` is false. Flag-off output must stay byte-identical; list the skipped rows in your report.

## Acceptance
- [ ] Custom food sheet modal test; render tests for a sample of changed controls, at least one per section, showing the secondary/IconButton classes.
- [ ] Every audit row in your files is fixed or listed as skipped, with a reason.
- [ ] Still one lime primary per screen.
- [ ] Bundle: change classes and markup only. Import `IconButton`/`Button` leaf modules, not barrels; add no new heavy imports.
- [ ] `npm run check` passes. (`npm run build` is run by the reviewer; skip it if your sandbox blocks it, and say so.)

## Out of scope
- Every other feature folder. Those are T-215 and T-217.
- `src/ui/**`, which belongs to T-217.
- `captain-workspace/training/**` and `programs/components/*editor*`.
