# T-432 — Receipts section vanishes after loading on billing

**Phase:** fix · **Depends on:** none · **Status:** ready

## Goal
The "الإيصالات" (receipts) section stays visible on `/captain/billing` after loading, with its receipts or an honest empty state. Live review (2026-11-22, kochivo.site, captain Ali Esmail, Arabic dark, both widths): the page first shows an "الإيصالات" card with a "بنحمّل الإيصالات" skeleton, then the section disappears entirely from the loaded page even though payments exist (a player paid 500 EGP via InstaPay); the loaded page text contains no "الإيصالات" at all.

## Design decisions (read first — the cause is already visible in code)
1. **The workspace branch drops the section when the list is empty.** In `src/features/billing/receipts/captain-receipts.tsx`, the workspace branch renders `{rows.length > 0 && <WorkspaceBillingTask label={t('title')} ...>}` — when `rows` loads as an empty array, nothing renders at all. The non-workspace branch in the same file already does the right thing: it renders `t('empty')` ("No receipts awaiting review" / ar equivalent) when `rows.length` is 0. Make the workspace branch match: render the section with the empty state when there is nothing awaiting review.
2. **Check the loader before assuming the list is wrong.** `listPaymentReceipts()` (via `receipt-actions.ts` / `receipt-read.ts`) lists receipts *awaiting review*. A payment that was already reviewed and decided correctly does not appear here — that is not a bug. Before changing the loader, verify what it filters: if it wrongly excludes pending receipts (e.g. a player paid 500 EGP via InstaPay and the receipt is still undecided but missing), fix the filter; if it correctly returns only undecided receipts, leave the loader alone and fix only the empty rendering (decision 1).
3. **The section title stays.** The section must keep its "الإيصالات" heading and count badge area in the loaded state, empty or not, so the skeleton-to-content transition never removes a section the captain just saw.

## Files
Create or modify only these:
- `docs/tasks/T-432-billing-receipts-vanish.md`: this card
- `src/features/billing/receipts/captain-receipts.tsx`: workspace branch renders the section + empty state when `rows` is empty
- `src/features/billing/components/workspace-billing.tsx`: read how `CaptainReceipts` is mounted (workspace prop); edit only if the mounting is what drops the section
- `src/features/billing/data/receipt-actions.ts` and `src/features/billing/data/receipt-read.ts`: read-only investigation of the loader filter; edit only if the filter wrongly excludes undecided receipts (state the finding in Notes either way)
- `src/features/billing/receipts/messages.ts`: only if the empty string needs adding for the workspace branch (the `empty` key already exists — reuse it)
- Tests: `src/features/billing/receipts/review.test.ts` and `src/features/billing/payments-screen.test.ts` (extend for the empty-list workspace case)

Do not edit any file outside this list. Do not touch the staged log-cleanup entries, any T-421 file, any KO file (`src/features/ko-account/**`, `src/features/ko-entry/config.ts`, migrations 0164–0167, `src/types/app-database.ts`). If the fix genuinely needs another file, implement everything else and report the file + lines + reason in your final message instead of editing it. Do not commit or push.

## Requirements
1. Workspace billing page, receipts list empty: the "الإيصالات" section is present with the empty copy (not absent).
2. Workspace billing page, receipts pending: the section lists them (existing behaviour, keep it).
3. Loading skeleton still shows while loading; load error still shows the error + retry (existing behaviour, keep it).
4. The non-workspace rendering is unchanged.
5. If the loader filter is found wrong, it is fixed and covered by a test; if it is correct, no loader change.
6. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log`, tokens only, logical RTL properties only, touch targets ≥ 48px, every user-facing string in `messages.ts` (ar/arStd/en), no emoji.

## Acceptance
- [ ] Billing page with no receipts awaiting review shows the "الإيصالات" section with its empty state (desktop and phone).
- [ ] Billing page with pending receipts lists them.
- [ ] The section no longer appears-then-vanishes on load.
- [ ] `npm run check`, `npm run build` and `npx vitest run src/lib/perf-budget.test.ts` pass.

## Tests (deterministic, inject `now`, no real timers, no network)
- `review.test.ts` / `payments-screen.test.ts`: workspace `CaptainReceipts` with `rows: []` renders the section title and the empty copy; with rows it renders the list; loading renders the skeleton text; error renders the error + retry. Mock `useResource` as the existing tests do.

## Out of scope
- Changing which receipts count as "awaiting review" beyond fixing a wrong filter (decision 2).
- The billing status pills (T-433) and the receipts review flow itself.
- A live re-check on kochivo.site (not possible until deploy).

## Notes for reviewer
- State whether the loader filter was correct or wrong, and what the 500 EGP InstaPay payment's receipt status is expected to be (awaiting review vs already decided) under the fixed code.

## References
- `src/features/billing/receipts/captain-receipts.tsx` (workspace branch: `rows.length > 0 && <WorkspaceBillingTask ...>`; non-workspace branch renders `t('empty')`)
- `src/features/billing/receipts/messages.ts:15-16` (`loading: 'بنحمّل الإيصالات'`, `empty`, `loadError`)
- `src/features/billing/data/receipt-actions.ts`, `receipt-read.ts` (`listPaymentReceipts`)
