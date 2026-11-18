# T-377: Subscriptions page, tidier (v6 captain, desktop)

**Migration:** none. **Owner decision 2026-11-18:** match canvas page «الاشتراكات والأكل والترتيب», screen 1 (`docs/mockups/desktop-fixes/h5-01-subs.dc.html`, overview `h5-all.png`).

## Problem
- Four empty sections (المبالغ المستنية، إيصالات مستنية مراجعة، مستني تأكيد، بيخلص قريب) each show 0 and take a lot of space.
- Player rows show stray «0» and «من غير مبلغ» values.

## Files
- `src/features/billing/components/workspace-billing*.tsx`, `workspace-payments-table.tsx`, `workspace-billing-summary.ts`
- `src/features/captain-workspace/money-owed/**`
- `src/features/billing/receipts/**` (only how the waiting list is shown inside the workspace)
- `src/features/billing/messages.ts` and its standard file, tests

## What to build
1. **Stat strip:** one card split into four cells: this month's income (with «من X متوقعة»), money still owed (amber when above 0, with the player count), active subscriptions, ending within 7 days.
2. **«محتاج منك» card:** merge pending amounts, receipts to review, payments waiting for confirmation and subscriptions ending soon into one card that lists what needs doing in one line each. Hide the card when every count is 0. Each item still opens the same action it opens today.
3. **Table:** filter tabs (الكل، باقي عليهم، من غير باقة، بيخلص قريب، مدفوع) with counts that never wrap, plus a player search. Columns: player and package, paid out of total with a thin bar (lime when fully paid, amber otherwise; «-» when there is no package), status tag, subscription end, last payment, and one action per row (الدفعات / سجّل دفعة / حدد باقة).
4. No «0» or «من غير مبلغ» subtitles anywhere.

## Rules for this card
- Desktop layout stays as it is today (sidebar, header, page width). Only the page content changes. Phone layouts must keep working.
- Change only the v6 workspace view (`NEXT_PUBLIC_CAPTAIN_WORKSPACE=1`). The flag-off markup and its hash tests stay unchanged.
- Strings in ar, arStd (behind the `NEXT_PUBLIC_INTERNATIONAL` getter, as in other v6 message files) and en. Tokens only, logical properties only, 48px targets, files under 250 lines.
- No migrations, no new dependencies, no data writes changed.

## Done when
- Tests cover: the merged card hidden when empty and listing each non-zero item, the tab counts, the paid-of-total cell, and one action per row by state.
- `npm run check` passes.
