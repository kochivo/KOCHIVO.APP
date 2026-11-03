# T-027c — Arabic and English: foundation and first features

**Phase:** 4 · **Depends on:** none · **Status:** ready

## Goal
Users can switch the whole app between Arabic (RTL, default) and English (LTR). This card builds
the system without any new dependency and converts the shared parts. Follow-up cards
(T-027d/e/f) convert the remaining features with the same pattern.

## Files
Create or modify only these:
- `src/core/i18n/locale.ts` (new): `type Locale = 'ar' | 'en'`, `LOCALES`, `DEFAULT_LOCALE = 'ar'`, `parseLocale(value)`, `localeDir(locale)`, `intlLocale(locale)` (`'ar-EG'` and `'en-GB'`), and the cookie name `kochivo.locale`
- `src/core/i18n/messages.ts` (new): `defineMessages({ ar, en })`. It is typed so that `en` must have exactly the same keys as `ar`. A missing or extra key is a compile error.
- `src/core/i18n/server.ts` (new, `server-only`): `getLocale()` reads the cookie, and `getT(messages)` returns `t(key, vars?)`
- `src/core/i18n/client.tsx` (new): `LocaleProvider`, `useLocale()`, and `useT(messages)`
- `src/core/i18n/set-locale.ts` (new, server action): validates the value, sets the cookie (1 year, `sameSite=lax`, `path=/`), and returns nothing
- `src/core/i18n/index.ts` (new) plus `src/core/i18n/i18n.test.ts` (new)
- `src/ui/language-switch.tsx` (new): `العربية` / `English`. It calls the action, then `router.refresh()`.
- `src/app/layout.tsx`: `lang` and `dir` come from `getLocale()`, wrapped in `LocaleProvider`
- `src/lib/dates.ts`, `src/lib/format.ts`: accept an optional locale. Arabic stays the default, so existing callers keep working.
- `src/app/globals.css`: only a `.dir-icon` utility that mirrors directional icons in LTR (`[dir='ltr'] .dir-icon { transform: scaleX(-1) }`)
- Convert to messages (each feature gets `messages.ts` next to its `index.ts`, and `ui` gets `src/ui/messages.ts`):
  - `src/ui/**`
  - `src/features/auth/**`
  - `src/features/marketing/**` (`content.ts` becomes per-locale)
  - `src/features/settings/**`
  - `src/features/player-shell/**`
  - `src/features/install/**`
  - `src/features/demo/**`
  - `src/app/global-error.tsx`, `src/app/offline/**`, `src/app/suspended/**`
- `AGENTS.md` §4 and `docs/ARCHITECTURE.md`: replace "User-facing strings are Egyptian Arabic" with the messages rule: every string lives in `messages.ts`, Arabic is Egyptian, English is short and plain, and there is no inline UI text.

## Requirements
1. **No new dependency.** Use plain TypeScript objects. `t('key', { n: 3 })` interpolates `{n}`. For plurals, keep the message per count where needed (Arabic has several plural forms), using `Intl.PluralRules(intlLocale)` and keys like `players.one`, `players.few`, `players.many`, and `players.other`. The `en` set uses only `one` and `other`.
2. The locale comes **only** from the cookie. With no cookie, it is Arabic. Do not sniff the browser language. The marketing page shows the switch in the header. Settings, login, and the demo banner area show it too.
3. **RTL and LTR:**
   - The layout already uses logical properties, so keep it that way.
   - Every icon that points a direction (chevrons, arrows, back, next) gets `dir-icon`. Find them all with a grep.
   - Fonts: the Latin text already uses Manrope, so check that English renders with Manrope and not Alexandria.
4. **Server components** use `await getT(messages)`, and **client components** use `useT(messages)`. Never pass the whole dictionary to the client; each client component imports its feature's messages.
5. **Data from the database stays as stored.** Exercise and food names are out of scope for this card.
6. **Tests:**
   - `parseLocale`
   - `localeDir`
   - `t` interpolation and plurals
   - The `defineMessages` key parity, as a type test: `// @ts-expect-error` on a missing key
   - Render tests: the marketing hero in both locales, and the login card in English (check that the text and `dir` change). Update any existing test that asserted Arabic text so it still asserts Arabic in the default locale.
7. **English copy:** short, plain, and confident, like "Start free", "Sign in", or "Your next step starts here". Do not translate word for word.

## Acceptance
- [ ] Switching to English flips `dir` to `ltr` and all converted screens show English after a refresh, with no full reload loop.
- [ ] A grep for Arabic letters in the converted folders finds them only in `messages.ts` and tests.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Converting the other features (player-home, workout, nutrition, progress, onboarding, roster, programs, meal-plans, templates, inbox, billing, admin, player-preview): those go in the next cards.
- Light/dark theme: a parallel card touches `layout.tsx`, `settings-screen.tsx`, and `site-header.tsx`. Keep your edits there minimal.
- Translating database content.

## References
- `src/lib/glass-mode.ts` (pattern for small pure helpers), `AGENTS.md` §2 and §4
