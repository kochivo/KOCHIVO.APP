# T-027g mobile polish and performance

Measured on 2026-11-03 with Next 16.4.4 / Turbopack and Node 22.23.4.
The before column comes from the existing build diagnostics read before edits;
it agrees with the reviewer's rounded baseline. The after column comes from a
successful production build of this change. Sizes are gzip KiB (1024 bytes),
rounded to two decimals, not transfer measurements or uncompressed bundle sizes.

## Measurement and budgets

For every entry in `.next/diagnostics/route-bundle-stats.json`, sum
`zlib.gzipSync(readFileSync(chunk)).length` over `firstLoadChunkPaths`, then divide
by 1024. Paths in the file are relative to the repository, with Windows separators.
The test normalizes separators for other operating systems. No HTML, CSS, font,
media, or source-map bytes are included. Do not run the test during a build: a
partially replaced `.next` tree can contain stale diagnostic paths.

All paths below have the hidden `/[locale]` prefix except `/_not-found`. Both
locales use the same client chunks. The requested targets are 200 KiB for
marketing/auth, 300 for player routes, 310 for captain routes, and 280 for demo.
The guard column records the actual fixed test ceiling. Misses use the achieved
size rounded up to the next 5 KiB, as allowed by the reviewer addendum. Routes
without a specified target retain a conservative 200 KiB guard.

| Route | Before KiB | After KiB | Guard KiB |
| --- | ---: | ---: | ---: |
| `/` | 213.90 | 193.41 | 200 |
| `/login` | 209.86 | 189.43 | 200 |
| `/forgot-password` | 209.86 | 189.43 | 200 |
| `/reset-password` | 209.86 | 189.43 | 200 |
| `/i/[code]` | 209.86 | 189.43 | 200 |
| `/suspended` | 209.86 | 189.43 | 200 |
| `/demo` | 302.42 | 282.98 | 285 |
| `/player` | 362.87 | 342.33 | 345 |
| `/player/settings` | 362.58 | 344.06 | 345 |
| `/player/captain` | 356.54 | 335.98 | 340 |
| `/player/nutrition` | 348.52 | 327.96 | 330 |
| `/player/progress` | 345.48 | 324.77 | 325 |
| `/player/onboarding` | 344.99 | 324.43 | 325 |
| `/player/workout/[dayId]` | 364.21 | 344.08 | 345 |
| `/captain` | 315.84 | 296.79 | 310 |
| `/captain/settings` | 320.11 | 301.06 | 310 |
| `/captain/billing` | 320.70 | 301.66 | 310 |
| `/captain/templates` | 320.60 | 301.54 | 310 |
| `/captain/inbox` | 326.22 | 307.17 | 310 |
| `/captain/nutrition/[planId]` | 326.65 | 307.62 | 310 |
| `/captain/players/[playerId]/nutrition` | 326.65 | 307.62 | 310 |
| `/captain/players/[playerId]/programs` | 365.23 | 308.38 | 310 |
| `/captain/programs/[programId]` | 365.23 | 308.38 | 310 |
| `/captain/players/[playerId]/preview` | 369.88 | 351.15 | 355 |
| `/admin` | 203.42 | 185.16 | 200 |
| `/dev/ui` | 204.49 | 184.04 | 200 |
| `/offline` | 193.75 | 173.23 | 200 |
| `/_not-found` | 193.06 | 172.15 | 200 |

The callback route and web manifest have no first-load page-JavaScript entries
in these diagnostics. They are not fabricated as zero-byte page measurements.

## Shared floor and remaining misses

The 193.06 KiB floor includes Sentry, rather than Supabase or Dexie from the root
layout. `src/instrumentation-client.ts` eagerly imports the SDK on every route;
the global error boundary also imports error capture. In the initial optimized
build, the shared chunk containing Sentry code was 116.2 KiB, with another
14.4 KiB Sentry integration chunk. These are chunk sizes, not exclusive module
sizes; minified chunks can contain multiple modules.

All three Sentry runtime configs already set `tracesSampleRate: 0`, and no
performance-monitoring calls exist in application code. Setting
`bundleSizeOptimizations.excludeTracing` in `next.config.ts` removes unused
tracing code while preserving error reporting and privacy scrubbing. That shared
chunk is now 95.3 KiB, the integration chunk is 14.3 KiB, and the total floor is
172.15 KiB. Marketing and every auth route now meet their requested targets.
Moving SDK initialization after hydration would require changing
`src/instrumentation-client.ts`, outside this card's file allowlist; that part was
stopped rather than relocating initialization into a layout and changing capture
timing.

The remaining largest identifiable chunk groups on player/workout are:

| Chunk content | gzip KiB | Scope |
| --- | ---: | --- |
| Sentry-containing shared chunk | 95.3 | Every route |
| Supabase client / auth / realtime | 66.0 | Authenticated clients and demo |
| Dexie / IndexedDB | 32.2 | Player offline views and captain preview |
| Zod validation | 30.0 | Client configuration and validation |
| Sentry integration | 14.3 | Every route |

These figures identify code present in chunks; they are not an additive package
breakdown. Chunk hashes may change on the next build.

- **Every player route (324.43–344.08 KiB vs 300):** the player shell requires
  authenticated subscription state, and the screens retain their offline
  snapshots, writes, sync and validation. Removing these eagerly required parts
  changes offline/auth behavior. Refactoring their shared hooks and data layer
  is outside the allowed component files. Fixed ceilings are 325–345 KiB.
- **Captain preview (351.15 vs 310):** its public player-home API brings the
  player snapshot/offline dependency path in addition to the captain shell.
  Changing that public API or bypassing it with a deep feature import is outside
  this task's rules. Ceiling: 355 KiB.
- **Demo (282.98 vs 280):** the diagnostic first-load set still includes the
  66.0 KiB Supabase and 30.0 KiB Zod groups. Authentication starts on demand;
  changing the demo feature's public/data dependency structure is outside the
  file allowlist. Ceiling: 285 KiB.

Other captain routes meet 310 KiB. In particular, deferring the inline exercise
picker reduces program builder first load from 365.23 to 308.38 KiB.

## Mobile and loading changes

- The marketing header uses three mobile rows: logo/start action, compact
  language/theme/sign-in controls, then navigation. Desktop keeps the existing
  full language selector and actions. The toggle reuses existing translations.
- Shared controls keep visible keyboard focus, use manipulation touch behavior,
  and enforce at least 16px form text. Existing transparent tap highlighting is
  retained. Long roster/workout titles can shrink and truncate; program names and
  action links wrap. Stepper numbers scale down on narrow screens while the
  existing 76px buttons and 68px completion action remain.
- Bottom navigation accounts for safe areas. Shared modal styling supplies safe
  padding, contained overscroll and background-page scroll locking. A small
  visual-viewport listener sizes modals above the soft keyboard and scrolls the
  focused field into view; it does not change normal sheet positions when the
  keyboard is closed. Keyboard detection requires an editable field, unit zoom
  and an inset over 100px, so pinch zoom and browser-toolbar shifts do not move
  dialogs. Safe inline insets follow the document direction.
- Exercise browsing uses dimensioned inline static placeholders. Intersection
  observation enables lazy, async-decoded GIFs only in view; reduced motion keeps
  the static placeholder. The current focus-mode exercise loads eagerly.
  Existing Gym visual attribution remains. Private photos and public food media
  retain explicit dimensions and lazy/async attributes; private media bypasses
  the optimizer cache. Public food hosts vary by deployment and are not in its
  optimizer allowlist, so their existing plain image path is retained.
- `next/dynamic` splits progress charts/check-in UI, PR celebration, form-check
  capture, the exercise picker, Turnstile and admin tables/audit content. The
  picker remains an inline panel, matching the existing implementation, and is
  deferred until in view. Admin audit content is also visibility deferred.
  Turnstile chooses its compact layout below 300px of available widget space.
- Loading boundaries cover captain roster, player detail descendants, program
  builder and admin, using a shared translated skeleton. Hero previews and the
  slogan now resolve concurrently with `Promise.all`.

## Audited and retained

The root already uses `min-h-dvh` and `viewportFit: cover`; no `100vh` remains in
application source. The source scan found no input/textarea/select class using
`text-sm` or `text-xs`; the global minimum also covers small inherited labels.
No blanket horizontal clipping was added to hide layout problems.

Manrope uses the Latin subset; Alexandria and Changa use Arabic. These are
variable font files, not a list of separately downloaded static weights. The
existing variable font setup is retained rather than replacing it with multiple
static weights. Marketing motion remains CSS-only with reduced-motion rules.

The tested `glassBootScript` already selects solid surfaces before paint for
save-data, low memory and limited CPU devices. CSS already covers unsupported
backdrop filters and reduced transparency in both themes. Nested glass surfaces
now keep their tint/border but do not apply another backdrop filter. Client
components inspected for server conversion generally require locale context,
event handlers or live/offline state; existing server marketing/layout components
remain server components. No layout reads new cookies or headers; marketing,
offline and the previously static player routes remain SSG.

## Verification and remaining device work

Production build succeeds using Windows worker threads and the TypeScript API
checker, without disabling type checks. The ordinary Vitest config bundler hits
the sandbox's `spawn EPERM`; use the accepted fallback:
`npm run test -- --configLoader native --pool threads`. The budget test reads
the real completed build and skips via `it.skipIf` only when diagnostics do not
exist. TypeScript and ESLint also run independently.

Tests cover both compact language directions, requesting no GIF before visibility,
the static placeholder's accessible name, deferred rendering, keyboard viewport
resizing and cleanup, plus the existing application/RLS suites. An initial
player-preview assertion failed because it expected an image `alt`; the static
image placeholder now preserves that contract without fetching a GIF.

Final results: production build exit 0; `npm run check` passed TypeScript and
ESLint, then hit the expected Vitest config-loader `spawn EPERM`. The complete
native-loader/thread fallback passed **104 test files, 966 tests**, including
the real-build performance guard. No `it.fails` cases were added. A source scan
of 162 layout/component/CSS files found no `100vh` or small-font field classes.

The 360×740 and 390×844 browser/device matrix in both directions and themes has
**not been visually verified** in this environment. In particular, real iOS
keyboard panning, Android keyboard resize, landscape notches, long injected
names, and authenticated screen scroll widths still need device/browser QA.
No measured CLS/LCP/INP or physical low-end-device GPU timings are claimed.
