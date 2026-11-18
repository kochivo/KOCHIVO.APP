# T-380: Captain settings, one section at a time (v6, desktop)

**Migration:** none. **Owner decision 2026-11-18:** the captain settings page is messy and inconsistent. Match canvas page «إصلاح شاشات الكمبيوتر», screens 1–4 (`docs/mockups/desktop-fixes/f5-01-page.dc.html` to `f5-04-security.dc.html`, overview `f5-all.png`).

## Problem
- `settings/components/captain-settings.tsx`: the side nav uses a `first:` active style and anchor links, so the active item never changes and every section is one long scroll.
- The profile shows three times: the header card, `WorkspacePageCard` and `PublicPageSettings`.
- `public-page-settings.tsx` uses native checkboxes.

## Files
- `src/features/settings/components/captain-*.tsx`, `public-page-settings.tsx`, the workspace page card, and new small files under `src/features/settings/components/captain/`
- `src/features/settings/**/messages.ts` (captain strings), tests

## What to build
1. Side nav with six sections: حسابك، صفحتك العامة، رسالة الدعوة، اللغة والإشعارات، باقتك والدفع، الأمان والبيانات. Only the selected section shows. The selection lives in the URL (`?section=`), so back and refresh keep it, and the active item uses the existing active nav style with `aria-current`.
2. Each section is one card with a title and a short line under it. Show the profile only once (in حسابك, with the public link and a copy button in صفحتك العامة).
3. Replace native checkboxes with the existing switch control from `@/ui`.
4. One sticky save bar at the bottom of the section when it has unsaved changes («عندك تغييرات مش محفوظة» + حفظ + تراجع). Sections that save instantly (switches) show the existing success toast instead.
5. Keep every setting that exists today, the sign-out button and the danger actions (in الأمان والبيانات).

## Rules for this card
- Desktop layout stays as it is today (sidebar, header, page width). Only the page content changes. Phone layouts must keep working.
- Change only the v6 workspace view (`NEXT_PUBLIC_CAPTAIN_WORKSPACE=1`). The flag-off markup and its hash tests stay unchanged.
- Strings in ar, arStd (behind the `NEXT_PUBLIC_INTERNATIONAL` getter, as in other v6 message files) and en. Tokens only, logical properties only, 48px targets, files under 250 lines.
- No migrations, no new dependencies, no data writes changed.

## Done when
- Tests cover: the section from the URL, the active item, the profile rendered once, the save bar only when dirty, and every existing setting still present.
- `npm run check` passes.
