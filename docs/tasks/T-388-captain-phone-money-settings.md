# T-388: Captain phone subscriptions and settings

**Migration:** none. Mockups: `c5-15-money`, `c5-16-settings`.

## Files
- `src/features/billing/components/workspace-billing*.tsx`, `workspace-payments-table.tsx` (phone only; T-377 desktop stays), `src/features/settings/components/captain*` (phone only; T-380 desktop stays), messages, tests.

## What to build
1. **Subscriptions:** month income card (out of expected, waiting amount), chips الكل / متأخر / بيخلص / دافع with counts, player rows with the state line and one action (سجّل دفعة / فكّرها / مدفوع).
2. **Settings:** captain card with public link and «عدّل»; rows: صفحتك العامة (status), لينك الدعوة (انسخ), الإشعارات, اللغة والوقت (current values), الباقة, الأمان, and اخرج من الحساب. Each row opens the same section T-380 built.

## Rules for every captain-phone card
- **Phone only.** Apply the new look below the `md` breakpoint (`max-md:` / the existing phone checks). The desktop at `md` and up must render exactly as today. Owner decision 2026-11-18: «سيب شكل الديسكتوب زي ما هو، هنعدل على شكل الفون بس».
- Only the v6 workspace (`NEXT_PUBLIC_CAPTAIN_WORKSPACE=1`). Flag-off markup and its hash tests stay unchanged.
- Keep every action and data that works today; this is a new look, not fewer features. Do not change queries, writes, ids or RLS. No migrations, no dependencies.
- Strings in ar, arStd (const outside `defineMessages` + `get arStd()` behind `NEXT_PUBLIC_INTERNATIONAL`) and en. Tokens only, logical properties, targets ≥ 48px, files ≤ 250 lines, every `<dialog>` has the `sheet` class, `localDate(x, timezone)` always gets a timezone.
- Match the mockups in `docs/mockups/captain-phone/` (open the .dc.html files at 390px; `00-all.png` is the overview) 1:1 at 360px and 390px.

## Done when
- Tests cover what is listed above, and a test proves the desktop markup did not change (class or structure check under md).
- `npm run check` passes.
