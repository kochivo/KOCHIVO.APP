# T-205: Bug fixes and one consistent language across the captain app

**Phase:** v6 owner review round 2 (owner approved 2026-11-12) · **Status:** ready · **Depends on:** none · **Migration:** none
**Flag:** sidebar changes behind `captainWorkspaceEnabled()`; flag off byte-identical. **Messages:** `ar` (Egyptian), `arStd` (docs/I18N-STYLE.md), `en`.
**Rules:** AGENTS.md in full. Tokens only, logical properties, ≥48px targets, 250 lines/file, no new deps, no Get-Content/Set-Content on text files, no commits.

## Files
- `src/features/roster/nav.ts` and its tests.
- `src/features/templates/`, for library loading only.
- The password-reset email template. Find it under `src/` or `supabase/templates/`. If it only exists in the Supabase dashboard, stop and write the Arabic HTML into this card for the reviewer.
- The feedback floating button component.
- Message files for the strings below, inside the files you own.
- Do NOT edit `src/features/inbox/`, `forms/`, `dashboard/`, `billing/`, `settings/`, `meal-plans/` or `captain-workspace/training/`. Other cards own them. If a string there needs changing, list it under Notes.

## Requirements
1. **Templates page shows «القوالب متحملتش».**
   - Reproduce the failure, find the cause, fix it and add a test.
   - The text also says «جرّب تاني» twice, once in the message and once on the button. The message becomes «القوالب متحملتش» only.
2. **Sidebar (flag on)** must read exactly:

   | Section | Items |
   |---|---|
   | (none) | الرئيسية, اللاعبين, المتابعة (badge = waiting count) |
   | التمرين | خطط التمارين |
   | الأكل (once) | الأنظمة الغذائية, مكتبة الأكلات |
   | الإدارة | التقييمات, الدفعات, الإعدادات |

   - The old «المهام» route keeps working, but its label becomes «المتابعة».
   - Each item gets its own lucide icon. No three identical book icons.
   - Labels are the same on every page. Remove the variants «الطعام», «مكتبة الأطعمة» and «اللاعبون».
3. **Password-reset email.** Write it in Egyptian Arabic, RTL, with the KOCHIVO name. Add an English fallback by user locale if the template system supports it.
4. **Feedback floating button.** It must not cover content.
   - Desktop: reserve space for it, or move it into the sidebar footer.
   - Mobile: keep it above the bottom nav.
5. **Language sweep** in the files you own:
   - Standard-Arabic phrases in `ar` become Egyptian. Examples: «لا توجد بيانات بعد», «حاول مجدداً», «أضف طعاماً», «يحتاج إلى متابعة».
   - `arStd` keeps the standard wording.
   - Currency «ج.م» becomes «جنيه».

## Acceptance
- [ ] Templates load.
- [ ] The sidebar is identical on all captain pages.
- [ ] The email renders as RTL Arabic.
- [ ] The feedback button never overlaps content at 1440×900 or 390×844.
- [ ] Tests for nav labels, icons and badge, and for the templates load path.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.
