# T-219: Homepage header and demo link restored (production fix)

**Phase:** Public pages (owner report 2026-11-13) · **Depends on:** T-218 · **Status:** ready

## Goal
T-218 rebuilt the homepage header to "logo and primary only" on phones, and in doing so it removed things the owner relies on: the language switch (Arabic/English, which also flips RTL/LTR), the dark/light switch, «دخول», and the demo link. Bring them back without losing the T-218 design.

## Files
- `src/features/marketing/components/site-header.tsx`, `hero.tsx`, `content.ts`, `messages.ts`, `standard/messages.ts`, marketing tests.
- `e2e/public.spec.ts` (the phone header check).
- This card.

## Requirements
1. **Header, every width:** the real logo, `LanguageSwitch` from `@/ui/language-switch`, `ThemeSwitch compact` from `@/ui/theme-switch`, and «دخول» linking to `/login`. Keep the T-218 reading-progress line and the slimmer header after the hero.
2. **Desktop (lg and up):** logo · section links · language · theme · «دخول» · primary «ابدأ مجاناً».
3. **Phone (under lg):** logo · language · theme · «دخول». The primary «ابدأ مجاناً» shows in the header too if everything fits at 360px with 48px targets. If it does not fit, it is left out of the phone header, because the hero and the closing card already carry it. The header must never wrap to two lines or scroll sideways at 360px.
4. **Demo:** bring back «جرّب الديمو» (`/demo`, the existing `tryTheDemo` and `aCoachWorkspaceWithSampleData` copy) in the hero. Put it under the two hero CTAs, next to the existing «لاعب ومعاك دعوة؟ ادخل من هنا» line, as a text link with its short note. Keep «شوف إزاي بيشتغل».
5. **Rules:** tokens only, logical properties, every icon-only control has a translated `aria-label`, all strings in messages (`ar`, `arStd`, `en`), no emoji.

## Acceptance
- [x] Tests: the header renders the language switch, theme switch and «دخول» link; the hero renders the demo link to `/demo`.
- [ ] e2e: at a phone width the header shows the language switch, theme switch and «دخول», and the page does not scroll sideways.
- [ ] `npm run check` and `npm run build` pass; `/` stays within the 200 KiB budget.

## Out of scope
- Any other homepage section.
- The installed-app welcome screens (T-220).

## Implementation notes
- Restored compact language/theme switches and sign-in at every width; signup stays desktop-only to reserve phone space for 48px controls. Reading progress and the slim header are preserved.
- Restored the hero demo text link and short note in Egyptian Arabic, standard Arabic and English, alongside the invite line.
- Marketing tests pass with `npx vitest run --configLoader native --pool threads src/features/marketing`: 4 files, 12 tests. The phone e2e now checks 360px width, controls, 48px targets, one row and no horizontal overflow.
- Production route bundle sizes are unavailable: `npm run build` fails with `Could not find the Next.js package (next/package.json)` through the dependency junction. The `/` 200 KiB budget remains unverified. Playwright is blocked by `Error: spawn EPERM`.
- `npm run check` passes typecheck and lint, then stops at the sandbox error `spawnSync git EPERM` in the release audit. The reviewer must rerun both full gates and the phone e2e outside this sandbox.
- A full Vitest fallback using native config loading and worker threads was stopped after several minutes without results; only the focused marketing suite is verified.
