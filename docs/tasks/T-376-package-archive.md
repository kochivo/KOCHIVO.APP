# T-376: Archive, restore and delete packages (v6 captain)

**Migration:** none, unless strictly needed for delete. If it is, add a new numbered migration that only adds things. **Owner report 2026-11-18 (the bug to fix):** today the captain can create packages but has no way to archive or delete them. The owner wants archive, restore and delete to work. Match the canvas page «الرسوم والباقات», screens 3 and 4 (`docs/mockups/charts/`).

## Cause
- The old `tiers/tier-card.tsx` had an archive button.
- The v6 `components/workspace-tier-card.tsx` and `tiers/tier-sheet.tsx` never got one.
- `changeTierStatus(id, 'archive')` and `setTierArchived(id, archived)` already exist in `src/features/billing/data/`.
- Duration archive already exists inside `tiers/package-sheet.tsx`.

## Files
Edit only these:
- `src/features/billing/components/workspace-tier-card.tsx`
- `src/features/billing/components/workspace-catalog.tsx`
- `src/features/billing/tiers/**`
- `src/features/billing/data/catalog-read.ts`, `catalog-actions.ts` and `tier-operations.ts`
- new small files under `src/features/billing/tiers/`
- messages (ar, arStd behind the international getter, en)
- tests, plus a PGlite test in `supabase/tests/` if you touch SQL or RLS

## What to build
1. **Menu.** Each tier card gets a 44px «⋯» menu button (translated `aria-label`) in its header, with these items:
   - عدّل الباقة
   - ضيف مدة
   - خليها الأكثر طلبًا / شيل الأكثر طلبًا
   - أرشف الباقة (danger colour, separated by a line)

   Remove nothing that works today.
2. **Archive confirm.** An `alertdialog` with these lines:
   - «أرشف باقة {name}؟»
   - «الـ {n} لاعبين المشتركين فيها هيكملوا عادي لحد ما اشتراكهم يخلص.»
   - «مش هتظهر للاعبين الجداد ولا في صفحتك العامة.»
   - «تقدر ترجّعها في أي وقت من الباقات المؤرشفة.»
   - Buttons: «لأ، سيبها» and «أرشفها» (danger outline).
   - The archive is optimistic through `catalog.change`, with a rollback and an error toast on failure.
3. **Archived section.** A collapsible «الباقات المؤرشفة ({n})» under the active tiers.
   - Load archived tiers with one extra query in `catalog-read.ts`, for the same captain, ordered by `archived_at` descending.
   - Each row shows the name, the archive date, and the current and past subscriber counts.
   - «رجّعها» calls `setTierArchived(id, false)`.
4. **Delete permanently.** «امسحها نهائي» appears only when the tier has never had a subscription, payment or join request that references it or any of its durations.
   - Check this on the server before deleting.
   - Deleting removes the tier and its durations.
   - If any reference exists, refuse with a clear message.
   - The confirm text says it cannot be undone.
   - Rely on RLS: the captain can delete only their own tiers. If the current policies block delete, add the smallest additive policy in a new migration with a PGlite test. Do not apply it to any database.
5. **Durations.** In `package-sheet.tsx`, give the existing «أرشف المدة» the same confirm style.

## Done when
- Tests cover:
  - menu items and the archive confirm copy with the player count;
  - optimistic archive with rollback;
  - restore;
  - the delete guard refusing a tier with history and allowing an unused one.
- The flag-off markup is unchanged. `npm run check` passes.
