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
- [x] Feature inventory, nothing dropped.
- [x] Unit tests: billing state → pill and action mapping, month sums in the captain's timezone, settings instant save with rollback on error.
- [ ] Flag off byte-identical; all gates pass; budgets unchanged.

## Feature inventory

| Existing feature/data/state | Destination in v6 |
|---|---|
| Billing loading, failure/retry, empty roster and invite link | Same states inside the billing surface |
| Plan tier, price, capacity, usage bar, paid-until, upgrade WhatsApp, missing support and demo restrictions | Plan card; price and activation details in expandable finance details |
| This/last month receipts, percentage change, dues and owing-player count | Three headline tiles; expandable finance details retain comparison and owing count |
| Player name, status, expiry, latest payment amount/date/days, unpaid balance | Table and row detail sheet |
| Renew by package/custom duration, partial payment, date preview, sessions packages, pending activation | Existing renewal/activation forms in row detail |
| WhatsApp reminders, missing-phone handling | State action when available; all available reminders retained in row detail |
| Freeze/unfreeze, sessions remaining, frozen and pending badges | State action and existing billing manager in row detail |
| Package create/archive and validation/error feedback | Expandable package section below table |
| Payment notes, renewal and collection history | Lazy row history, including notes and periods (built per v6-spec) |
| Profile name, public slug/copy, avatar upload, bio, location, social links | Profile fact card and existing branding form in sheet |
| Language/style, automatic/manual timezone, units | Instant-save chips and existing timezone choices; inline save/error/retry with rollback |
| Invitation message and validation | Preview card and existing form in sheet |
| Export/download feedback | Account card opens existing export flow |
| Sign out | Account card, existing auth action |
| Delete confirmation, scheduled date and seven-day cancellation, demo restrictions | Account card opens existing deletion flow |
| Glass preference, theme, install, push controls and tour replay | Additional-options sheet reached from account card (built per v6-spec) |
| Settings loading, failure/retry, player profile/settings | Captain loading/error states retained; player path stays on the legacy component |

## Implementation plan

1. Add deterministic status/action, timezone-month and optimistic preference tests.
2. Add isolated flag-gated billing and captain settings surfaces, reusing existing forms/actions.
3. Verify all gates without changing budgets, dependencies, schema, standard Arabic or other cards.

## Notes for reviewer

- Implemented flag-gated surfaces and local fact-row/save-status equivalents; shared T-188 parts were absent. Player settings remains on the existing component.
- Read the full v6 spec and the approved billing/settings markup. Live 1440×900 / 390×844 comparison remains unverified: `NEXT_PUBLIC_CAPTAIN_WORKSPACE=1 npm run dev -- -p 3104` failed with `spawn EPERM`; an in-process Next start-server fallback also failed with `spawn EPERM`.
- Deliberate additions beyond the mockup: expandable finance/package/plan details retain existing features, and the account card opens an additional-options sheet for appearance, install, notifications and tour replay. Controls use the mandatory 48px touch area. The sign-out action retains the auth feature's existing translated label (`تسجيل الخروج`) instead of mockup `خروج`; changing that shared component is outside this card.
- Standard-Arabic chip remains disabled while the international flag is off, preserving T-184's existing style gate. English is shown only when that flag is on. No `arStd` or `standard/` files were changed; new Egyptian/English messages require reviewer reconciliation before standard-coverage gates pass.
- Scoped verification: 31 test files / 153 tests passed, including flag selection, billing mappings/month boundaries, authenticated preference writes, rollback/input retention, merged payment-history pagination and deletion-sheet reopen state. TypeScript and ESLint passed.
- `npm run check` reached the release audit after typecheck/lint, then failed at `spawnSync git EPERM`. Running the same release-audit scanners with a shell-supplied git file list (including untracked additions) returned `Release audit fallback: 2204 files, 0 findings`.
- `npm run build` compiled successfully, then failed starting its TypeScript worker with `spawn EPERM`; standalone `npx tsc --noEmit -p .` passed. No build configuration or budget was changed.
- Default Vitest and the default standalone budget command failed loading config with `spawn EPERM`; used `--maxWorkers=2 --configLoader native --pool=threads`. Budget verification fails with `ENOENT` because the existing `.next/diagnostics/route-bundle-stats.json` references missing chunk `34c8__-uasntr.js`. A complete reviewer build must regenerate bundle statistics.
- Full fallback suite summary: `Test Files 3 failed | 559 passed (562)`; `Tests 4 failed | 3754 passed (3758)`. The four failures are two new-message standard-coverage cases, the standard dictionary-gating case, and the stale bundle-budget artifact. The previously found sheet-surface and timezone-literal regressions were fixed and pass their targeted checks.
- Existing shared timezone runtime reads remain gated by `NEXT_PUBLIC_INTERNATIONAL`; this card preserves that infrastructure. Validate timezone behavior with both workspace and international flags enabled; changing the shared timezone gate is outside this card.
