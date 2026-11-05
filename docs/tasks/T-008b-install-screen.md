# T-008b — Install the app: glass prompt after the first workout

**Phase:** 2 · **Depends on:** T-006, T-008 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
After the player finishes their **first** workout (not on first open), show a glass sheet «نزّل KOCHIVO على موبايلك», which works offline and opens faster:
- **Android / Chrome:** capture `beforeinstallprompt`, then show «ثبّت التطبيق» (lime) which calls `prompt()`.
- **iOS Safari** (no install API): show 3 short illustrated steps (lucide icons, no images): «اضغط على زرار المشاركة» → «اختار إضافة للشاشة الرئيسية» → «اضغط إضافة».
- **Already installed** (`display-mode: standalone` or `navigator.standalone`): never show.
- «مش دلوقتي» hides it for 7 days. After 3 dismissals, never again.

## Files
- `src/features/install/` (new):
  - `index.ts`
  - `platform.ts` (pure): `installPlatform({ userAgent, standalone, hasPromptEvent })` returns `'installed' | 'android' | 'ios' | 'unsupported'`
  - `policy.ts` (pure): `shouldShowInstall({ finishedWorkouts, platform, dismissals, lastDismissedAt, now })`. It needs `finishedWorkouts ≥ 1`, a platform other than installed or unsupported, `dismissals < 3`, and 7 days since `lastDismissedAt`.
  - `hooks/use-install-prompt.ts`:
    - listens for `beforeinstallprompt` (call `preventDefault`, keep the event) and `appinstalled`
    - reads and writes `kochivo.install` in `localStorage`, holding only `{ dismissals, lastDismissedAt }`, with every access in try/catch
    - counts finished workouts from local Dexie `workout_sessions` where `completed_at` is not null, via `useLiveQuery` from `@/core/offline`
  - `components/install-sheet.tsx`:
    - a `glass-strong` bottom sheet above the bottom nav
    - `role="dialog"`, `aria-modal`, and a labelled title
    - the Escape key closes it
    - one lime primary on Android; the iOS steps list has no primary
    - «مش دلوقتي» is ghost
  - `install.test.ts`: the platform matrix (Android Chrome, iOS Safari, iOS Chrome = ios, desktop Chrome with a prompt = android, standalone = installed, Firefox desktop = unsupported) and every `shouldShowInstall` rule, with an injected `now`
- `src/features/player-shell/components/player-shell.tsx`: render `<InstallSheet />` from `@/features/install` once, only where `showsNav(pathname)` is true (never inside focus mode). This is the only change there.

## Requirements
1. No service worker or manifest changes in this task. If the manifest is missing something needed for installability, write it under «Notes for reviewer».
2. SSR-safe: there is no `window` access during render.
3. Files are under 250 lines, use tokens only, use RTL logical properties, have targets ≥ 48px, use Egyptian Arabic, and give icon buttons an Arabic `aria-label`.

## Acceptance
- [ ] `install.test.ts` passes.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Push notifications
- The captain app install
- The white-label manifest (T-020)
