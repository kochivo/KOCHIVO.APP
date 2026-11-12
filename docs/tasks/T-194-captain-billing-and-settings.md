# T-194: Captain billing and settings (mockup v6-rest: «الدفعات», «الإعدادات»)

**Phase:** Captain workspace v6 (owner: "100% UI/UX and backend") · **Depends on:** T-187 · **Status:** ready
**Migration:** none expected. **Flag:** behind `captainWorkspaceEnabled()`; flag off byte-identical.

Read first: `docs/mockups/captain-workspace/v6-rest.html` (screens «الدفعات» and «الإعدادات») and `docs/mockups/captain-workspace/v6-spec.md`. If the shared `src/ui/` parts from T-188 do not exist yet, build local equivalents inside your feature and note it.

## Files
- `src/features/billing/` (captain billing screen, player subscriptions table, payments) and tests.
- `src/features/settings/` captain settings screen (not the player settings, that is T-196) and tests.
- Thin routes `.../captain/billing/page.tsx`, `.../captain/settings/page.tsx`.
- Messages (`ar`/`en` only). This card.

## Requirements
1. **الدفعات:**
   - Plan card (glass-strong): «باقتك», plan name, «{used} من {limit} لاعيبة», bar, «كبّر الباقة» (existing upgrade flow).
   - Three tiles: اتدفع الشهر ده، متأخر (warn), هيخلص الأسبوع ده. Money in the captain's currency format (today EGP «ج.م»).
   - Table: اللاعب، الحالة (pill: نشط / هيخلص بعد {n} أيام / متأخر {n} أيام / متجمد), لحد، آخر دفع، one action that fits the state: «جدّد» / «فكّره» / «سجّل دفع» / «فكّ التجميد». Existing renew sheet, reminders, payment history per player (row click opens it).
   - Every existing billing action stays (freeze, packages, sessions left, payment notes).
2. **الإعدادات:** four cards:
   - «ملفك وصفحتك»: fact rows (الاسم، رابط صفحتك، واتساب) + «عدّل» opening the existing profile/branding form in a sheet (photo, bio, location, social links, public slug).
   - «اللغة والتوقيت»: language chips (عربي مصري / عربي فصحى / English, the third only when the international flag is on, same as T-184), timezone chips (تلقائي · {zone} / اختار بنفسي → existing picker), units chips. Changes save instantly and quietly (`save-status`, no toast).
   - «رسالة الدعوة»: preview + «عدّل الرسالة» (existing form).
   - «حسابك»: نزّل بياناتك، اخرج من الحساب، امسح الحساب (danger colour, existing confirm + 7-day cancel flow).
3. Feature inventory per `v6-spec.md` for both screens.
4. Copy every Arabic string from the mockup exactly. `ar` + `en` only.

## Acceptance
- [ ] Matches the two mockup screens at 1440×900 and 390×844 (differences listed).
- [ ] Feature inventory, nothing dropped.
- [ ] Unit tests: billing state → pill and action mapping, month sums in the captain's timezone, settings instant save with rollback on error.
- [ ] Flag off byte-identical; all gates pass; budgets unchanged.
