# T-184: Standard Arabic option (infrastructure, public site, sign-in, onboarding)

**Phase:** International (owner decision 2026-11-12) · **Depends on:** none · **Status:** implemented; release verification blocked by Windows EPERM
**Migration:** `0095_arabic_style.sql`, additive only, not applied. Applying it to production needs the owner's approval.

## Goal
Arabic-speaking users outside Egypt can use KOCHIVO in simple standard Arabic («عربي فصحى مبسّط»). Egyptians keep Egyptian Arabic. This is a second Arabic **style** on top of the same `ar` locale, so RTL, routes, `locale === 'ar'` checks and Arabic digits are unchanged. Any string that has no standard version yet falls back to the Egyptian one, so the work can be translated in batches (T-185 and T-186).

## Files
- `src/core/i18n/` (`messages.ts`, `locale.ts`, `server.ts`, `client.tsx`, `set-locale.ts`, and tests):
  - `defineMessages` accepts an optional `arStd` dictionary. It is a partial of `ar`, with the same keys, placeholders and plural keys, checked by the type system and a test.
  - `createT(messages, locale, style)` uses `arStd[key]` when `style === 'standard'` and the key exists; otherwise it uses `ar`.
  - `ArabicStyle = 'egyptian' | 'standard'`. It is read from a cookie `kochivo.arabic` and then from the profile; the default is decided by rule 3 below. Keep every existing call signature working, with the style defaulting to `'egyptian'`.
- New migration: `profiles.arabic_style text null check (arabic_style in ('egyptian','standard'))`, where null means automatic, with update granted to `authenticated`. Add a PGlite test.
- The language switcher (wherever the ar/en switch lives today) offers three choices: «عربي مصري», «عربي فصحى» and «English».
- `src/features/settings/`: the same choice, saved to the profile and the cookie.
- `src/app/[locale]/layout.tsx`: reviewer-approved scope extension to pass the server-resolved Arabic style to the existing provider; no other route changes.
- `next.config.ts`: budget follow-up normalizes the public international flag to a compile-time `0` or `1`, including when unset, so disabled standard dictionaries can be removed.
- **Translate to `arStd`:** `src/ui/`, `src/core/` messages, the public marketing site and footer, sign-in/sign-up/reset, onboarding and intake, and errors and empty states in `src/lib/`.
- `docs/I18N-STYLE.md` (new): the standard Arabic style guide and glossary below.

## Requirements
1. **Flag.** Behind `NEXT_PUBLIC_INTERNATIONAL === '1'`, the same flag as T-182; reuse `src/lib/international-enabled.ts` if it exists, or create it with the same shape. With the flag off, the style is always `'egyptian'` and the switcher shows the two choices it shows today. That is byte-identical to today, with a test.
2. **Style guide** (put it in `docs/I18N-STYLE.md` and follow it):
   - **Tone:** short, simple standard Arabic of the kind Gulf and Levant apps use, with no heavy classical forms. Address the user in the masculine singular, the same as the Egyptian strings.
   - **Glossary:**
     - عاوز → تريد
     - دلوقتي → الآن
     - النهارده → اليوم
     - خلّص → أنهِ
     - سِت → مجموعة
     - إيه → ما
     - مش → لا / ليس
     - كده → هكذا
     - بتاع → الخاص بـ
     - ابعت → أرسل
     - Check-in stays «Check-in»
     - Exercise names stay English
   - Keep the brand, the English slogan, numbers and units exactly as they are, with no emoji.
3. **Default style** when nothing is chosen:
   - Egyptian if the profile timezone or the device timezone is `Africa/Cairo`, or if `navigator.language` is `ar-EG`;
   - otherwise standard.

   A manual choice always wins.
4. **No flash.** The server renders the right style (from the cookie), so pages don't flash between dialects.
5. **Fallback test.** A key missing from `arStd` falls back to `ar` without throwing. Write a test that lists `arStd` coverage per messages file, so T-185 and T-186 can track progress.

## Acceptance
- [x] Unit tests for `createT` style selection, fallback, plurals and placeholder parity.
- [x] A flag-off test, including exact legacy switcher and layout-provider markup.
- [x] Tests for the default-style rule.
- [x] Settings and switcher tests.
- [x] PGlite test for the column.
- [x] Translated files reach 100% `arStd` coverage, per the coverage test.
- [ ] All gates pass.

## Implementation notes
- The locale layout passes the cookie/profile-resolved style into `LocaleProvider` before rendering client copy. Integration tests cover both sources and flag-off markup parity.
- Authentication action errors and browser failure paths reuse the selected translator.
- Standard dictionary coverage: PWA 3/3, auth 94/94, auth signup 1/1, intake 25/25, marketing 189/189, onboarding 96/96, shared UI 44/44, tour 24/24.
- The first anonymous request cannot report a device timezone before browser code runs. The server uses available profile/request-language information; subsequent requests also use browser-recorded hints. Manual cookie choices are rendered on the server without a dialect flash. See `docs/I18N-STYLE.md`.
- No dependencies, budget changes, commits or live database changes. AGENTS.md remains as placed by the reviewer.

## Verification (2026-11-12)
- `npx tsc --noEmit -p .`: passed.
- `npx eslint .`: passed.
- `npx vitest run --maxWorkers=2 --configLoader native --pool=threads`: **517 passed | 1 skipped (518)** test files; **3631 passed | 1 skipped (3632)** tests. The skipped test requires completed-build bundle statistics.
- Layout regression checks: **9 passed**, covering the unchanged existing layout tests plus cookie/profile standard rendering and byte-identical flag-off provider markup. With the flag off, the layout bypasses style resolution entirely.
- `npm run check`: typecheck and lint passed; stopped at `npm run audit:release` with `spawnSync git EPERM`. The existing `scanFile`/`scanRoutes` rules were run with a PowerShell-supplied tracked/untracked file list instead: **2040 files, 0 findings**.
- `npm run build`: **Compiled successfully in 19.9s**; blocked at the TypeScript worker with `spawn EPERM`. Standalone TypeScript passed, but a completed production build remains unverified.
- `npx vitest run src/lib/perf-budget.test.ts --maxWorkers=2 --configLoader native --pool=threads`: **1 skipped**; `.next/diagnostics/route-bundle-stats.json` is unavailable after the blocked build. No budget was changed.
- `git diff --check`: passed. The reviewer must rerun the blocked gates and confirm route budgets before checking the final acceptance item.

## Out of scope
- Player app screens (T-185) and captain app screens (T-186).
- Currency and payments.

## Reviewer budget follow-up (2026-11-12)
- Reviewer baseline: 201.39 KiB gzip on forgot-password, invite, login, reset-password and suspended routes, over the unchanged 200 KiB limit.
- Local compiled-manifest measurement before this fix: **201.35 KiB** on each affected route. After this fix: **199.73 KiB**, a **1.62 KiB** reduction per route. Measurements use Next's own `writeRouteBundleStats` collector and the perf test's per-chunk gzip calculation.
- All eight scoped standard dictionaries now have local build-time flag branches. `next.config.ts` supplies an explicit disabled literal when the flag is unset; without that default, Next leaves the lookup unresolved and cannot prune the strings. No Egyptian or English copy changed. Enabled builds retain complete standard coverage.
- Regression tests cover dictionary omission when disabled, complete dictionaries when enabled, and compile-time flag normalization. The coverage test explicitly enables international support while inspecting translations.
- Latest checks: `npx tsc --noEmit -p .` and `npx eslint .` passed; relevant Vitest fallback **78 files / 539 tests passed**, including the route budget and existing byte-identical flag-off checks.
- `npm run build` compiled successfully in **6.8s**, then hit the existing TypeScript-worker `spawn EPERM`. Route stats were regenerated from those compiled manifests with Next's own collector; the complete build remains for the reviewer to rerun. `npm run check` passed typecheck/lint, then hit audit's existing `spawnSync git EPERM`.
- No budgets, dependencies, AGENTS.md, migrations or live data were changed by this follow-up. No commit was made.
