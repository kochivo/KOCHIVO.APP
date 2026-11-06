# T-111 — Mobile captain account destinations

Owner requested a permanent, discoverable place for Settings and Payments after the four-item mobile navigation release. Add a labeled account disclosure in the shared captain header with both existing destinations. Keep mobile bottom navigation at four and desktop sidebar at six. Support RTL/LTR, keyboard dismissal, outside dismissal, and 48px targets. No new dependencies or database changes. Publication follows the owner's standing apply-and-publish instruction.

## Files

- `src/features/roster/components/captain-account-menu.tsx`
- `src/features/roster/components/captain-shell.tsx`
- `src/features/roster/captain-account-menu.test.ts`
- `src/features/roster/captain-shell.test.ts` — isolate the new child in shell-layout tests.
- `src/features/roster/messages.ts`
- `docs/tasks/T-111-captain-account-menu.md`
- `docs/superpowers/plans/2026-11-06-captain-account-menu.md`

A temporary `src/app/[locale]/account-menu-preview/page.tsx` may render the actual shared shell for browser verification if demo entry is unavailable; remove it before build/publication.

## Acceptance

Settings and Payments are accessible from every mobile captain page via a visible Account button. Native popover supplies light dismissal and Escape behavior; links dismiss before navigation. Existing desktop and bottom navigation destinations remain intact. Verify localized accessible names, correct link targets, real-browser interactions and geometry, full check/build/performance, and independent review.
