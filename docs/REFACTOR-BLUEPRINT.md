# KOCHIVO refactor blueprint (pre-KO phase)

Status: proposal, 2026-11-11. Audited at commit `89096356` on `master`. Read-only audit; nothing in `src/`
was changed. `npx tsc --noEmit -p .` passes on this tree. Bundle figures come from `docs/PERFORMANCE.md`
and `docs/tasks/T-155-bundle-budgets.md`; no build was run for this document.

Every statement about the current code below carries a path or a measured count. Statements marked
**(inference)** were reasoned, not measured.

---

## 0. Verdict

The request asked for a services layer, a fetching library, shared types and optimistic UI as if none existed.
Most of that already exists in this codebase. It was built for an offline-first PWA under strict bundle budgets,
and it is better suited to this product than the generic answer. The work is to tighten it, not replace it.

**Already right, keep it:**

- **Feature folders with `data/` modules are the services layer.** 41 features, 129 modules under
  `features/*/data/`, and routes stay thin: 36 `page.tsx` files, 551 lines in total, the largest 46 lines.
  Do not add `src/services/`.
- **Captain pages are server-rendered.** The page loads its data on the server: async Server Components and
  `server-only` loaders (26 modules with `import 'server-only'`, 49 with `'use server'`), with promises passed to
  the client and unwrapped by `use()` (`roster-screen.tsx:27`, `billing-screen.tsx:17`). This is the
  Next-native strategy, and it costs 0 KiB of client JavaScript.
- **Player writes are offline-first and correct.** Each write is one Dexie transaction for the row and the outbox
  (`core/offline/outbox.ts:10-31`). Ids come from `stableId`, conflicts resolve by last write, and the outbox
  is revision-safe (`core/offline/sync.ts:58-84`). This is the optimistic UI for the player side, and it is
  already more robust than anything a query library offers.
- **Import direction is enforced by ESLint** (`eslint.config.mjs`). Route budgets are enforced by CI after a
  real build (`.github/workflows/checks.yml:39-40`).

**The four things that matter most, in order:**

1. **The outbox has no poison-row handling** (verified). A row the server rejects forever, for example an RLS
   or check-constraint failure, is retried every 5 minutes for ever (`backoff.ts`). It also stops every later
   table in `SYNC_ORDER` (`sync.ts:36-38`). One bad `workout_sessions` row silently stops meal, supplement and
   daily-check sync for that player, and the pill says "saved" indefinitely (`ui/sync-pill.tsx` has no failure
   state). For a gym app this is the most serious reliability risk.
2. **Nothing structural prevents this week's bundle regressions from coming back.** The ESLint
   deep-import rule matches only `@/features/*/*`. 7 relative imports into other features' internals bypass it
   today. Shared surfaces (layouts, shells) are not checked until a full build runs the budget test.
3. **`src/types/database.ts` is not a generated file any more, and it has drifted.** 15 of 45 table entries
   and 50 of 76 function entries are hand-written one-liners. Some import from `@/core/offline/tables`. At
   least one is wrong: the `notifications.type` union has 7 values, and the database allows 16
   (`0086_crown_month_end_reminder.sql`). The cast at `features/notifications/data/notifications.ts:32` hides
   the gap.
4. **Client-side reads are hand-rolled about 30 times, with no shared cache.** 31 files have their own
   `let active = true` cancellation, and 28 have their own retry counter. Polling exists in 5 shapes, and
   focus plus `visibilitychange` both fire a refetch. There is one good in-house precedent
   (`features/ko-feed/hooks/use-ko-feed.ts`: module store, single-flight, ref-counted polling). Generalise it
   into one ~80-line primitive. **Do not add TanStack Query.**

Before more KO work, also break the KO feature cycle (section 1.4). Otherwise the next KO card will repeat the
c6789daf problem.

---

## 1. Folder structure: keep it and tighten three rules

### 1.1 What exists

`src/app → src/features/<name>/{index.ts, components/, hooks/, data/} → src/{ui,core,lib}`, as in AGENTS.md §2.
ESLint enforces two of the rules (`eslint.config.mjs`):

```js
const noFeatureImports     = { group: ['@/features/*', '@/features/**'] };   // core/ui/lib
const noDeepFeatureImports = { group: ['@/features/*/*', '@/features/*/**'] }; // app/features
```

Measured drift from the documented layout:

| Finding | Evidence |
| --- | --- |
| Relative imports bypass the deep-import rule | 7 lines: `app/[locale]/(captain)/captain/layout.tsx:6,8`, `captain/page.tsx:3,4`, `captain/billing/page.tsx:4,5`, `captain/players/page.tsx:3` (e.g. `'../../../../features/billing/data/dues'`) |
| Barrels re-export static client components | 56 static `'use client'` value exports across 40 `index.ts` files, against 17 `-entry` dynamic wrappers (counted by resolving each `export … from` in every barrel) |
| Features without the standard layout | `ko-account` (11 root files, no subfolders), `ko-agent` (5), `ko-entry`, `share-card`; `mobile-review-fixture/` is an empty folder with no `index.ts` |
| Cross-feature cycle | `ko-preview` ↔ `ko-account` and `ko-preview` ↔ `ko-agent` (section 1.4) |
| ARCHITECTURE.md §3 is stale | It lists `clients/`, `checkins/`, `schemas.ts types.ts` per feature, and `(auth)/(captain)/(player)` without `[locale]` |
| 250-line limit is met by width | ESLint `max-lines` skips blanks and comments, and there is no line-length rule. 586 source lines are over 160 characters and 82 are over 250. `programs/messages.ts` is at 250 lines and `marketing/messages.ts` at 249 |

The relative imports are probably not laziness **(inference)**. `PlanSidebar` is exported from
`@/features/billing`, but importing that barrel from the captain layout would put its 5 static client
components (`RosterBilling`, `ActivatePlayerButton`, …) into every captain route's client manifest. The
deep import was a bundle workaround that the lint rule happened not to see. So the real defect is the barrel
shape, not the import.

### 1.2 Rules to add

**Rule S1: no relative paths into a feature.** Add `'**/features/*/**'` to the restricted patterns for
`src/app/**`. Add `'**/features/**'` for `src/core/**`, `src/ui/**` and `src/lib/**`. Inside a feature,
`../data/x` does not contain `features/`, so legitimate intra-feature imports are unaffected.
Enforced by ESLint.

```js
const noDeepFeatureImports = {
  group: ['@/features/*/*', '@/features/*/**', '**/features/*/**'],
  message: "Import another feature only through its index: '@/features/<name>'.",
};
```

**Rule S2: shared surfaces import only server-safe exports.** A *shared surface* is any file that is in
the first load of many routes:

- every `layout.tsx` and `template.tsx`;
- `opengraph-image.tsx` and `global-error.tsx`;
- the two shells, `features/player-shell/components/player-shell.tsx` and `features/roster/components/captain-shell.tsx`.

A value import from `@/features/<x>` in a shared surface must resolve to one of these:

- a module that does not start with `'use client'`;
- a `*-entry.tsx` or `*-loader.tsx` wrapper built on `next/dynamic`.

Type-only imports are always allowed. Enforced by a new unit test,
`src/lib/shared-surface-imports.test.ts`. It uses static regex resolution, has no build dependency and runs
in milliseconds. The same scan produced the 56/17 count above. This catches the c6789daf and T-155 class of
problem before review instead of after a 5-minute build.

**Rule S3: feature barrels are the contract; client components meant for other features go through an
entry.** When a feature exports a client component that another feature or a layout renders, the barrel
exports the `-entry.tsx` dynamic wrapper, not the component. Static client exports stay legal when only
pages import them. The S2 test reports any that reach a shared surface. Add this to AGENTS.md §2 as one
bullet, with the pattern already used in `features/ranks/components/rank-entry.tsx`:

```tsx
'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const RankScreen = dynamic(() => import('./rank-screen').then(module => module.RankScreen), {
  loading: () => <LoadingState />,
});
```

For the same reason, add one sentence to AGENTS.md: inside `core/` and `ui/`, server or shared code imports
the leaf module (`@/core/offline/ids`, `@/ui/loading-state`), not the barrel. `docs/PERFORMANCE.md`
(T-027h follow-up) records that `uuidv7` imported through `@/core/offline` pulled Dexie into the captain
preview.

### 1.3 Do not restructure further

Do not move to `src/services`, `src/hooks` or `src/types/domain`, and do not use layer-first folders. The
feature-first layout is what makes the 250-line, one-responsibility rule workable for parallel Codex lanes.
A layer-first move would touch about 970 files for no runtime gain.

### 1.4 KO features before more KO work

There are five KO features, about 2,400 lines in total: `ko-account` 899, `ko-preview` 625, `ko-feed` 432,
`ko-agent` 240 and `ko-entry` 205. Their imports form cycles:

- `ko-agent/chat.ts:4` imports the values `koAudioTypes, koMaxAudio, koMaxText` from `@/features/ko-preview`.
- `ko-agent/demo-plan.ts:2` imports `koPreviewAllowed` from `@/features/ko-preview`.
- `ko-account/route.ts:7` imports `koPreviewMessages` from `@/features/ko-preview`.
- `ko-preview/components/ko-chat.tsx:20-21` imports types back from `ko-agent` and `ko-account`.

So the server route `/api/ko` depends at runtime on the barrel that exports `KoChat`, `KoWidget` and
`KoPreview`. Fix: create one server-safe `features/ko-core/` that holds the shared pieces:

- `policy.ts`, which has `KoRole` and `koPreviewAllowed`;
- `agent-limits.ts`;
- the wire types `KoReply` and `AccountReply`, together with their Zod schemas.

The other four features then depend on `ko-core` and not on each other's UI. Give `ko-account` the
standard `data/` layout in the same card. This is mechanical (moves plus import rewrites) and must land
before the next KO card.

---

## 2. Services: the layer exists; standardise its contract

### 2.1 The existing equivalent of `player.service.ts`

The requested `src/services/player.service.ts` already exists, split by feature. For the "player" model as
the captain sees it:

- the roster list: `features/roster/data/roster.ts`, with `fetchRoster` and `fetchCaptainFirstName`;
- one player's profile: `features/player-profile/data/profile.ts`, with `fetchPlayerProfile`;
- billing per player: `features/billing/data/*`;
- archiving a player: `features/roster/data/archive-player.ts`, a Server Action.

These are called from a thin route (`app/[locale]/(captain)/captain/players/[playerId]/page.tsx`, 18
lines). A route-level example:

```tsx
export default async function PlayerProfilePage({ params, searchParams }: Props) {
  const [{ playerId }, { tab }] = await Promise.all([params, searchParams]);
  return <ProfileScreen key={playerId} playerId={playerId} tab={parseTab(tab)}
    today={localDate(new Date())} data={fetchPlayerProfile(playerId)} />;
}
```

### 2.2 What is missing: one return and error convention

Measured across the 129 `data/` modules:

| Shape | Modules |
| --- | ---: |
| `if (error) throw …` | 50 |
| `return { error: string }` | 45 |
| `ActionResult<T>` (`lib/action-result.ts`) | 14 |
| Both `throw` and `return { error }` in the same module | 19 |
| Zod `parse` or `safeParse` at the boundary | 50 |

Callers therefore have to know each module's habits. The result is effect code like
`features/billing/components/billing-manager-card.tsx:23`, which handles both a `{ error }` result and a
throw for the same call.

**Convention (add to AGENTS.md §3):**

1. **Reads** are named `load<Thing>` or `fetch<Thing>` and return `Promise<T>`. They **throw** on failure,
   and the error passes through `core/supabase/errors.ts` (`readError`, `isPermissionDenied`). A missing
   row returns `null`, never an error. Server Components catch in one place and render `ErrorState`; client
   islands go through `useResource` (section 3), which turns a throw into `status: 'error'`.
2. **Mutations** are Server Actions (`'use server'`) that return `ActionResult<T>` and never throw for an
   expected failure. The `error` is already translated, as today. Browser-direct mutations are allowed only
   where the data is not RSC-owned (KO dismissals, swap decisions). They follow rule 1 and throw.
3. **Player offline writes** go through `saveAndQueue()` and nothing else (unchanged).
4. **Any row from outside the process is validated at the boundary.** That means a JSON column, an RPC that
   returns `jsonb`, or a `fetch()` response. Validate it with a Zod schema in a module that is loaded lazily
   (the T-155 `lazy-validation` pattern). Typed table selects need no Zod; the generated types cover them
   once section 4 is done.
5. **One query concern per function and no loops of awaited writes.** A loop of N updates becomes one RPC.

### 2.3 Before and after on a real file: `features/supplements/data/captain.ts`

Before (excerpt). The read is unbounded. The reorder runs N sequential round trips and leaves a half-applied
order on failure.

```ts
export async function fetchCaptainSupplements(playerId: string) {
  const client = await loadSupabaseBrowser();
  const [rows, logs] = await Promise.all([
    client.from('supplements').select('*').eq('player_id', playerId).is('archived_at', null).order('position').order('created_at'),
    client.from('supplement_logs').select('*').eq('player_id', playerId),
  ]);
  if (rows.error || logs.error) throw rows.error ?? logs.error;
  return { rows: rows.data, logs: logs.data };
}

export async function reorderSupplements(rows: SupplementRow[], index: number, direction: number) {
  // …
  for (const [position, row] of ordered.entries()) {
    const result = await client.from('supplements').update({ position }).eq('id', row.id);
    if (result.error) throw result.error;
  }
}
```

After. The read is bounded to what the screen uses: adherence is computed over 7 days
(`captain-supplements.tsx`, `supplementAdherence(..., 7, now)`). The reorder becomes one atomic RPC, which
needs a new migration with RLS and a PGlite test.

```ts
const ADHERENCE_DAYS = 7;

export async function loadCaptainSupplements(playerId: string, today: string): Promise<CaptainSupplements> {
  const client = await loadSupabaseBrowser();
  const [rows, logs] = await Promise.all([
    client.from('supplements').select('id,captain_id,player_id,name,dose,timing,notes,position,archived_at,created_at')
      .eq('player_id', playerId).is('archived_at', null).order('position').order('created_at'),
    client.from('supplement_logs').select('id,supplement_id,log_date,taken_at,deleted_at,client_updated_at')
      .eq('player_id', playerId).gte('log_date', shiftDate(today, -ADHERENCE_DAYS)),
  ]);
  if (rows.error) throw rows.error;
  if (logs.error) throw logs.error;
  return { rows: rows.data, logs: logs.data };
}

export async function reorderSupplements(playerId: string, orderedIds: readonly string[]): Promise<void> {
  const client = await loadSupabaseBrowser();
  const { error } = await client.rpc('reorder_supplements', { p_player: playerId, p_ids: [...orderedIds] });
  if (error) throw error;
}
```

The player-side twin, `features/supplements/data/refresh.ts:24-27`, has the same unbounded
`supplement_logs` select, and it runs on every `focus` and `online` event (`player-supplements.tsx:31-36`).

---

## 3. Data fetching and caching

### 3.1 What exists, measured

**Captain side.**

- **Page-level data:** RSC loaders. Per-request dedupe through React `cache()` is used in 2 places only
  (`core/i18n/server.ts`, `coach-page/data/public-profile.ts`).
- **Client islands:** about 30 hooks or components fetch in `useEffect`. Examples are `AnalyticsTab`,
  `ReadinessTab`, `CaptainSupplements`, `CaptainVoiceNotes`, `ScanSection`, `RadarCard`, `InboxScreen`,
  `TemplatesScreen` and `BillingManagerCard`.
  - 31 files hand-roll cancellation (`let active = true` or `cancelled` / `alive`).
  - 28 files hand-roll retry with an `attempt` / `retry` / `nonce` counter.
  - None shares a cache or deduplicates requests.
- **Revalidation:**
  - 18 `router.refresh()` calls;
  - `revalidatePath` in admin and billing actions only;
  - no `staleTimes` in `next.config.ts`, so every client navigation and every profile tab switch re-renders
    the page on the server (tabs are `?tab=` links, `profile-tabs.tsx:11`).
- **Polling:** 5 independent shapes.
  - `use-my-captain.ts:80` every 30 s, plus `focus`, `visibilitychange`, `online` and `offline`;
  - `use-notifications.ts:37` and `use-ko-feed.ts:41,70` every 120 s;
  - `approval-watcher.tsx:27` every 30 s.
  - Focus and `visibilitychange` both fire on tab return, so each of these refetches twice **(inference
    from event semantics)**.
- **Good precedent:** `use-ko-feed.ts` keeps a module-level store and reads it through
  `useSyncExternalStore`. It has single-flight requests (`request` / `pending`), ref-counted polling
  (`pollingUsers`) and a `version` guard against late responses. This is a correct mini-SWR, written once
  and not reusable.

**Player side.** Dexie is the read model. `core/offline/use-live-query.ts` (16 lines) subscribes to
`liveQuery`. Server snapshots are written into Dexie by `refreshCachedSnapshot`
(`core/offline/refresh-snapshot.ts`), and the UI only ever reads Dexie. One defect: `useLiveQuery` keeps
the previous query's value after its key changes, and it does not return its error. Callers compensate by
hand:

- `use-program-snapshot.ts:16`: `cached && cached.player_id !== playerId ? null : cached`
- `player-supplements.tsx:44`: `data.playerId !== playerId`

### 3.2 Verdict

**Captain side: RSC first; one in-house client resource primitive; no library.**

- Page data stays in Server Components. Wrap per-request loaders that several segments call in React
  `cache()`. Today `fetchPlanSummary` runs twice on `/captain`, once from `captain/layout.tsx:13` and once
  from `captain/page.tsx:14`. Each run costs a claims check, a profile query, an RPC and 2 more queries
  (`billing/data/plan-summary.ts`, `billing/data/client.ts`).
- Mutations revalidate with `router.refresh()` from a transition, or with `revalidatePath` in the action, as
  today.
- Client islands use `useResource` from a new `src/core/resource/`, of about 80 lines, generalised from
  `use-ko-feed.ts`. It provides:
  - a keyed cache and single-flight requests;
  - `AbortSignal` cancellation;
  - one visibility-aware revalidate per return (focus and `visibilitychange` coalesced);
  - optional `pollMs`, paused while hidden;
  - `retry`, and `mutate` for optimistic updates (section 5).

  It replaces the 31 hand-rolled cancellation blocks file by file.

**Player side: keep Dexie as the cache.** Fix `useLiveQuery` (below). Put no query library on top of it: a
second cache over IndexedDB would create two sources of truth for offline data.

**Why not TanStack Query.** It costs about 12–13 KiB gzip (published figure for `@tanstack/react-query`
5.x, not measured here), and it needs the owner's approval as a new dependency. Captain routes would absorb
the bytes, since they sit at 233–297 KiB against 310 (`PERFORMANCE.md`, T-027h and T-155 tables). The problem is what
the bytes buy:

- a persister, which Dexie already provides;
- a mutation queue, which the outbox already provides;
- infinite queries, which no screen uses;
- devtools.

It also invites moving RSC-loaded captain pages to client fetching, which would be a regression in first
paint and in bundle size. **Not recommended.**

**Why not SWR.** About 4–5 KiB gzip (published figure, not measured here) and a good fit for the islands.
It would be the right call if the in-house primitive grows past about 150 lines or needs Suspense
integration or paginated keys. Until then, a tested 80-line module costs nothing in approvals or bytes. Trip
wire: if `src/core/resource/` exceeds 150 lines, open an owner-approval card for `swr` instead of growing it.

### 3.3 The hook, as it would be written here

`src/core/resource/use-resource.ts` (sketch; the store lives in `store.ts`, tests in `resource.test.ts`
with an injected `now` and a fake `document`):

```ts
'use client';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { read, subscribe, revalidate, mutate as mutateKey, type ResourceState } from './store';

export interface ResourceOptions { pollMs?: number; staleMs?: number }

export function useResource<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>,
  { pollMs, staleMs = 15_000 }: ResourceOptions = {}): ResourceState<T> & {
    retry: () => void; mutate: (next: (current: T | undefined) => T, commit: () => Promise<unknown>) => Promise<boolean>;
  } {
  const state = useSyncExternalStore(
    useCallback(listener => key ? subscribe(key, listener) : () => {}, [key]),
    () => read<T>(key), () => read<T>(null));
  useEffect(() => {
    if (!key) return;
    return revalidate(key, load, { pollMs, staleMs }); // single-flight, aborts on last unsubscribe, visibility-aware
  }, [key, load, pollMs, staleMs]);
  return {
    ...state,
    retry: () => { if (key) void revalidate(key, load, { force: true })(); },
    mutate: (next, commit) => key ? mutateKey(key, next, commit) : Promise.resolve(false),
  };
}
```

`features/muscle-analytics/components/analytics-tab.tsx` (36 lines today, with 4 `useState` and a hand-rolled
`active` flag) becomes a component without `useEffect`:

```tsx
export function AnalyticsTab({ playerId, self = false }: { playerId: string; self?: boolean }) {
  const t = useT(messages);
  const today = localDate(new Date());
  const load = useCallback(() => loadAnalytics(playerId, today, self), [playerId, today, self]);
  const { data, status, retry } = useResource(`analytics:${playerId}:${today}`, load);
  return <section className="glass-strong space-y-5 rounded-card p-5 sm:p-6" aria-busy={status === 'loading'}>
    <AnalyticsHeader t={t} />
    {status === 'error' ? <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={retry} />
      : data ? <AnalyticsPanel key={playerId} weeks={data.weeks} self={self} readiness={data.readiness} />
      : <AnalyticsSkeleton />}
  </section>;
}
```

`loadAnalytics` moves the `Promise.all([fetchMuscleVolume, loadTodayReadiness])` into
`muscle-analytics/data/`, so the component only renders. Switching profile tabs and coming back is now
served from the cache, with a background revalidate.

### 3.4 Player-side fix: `useLiveQuery`

```ts
export function useLiveQuery<T>(query: () => T | Promise<T>, onError?: (error: unknown) => void, retryKey = 0): T | undefined {
  const [state, setState] = useState<{ query: typeof query; value?: T }>({ query });
  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: value => setState({ query, value }),
      error: (error: unknown) => onError?.(error),
    });
    return () => subscription.unsubscribe();
  }, [query, onError, retryKey]);
  // A new query never shows the previous key's rows (e.g. another account's snapshot).
  return state.query === query ? state.value : undefined;
}
```

Once this lands, the guards in `use-program-snapshot.ts:16` and `player-supplements.tsx:44` become
removable. Keep them one release as defence in depth, then remove them in a follow-up card.

### 3.5 Polling budget (inference, for sizing)

A visible player tab issues about:

- 2 requests/min from `use-my-captain`;
- 0.5/min from notifications;
- 0.5/min from the KO feed, plus 0.5/min from the digest when enabled.

That is about 3 to 3.5 requests per minute before any user action. At 5,000 concurrently visible player
tabs this is about 250–290 requests/s of baseline load on PostgREST. `useResource` with `pollMs` paused
while hidden, plus coalesced focus and visibility, removes the duplicate on every return to the app.
Moving `use-my-captain` to 60–120 s needs an owner call on how fast a captain change must appear; it is not
a technical requirement.

---

## 4. Types: one source of truth

### 4.1 What exists

- `src/types/database.ts` (1,953 lines) is the Supabase client's `Database`. Both clients are typed with
  `src/types/app-database.ts` (31 lines). That file is an overlay for trigger-filled columns and nullable RPC
  arguments, and it is the right pattern.
- 36 non-test references derive domain types with `Pick<Tables<'…'>, …>`. Good examples are
  `features/programs/types.ts`, `features/player-home/data/program-snapshot.ts:8-16` and
  `features/billing/types.ts`.
- Type assertions are rare: about 25 `as SomeType` in non-test code, 0 `as unknown as`, and 0 `any`. The ones
  that cross a database boundary are:
  - `features/notifications/data/notifications.ts:32`: `row.type as NotificationType`
  - `features/supplements/data/refresh.ts:31`: `prescriptions.data as SupplementRow[]`
  - `features/settings/data/settings.ts:57`: `result.data as SettingsProfile`
  - `features/ko-preview/components/ko-chat.tsx:55,98`: `response.json() as …`, an unvalidated wire format
  - `features/progress/data/checkins.ts:36` and one other place: `.returns<…>()`, the deprecated
    supabase-js assertion

### 4.2 The problem

`database.ts` is a hybrid:

- 30 tables are in generated multi-line form;
- 15 tables are hand-written one-liners at the top: `ko_waitlist`, `crown_*`, `points_log`,
  `player_points`, `exercise_swap_requests`, `daily_checks`, `supplements`, `supplement_logs`,
  `notifications`, `admin_audit_log`, `admins` and others;
- 50 of 76 functions are hand-written;
- line 1 imports `DailyCheckRow, SupplementRow, SupplementLogRow` from `@/core/offline/tables`. The
  database type now depends on application code, which is backwards.

No script in `package.json` or `scripts/` regenerates it. The result is verified drift:

```ts
// src/types/database.ts:159 (hand-written)
type: 'plan_assigned' | 'nutrition_updated' | 'player_joined' | 'player_inactive' | 'join_requested' | 'workout_reminder' | 'workout_feedback';
// supabase/migrations/0086_crown_month_end_reminder.sql allows 16 values, including 'crown_defend'.
```

The offline sync rows in `core/offline/tables.ts` (`SetLogRow`, `MealLogRow`, …) are also hand-written,
with only a comment ("Must stay in step with … 0006 … 0007") keeping them aligned.

### 4.3 Decision

1. **`src/types/database.ts` is 100% generated, and nobody edits it.** Regenerate it from the live project:
   use Supabase CLI `gen types typescript --linked`, or the Supabase MCP `generate_typescript_types` tool
   (the owner runs either). Add a header comment saying so. Add an ESLint `ignores` entry so nobody
   "fixes" it.
2. **All hand corrections live in `app-database.ts`**, as today for `form_checks`. This includes narrowing
   `text` columns that have a `check (… in (…))` constraint to their union. Example:

   ```ts
   type Narrow<Row, Patch> = Omit<Row, keyof Patch> & Patch;
   type Supplements = Public['Tables']['supplements'];
   // CHECK constraint in 0051_supplements.sql; enforced by supabase/tests/type-narrowing.test.ts
   supplements: Omit<Supplements, 'Row'> & { Row: Narrow<Supplements['Row'], { timing: SupplementTiming }> };
   ```
   A PGlite test reads `pg_constraint` for each narrowed column and asserts that the union in
   `src/types/enums.ts` matches. That turns the next drift into a test failure.
3. **Domain types derive and never redeclare.** The sync contract becomes:

   ```ts
   // core/offline/tables.ts
   import type { Tables } from '@/types/database';
   export type SetLogRow = Omit<Tables<'set_logs'>, 'player_id' | 'server_updated_at'>; // server sets both
   ```
   One subtlety: the generated `program_exercise_id` is `string | null`, because the RPC nulls references to
   deleted plan rows (ARCHITECTURE.md §6). The local row declares `string`. Keep the local narrowing
   explicit with `Narrow<…>` and a comment, so the difference is deliberate and visible.
4. **Unvalidated wire formats get a Zod schema** in a lazily loaded module: the KO chat responses at
   `ko-chat.tsx:55,98` and the `jsonb` payload of notifications. The schemas belong in `ko-core` (section 1.4).

---

## 5. Optimistic UI

### 5.1 Player side: the outbox is the pattern (keep it, add the missing failure path)

The flow:

- **Write.** `logSet` (`features/workout/data/log-set.ts:24-29`) calls `saveAndQueue`, which puts the row
  and its outbox entry in one Dexie transaction.
- **Show.** `liveQuery` re-renders at once.
- **Send.** `OUTBOX_WRITE_EVENT` wakes `startSync` (`core/offline/runner.ts:61`).
- **Settle.** A success deletes the outbox entry only when its `revision` is unchanged (`sync.ts:75-83`).
  A failure schedules a backoff.

There is no rollback, by design. The local row is the truth until the server accepts it.

The missing piece is the *permanent* failure. Today:

- `sendBatch` treats every error alike: backoff of 2 s doubling to a 5-minute cap, retried for ever
  (`backoff.ts`).
- A single rejected row fails its whole batch of 50, and the `return result` at `sync.ts:38` skips every
  later table, even unrelated ones. `meal_logs`, `supplement_logs` and `daily_checks` do not depend on
  `workout_sessions`; only `set_logs` does.
- Failures go only to `console.error` (`runner.ts:47`), not to Sentry.
- `SyncPill` has only `synced | pending | offline`.

Fix, without a Dexie schema bump:

1. **Classify the error in `supabaseTransport`.** Transient errors are network failures, 5xx, `PGRST301`
   and `40001`. Permanent errors are `42501`, `23xxx` and `22xxx`.
2. **Park a permanently rejected entry.** Set `next_attempt_at: Number.MAX_SAFE_INTEGER` and `parked: true`.
   Do the same after N transient attempts (N = 12, which is about 1 hour at the cap). Keep the local row.
3. **Replace the linear stop with a dependency map** `{ set_logs: ['workout_sessions'] }`. A failing table
   blocks only its dependants.
4. **Add a `'attention'` state to `SyncPill`** with a retry action that un-parks. Report a parked entry to
   Sentry once, through the existing scrubber, with the table and error code only (no row content).

Tests go in `sync.test.ts`, with an injected `now` and a fake transport: park on `42501`; unrelated tables
still flush; a re-save of a parked row un-parks it (`saveAndQueue` already resets `attempts`).

The same file has one more cost. `supabaseTransport` (`transport.ts:16`) calls `auth.getUser()`, a network
round trip to Auth, **once per table per flush**. Since commit 5515d56a, a flush runs on every tap. Check
the identity once per flush instead. Use `getClaims()`, which verifies the JWT locally when the project uses
asymmetric signing keys **(not verified for this project)**.

### 5.2 Captain side: "whoever owns the data owns the optimistic state"

Today there are 5 shapes:

- `lib/optimistic.ts` `applyOptimistic`, used in 3 files (`roster-screen.tsx:43`, `settings-screen.tsx`,
  `templates-screen.tsx`);
- `notifications/data/read-state.ts` `markOptimistically`;
- `ko-feed/data/dismiss.ts` `snoozeOptimistically`;
- `ko-feed/data/decide-swap.ts` `decideSwapOptimistically`;
- a hand-rolled snapshot in `billing-manager-card.tsx:27-37`.

Mutations that still wait for the server and then refetch include:

- `captain-supplements.tsx:31` (`await work(); await refresh()`) for archive and reorder;
- `billing-manager-card.tsx:35` (`await load(); router.refresh()`);
- `program-generator/components/generate-button.tsx:58`.

React 19's `useOptimistic` is used 0 times.

The rule depends on who owns the data:

- **RSC-owned data** (the list came from a Server Component prop: roster, billing, join requests) uses React
  19 `useOptimistic` inside a transition. Rollback is automatic: when the transition settles, the optimistic
  layer is dropped and the refreshed server props show. That also covers failure, with no code.
- **Resource-owned data** (a client island on `useResource`) uses `resource.mutate(next, commit)`, which is
  `applyOptimistic` underneath. It snapshots per key, rolls back on a throw, and revalidates the key on
  success.

Delete the three ad-hoc helpers as their callers migrate. `markOptimistically` and
`snoozeOptimistically` become `mutate` calls.

RSC-owned example, a direct rewrite of the archive flow in `features/roster/components/roster-screen.tsx`:

```tsx
const [players, removeOptimistic] = useOptimistic(result.players ?? [],
  (current, archivedId: string) => current.filter(player => player.playerId !== archivedId));
const [, startTransition] = useTransition();

function archive(id: string) {
  startTransition(async () => {
    removeOptimistic(id);
    const response = await archivePlayer(id);           // Server Action, ActionResult
    if (!response.ok) setArchiveErrors(errors => ({ ...errors, [id]: response.error }));
    else router.refresh();                               // server props replace the optimistic layer
  });
}
```

Resource-owned example, `CaptainSupplements` archive on `useResource`:

```ts
const supplements = useResource(`supplements:${playerId}`, load);
const archive = (id: string) => supplements.mutate(
  current => current && { ...current, rows: current.rows.filter(row => row.id !== id) },
  () => archiveSupplement(id, Date.now()),
); // false → rolled back; the row reappears and the error toast shows
```

The one-primary-action and 48 px rules are unaffected. During the transition, the pending state disables
only the affected row, as `roster-screen.tsx` already does with `inFlight`.

---

## 6. Server-side scale risks

Ordered by expected impact. All query counts are per page load, from the code.

1. **Two route-profile RPCs per captain navigation.**
   - The proxy runs `getClaims()` and then `my_approval_route_profile` on every matched request, including
     RSC navigations, prefetches and Server Actions (`core/supabase/session.ts:26-29`, matcher in
     `src/proxy.ts`).
   - The captain layout calls the same RPC again (`roster/data/captain-approval.ts:8`).

   Option: the proxy forwards the decided profile in a request header it always overwrites, the same way it
   already sets `x-kochivo-path`, and the layout reads it. This is security-adjacent, so measure first and
   ship separately (card R-14).
2. **Duplicate and serial loaders on `/captain`.**
   - `fetchPlanSummary` runs twice (section 3.2). Each `captainClient()` repeats a `profiles.role` lookup.
   - `fetchRoster` runs its `captain_roster` RPC, then `profiles`, then `coach_clients`, serially
     (`roster/data/roster.ts:12-22`). The last two are independent, so run them with `Promise.all`.
   - `.in('id', [...all player ids])` grows the URL with roster size (about 37 bytes per id) **(inference:
     it fails somewhere above a few hundred players, depending on the proxy limit)**. Fold the avatar path
     and link columns into `captain_roster` in a new migration.
3. **N+1 signed URLs in the player gallery.** `progress/components/player-gallery.tsx:23` signs each photo
   with its own `createSignedUrl`: up to 26 check-ins × photos per week (`progress/data/checkins.ts:36`, `limit(26)`).
   `createSignedUrls` (batch) is already used in 3 places: `inbox.ts:79`, `player-profile/data/profile.ts:65`
   and `voice-notes.ts:18`. Switch to it.
4. **Unbounded selects on growing tables.**
   - `supplement_logs` is read in full by player and captain (`supplements/data/refresh.ts:25`,
     `supplements/data/captain.ts:12`) at about one row per supplement per day, and the player side re-reads
     it on every focus. PostgREST's `max_rows` is not set in the repo, so the platform default applies (1000
     unless changed in the dashboard; **not verified**). Past that the read is **silently truncated**, and
     adherence becomes wrong.
   - The inbox loads every open check-in and form check with `select('*')` (`inbox/data/inbox.ts:30-35`;
     the limit applies only to `reviewed`).

   The team already knows the keyset pattern: `muscle-analytics/data/muscle-volume.ts:57-70`,
   `workout/data/history.ts:41`. Apply it here. There are 40 `select('*')` call sites; narrowing them is a
   follow-up, not urgent.
5. **Sequential writes.** `reorderSupplements` issues N updates (section 2.3).
6. **Sync transport `getUser()` per table per flush** (section 5.1).
7. **Watch, do not touch yet.** `captain_roster` (`0016_captain_roster.sql`) uses 4 correlated subqueries
   per player, and RLS re-applies inside them because it is `security invoker`. The supporting indexes
   exist (`workout_sessions_player_date`, `check_ins_captain_open`, `form_checks_player_id`, …). Run
   `EXPLAIN ANALYZE` on the largest real roster before changing it.

---

## 7. Ordered refactor plan

Each card can be reviewed in one sitting and shipped on its own. The order is value over risk. Every card
keeps the AGENTS.md rules: tests added, `npm run check` and build pass, budgets untouched.

**R-01: Close the relative-import loophole.**
- **Goal:** Rule S1.
- **Files:** `eslint.config.mjs`, the 7 offending imports. Export `fetchDues`, `fetchPlanSummary`,
  `fetchBilling` and `BillingScreen` from `features/billing/index.ts`, and `RosterScreen` from
  `features/roster/index.ts`. Expose them as `-entry` wrappers where the screen is a client component, so
  the barrel stays layout-safe.
- **Acceptance:** `npx eslint .` fails on a reintroduced `'../../features/x/y'`; the perf budget passes with
  no route above its T-155 figure.
- **Risk:** low.

**R-02: Shared-surface import test.**
- **Goal:** Rule S2.
- **Files:** a new `src/lib/shared-surface-imports.test.ts`; one bullet in AGENTS.md §2.
- **Acceptance:** the test fails if `captain/layout.tsx` imports `RosterBilling` from `@/features/billing`
  (a negative fixture proves it), and passes on master.
- **Risk:** low.

**R-03: Outbox poison rows and table isolation.**
- **Goal:** section 5.1, steps 1–4.
- **Files:** `core/offline/{sync,transport,runner,tables}.ts`, `ui/sync-pill.tsx`, the player-shell pill
  wiring, `messages.ts`, `sync.test.ts`.
- **Acceptance:**
  - a `42501` row parks and does not block `meal_logs`;
  - `set_logs` still waits for `workout_sessions`;
  - a re-save un-parks the row;
  - the pill shows the attention state;
  - Sentry receives one scrubbed event.
- **Risk:** medium. It touches the sync engine, but the change is additive and fully unit-testable.

**R-04: One identity check per flush.**
- **Goal:** replace the per-table `auth.getUser()` in `transport.ts` with one claims check per
  `flushOutbox` run.
- **Acceptance:** the existing account-change tests pass; a new test asserts one auth call for a
  three-table flush.
- **Risk:** low to medium (security-adjacent; keep the `localDb().userId` double check).

**R-05: Per-request dedupe with React `cache()`.**
- **Goal:** wrap `captainClient` (billing), the roster and profile clients, `fetchPlanSummary`, and a
  shared `currentClaims()` in `cache()`.
- **Acceptance:** a unit test with a counting fake client shows one plan-summary load when both layout and
  page call it.
- **Risk:** low.

**R-06: `useLiveQuery` key reset.**
- **Goal:** section 3.4.
- **Files:** `core/offline/use-live-query.ts` and a test.
- **Acceptance:** after `query` changes, the hook returns `undefined` until the new query emits.
- **Risk:** low.

**R-07: Regenerate `database.ts` and move corrections to the overlay.**
- **Goal:** section 4.3, steps 1–3.
- **Files:** `src/types/*`, `core/offline/tables.ts`, a new `src/types/enums.ts`, a new
  `supabase/tests/type-narrowing.test.ts`; remove the casts at `notifications.ts:32`, `refresh.ts:31` and
  `settings.ts:57`.
- **Acceptance:** `tsc` passes with those three casts deleted; the PGlite test compares the unions with
  `pg_constraint`; `database.ts` has no import line.
- **Risk:** medium. A large type diff, but zero runtime change. Needs the owner to run type generation.

**R-08: Bound the growing reads.**
- **Goal:** add a `log_date` window to `supplement_logs` (player and captain); add a limit and keyset
  paging to the inbox's open items; sign the gallery photos in a batch.
- **Acceptance:** tests on the query builders (fake client records `.gte`, `.limit` and `.range`); the
  gallery issues one storage call per load.
- **Risk:** low to medium. Confirm with the owner how many days of supplement history the player screen
  must show offline.

**R-09: `core/resource` and the first three islands.**
- **Goal:** section 3.3. Migrate `AnalyticsTab`, `ReadinessTab` and `CaptainSupplements`.
- **Acceptance:**
  - store tests: single-flight, abort on the last unsubscribe, no fetch while hidden, one revalidate per
    focus plus visibility pair, rollback on a failed `mutate`;
  - tab switch-back renders from the cache;
  - captain route budgets do not grow by more than 2 KiB.
- **Risk:** medium (new shared primitive). Ship before migrating more callers.

**R-10: KO core and cycle removal.**
- **Goal:** section 1.4. Move the shared policy, limits, roles and wire types with Zod to
  `features/ko-core`; give `ko-account` the standard `data/` layout.
- **Acceptance:** no `ko-*` feature imports a `ko-*` barrel that exports a client component; `/ko` and
  `/dev/ko` stay at or below 199 and 182 KiB.
- **Risk:** low (moves only). **Do this before the next KO feature card.**

**R-11: Captain optimistic standard.**
- **Goal:** section 5.2. Use `useOptimistic` for roster archive and join requests; use `resource.mutate`
  for the supplements island; add the `reorder_supplements` RPC migration with RLS and a PGlite test.
- **Acceptance:**
  - a failed archive restores the row and shows the translated error;
  - a reorder is one request and atomic;
  - `markOptimistically` and `snoozeOptimistically` are deleted, with their callers on `mutate`.
- **Risk:** medium.

**R-12: Coalesce polling.**
- **Goal:** move `use-my-captain`, `use-notifications`, `use-ko-feed` and `approval-watcher` onto
  `useResource` with `pollMs`.
- **Acceptance:** one request per tab return (test with a fake `document`); intervals unchanged unless the
  owner decides otherwise.
- **Risk:** medium.

**R-13: Split `messages.ts` at the limit.**
- **Goal:** split `programs/messages.ts` (250) and `marketing/messages.ts` (249) by screen.
- **Acceptance:** no change to the Arabic strings (byte-identical values, checked by a test); lint passes.
- **Risk:** low.

**R-14: One route-profile RPC per request.**
- **Goal:** section 6, item 1.
- **Acceptance:** the layout performs no RPC when the proxy header is present; a spoofed incoming header is
  overwritten (test).
- **Risk:** medium (auth path). Measure Supabase request counts before and after.

**R-15: Split `InboxScreen`.**
- **Goal:** 200 lines, 13.6 KB, about 20 state hooks (`inbox/components/inbox-screen.tsx:28-75`). Extract
  `useInboxList` (on `useResource`), `useInboxReview` and the voice-reply state.
- **Acceptance:** the existing inbox tests pass; no file is over 150 lines.
- **Risk:** medium. Do it after R-09.

**R-16: One flag module.**
- **Goal:** move `ranksEnabled`, `koTeaserEnabled` and `koAccountConfig` behind `src/core/config/flags.ts`,
  public and server-only parts split.
- **Acceptance:** the tests for each flag move unchanged.
- **Risk:** low. Do it last; the value is consistency only.

Also update `docs/ARCHITECTURE.md` §3 to the real tree in the same pass as R-01. That is a doc-only change.

---

## 8. Leave alone

- **The offline engine's core.** Leave `saveAndQueue`, `stableId`, the revision-safe outbox, the
  last-write-wins `sync_*` RPCs and the snapshot refresh as they are. They are correct, tested
  (`sync.test.ts`, `runner.test.ts`, `refresh-snapshot.test.ts`, PGlite) and hard to re-derive. R-03 adds to
  them; nothing rewrites them.
- **RSC page loading for the captain.** Do not convert pages to client fetching to use a query library.
  It would add bytes and remove streaming.
- **The feature-first layout.** No `src/services`, `src/hooks` or `src/types/domain` reorganisation.
- **Dexie eager on player routes.** `PERFORMANCE.md` documents why (the first offline snapshot read).
  Routes are at 278–284 KiB against 300.
- **Sentry initialisation and fonts.** Out of scope per T-155; the shared floor is understood.
- **Converting check constraints to Postgres enums.** It would mean a live-data migration for a type-level
  gain that the overlay in R-07 gets with zero database risk.
- **Zod placement from T-155.** Validators stay in lazily imported modules (`ranks/lazy-validation.test.ts`).
  Do not consolidate them into an eager shared schema file.
- **`captain_roster` SQL.** Leave it until a real `EXPLAIN ANALYZE` shows a problem.
- **A global client state library.** Zustand, Redux and similar are not needed. Dexie holds the player state,
  RSC holds the captain state and `useResource` holds the islands.
