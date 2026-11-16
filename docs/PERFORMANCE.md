# T-027g mobile polish and performance

## T-027h — player import boundaries

The public environment validator no longer imports the Zod runtime. Its URL
acceptance, whitespace handling, minimum key length, error name/message/issues,
and lazy successful-result cache are compared against the previous schema in
`src/core/config/env.test.ts`. Environment failures are ordinary Error instances
with the same diagnostic fields; they are no longer Zod class instances. No
repository caller inspects the error prototype or uses Zod error methods.

Player snapshot refreshes dynamically import their fetch/validation modules only
inside the online fetch callback. Zod program-settings parsing is unchanged.
Supabase loads through an async adapter which reuses the existing browser
singleton. Nutrition authentication, progress requests and workout background
sync await that adapter; effect cleanup prevents a late import from starting a
subscription or sync loop after unmount. Media sync loads the client only when
online and there is queued media. Injected snapshot fetches and offline refreshes
do not load it. Existing snapshot, transaction and outbox semantics are retained.

Captain preview computes today's day in its server loader with the same
`pickTodayDay` function. The client no longer imports the player-home public API
at runtime merely to select the day. Arabic/English rendering fixtures and the
older-completion rotation test cover the added server result.

Dexie remains eager: player-shell renders InstallSheet, whose out-of-scope
`features/install/hooks/use-install-prompt.ts` imports the synchronous `localDb`
API. Player screens also need Dexie to read their cached first snapshot. Changing
that API globally would require callers outside this card. No database schema,
`saveAndQueue`, service-worker cache policy or offline tests were changed.

### Measured after T-027h (reviewer build, 2026-11-03)

Measured by the reviewer from a completed production build, the same way the
budget test does. The reviewer also removed Zod from `features/demo/data/demo-profile.ts`
(plain checks with the same rules) and made the captain preview compute macros with
`lib/macros` directly instead of importing the nutrition feature.

| Route (without `/[locale]`) | Before gzip KiB | After gzip KiB | Guard KiB |
| --- | ---: | ---: | ---: |
| `/player` | 342.33 | 245.48 | 300 |
| `/player/captain` | 335.98 | 239.58 | 300 |
| `/player/nutrition` | 327.96 | 231.94 | 300 |
| `/player/progress` | 324.77 | 228.54 | 300 |
| `/player/onboarding` | 324.43 | 258.15 | 300 |
| `/player/workout/[dayId]` | 344.08 | 278.02 | 300 |
| `/player/settings` | 344.06 | 342.42 | 345 |
| `/demo` | 282.98 | 253.19 | 280 |
| `/captain/players/[playerId]/preview` | 351.15 | 350.79 | 355 |

### Follow-up (reviewer, 2026-11-03): the two misses closed

- `/player/settings`: `deletionDate` moved out of the Zod schema module into
  `features/settings/deletion.ts`, and `DemoBanner` signs out through
  `loadSupabaseBrowser()`, so the `@/features/demo` barrel no longer pulls the
  browser Supabase client eagerly.
- Captain preview: the Dexie chunk came from `core/storage/private-media.ts`, which
  imported `uuidv7` through the `@/core/offline` barrel. It now imports
  `@/core/offline/ids` directly.

| Route (without `/[locale]`) | After gzip KiB | Guard KiB |
| --- | ---: | ---: |
| `/player/settings` | 244.08 | 300 |
| `/captain/players/[playerId]/preview` | 283.24 | 310 |
| `/captain/settings` | 234.66 | 310 |
| `/demo` | 186.88 | 280 |

Every route is now within its default target, so the exceptions map is empty.

---

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

## T-155 — restore route budgets (2026-11-10)

The table uses completed Turbopack builds and the gzip calculation in
`src/lib/perf-budget.test.ts`. Before values were reproduced locally before
implementation. Public feature imports remain through `index.ts`; small client
entries split the screens that server barrels previously included merely to
read a message, constant, or server loader. Default SSR is retained for auth,
coach controls, generator, progress, supplements, and ranking entries. The
already client-only intake and dev preview use the existing loading state;
the floating KO widget uses no fallback, matching its existing launcher wrapper.

| Route (without `/[locale]`) | Before gzip KiB | After gzip KiB | Budget KiB |
| --- | ---: | ---: | ---: |
| `/admin` | 262.34 | 195.19 | 200 |
| `/c/[slug]` | 202.38 | 193.22 | 200 |
| `/login` | 200.97 | 197.68 | 200 |
| `/forgot-password` | 200.97 | 197.68 | 200 |
| `/reset-password` | 200.97 | 197.68 | 200 |
| `/i/[code]` | 200.97 | 197.68 | 200 |
| `/suspended` | 200.97 | 197.68 | 200 |
| `/captain/players/[playerId]/programs` | 415.86 | 291.84 | 310 |
| `/captain/programs/[programId]` | 349.65 | 277.24 | 310 |
| `/captain/nutrition/[planId]` | 342.35 | 270.32 | 310 |
| `/captain/players/[playerId]/nutrition` | 342.35 | 270.32 | 310 |
| `/captain/templates` | 334.16 | 260.47 | 310 |
| `/captain/players/[playerId]` | 314.98 | 232.66 | 310 |
| `/captain/players/[playerId]/preview` | 312.95 | 277.54 | 310 |
| `/player` | 319.40 | 277.85 | 300 |
| `/player/rank` | 319.40 | 277.85 | 300 |
| `/player/progress` | 329.33 | 284.13 | 300 |
| `/player/captain` | 324.54 | 283.01 | 300 |
| `/player/settings` | 325.67 | 284.15 | 300 |
| `/ko` | 328.58 | 198.95 | 200 |
| `/dev/ko` | 253.11 | 181.02 | 200 |

Supabase now loads through the existing singleton adapter inside the admin
waitlist effect and generator's open-sheet effect. Late imports cannot start a
query after cleanup. Rank and feed validators retain their exact Zod schemas in
small modules imported when data is requested. Importing the full Zod namespace
dynamically was avoided because that prevents pruning unused exports. The
optional digest loader is deferred separately and catches chunk-load failures.

The budget guard passes for every diagnostic route, not only this table. Its
budgets and empty exceptions map are unchanged. Existing screen/data suites cover
the deferred screens; `features/ranks/lazy-validation.test.ts` additionally proves
that importing loaders does not initialize Zod and that requested data is still
validated. No offline-write, schema, service-worker, Sentry, or font changes were
made.

Local Windows verification requires the documented native Vitest loader/thread
fallback. Next's worker threads and TypeScript API checker were enabled only in
a temporary process preload, with placeholder public Supabase build values;
no repository configuration or environment files were changed. The release audit
used the unchanged script with its `git ls-files -z` input captured by the shell,
because Node child-process execution is denied here. Temporary helpers are
removed from the final diff.

Verification: production build exit 0; budget test **1 passed**; combined check
passed TypeScript, ESLint, release audit (**1747 tracked files, 0 findings**),
and Vitest (**437 test files, 3142 tests**). The combined command was
`npm run check -- -- --configLoader native --pool threads --maxWorkers 2`,
with the temporary audit-input preload described above. Independent review found
no remaining important issues. Browser/device QA was not run for this import-only
change.

## Budget exception — `/c/[slug]` (2026-11-14)

The public coach page measured 199.84 KiB before the captain v11 work and
199.94 KiB locally after it; the CI build measured just over 200 KiB. The
growth came from shared code, not the page itself. Owner decision 2026-11-14:
allow this route up to **205 KiB** in `src/lib/perf-budget.test.ts` so the
release can ship, and trim the page back under 200 in a follow-up card.

## Budget exception — program builder routes (2026-11-14)

The v11 captain frame (T-238: grouped sidebar with live counters, top bar
with search and page slots, mobile more sheet) adds about 3.6 KiB gzip to
every captain route. The two program builder routes were already at 307.7
KiB and measured 311.3 KiB after it. They may grow to **315 KiB** in
`src/lib/perf-budget.test.ts`; every other captain route keeps 310.
Measured with a full Turbopack build (fonts served from a local copy of the
Google Fonts CSS because fonts.googleapis.com was unreachable).

## Bundle bleed fix (2026-11-14)

A feature's `server.ts` or `index.ts` re-export pulled every client component
it could reach into each route that imported it, even ones the route never
renders.
- `src/features/captain-workspace/package.json` and
  `src/features/notifications/package.json` set `"sideEffects": false` so
  unused re-exports are dropped. Tasks went from 275.9 to 242.7 KiB and
  templates from 272.2 to 242.3.
- The notifications page components no longer add about 5 KiB to every route.
- Server loaders in other features read nutrition, ranks and program helpers
  through those features' `server.ts` (server-only leaves), not their UI
  barrels.
- `/captain/players/[playerId]/programs` measured 314.1 KiB, so it keeps the
  315 limit of the program builder routes.

Before adding a client component to a barrel that layouts or shells import,
check whether that feature needs the same `sideEffects` flag.

## Login and welcome ceiling (2026-11-14)

After T-252 (automatic language), `/[locale]/login` and `/[locale]/welcome` measured 199.93 KiB locally and 200.003 KiB in CI. CI measures slightly more because its public env values differ. T-252 removed client code overall, so the extra bytes come from chunk splitting, not from a new feature.

Both routes now have a ceiling of 201 KiB in `src/lib/perf-budget.test.ts`.

Follow-up: trim the public pages back under 200 KiB, then drop this exception and the `/c/[slug]` one. A good place to start is the shared `src/ui/messages.ts` dictionary: it is duplicated into 16 chunks, and the compact language switch needs only four of its strings.

## Budget exception — `/offline` (2026-11-15)

The offline page carries the whole workout screen. Before T-307 it measured
195.8 KiB; after T-307 (medal ranks and finish points) and T-309 (exercise
video inside the app) it measured 203.8 KiB. The video player, its sheet and
its strings already load only when a video is opened; the rest is shared
workout code. Owner decision 2026-11-15: allow this route up to **206 KiB** in
`src/lib/perf-budget.test.ts`, as long as the workout stays fast and smooth.

## Budget exception — captain player program tab (2026-11-16)

`/captain/players/[playerId]/programs` measured 316.2 KiB after T-319 (audit
fixes) and T-321b (rank share image). None of their new code is in this
route's first-load chunks; the 1.2 KiB came from shared chunks splitting
differently. The route may grow to **317 KiB**; the program builder route
keeps 315.
