# T-279 — Package durations: clear duration choice, no duplicate durations in a tier

**Phase:** bug fix (owner report 2026-11-14) · **Depends on:** none · **Status:** ready

## The bug
A captain built the tier «VIP» (subtitle «VIP 3Month») and added three durations priced 2,000, 500 and 1,000. All three were saved with `days = 30`:
- the duration field is a bare number that starts at 30;
- nothing stops two durations of the same length in one tier.

The captain's packages page shows three rows, all labelled «شهر». The public coach page (`/c/[slug]`) groups by days, so it shows one «30 يوم» chip with 2,000. The other two prices are silently hidden. The captain cannot understand what the player sees.

## Files
- `src/features/billing/components/packages-card.tsx` (the duration editor used by the package sheet)
- `src/features/billing/tiers/package-sheet.tsx`
- `src/features/billing/data/catalog-package.ts` (the save action)
- `src/features/billing/components/workspace-tier-card.tsx` and `src/features/billing/tiers/tier-card.tsx` (duration rows)
- Billing messages (ar, arStd gated like the other files, en) and tests

## Requirements
1. **Duration as a clear choice.** For `kind = 'days'`, show a segmented choice above the number: «شهر» (30), «٣ شهور» (90), «٦ شهور» (180), «سنة» (365), «مدة تانية». Only «مدة تانية» shows the number field (1–365).
   - A new duration preselects the first preset that this tier does not use yet.
   - Editing keeps the saved value, and selects its preset if it matches one.
2. **No duplicate durations in one tier.**
   - The save action rejects a `days` package whose tier already has another active (not archived) `days` package with the same `days`.
   - Message: «المدة دي موجودة في الفئة. عدّل سعرها بدل ما تضيف واحدة تانية».
   - The editor shows the same message before saving, and disables presets already used in this tier, with the reason.
   - The same rule applies to `sessions` packages with the same `sessions` count.
   - Use a server check only. No database change: existing duplicate rows must keep loading.
3. **Existing duplicates are visible.** When a tier already has two or more active durations of the same length:
   - mark each such row with a warn line «مدتين بنفس الطول، اللاعب هيشوف واحدة بس»;
   - add an «عدّل» link on each row.
   On the public page, keep showing one price per duration, using the same rule as today, and add a test that pins which one (the oldest).
4. **Row labels** use the real length: «شهر», «٣ شهور», «٤٥ يوم» and so on, through the same `durationLabel` logic as the public page. Move that logic into a shared helper in `package-choice.ts` and test it.
5. **Optimistic UI and error states** stay as today. Every string goes in the messages files.

## Acceptance
- [ ] A captain cannot save a second 30-day duration in the same tier. The editor says why before saving.
- [ ] A new duration in a tier that already has «شهر» preselects «٣ شهور».
- [ ] Existing duplicate rows show the warning on the captain card.
- [ ] Unit tests cover the server duplicate check (days and sessions), the presets, the label helper and the public page's pick.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Database constraints or migrations.
- Changing the owner's live data. The owner will fix the three rows from the editor.
- Offers.
