# T-383: Captain phone shell (bottom bar, + sheet, More)

**Migration:** none. Mockups: `c5-01-home` (bar), `c5-03-quick-add`, `c5-10-more`.

## Files
- `src/features/roster/components/captain-*.tsx` (frame nav, top bar, more sheet, nav groups), roster messages, tests.

## What to build
1. Phone bottom bar with five items: الرئيسية، المهام (badge with open tasks), a raised lime **+** button in the middle, اللاعبين، المزيد. Active item uses the existing active style and `aria-current`. KOCHIVO icons from `src/ui/icons` for nav.
2. **+ sheet** «عاوز تعمل إيه؟»: ضيف لاعب، سجّل دفعة، برنامج جديد، نظام أكل، ابعت تقييم، لينك الدعوة. Each opens the flow that exists today.
3. **المزيد page/sheet:** captain card (name, plan, players used of limit) on top, then groups فريقي (طلبات الانضمام with count، الترتيب)، مكتبتي (برامج التمرين، التمارين، الأنظمة الغذائية، الأكلات، التقييمات with counts)، فلوسي (الاشتراكات، الباقات), and settings.
4. The phone top bar becomes a plain page header (title + one action); the old phone nav is removed only below md.

## Rules for every captain-phone card
- **Phone only.** Apply the new look below the `md` breakpoint (`max-md:` / the existing phone checks). The desktop at `md` and up must render exactly as today. Owner decision 2026-11-18: «سيب شكل الديسكتوب زي ما هو، هنعدل على شكل الفون بس».
- Only the v6 workspace (`NEXT_PUBLIC_CAPTAIN_WORKSPACE=1`). Flag-off markup and its hash tests stay unchanged.
- Keep every action and data that works today; this is a new look, not fewer features. Do not change queries, writes, ids or RLS. No migrations, no dependencies.
- Strings in ar, arStd (const outside `defineMessages` + `get arStd()` behind `NEXT_PUBLIC_INTERNATIONAL`) and en. Tokens only, logical properties, targets ≥ 48px, files ≤ 250 lines, every `<dialog>` has the `sheet` class, `localDate(x, timezone)` always gets a timezone.
- Match the mockups in `docs/mockups/captain-phone/` (open the .dc.html files at 390px; `00-all.png` is the overview) 1:1 at 360px and 390px.

## Done when
- Tests cover what is listed above, and a test proves the desktop markup did not change (class or structure check under md).
- `npm run check` passes.
