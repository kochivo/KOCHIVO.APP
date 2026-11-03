# T-033 — Skeletons, glass toasts and type hierarchy

**Phase:** 3 · **Depends on:** T-032 merged (it changes `src/ui` and `globals.css`) · **Status:** ready after T-032

## Goal
Make loading, feedback and text feel like a polished SaaS product.
Loading text becomes shimmering skeletons shaped like the content. Success and error messages appear as glass toasts that rise from the bottom and fade away. Headings and secondary text get a clear, consistent hierarchy.

## Decisions already made by the owner
- **No Sonner.** Build our own toast in `src/ui`; no new dependency.
- **Keep the fonts.** Alexandria for body and Changa for display stay, through `next/font/google`. Only the hierarchy changes.

## Files
Create or modify only these:
- `src/ui/skeleton.tsx` (new):
  - `Skeleton` (a block with `rounded-control` and a shimmer)
  - presets `SkeletonText` (n lines), `SkeletonCard` (a glass card with a title and lines), and `SkeletonList` (n rows with an avatar and two lines)
  - the shimmer is a CSS gradient sweep added to `globals.css` as a utility; it falls back to a static block under `prefers-reduced-motion`
  - `role="status"` with an sr-only translated "loading" label
- `src/ui/loading-state.tsx`, `route-loading.tsx`:
  - render skeletons instead of text
  - `LoadingState` gets an optional `variant: 'list' | 'cards' | 'detail'` prop, defaulting to `'list'`, so the current call sites keep working
- Feature call sites: pass the variant that matches each screen, so the skeleton looks like the real content. This covers:
  - the dashboard
  - the players list
  - the inbox
  - billing
  - templates
  - the player home
  - nutrition
  - progress
  - the coach page
  - the profile tabs
  - the voice notes card

  Do not change any other logic in those files.
- `src/ui/toast.tsx` (new):
  - a `ToastProvider`, mounted once in `src/app/[locale]/layout.tsx`, and a `useToast()` hook with `success(text)` and `error(text)`
  - glass surface (`glass-strong`), bottom-centred above the bottom nav, with safe-area insets
  - enters with the `enter` utility from T-032 and leaves with a fade
  - closes on its own after 4 s (6 s for errors), pauses while hovered or focused, and has a translated close button
  - a stack of at most 3 toasts
  - `aria-live="polite"` for success and `role="alert"` for errors
  - inject `now` and timers so the tests are deterministic (fake timers)
- Feature call sites: replace the inline success notices («اتحفظ», «اتبعتت» and the like, the ones that appear and then sit on screen) with `toast.success(...)`, in:
  - program save and activate
  - nutrition save
  - inbox review sent
  - payment recorded
  - player renewed
  - template copied
  - custom food saved
  - voice note sent

  Keep inline errors next to form fields; use `toast.error` only for action-level failures.
- `src/app/globals.css`, type hierarchy:
  - `h1`–`h3` and the card titles use `font-bold` in the ink colour
  - secondary text and notes use `text-muted` with `font-medium`
  - if `text-muted` (#b5bbc1) is too bright compared with the requested "white at 60%", add a token `--color-subtle` that is ink at 60%, and use it for notes and captions only; it must still pass `src/ui/contrast.test.ts` in both themes
  - no raw `text-white/60` in components
- `src/ui/messages.ts`: strings for "loading", "close notification" and the like.
- Tests: `src/ui/ui.test.ts` (skeleton presets render with status semantics; toast queue, auto-dismiss, pause, the max of 3, and the roles) and contrast tests for any new token.

## Requirements
1. No new dependencies.
2. RTL logical properties; the toast is centred, so this is safe.
3. Toasts never cover the primary action button or the bottom nav.
4. The perf budget still passes: the toast provider is tiny and has no heavy imports.
5. Do not change data or business logic.

## Acceptance
- [ ] No plain loading text is left anywhere a list, card or detail view is loading.
- [ ] Success actions show a glass toast that rises from the bottom and closes on its own.
- [ ] Headings and secondary text follow the hierarchy, and contrast tests pass.
- [ ] `npm run check`, `npm run build` and the perf budget test pass.

## Out of scope
- Changing fonts.
- The marketing landing page.
