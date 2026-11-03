# T-027f — Arabic and English: inbox, billing, admin, preview, and database names

**Phase:** 4 · **Depends on:** T-027c (merged) · **Status:** ready

## Goal
Finish English and LTR support for inbox, billing, admin, preview, and database names, using exactly the system T-027c built
(`src/core/i18n`, per-feature `messages.ts`, `useT` / `getT`, `dir-icon`). After this card,
a user who picks English sees no Arabic UI text in these features.

## Files
Create or modify only these:
- `src/features/inbox/**`: add `messages.ts` and replace every inline string
- `src/features/billing/**`: add `messages.ts` and replace every inline string
- `src/features/admin/**`: add `messages.ts` and replace every inline string
- `src/features/player-preview/**`: add `messages.ts` and replace every inline string
- `src/app/[locale]/admin/**`, `src/app/[locale]/(captain)/captain/{inbox,billing}/**`: page metadata titles
- `src/lib/display-name.ts` (new) plus a test: `exerciseName(row, locale)` and `foodName(row, locale)`. In English they return `name_en` when it is present, otherwise the Arabic name. In Arabic they return `name_ar`, falling back to `name_en`.
- Use the helper in the listed features only (`player-preview` renders exercise names). The reviewer applies it in programs and workout after the parallel cards merge.

## Requirements
1. Follow the T-027c pattern exactly. Read `src/core/i18n/*` and one converted feature (`src/features/settings`) first.
   - No new helpers unless the card says so.
   - No dependency.
1b. The locale is a hidden route segment, `src/app/[locale]`. Pages and layouts take the locale from `params.locale`, as in `createT(messages, parseLocale(locale))`, and never from the cookie. That keeps static routes static. Server actions and client components use `getT` / `useT` as usual.
2. Every user-facing string moves to the feature's `messages.ts`: text, `aria-label`, `placeholder`, `title`, toast and error text, and zod error messages shown to the user.
   - Arabic stays Egyptian, unchanged word for word.
   - English is short and plain, not a literal translation.
3. Plurals use the T-027c plural helper, and numbers and dates use the locale-aware `formatNumber` / `formatDateAr` / `formatTimestampAr` with the current locale.
4. Every directional icon (chevron, arrow, back, next) gets `dir-icon`. Check that layouts use logical properties only.
5. Update the tests that assert Arabic text so they still pass in the default locale. Add at least one render test per feature in `en` that checks one key string.

## Acceptance
- [ ] A grep for Arabic letters in the listed folders finds them only in `messages.ts` and tests.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Features other than the ones listed (other cards convert them in parallel).
- Changing `src/core/i18n/**` or `src/ui/**`. If you need a change there, describe it under "Notes for reviewer".
- Translating database content, unless listed above.
