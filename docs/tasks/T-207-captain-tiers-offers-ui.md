# T-207: Captain «باقاتي والعروض» screens (mockup v6-packages-offers)

**Phase:** Captain packages v2 (owner approved 2026-11-12; wants it **100% like the mockup**) · **Status:** ready · **Depends on:** T-206 (data) and T-203 (billing page; same feature folder) · **Migration:** none
**Flag:** behind `captainWorkspaceEnabled()`; flag off byte-identical. **Messages:** `ar` (Egyptian), `arStd`, `en`. Copy Arabic strings from the mockup exactly.
**Rules:** AGENTS.md in full. Tokens only, logical properties, ≥48px targets, 250 lines/file, no new deps, no Get-Content/Set-Content, no commits.

Read first, in full: `docs/mockups/captain-workspace/v6-packages-offers.html` screens «باقاتي (الكابتن)» and «عرض جديد».

## Files
- `src/features/billing/`: new `tiers/` and `offers/` components, messages and tests.
- The billing page's «باقاتك» side card: link it to the new screen.
- A thin new route `src/app/[locale]/(captain)/captain/billing/packages/page.tsx`, with a loading boundary.

## Requirements
1. **Header**
   - Breadcrumb «الدفعات ‹».
   - Title «باقاتي والعروض» and its subline.
   - «شوف صفحتي» and the primary «فئة جديدة».
2. **Offers card**
   - One row per offer showing: icon value (20% / −500 / +1), name, status pill (from `offerStatus`), and a description line built from the data. Example: «خصم 20% على باقات 3 و6 شهور · للجداد والتجديد · استخدمه 7 من 20».
   - Row actions: «عدّل» and «وقّفه» (or resume).
   - Last row: «+ عرض جديد» plus the preset chips.
3. **Tier cards**
   - Each card shows: color dot, name, «الأكثر طلبًا» pill, ⋯ menu (rename, edit features, set featured, reorder, archive), the features list, and duration rows (label, «وفّر N%» from `savingsPercent`, price).
   - Footer: «{n} لاعيبة عليها» and «+ مدة».
   - A dashed «+ فئة جديدة» card comes last.
   - Editing reuses the existing package sheet, now with a tier field.
4. **New/edit offer form**
   - Presets: بلاك فرايداي، رمضان، الصيف، رأس السنة، من الأول. Each fills the name and suggested dates for the current year in the captain's timezone.
   - Kind cards: نسبة / مبلغ / مدة هدية, with a value input that changes with the kind.
   - Scope: كل الباقات / مدد معينة / فئة معينة, with a picker.
   - Start and end inputs, themed. No native white pickers if avoidable; if not avoidable, style them.
   - Checkboxes: للجداد / للتجديد / عدد محدود N.
   - Live preview card beside the form, using `finalPrice`: «العرض بيخلص بعد … · فاضل N مكان».
   - Primary «شغّل العرض».
   - Validation messages for: no target, end before start, nothing selected, value out of range.
5. **Note line about old packages under «أساسي»**: show it only while a «أساسي» tier exists.
6. **States:** loading, error/retry and empty («لسه معملتش باقات» plus «فئة جديدة»). Updates are optimistic with rollback.

## Acceptance
- [ ] Matches the two mockup screens at 1440×900 and 390×844; differences listed.
- [ ] Tests: offer form validation, preset dates in two timezones, status pills, savings labels and optimistic rollback.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.
