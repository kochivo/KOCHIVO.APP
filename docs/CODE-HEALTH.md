# Code health review before the gym trial

Reviewed on 2026-11-03 against `AGENTS.md`, `docs/ARCHITECTURE.md`, T-025, and the GIF requirements in `docs/LEGACY-AUDIT.md`. This is a static source review: no application code or tests were changed. Line numbers refer to the reviewed tree. Findings about runtime behavior below are source-traced, not browser reproductions.

Search scope: `src/`, executable files in `public/` and `scripts/`, and `supabase/tests/`. Reviewed route files, feature import/export declarations, player write paths, UI state branches, and matching helper/test implementations. `rg` is unavailable here; searches used PowerShell `Select-String` and UTF-8 file reads. No new tools or dependencies were installed.

Severity: **high** blocks users or violates a material user/security rule; **medium** makes changes or reliable validation harder; **low** is cosmetic or small maintenance drift.

## Summary

| ID | Severity | Area | File (primary evidence) | Title |
|---|---|---|---|---|
| CH-01 | high | Workout / async state | `src/features/workout/hooks/use-focus-session.ts:104` | A new workout stays in loading before its first set |
| CH-02 | high | Training dates | `src/features/workout/components/focus-screen.tsx:26` | Focus mode can keep yesterday's training date after resuming |
| CH-03 | medium | Database contracts | `src/types/database.ts:13` | Placeholder schema causes repeated local schemas and client casts |
| CH-04 | medium | Duplication | `src/features/player-home/week.ts:13` | Calendar, formatting, WhatsApp, error and cache helpers have parallel copies |
| CH-05 | medium | Clock injection | `src/features/billing/data/billing.ts:36` | Five server actions/readers own clocks inside business logic |
| CH-06 | medium | Structure | `src/app/(player)/player/page.tsx:9` | Routes own data policy; one feature test imports the app layer |
| CH-07 | medium | Test determinism | `supabase/tests/harness.ts:70` | SQL test fixtures and expiry checks depend on the real database clock |
| CH-08 | low | Arabic UI | `src/features/player-home/components/greeting.tsx:6` | English headings, dates and units remain in Arabic screens |
| CH-09 | low | UI tokens / contrast | `src/ui/stepper.tsx:30` | Shared controls bypass color tokens; two focus panels use ordinary glass |
| CH-10 | low | Type safety | `src/core/offline/sync.ts:52` | Eight non-null assertions have no safety explanation |
| CH-11 | low | Leftovers | `src/features/player-home/components/today-card.tsx:22` | Three TODOs include one obsolete handoff and two unfinished product details |

## Findings

### CH-01 — New workout cannot reach its first set

**Evidence:** `src/features/workout/hooks/use-focus-session.ts:37`–`41` returns `null` after a successful lookup with no session. At line 104, `Boolean(day && (!session || !sets))` treats that loaded `null` as loading. `src/features/workout/components/focus-screen.tsx:46`–`60` renders the loading branch instead of the controls. The session is only created by `complete()` at hook line 79, which requires the hidden button.

**Rule/impact:** AGENTS §4 requires meaningful async states; architecture §4/§6 requires immediate local recording. A valid day with no existing session cannot start through this UI.

**Smallest fix:** Test `session === undefined` for pending lookup, accepting `null` as a loaded new session. Extend `src/features/workout/workout.test.ts:214`: its existing missing-session test checks only the read-only query result (lines 234–246), discarding the returned hook state. Assert `loading === false`, controls enabled, and first completion creates/queues the session and set with an injected timestamp.

### CH-02 — Focus mode does not refresh its day on resume

**Evidence:** `src/features/workout/components/focus-screen.tsx:26`–`30` computes Cairo `today` at mount and on online/offline events only. Unlike `src/features/player-home/components/home-screen.tsx:37`–`38` and `src/features/nutrition/hooks/use-nutrition-snapshot.ts:51`–`52`, it never updates on focus or visibility change. `src/features/workout/hooks/use-focus-session.ts:79` passes that retained date to `startSession`; `src/features/workout/data/log-set.ts:5` and `:10` use it for both the stable ID and `training_date`.

**Rule/impact:** AGENTS §3 and architecture §6 require the local training date to determine the session. Keeping a workout tab open overnight and reopening it without a connectivity change can record the next workout against the previous date/session. This matters for history and day rotation.

**Smallest fix:** Refresh the Cairo day on focus/visibility recovery, with a defined policy for an in-progress workout crossing midnight. Add a fixed-clock resume regression covering a new session after midnight; do not use a real timer. A shared injected day source could also prevent stale dates while a tab remains continuously visible.

### CH-03 — Shared database types remain a placeholder

**Evidence:** `src/types/database.ts:1`–`18` explicitly remains a placeholder with no table definitions. Three literal `ReadTable` definitions exist at:

- `src/features/player-home/data/program-snapshot.ts:18`.
- `src/features/player-preview/data/preview.ts:14`.
- `src/features/player-shell/data/my-captain.ts:10`.

Equivalent `Table` definitions are repeated in `src/features/admin/types.ts:28`, `src/features/billing/data/client.ts:6`, `src/features/inbox/data/client.ts:8`, `src/features/meal-plans/data/client.ts:14`, `src/features/programs/types.ts:17`, `src/features/roster/data/client.ts:9`, `src/features/settings/data/settings.ts:9`, and `src/features/templates/types.ts:4`.

Feature client wrappers repeat `supabaseServer() as unknown as SupabaseClient<LocalSchema>`: `authClient` (`src/features/auth/data/auth-client.ts:21`), `captainClient` (`src/features/billing/data/client.ts:22`–`24`), `inboxClient` (`src/features/inbox/data/client.ts:19`–`21`), `planClient` (`src/features/meal-plans/data/client.ts:30`–`32`), and `rosterClient` (`src/features/roster/data/client.ts:21`–`23`). Similar inline casts occur in admin, onboarding, programs, preview, player-shell, progress and templates data files.

**Rule/impact:** Architecture §3 places generated database types in `src/types/database.ts` and Supabase clients in `core/supabase`. Parallel handwritten contracts hide schema drift behind double casts and multiply every schema change. This is maintenance/type-contract debt, not evidence that RLS is bypassed.

**Smallest fix/home:** Replace the placeholder with schema-matching generated types in `src/types/database.ts`, keep typed browser/server construction in `src/core/supabase`, then remove local table/schema copies and casts incrementally. Keep domain authorization checks in the features. If generated types are temporarily unavailable, put one shared table-shape helper in `src/core/supabase/types.ts`; that alone does not validate the handwritten schemas.

### CH-04 — Repeated cross-feature helpers

**Rule/impact:** T-025 duplication check; architecture §1/§3 assign shared pure functions to `lib/` and infrastructure to `core/`. These are change-cost findings, not a requirement to combine unrelated domain behavior.

| Copies and exact evidence | Smallest fix / proposed home |
|---|---|
| Saturday-week arithmetic: `buildWeek`, `src/features/player-home/week.ts:13`–`18`; `activityWeek`, `src/features/player-preview/week.ts:7`–`12`; week boundary helper `weekStart`, `src/features/progress/week.ts:2`–`6`. | Share a pure Saturday-week date generator in `src/lib/dates.ts`; retain workout states and meal counts in each feature. |
| Arabic date formatters: `reminderText`, `src/features/billing/renew.ts:14`; local `formatDate`, `src/features/player-shell/components/captain-screen.tsx:11`–`14`; inline subscription date, `src/features/roster/components/roster-row.tsx:52`; `endsLabel`, `src/features/admin/format.ts:13`; deletion date, `src/features/settings/components/delete-account-card.tsx:32`; preview dates, `src/features/player-preview/components/preview-week.tsx:8` and `preview-screen.tsx:45`. | Add date-only and timestamp display helpers with explicit locale/options in `src/lib/dates.ts`. Preserve UTC parsing for date-only values and Cairo conversion for timestamps. |
| Calorie number formatting: `src/features/nutrition/components/macro-ring.tsx:14`–`15`; `src/features/player-home/components/nutrition-slot.tsx:17`, both use `toLocaleString('en-US')`. | One number formatter in `src/lib/format.ts`, with an explicit numeral policy. Arabic date formatting is the broader duplication above; no second Arabic-number conversion helper was found. |
| Phone sanitization / links: `waLink`, `src/features/billing/renew.ts:19`–`21`; `whatsappUrl`, `src/features/player-shell/access.ts:11`–`13`; inline support URL, `src/features/auth/components/suspended-screen.tsx:4`–`10`; `whatsappShareUrl`, `src/features/roster/invite.ts:9`–`10`; `radarWhatsappUrl`, `src/features/roster/radar.ts:30`–`34`; marketing URL, `src/features/marketing/content.ts:64`. | `src/lib/whatsapp.ts`: optional phone and optional encoded message, including share-only URLs. Keep message text and configured numbers in their features. Radar currently checks only raw phone presence, so punctuation-only input becomes a share URL instead of a disabled contact. |
| Error-code classification: `authError`, `src/features/auth/errors.ts:15`; `actionError`, `src/features/admin/format.ts:17`; `errorMessage`, `src/features/templates/data/templates.ts:19`; inline renewal mapping, `src/features/billing/data/billing.ts:23`; activation mapping, `src/features/programs/data/activate.ts:14` and `src/features/meal-plans/data/activate.ts:9`. | Share safe code extraction and common permission/missing-row classification in `src/core/supabase/errors.ts`. Keep auth, billing and activation-specific Arabic messages local; code `22023` has different domain meanings. |
| Snapshot refresh scaffolding: `refreshSnapshot`, `src/features/player-home/data/refresh-snapshot.ts:11`–`20`; `refreshNutrition`, `src/features/nutrition/data/refresh-nutrition.ts:11`–`19`, repeat online guard, injected fetch/DB, put/delete and result states. | A small typed cache-refresh helper in `src/core/offline/refresh-snapshot.ts`; keep fetching/mapping and table selection feature-owned. |

### CH-05 — Business logic reads the wall clock internally

**Evidence:** No `now` input or injected clock is accepted by:

- `fetchBilling`, `src/features/billing/data/billing.ts:36`: derives the subscription query timestamp and player statuses.
- `saveIntake`, `src/features/onboarding/data/save-intake.ts:9`: derives age validation and completion time.
- `createInvite`, `src/features/roster/data/create-invite.ts:17`: calculates access expiry.
- `archivePlayer`, `src/features/roster/data/archive-player.ts:14`: writes archive time.
- `reviewItem`, `src/features/inbox/data/inbox.ts:60`: writes review time.

Other UI clock consumers include `src/features/player-shell/components/player-shell.tsx:17` and `captain-screen.tsx:18` (access status during rendering), `src/features/onboarding/components/intake-wizard.tsx:24` and `hooks/use-intake-draft.ts:34` (validation), and the UI event/effect boundaries in home, nutrition, progress, export, install and workout. Workout/rest logic also reads `Date.now()` in `src/features/workout/hooks/use-focus-session.ts:70`, `:77`, `:96` and `use-rest-timer.ts:17`, `:29`, `:35`, `:52`–`53`; install policy inputs are captured at `src/features/install/hooks/use-install-prompt.ts:32` and `:71`.

**Rule/impact:** AGENTS §3/§6 require clock injection for deterministic logic. The five server functions require global clock mocking to test date boundaries. Tests do freeze their clocks where needed; this is an injection gap, not a claim that those tests currently use live dates. UI clocks captured at an event boundary and passed into already-pure functions are not independently defects; CH-02 identifies the concrete lifecycle failure.

**Smallest fix:** Extract clock-dependent work into internal functions accepting `now`, with server actions capturing trusted server time once before calling them. Do not expose client-controlled timestamps for authoritative server writes. Keep UI clock acquisition at boundaries and inject the clock into lifecycle tests.

### CH-06 — Layer and route responsibilities drift

**Evidence:**

- `src/app/(player)/player/page.tsx:9`–`18` directly queries a profile, extracts a first name and defines the failure fallback. This is feature data/mapping policy.
- `src/app/(player)/player/workout/[dayId]/page.tsx:6`–`12` owns session lookup and the offline failure policy. It repeats the authentication lookup in the home route.
- `src/app/(player)/player/onboarding/page.tsx:7`–`13` chooses the submitted/error branches. Keep the framework redirect in the route, but move feature-specific status/error mapping behind a feature API.
- `src/features/marketing/marketing.test.ts:4` imports `../../app/page`, reversing the `app -> features` dependency. The alias-based ESLint boundary patterns do not cover this relative import.

**Rule/impact:** AGENTS §2 and architecture §1/§3 require thin routes and one-way dependencies. Route-bound data policy is harder to reuse and test; app composition changes can break a feature's tests.

**Smallest fix:** Move home/workout identity/profile loading into feature `data/` APIs exposed through `index.ts`, preserving existing offline fallbacks. Move the page-composition test out of the feature, or test feature composition directly. Search-param parsing, framework redirects/not-found, Suspense wiring and calls to feature APIs in the other routes are appropriate route work; `src/app/admin/page.tsx:10`–`19` has no independent business algorithm to extract.

### CH-07 — SQL tests use real dates and timestamps

**Evidence:** `supabase/tests/harness.ts:69`–`72` implements `dayOffset` using live `current_date`; `createTestDb` at line 33 does not freeze the database clock. Explicit live-clock fixtures/checks occur at:

- `supabase/tests/rls-admin.test.ts:51`–`54`, `:74`, `:80`–`81`, `:94`, `:121`, `:169`, `:172`, `:176`–`177`, `:184`.
- `supabase/tests/rls-auth-roles.test.ts:24`, `:37`, `:46`–`47`.
- `supabase/tests/rls-content-per-captain.test.ts:87`, `:90`, `:93`, `:113`.
- `supabase/tests/rls-intake.test.ts:113`; `supabase/tests/rls-nutrition.test.ts:25`.
- `supabase/tests/rls-player-payments.test.ts:31`–`32`, `:51` (its renewal calculations at lines 17–21 do freeze SQL today).
- `supabase/tests/rls-sec-fixes.test.ts:76`, `:153`.
- `supabase/tests/rls-settings.test.ts:15`, `:38`–`39`, `:50`; `supabase/tests/rls-storage.test.ts:42`.
- `supabase/tests/rls-suspension.test.ts:30`, `:32`, `:36`, `:58`, `:68`, `:88`.
- `supabase/tests/rls.test.ts:13`, `:122`, `:130`, `:134`.

**Rule/impact:** AGENTS §6 requires deterministic dates. Relative SQL fixtures generally remain valid today, but calls in separate transactions can cross a date boundary. These tests also cannot replay the same expiry boundary independently of execution time. No current test failure is inferred from these uses.

**Smallest fix:** Freeze the time-sensitive SQL expressions in each isolated test database using a fixed test clock, following the existing payment test's function-definition substitution pattern where suitable. Reuse the clock through the harness; freeze both tested functions and fixtures, rather than changing production behavior or only replacing fixture dates.

### CH-08 — English user-facing copy remains

**Evidence:** English weekday/month output in `src/features/player-home/components/greeting.tsx:6`–`9`; `DAY` in `today-card.tsx:16`; `KCAL` in `src/features/nutrition/components/macro-ring.tsx:15`; `ROSTER` in `src/features/roster/components/roster-screen.tsx:34`; `INBOX` in `src/features/inbox/components/inbox-screen.tsx:66`; `CAPTAIN` in `src/features/player-shell/components/captain-screen.tsx:21`; `PROGRESS` in `src/features/progress/components/progress-screen.tsx:93`; `TEMPLATES` in `src/features/templates/components/templates-screen.tsx:56`; `NEXT` in `src/features/workout/components/next-up.tsx:5`; `REST` in `rest-panel.tsx:10`.

Marketing also has English labels in `src/features/marketing/content.ts:12`–`13`, `:19`–`20`, `:29`, `:37`, and an English accessible headline at `src/features/marketing/components/slogan.tsx:5`. The brand, plan names, required GIF credit, and fallback exercise names are not counted as untranslated application chrome.

**Rule:** AGENTS §4 requires short Egyptian Arabic user-facing strings.

**Smallest fix:** Translate/remove decorative English labels, format greeting dates with `ar-EG`, and use an Arabic accessible headline. Preserve brand/plan identifiers and required attribution.

### CH-09 — Token and focus-panel styling drift

**Evidence:** `src/ui/button.tsx:9`–`10` uses `hover:bg-white/10` and `/5`; `src/ui/stepper.tsx:30` and `:42` use `bg-white/10 active:bg-white/20`. These use Tailwind's white color rather than project theme tokens. `src/features/workout/components/exercise-header.tsx:8` and `next-up.tsx:4` use `glass` for focus-mode panels.

**Rule:** AGENTS §4 requires theme-token colors and `glass-strong` on focus-mode panels.

**Smallest fix:** Use project surface/overlay tokens for hover/active states and `glass-strong` for those panels. Main weight/reps, rest and completion panels already use strong glass. No component hex-color finding was confirmed; metadata colors are discussed in the clean list.

### CH-10 — Non-null assertions lack safety explanations

**Evidence:** `src/core/offline/sync.ts:52`, `:61`, `:63` assert persisted outbox IDs. `supabase/tests/harness.ts:52`, `:71` and `supabase/tests/rls.test.ts:30`, `:36`, `:39` assert SQL result rows. None has a comment explaining why that particular assertion is safe. The nearby sync comment describes revision handling, not ID presence.

**Rule:** AGENTS §5 forbids unexplained non-null assertions. The persisted-ID invariant is plausible; this is not evidence of a crash in normal operation.

**Smallest fix:** Narrow/assert required IDs/rows once with a descriptive failure, or document the persistence/RETURNING invariant beside each justified assertion. `text-danger!` is Tailwind syntax and was excluded.

### CH-11 — TODO inventory

- `src/features/player-home/components/today-card.tsx:22`: obsolete T-006 handoff comment; the workout route now exists. Remove the comment.
- `src/features/marketing/components/hero.tsx:16`: demo still links to login via `src/features/marketing/content.ts:9`, while line 12 promises a one-click demo. Use honest login/preview wording until the deferred demo exists; do not build a new demo in a cleanup card.
- `src/features/admin/components/kpi-row.tsx:8` and `:13`: pending activation is hard-coded to zero while its payment-request workflow is absent. Show an unavailable state or omit that KPI until the workflow exists, so zero is not presented as measured data.

**Rule/impact:** T-025 explicitly asks for leftover TODOs. Architecture §1 requires clear responsibilities; misleading placeholders should have explicit follow-up ownership. The latter two are known unfinished scope, not dead components, and remain untouched here.

## Clean checks and coverage limits

- **File size:** No `src/` file exceeds 250 physical lines. Files at or above 220: `src/features/workout/workout.test.ts:248` (248 lines), `src/features/auth/auth.test.ts:231` (231), `src/features/onboarding/onboarding.test.ts:226` (226). These are growth watchpoints, not current violations. ESLint ignores blank/comment lines and exempts tests; raw counts were checked separately.
- **Components/API files:** No file with multiple exported React components was found. Helper exports alongside a component were not miscounted as extra components. Feature `index.ts` files contain public re-exports rather than implementations.
- **Import boundaries:** No deep imports across features, including relative cross-feature paths, or `core/`, `ui/`, `lib/` imports from features were found. Cross-feature imports use public barrels. The separate feature-to-app test violation is CH-06.
- **Player offline writes:** `src/features/workout/data/log-set.ts:12`, `:23`, `:32` and `src/features/nutrition/data/log-meal.ts:13` use `saveAndQueue`; IDs derive from `stableId` via workout ID helpers or directly for meals. Server queries of session/meal history in preview are reads. `src/core/offline/transport.ts:13` is the intended queued RPC transport. No direct player Supabase write to the three log tables was found. Network check-in writes are a separate domain, not misreported as meal/session bypasses.
- **Random/date anti-patterns:** No `Math.random` or `toISOString().slice(0,10)` variant was found in executable app/public/script code. `new Date(value)` parsing and injected `new Date(now)` calls were distinguished from live-clock acquisition. Training/log dates use `localDate`; CH-02 concerns when it is refreshed.
- **RTL:** No physical `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right` utilities or directional inline margin/padding/position properties were found in components. `pr-*` personal-record names were excluded.
- **Hex colors:** No hard-coded component styling hex values were found. Hex values are present in the central CSS and browser/PWA metadata (`src/app/layout.tsx:22`, `src/app/manifest.ts:13`–`14`), matching the background theme. Metadata requires a literal CSS color and is not rendered component styling. Non-token white utilities are CH-09.
- **Accessibility/states:** Reviewed icon-only button call sites and shared controls; Arabic accessible labels were present. Reviewed collection/picker branches and async screens for loading/error/empty handling; no missing collection empty state was confirmed. Seven-day strips and fixed option lists are populated by construction. Radar's empty `null` branch is explicitly required by T-009b, not a missing state. The workout's incorrect loading state is CH-01. This was source review, not a full browser accessibility or touch-target audit.
- **GIF credit:** Browsable exercise picker (`src/features/programs/components/exercise-picker.tsx:34`), player preview (`src/features/player-preview/components/preview-program.tsx:26`), workout GIF (`src/features/workout/components/exercise-header.tsx:12`), and marketing footer content (`src/features/marketing/content.ts:61`) contain `© Gym visual`.
- **Type/style prohibitions:** No explicit TypeScript `any`, `@ts-ignore`, or `console.log` was found in executable app/public/script/test files. `expect.any(...)` and English prose containing “any” were excluded. Non-null assertions are CH-10.
- **Feature test presence:** All 18 feature directories have at least one test file. Presence is not behavioral coverage: CH-01 identifies an existing regression test that misses the hook's loading result.
- **Test clocks/network:** No explicit live JS `new Date()`/`Date.now()` or real timer scheduling was found in test bodies. Fixed dates, fake timers/system-time mocks, local PGlite, and mocked Supabase/Storage calls were distinguished from network access. No real network call was found. SQL clocks remain CH-07. No `it.fails`/`test.fails` was found.
- **Dead code:** No confidently unused React component or wholly unreferenced function implementation was found after checking declarations, barrels, consumers and tests. Framework exports (`GET`, `viewport`, `dynamic`) are framework entry points. Some helpers are exported only for tests or used locally (for example `captainLinks`); these were not padded into dead-code findings. Static searches do not prove production reachability of every export.
- **Security scope:** No full RLS/security scan or database schema changes were performed; this report covers the requested code-health checks.

## Verification

- `npm run check` was invoked through `npm.cmd` because PowerShell blocks `npm.ps1`. Typecheck and ESLint passed; the default Vitest config loader then failed with `Error: spawn EPERM`.
- Required fallback `npm.cmd run test -- --configLoader native --pool threads` started but exhausted worker memory (`Allocation failed - JavaScript heap out of memory`). Retried with `--maxWorkers 1`: **Test Files 54 passed (54); Tests 694 passed (694)**. The unmodified default check command cannot be reported as passing in this sandbox.
- `npm.cmd run build`: **Compiled successfully in 11.3s**, then **Running TypeScript ... / spawn EPERM**; exit 1. This is a process-spawn limitation, not a Google Fonts fetch failure. Standalone `tsc --noEmit` already passed in the check gate. Reviewer should rerun both default gates outside this sandbox.
- Only `docs/CODE-HEALTH.md` was intentionally added; application code, tests, configuration and migrations remain unchanged.
