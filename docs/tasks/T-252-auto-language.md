# T-252 — Automatic language on first visit; the language switch offers only Arabic and English

**Phase:** international · **Depends on:** T-184, T-251 · **Status:** ready

Owner decision 2026-11-14:
- The site picks its language by itself on a first visit.
- The language switch shows two choices only: «عربي» and «English».
- The Arabic style (Egyptian or simple standard) is never a visible choice. It is always chosen automatically.

## Goal
A visitor who has never chosen a language lands on the site in the language they most likely read. Anyone can still switch between Arabic and English, and that choice is kept. Egyptian versus standard Arabic is decided for them, so the switch stays simple.

## Files
- `src/proxy.ts`: first-visit language detection
- `src/core/i18n/locale.ts`: a pure `detectLocale(...)` helper, and `resolveArabicStyle` without a manual style
- `src/core/i18n/language-options.ts`: always two options
- `src/core/i18n/server.ts`: stop reading the manual style cookie and the profile style
- `src/core/i18n/set-locale.ts`: no style argument
- `src/features/settings/data/language.ts`: no style write
- `src/ui/language-switch.tsx`: two buttons
- callers that pass a style (search for `setLocale(` and `saveLanguage(`), only to drop the style argument
- `src/core/i18n/messages.ts` / i18n messages: remove the `arabicEgyptian` and `arabicStandard` labels if nothing uses them
- tests next to each file

## Requirements
1. **First visit (no `kochivo.locale` cookie):**
   - The proxy calls `detectLocale({ acceptLanguage, country })`, where `country` is the `x-vercel-ip-country` header.
   - Rules, in order:
     1. Browser language first. If the first `Accept-Language` entry is Arabic (`ar` or `ar-*`), use `ar`. If it is English (`en` or `en-*`), use `en`.
     2. Otherwise, country. The Arab League countries use `ar`: EG, SA, AE, KW, QA, BH, OM, YE, IQ, JO, LB, SY, PS, LY, TN, DZ, MA, SD, MR, SO, DJ and KM. Any other known country uses `en`.
     3. Otherwise `ar`, the current default.
   - Set the `kochivo.locale` cookie with `LOCALE_COOKIE_OPTIONS`, so detection runs once.
2. **A saved choice always wins.** An existing cookie is never overridden. A shared `/ar` or `/en` link keeps working as it does today.
3. **The Arabic style is automatic only.** `resolveArabicStyle` takes the device timezone, the profile timezone and the browser language:
   - If any of them is Africa/Cairo or `ar-EG`, use Egyptian.
   - Otherwise use standard.
   - Do not read the manual style cookie or `profiles.arabic_style` any more. Leave the column and any existing cookies in place, since the database stays additive.
4. **The language switch** shows «عربي» and «English» only, both when the international flag is on and when it is off. The pressed state reflects the current locale. The settings screen and the public header use the same two options.
5. Cairo users must see no change. They get `ar`, Egyptian.
6. Keep the proxy fast: no network calls and no database reads.

## Acceptance
- [ ] Unit tests for `detectLocale` cover:
  - an Arabic browser in the US gives `ar`;
  - an English browser in Egypt gives `en`;
  - a French browser in Saudi Arabia gives `ar`;
  - a French browser in France gives `en`;
  - no headers gives `ar`.
- [ ] Proxy tests: the cookie is set on a first visit; an existing cookie is never replaced; `/en` links still switch.
- [ ] Style tests: a Cairo timezone gives Egyptian; Riyadh gives standard; a stale `kochivo.arabic=standard` cookie is ignored for a Cairo user.
- [ ] The language switch renders exactly two buttons.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- New languages.
- Currency or prices per country.
- Removing the `arabic_style` column.
