# T-026b — Arabic copy, colour tokens, and leftovers (CH-08, CH-09, CH-11)

**Phase:** 5 · **Depends on:** T-025 report (merged) · **Status:** ready
**Delegate to:** Codex

Read `docs/CODE-HEALTH.md` CH-08, CH-09 and CH-11 first.

## Fixes
1. **CH-08:** remove or translate the decorative English labels (`DAY`, `KCAL`, `ROSTER`, `INBOX`, `CAPTAIN`, `PROGRESS`, `TEMPLATES`, `NEXT`, `REST`) into short Egyptian Arabic, or drop them where the Arabic text beside them already says it. The greeting date uses `ar-EG`. Marketing: translate the English labels in `content.ts` and give `slogan.tsx` an Arabic accessible name. Keep the brand name «KOCHIVO», plan names (ENTRY, CHAMPION, LEGEND, EMPIRE), and «© Gym visual» exactly.
2. **CH-09:** in `src/ui/button.tsx` and `src/ui/stepper.tsx`, replace `bg-white/5`, `bg-white/10`, `bg-white/20` with theme tokens. If no fitting token exists, add one or two overlay tokens to `@theme` in `globals.css` (for example `--color-overlay` and `--color-overlay-strong`), and do not touch the glass utilities. Switch `exercise-header.tsx` and `next-up.tsx` panels from `glass` to `glass-strong`.
3. **CH-11:**
   - remove the obsolete T-006 TODO in `today-card.tsx`
   - marketing hero: the demo button links to sign-in, so its text must not promise a one-click demo; use honest wording such as «جرّب KOCHIVO» and keep the link
   - admin `kpi-row.tsx`: remove the hard-coded «مستنيين تفعيل» = 0 KPI (there is no request workflow yet); keep the other KPIs and adjust the grid columns; update `admin.test.ts`

## Files
Only the files named in CH-08, CH-09 and CH-11, `globals.css` tokens if needed, and their tests. **Do not touch** `src/features/workout/hooks/*` or `src/features/workout/components/focus-screen.tsx` (another card is fixing them).

## Requirements
1. Tokens only, RTL logical properties, Egyptian Arabic, no emoji. Files under 250 lines.
2. Update any test that asserts the old English text.

## Acceptance
- [ ] Tests pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- CH-01..CH-07, CH-10
