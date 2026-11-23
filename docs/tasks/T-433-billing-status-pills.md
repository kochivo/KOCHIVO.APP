# T-433 — Billing status pills wrap to two lines on desktop

**Phase:** fix · **Depends on:** none · **Status:** ready

## Goal
Billing status pills fit on one line. Live review (2026-11-22, kochivo.site, captain Ali Esmail, Arabic dark, desktop): "مدفوعة كاملة" and "من غير باقة" break mid-phrase in the narrow status column. Readable but untidy.

## Design decisions (read first)
1. **The pill never wraps.** The status span in `workspace-billing-payment-row.tsx` is `<span className="inline-flex rounded-md px-inline text-micro font-semibold ...">` with no `whitespace-nowrap`. Add `whitespace-nowrap` (and `shrink-0` where the row can squeeze it) so the phrase stays on one line.
2. **Widen the column if the pill still does not fit.** The desktop row is a table row at `min-[1024px]`; if the status column is too narrow for the longest status ("مدفوعة كاملة", "من غير باقة", "مدفوعة جزئيًا"), give the status cell room (e.g. let the table size that column to content) rather than letting the pill wrap. Do not shorten the labels.
3. **Check the phone row too.** `workspace-billing-phone-player.tsx` renders the same status for the same players; apply the same non-wrapping there if it uses the same pill.

## Files
Create or modify only these:
- `docs/tasks/T-433-billing-status-pills.md`: this card
- `src/features/billing/components/workspace-billing-payment-row.tsx`: the desktop status pill
- `src/features/billing/components/workspace-billing-phone-player.tsx`: the phone status, if it renders the same pill
- `src/features/billing/components/workspace-billing-summary.tsx`: only if the desktop table/column widths live there and the column must be widened (it defines the `PaymentRow` type the row imports — check where the table is)
- Tests: `src/features/billing/payments-screen.test.ts` (extend for the non-wrapping status)

Do not edit any file outside this list. Do not touch the staged log-cleanup entries, any T-421 file, any KO file (`src/features/ko-account/**`, `src/features/ko-entry/config.ts`, migrations 0164–0167, `src/types/app-database.ts`). If the fix genuinely needs another file, implement everything else and report the file + lines + reason in your final message instead of editing it. Do not commit or push.

## Requirements
1. Desktop billing table: every status pill ("مدفوعة كاملة", "من غير باقة", "مدفوعة جزئيًا", and the other statuses in the same span) renders on one line.
2. Phone billing rows: same, if the same pill is used there.
3. No label text changes; no column content removed to make room.
4. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log`, tokens only, logical RTL properties only, touch targets ≥ 48px, every user-facing string in `messages.ts` (ar/arStd/en), no emoji.

## Acceptance
- [ ] Desktop: "مدفوعة كاملة" and "من غير باقة" each on one line.
- [ ] Phone: same where the pill appears.
- [ ] No other billing column is broken by the widening.
- [ ] `npm run check`, `npm run build` and `npx vitest run src/lib/perf-budget.test.ts` pass.

## Tests (deterministic, inject `now`, no real timers, no network)
- `payments-screen.test.ts`: the rendered status pill carries the non-wrapping class for the fully-paid and no-package rows.

## Out of scope
- The receipts section (T-432), payment amounts, the progress bar in the same row.
- A live re-check on kochivo.site (not possible until deploy).

## Notes for reviewer
- State whether the column needed widening or the pill class alone fixed it.

## References
- `src/features/billing/components/workspace-billing-payment-row.tsx:30-41` (status selection) and the status `<span>` (no `whitespace-nowrap`)
- `src/features/billing/messages.ts:16` (`fullyPaid: 'مدفوعة كاملة'`, `noPackage: 'من غير باقة'`)
