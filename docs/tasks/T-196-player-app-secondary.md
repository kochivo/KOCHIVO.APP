# T-196: Player app secondary screens (mockup v6-rest: «تطبيق اللاعب ٢»)

**Phase:** Player app v6 (owner: "100% UI/UX and backend") · **Depends on:** T-195 · **Status:** ready
**Migration:** none expected. **Flag:** behind `captainWorkspaceEnabled()`; flag off byte-identical.

Read first: `docs/mockups/captain-workspace/v6-rest.html` (screen «تطبيق اللاعب ٢», eight phones) and `docs/mockups/captain-workspace/v6-spec.md`. Use the player shell from T-195.

## Files
- `src/features/onboarding/` (player intake), `src/features/readiness/` (morning questions), `src/features/workout/` finish screen only, `src/features/forms/` player answer flow only (`answer-flow`, `answer-entry`, `player-form-page`, `pending-forms`), `src/features/ranks/`, `src/features/body-scans/`, `src/features/supplements/`, `src/features/notifications/`, player part of `src/features/settings/`, and tests.
- Thin player routes for these pages. Messages (`ar`/`en` only). This card.

## Requirements
1. **أول مرة:** one question per step with «{n} من {total}», progress bar, «تخطّى» where optional, big option cards (selected = lime border + lime-soft), primary «التالي». Same intake data and validation as today.
2. **سؤالين الصبح:** sleep chips, soreness chips, readiness result card (glass-strong) with the suggested decision, primary «تم». Same data and rules as today.
3. **آخر التمرين:** trophy, «خلّصت {day}», duration · sets · volume, tiles (نقط, رقم قياسي), effort 1–10 chips with «سهل جدًا / أقصى مجهود», primary «ابعت للكابتن», secondary «شارك» (existing share card).
4. **جاوب تقييم:** one question per page, «{n} من {total}», progress bar, question types (number, choice, scale, text, photo with camera/gallery), «رجوع» + primary «التالي» / «ابعت الإجابات» at the end, note «إجاباتك بتتحفظ لو النت فصل» (local draft as today). Renamed to التقييمات.
5. **رتبتك:** rank card (badge, tier, points, bar to next), «سباق التاج الشهر ده» list with the player's own row highlighted and the prize line, «لوحة الشرف» row. Keep celebrations and share.
6. **InBody والمكملات:** InBody card with three values and deltas, «ضيف InBody» (existing upload/PDF/photo), history; «مكملات النهارده» rows with big ticks (existing schedule times). Supplements also appear inside الأكل (T-195 links here).
7. **الإشعارات:** header with «علّم الكل كمقروء», rows with icon colour by type and unread dot, deep links as today.
8. **حسابي:** profile row (coach and days left), language chips (مصري / فصحى / English per T-184 flag rules), units, workout reminder time, install app, logout, KO «قريبًا» card.
9. Feature inventory per `v6-spec.md` for all eight screens.
10. Copy every Arabic string from the mockup exactly. `ar` + `en` only.

## Acceptance
- [ ] Matches the eight phones at 390×844, differences listed.
- [ ] Feature inventory, nothing dropped.
- [ ] Offline: assessment draft and readiness answers survive offline (tests).
- [ ] Flag off byte-identical; all gates pass; budgets unchanged.
