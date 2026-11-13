# T-217: Button clarity in the player app, settings, public pages and shared UI (T-211 phase 2, part 3 of 3)

**Phase:** v6 fixes · **Status:** ready · **Depends on:** none · **Migration:** none
**Owner decision:** 2026-11-13. The owner approved the T-211 audit list (`docs/tasks/T-211-audit-result.md`).
**Rules:** follow AGENTS.md in full.
- No new deps.
- Keep files under 250 lines.
- Tokens only; logical properties only.
- All strings go in `messages.ts`, with all three styles: `ar`, `arStd` and `en`.
- No Get-Content/Set-Content. Do not commit.

**Parallel work:** parts 1 (T-215) and 2 (T-216) run at the same time in other checkouts. Touch **only** the files listed under "Your files" below.

## Your files
- `src/ui/**`
- `src/features/settings/**`
- `src/features/notifications/**`
- `src/features/install/**`
- `src/features/feedback/**`
- `src/features/marketing/**`
- `src/features/auth/**`
- `src/features/demo/**`
- `src/features/coach-page/**`
- `src/features/admin/**`
- `src/features/player-shell/**`
- `src/features/player-home/**`
- `src/features/onboarding/**`
- `src/features/forms/components/answer-flow.tsx` and `src/features/forms/components/pending-forms.tsx` only
  - Put any new strings for these in the forms redesign messages **only if unavoidable**. Prefer existing keys, because T-215 owns the forms messages.
- `src/features/nutrition/**` (the player nutrition feature, not `meal-plans`)
- `src/features/readiness/**`
- `src/features/progress/**`
- `src/features/body-scans/**`
- `src/features/workout/**`

## A. Shared fixes first (`src/ui`)
- `EmptyState.secondary` (`src/ui/empty-state.tsx:37,38`): both the link and button branches render as secondary (a visible surface and border).
- Add one shared way to style a `Link`/`<a>` as a secondary button, if none exists. For example, export a `secondaryButtonClass` from the button leaf module, or add a `ButtonLink` leaf component. Use it in your files.
  - Write a short note in your report so T-215 and T-216 can switch to it later. They will not use it in this round.
- Fix every audit row in "Shared UI controls":
  - `in-app-browser-warning`, `language-switch` (a surfaced segmented group), `save-status`, `sync-pill`, `theme-switch`, `toast` and `tour`.

## B. Button clarity, from the approved T-211 audit
Fix **every row** in these audit sections that sits in your files: "Settings", "Public pages" and "Player app".

The rules:
- `secondary` → `Button variant="secondary"`, or the shared secondary link style from section A.
- `icon-button` → the existing `IconButton`, keeping the translated `aria-label`.
- `link style` → lime text plus underline on hover/focus, `min-h-12` touch target.
- `keep`, add chevron → add a lucide `ChevronDown` that rotates when open (`group-open:rotate-180`).
- Destructive actions → secondary with danger text and a danger border token, if one exists. Add no new hex.
- Marketing uses its own `marketing-*` button variants. Keep that family: add a bordered/secondary marketing variant if needed, instead of the app `glass` button.

## C. More than one primary on a screen
Use the audit's "Screens with more than one primary action" list:
- **Public `/`:** keep lime only for the hero «ابدأ مجاناً · لحد 5 لاعبين». The header CTA, the featured pricing «اشترك» and the final CTA become the secondary or outlined marketing style.
  - Owner check: if the final CTA is far below the hero, it may keep lime, since only one primary is visible at a time. State your choice in the report.
- **`/c/[slug]`:** when both «افتح التطبيق» and the featured package «اختار…» show, the package action stays lime and «افتح التطبيق» becomes secondary.
  - **This route is at 199.13 of 200 KiB gzip.** Change classes only, and add no imports at all to `coach-page/**` or `billing/choice/**`. `billing/choice/**` is T-215's folder, so only change `coach-page`.
- **`/admin` approvals:** only the first pending application's approve button stays lime; the rest become secondary.
- **`/player/nutrition`:** a meal already marked eaten shows «كلت الوجبة» as secondary (a checked state). Only the next uneaten meal's button is lime.
- **`/player/workout/[dayId]`:** completed-set edit buttons use the secondary or checked style, not filled lime. Only the active set's done button is lime.

**Skip legacy-only rows:** components that render only when `captainWorkspaceEnabled()` is false, where that flag applies. Flag-off output must stay byte-identical. Player and public screens that do not branch on the flag are in scope. List the skipped rows in your report.

## Acceptance
- [ ] Unit or render tests for: `EmptyState` secondary, the secondary link style, the language-switch segmented group, the single lime per meal list and per workout set list, and admin approval styling.
- [ ] Every audit row in your files is fixed or listed as skipped, with a reason.
- [ ] Bundle: change classes and markup only. Import leaf modules, not barrels.
  - Public pages have a 200 KiB budget; `/c/[slug]` has under 1 KiB of headroom.
  - Player routes have a 300 KiB budget, with about 8 KiB of headroom.
- [ ] `npm run check` passes. (`npm run build` is run by the reviewer; skip it if your sandbox blocks it, and say so.)

## Out of scope
- Every feature folder not listed under "Your files". Those are T-215 and T-216.
- The «© Gym visual» footer credit stays as it is.
