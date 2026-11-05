# T-061 — E2E tests for the critical flows (Playwright)

**Phase:** 3 · **Depends on:** none · **Status:** ready (owner chose E2E on 2026-11-04)

## Goal
- One command, `npm run test:e2e`, drives the real built app in a browser through the flows that make money.
- A change that breaks one of them is caught before it is published.

## Setup that already exists
- `@playwright/test@1.64.1` is installed as a pinned dev dependency. Do not add any other dependency.
- **Do not download browsers.** Use the installed Microsoft Edge: `channel: 'msedge'`, configurable with `E2E_CHANNEL`.
- The app talks to the hosted Supabase project. The only data a test may create is through the public **demo** (`/ar/demo`, an anonymous sign-in that gets its own sandbox captain and players). Never sign up real accounts, never use passwords, never touch admin routes.

## Files
- `playwright.config.ts` (repo root):
  - `testDir: 'e2e'`
  - `webServer` runs `npm run start -- -p 3100` against an existing `next build`, with `reuseExistingServer: true`
  - `baseURL http://localhost:3100`
  - one Edge project at a mobile viewport (Pixel 7 size) and one desktop project
  - `retries: 1`, `trace: 'retain-on-failure'`, outputs under `test-results/` and `playwright-report/`
- `e2e/*.spec.ts`: the specs below. Add small helpers in `e2e/support/` if needed (≤ 250 lines per file).
- `package.json` script: `"test:e2e": "playwright test"`. Do **not** add it to `check` or to `.github/workflows/deploy.yml`: it needs the network and creates demo users, so it stays manual.
- `.gitignore`: add `test-results/`, `playwright-report/`, `playwright/.cache/`.
- Make sure Vitest does not pick up `e2e/` (its include is already `src/**`; keep it that way) and that `tsc` and `eslint` pass over the new files.
- `docs/TESTING.md` (create, or add a section if it exists): how to run it (`npm run build` first, then `npm run test:e2e`), and the rule that only demo data may be created.

## Specs (Arabic locale unless noted)
1. **public.spec.ts:**
   - The landing page `/ar` loads with the hero, and the mobile menu opens and closes (≤ 1024 px).
   - `/en` loads in English with `dir="ltr"`.
   - The `/opengraph-image` response is `image/png`.
   - `/ar/login` shows the email field.
2. **demo-captain.spec.ts:**
   - Start the demo as a captain and land on the captain dashboard.
   - Open the roster, then open one player's profile.
   - Open the program builder for that player, add one exercise from the library, and see the «اتضاف» state and the toast.
3. **demo-player.spec.ts:**
   - Start the demo as a player (or switch to the player view if the demo offers it).
   - Open today's workout, log one set (stepper plus done), and see it marked done.
   - Go offline (`context.setOffline(true)`), log another set, see it marked done, go back online, and see the sync state settle with no error.
4. **rtl.spec.ts:** on the captain dashboard and the player home in `/ar`, assert there is no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth + 1`) at the mobile viewport.

Read the real UI first (`src/features/demo`, `player-home`, `workout`, `programs`) and select elements by role and accessible name, using the strings from the features' `messages.ts`. Never use CSS classes or `nth()` positions. If a needed control has no accessible name, add a translated `aria-label` in that component; that is the only product-code change allowed.

## Requirements
- Tests are independent, with no ordering between files. Each demo spec starts its own demo.
- Do not wait on fixed times (`waitForTimeout`). Use web-first assertions.
- If the demo shows a Turnstile captcha (a site key is configured), the spec must `test.skip` with a clear reason. Never try to solve or bypass it.
- English and Arabic strings come from the messages files, imported where practical, not retyped.

## Acceptance
- [ ] `npm run build && npm run test:e2e` passes locally on Edge, both projects.
- [ ] Breaking a flow on purpose (e.g. renaming the done button label) makes the right spec fail.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2` and `npm run build` still pass.

## Out of scope
CI integration, visual snapshots, sign-up and email flows, payments.
