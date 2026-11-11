# T-171: Requests queue (inbox redesign, behind the flag)

**Phase:** Captain suite (owner approval 2026-11-11) · **Depends on:** T-166, T-167 · **Status:** implemented; reviewer build gate pending (Windows EPERM)

## Goal
The design is screen 1 («الطلبات») in `docs/mockups/captain-workspace/suite.html`.

Rebuild the captain inbox as one queue of everything a player sent:
- weekly check-ins;
- form-check videos;
- plan-renewal / ending-soon items.

The queue is sorted by urgency. Each row says what changed, so the captain doesn't need to open the form. When the flag is off, `/captain/inbox` renders exactly what it renders today.

## Files
- `src/app/[locale]/(captain)/captain/inbox/page.tsx`: a flag switch only, the same pattern as T-166.
- `src/features/captain-workspace/` (a new `queue/` subfolder, or new files), messages, tests.
- `src/features/inbox/index.ts`: export existing reads if needed. Do not change their behaviour.
- `src/features/player-file/index.ts`: only if a missing export is needed.
- This card.

## Requirements
1. **Data.** Reuse the existing inbox reads (bounded, keyset cursor `{created_at,id}`, 50 per page) and the existing `triage.ts`. Do not add queries without a bound.
2. **Row model (pure, unit tested): `queueRow(item, previousSnapshot?, now)`.** It returns:
   - player, kind and age in hours;
   - `late` when the item waited more than 24h;
   - `changes`: up to 3 chips, for example:
     - weight delta;
     - waist delta;
     - a new injury (style `danger`);
     - training days changed (style `warn`);
     - «no change».

   Changes come from comparing with the previous check-in through the `player-file` adapters (`checkinSnapshot`, `mergePlayerFile`).
3. **Sort:** a new injury first, then late items, then the newest. Reviewed items go to the «reviewed» filter.
4. **KPIs:**
   - needs reply;
   - late (>24h);
   - the captain's average reply time over the last 7 days (`reviewed_at - created_at`), compared with the 7 days before;
   - reviewed this week.

   These are computed from the rows already loaded plus one bounded count query each where needed. The card reports the exact queries.
5. **UI:**
   - filter chips (needs reply / late / reviewed / all) with counts;
   - a kind segment;
   - search by player name (client-side over loaded rows);
   - a «load more» button with the cursor;
   - each row's primary action «راجِع» opens the existing review flow.

   Rows become cards on the phone. Loading, empty and error states are required.
6. **RTL and locale.** Logical properties only. Numbers go through `formatNumber`, and deltas are rendered LTR.

## Acceptance
Implementation plan (within this card's scope):
- Add deterministic row, urgency, filter and KPI tests, then implement the pure queue model.
- Export existing inbox reads and review primitives without modifying them; load bounded pages and previous snapshots in workspace data modules.
- Add the responsive queue, isolated review dialog, translated states and pagination tests.
- Switch only on `NEXT_PUBLIC_CAPTAIN_WORKSPACE === '1'`; verify the exact legacy tree, all gates and flag-off bundle growth.

- [x] Unit tests for `queueRow` and the sort, with `now` injected.
- [x] A flag-off test proves the old inbox tree is unchanged.
- [x] Tests for load more and the empty and error states.
- [ ] All gates pass. Report the inbox route budget before and after (flag-off growth ≤ 1 KiB).

## Out of scope
- Custom forms (T-176…T-178).
- Changing review/reply behaviour.
- Migrations.
- `src/app/globals.css` and `src/features/luxury-preview`.

## Implementation and query report

The route follows T-166's `captainWorkspaceEnabled()` switch and dynamically imports
the server-only workspace entry. The legacy `<InboxScreen />` tree is unchanged.
The client queue and review dialog load separately. No dependency, migration,
budget, existing inbox query, or existing inbox component was changed.

Reads (all authenticated, subject to existing RLS):

- Existing `listInbox({ status: 'open', limit: 50, cursor })`: unchanged reads of
  `check_ins` and `form_checks`, each limited to 50, merged to a 50-item page.
  Cursor remains `{ created_at, id }`, ordered by creation descending and ID
  ascending, with `created_at < cursor.created_at OR (created_at = cursor.created_at
  AND id > cursor.id)`. Existing bounded profile/exercise lookups are retained.
- Existing `listInbox({ status: 'reviewed', limit: 50 })`: latest 50 reviews,
  unchanged. Reply-time averages compare `reviewed_at - created_at` for loaded
  reviews in `(now - 7 days, now]` and `(now - 14 days, now - 7 days]`.
  A missing period displays unavailable rather than zero. The UI states this
  latest-50 sample explicitly; this is not an all-history aggregate. Existing
  reviewed reads have no cursor, so reviewed history remains capped at 50.
- Existing `listTriageInputs(playerIds, at)`: at most 4 check-ins and 7 daily
  checks per loaded player. Pagination deduplicates history by ID and daily
  checks by player/date before calling the existing `triage` and `nextOpenItem`.
- For each check-in in an open page, one previous-snapshot query:
  `check_ins.select(id,created_at,body_weight_kg,waist_cm,notes)` with
  `captain_id = caller`, `player_id = item.player_id`,
  `created_at < item.created_at`, ordered `created_at DESC, id ASC`, `limit(1)`.
  Both current and previous rows pass through `checkinSnapshot`; changes use
  `mergePlayerFile`. At most 50 predecessor queries per inbox page.
- Ending-soon read: `coach_clients.select(id,player_id,created_at,access_until,
  profiles!coach_clients_player_id_fkey(full_name))`, `captain_id = caller`,
  `archived_at IS NULL`, `frozen_at IS NULL`, `pending = false`,
  `today <= access_until <= today + 7 days` in Cairo; ordered
  `created_at DESC, id ASC`, `limit(50)`. This stream uses its own creation/ID
  cursor and the same keyset predicate. The visible waiting clock starts seven
  days before expiry. Review links to the existing player page's billing controls.
- Counts: for **each** of `check_ins` and `form_checks`, four
  `select('id', { count: 'exact', head: true }).eq('captain_id', caller).limit(1)`
  queries, with respectively: `reviewed_at IS NULL`; `reviewed_at IS NULL AND
  created_at < now - 24 hours`; `reviewed_at IS NOT NULL`; and
  `Cairo Saturday midnight <= reviewed_at <= now`. Two equivalent bounded head
  counts use the ending-soon roster predicate: all ending-soon rows, and rows
  whose seven-day-window waiting age exceeds 24 hours. Thus ten head/count
  queries supply exact global counts without downloading extra result rows.

The row adapter supports injury and training-day chips from snapshots. Current
check-in storage only supplies weight, waist and notes; it cannot report new
injury/training-day answers until a future form adapter supplies those facts.
Free-text notes are not interpreted as structured injury reports. Reviewed rows
without a loaded predecessor show no-change rather than inventing a delta.

## Validation report (2026-11-11)

- Focused queue suite: 26 tests passed, including flag-off tree, pagination,
  duplicate evidence, concurrent review preservation, counts and Arabic LTR deltas.
- Full final-source native-config/thread suite: **476 files, 3,400 tests passed**.
  The earlier stale-artifact run failed only `src/lib/perf-budget.test.ts` with
  ENOENT; after refreshing compiled diagnostics, both full reruns passed.
- `npx tsc --noEmit -p .`: passed. `npx eslint .`: passed.
- Default Vitest/config loading: Windows `spawn EPERM`; used
  `npx vitest run --maxWorkers=2 --configLoader native --pool=threads`.
- `npm run check` reaches release audit, which fails on `spawnSync git EPERM`.
  Equivalent audit rules run with the tracked Git file list piped by PowerShell:
  `Release audit: 1882 tracked files, 0 findings`.
- `npm run build`: compilation succeeds, then the Next TypeScript worker fails
  with `spawn EPERM`. The standalone TypeScript gate passes. An in-memory
  worker-thread build attempt also encounters EPERM; repository configuration
  was not changed. A complete production build remains a reviewer gate.
- Next's own `writeRouteBundleStats` was invoked against the compiled manifests
  after the interrupted build to refresh stale paths. Inbox gzip measurement:
  **237,742 bytes before (232.170 KiB), 238,197 bytes after (232.614 KiB), +455
  bytes (0.444 KiB)** with `NEXT_PUBLIC_CAPTAIN_WORKSPACE=0` explicitly set in
  the final build process (no environment file edited). This is compiled-artifact evidence,
  not a claim that the full build completed.
- `npx vitest run src/lib/perf-budget.test.ts` encounters the same default-config
  EPERM; its native-config/thread fallback passes (1 test).
