# T-109 — Show current InBody values from the first record

**Status:** implemented and verified, 2026-11-06. Owner subsequently authorized commit and production publication. Existing hosted policy requires no DDL change.

## Goal and diagnosis

Captain mode passes `total=true` to `ScanMetrics`, which currently substitutes total deltas for primary measurement values. A single record therefore renders dashes despite containing valid measurements. Primary cards must always show the latest record; only the comparison requires two records.

## Files

- `src/features/body-scans/components/scan-metrics.tsx`
- `src/features/body-scans/components/scan-section.tsx`
- `src/features/body-scans/messages.ts`
- `src/features/body-scans/scan-metrics.test.ts`
- `src/features/body-scans/scans-load.test.ts`
- `docs/sql/body-scans-captain-read.sql`
- `supabase/tests/body-scans-policy-snippet.test.ts`
- `docs/superpowers/plans/2026-11-06-inbody-current-values.md`

## Acceptance and scope

Show available latest measurements with one or more records, retain dashes only for genuinely missing metrics, and keep coach total-change/player recent-change calculations separate. Verify `listScans(playerId)` uses the selected player. Supply and locally test an idempotent SQL snippet for the actual `body_scans` table that preserves current coach ownership, archive, suspension, and relationship-start privacy boundaries. Existing hosted RLS is already enabled and grants coach SELECT. No hosted SQL changes or new migration are required or authorized by this task.
