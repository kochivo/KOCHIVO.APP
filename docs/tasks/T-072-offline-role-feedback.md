# T-072 — Role-aware offline page, feedback button, install prompt for captains

**Phase:** 3 · **Status:** ready (owner request, 2026-11-04)

## 1. Role-aware offline page (bug)
- `src/app/[locale]/offline/page.tsx` is served by the service worker for uncached pages. It always shows the player text `todaySWorkoutIsSavedOn` («تمرين النهارده متسجّل على موبايلك…», "today's workout is saved on your phone…"), even for captains.
- **Remember the role on the device:**
  - When the captain shell or the player shell mounts, store `localStorage['kochivo.role'] = 'captain' | 'player'`.
  - On sign-out, clear it. That covers every sign-out path: settings, the admin sign-out, and `/auth` sign-out if any.
  - Wrap every access in try/catch.
- **The offline page renders a small client component `offline-message.tsx`** that reads the stored role after mount. The server render shows the generic text, and the client swaps it in, with no hydration mismatch.
  - player: keep the current text
  - captain: «مفيش نت دلوقتي. أول ما يرجع هتقدر تتابع لاعيبتك وتعدّل البرامج.» ("no internet right now; once it's back you can follow your players and edit programs"); English: "You're offline. Reconnect to follow your players and update programs."
  - unknown or signed out: «إنت مش متصل بالنت.» ("you're not connected to the internet"); English: "You're offline."
- The service worker caches the offline page, so the page must not need the network. Keep the component tiny.

## 2. Feedback button (report a problem)
- **Placement:** a small floating icon button (`MessageSquareWarning` from lucide).
  - It shows in the captain and player shells, but not in focus/workout mode and not on marketing pages.
  - Position: `fixed`, at the end side, just above the bottom nav (`bottom-[calc(var(--nav-clearance)+0.5rem)]`); on desktop (lg, where there is no bottom nav), `bottom-6`.
  - Below sheets in z-order; size at least 48 px.
  - Translated `aria-label` «بلّغ عن مشكلة» ("report a problem").
- **Behavior:** it opens a sheet using the opaque `sheet` surface from T-066, with:
  - a textarea «إيه المشكلة؟» ("what's the problem?"), 5–1000 characters
  - a send button
  - success toast «وصلتنا، شكراً» ("we got it, thanks"), and an error state
- **Transport:** use **Sentry user feedback**, already installed and approved, with no new webhook or secret.
  - Call `Sentry.captureFeedback({ message, url: location.href }, { captureContext: { tags: { role }, user: { id } } })`.
  - The user id is the Supabase user id from the existing session or identity helper, never the email.
  - If Sentry has no DSN (local, tests), fall back to returning an error that says sending failed.
  - Keep `@sentry/nextjs` imports lazy (dynamic import on submit) so the shell routes stay inside the perf budget.

## 3. Install prompt for captains
- `src/features/install` (`use-install-prompt.ts` listening to `beforeinstallprompt`, plus `install-sheet.tsx`) already exists. Check where it is mounted.
- If it only shows for players, also mount the existing install entry for captains: same component, same once-per-period rules. If it already shows for both, change nothing and say so.

## Already done, verify only
- **Skeletons:** `LoadingState` already renders skeletons (`src/ui/skeleton.tsx`). Grep for any remaining spinner (`animate-spin`, `Loader2`) in captain screens and replace it with `LoadingState` / skeletons. Report what you found.
- **RTL:** grep `\b(ml|mr|pl|pr|left|right)-` and `text-left|text-right` in `src/**/*.tsx`. Replace any hit with logical properties, and report the count.

## Tests
- `offline-message`: each role gives the right text; storage that throws falls back to the generic text.
- Role storage is set on shell mount and cleared on sign-out.
- Feedback: validation, a successful submit calls `captureFeedback` with url, role and id, and failure shows the error. Mock the dynamic import.

## Requirements
- No new dependencies.
- Strings in `messages.ts` (Egyptian Arabic and English).
- Tokens only, logical properties.
- Files ≤ 250 lines.
- The perf budget must pass after the build without raising budgets.

## Acceptance
- [ ] A captain who goes offline sees the captain text; a player sees the player text.
- [ ] The feedback button sends a report that appears in Sentry → User Feedback with the page URL and user id.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build` and the perf budget pass.
