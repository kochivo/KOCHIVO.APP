# T-178: Form requests: send, schedule, remind, answer, and feed the player file

**Phase:** Captain suite (owner approval 2026-11-11) · **Depends on:** T-176, T-177, T-172 · **Status:** implemented; reviewer rerun needed for Windows-blocked gates

## Reviewer scope decision and implementation plan

- Answers are online-first. Device drafts are restored by request and cleared only after confirmed submission. Full offline queueing and sync RPCs are deferred to a later card; `src/core/offline/` stays untouched.
- One additive migration, `0093_form_schedules.sql`, adds functions and guarded pg_cron jobs. No live database changes.
- Player-file loader/history changes are authorized; flag-off behavior stays identical.
- Reviewer notification exception: 0093 may widen `notifications_type_check` with the existing full list plus `form_requested`. Changes to `src/types/enums.ts` and `src/features/notifications/` are authorized for its types, translated message, stored payload and answer-route link, with tests.
- Implement and test: (1) Cairo scheduling/reminder rules and SQL functions, (2) draft/submit flow and lazy player route/home card, (3) optimistic captain send/remind and custom-answer review, (4) bounded player-file snapshots and queue integration, (5) all requested verification gates and route size measurement.
- Review focus: Cairo DST/month boundaries; repeated/concurrent scheduler calls; inactive links; partial/failed submissions retaining drafts; flag-off reads and output.

## Goal
This card closes the loop. The captain sends a form, either by hand or on a schedule. The player answers it in the app. The answers then appear in three places:
- the queue (T-171);
- the player forms tab (T-172);
- the player file, through a new `form` adapter.

## Files
- `src/features/forms/` (data, components, hooks, messages, tests).
- `src/features/player-file/model.ts`: add the `form` adapter `formSnapshot(request, answers, questions)`. Only `maps_to` answers become facts.
- `src/features/captain-workspace/` forms tab: add a «اطلب فورم» button and wire «فكّره».
- `src/features/captain-workspace/` queue: include answered `form_requests` as rows.
- A player route for answering: `src/app/[locale]/(player)/player/forms/[requestId]/page.tsx` (thin, flag-gated), plus a pending-forms card on the player home, only when the flag is on.
- The scheduler: use the project's existing cron or scheduled mechanism if there is one (check `docs/ARCHITECTURE.md` and `vercel.json`). If there is none, stop and report it instead of adding infrastructure.
- This card.

## Requirements
1. **Send.** «اطلب فورم» opens a picker of the captain's forms and sets an optional due date, then creates a `form_request`. It is optimistic.
2. **Schedule.** A pure `dueRequests(forms, links, lastSent, now)` returns the requests to create (Africa/Cairo, idempotent per period). Fully unit tested with `now` injected.
3. **Remind.** «فكّره» sets `reminded_at` and uses the existing notifications feature. Scheduled reminders after `remind_after_hours` use the same pure function style.
4. **Player answer flow.**
   - Uses the shared `question-field.tsx`; one question per step on the phone.
   - Reviewer revision: keep a device draft keyed by player/request, restore on reopen, and submit online through the authenticated client using `stableId(requestId, questionId)`. Retain drafts on failure and clear only after confirmed success. Full offline queueing is deferred.
   - Photos upload to `forms/`.
   - The finish screen is a clear confirmation.
5. **Player file.** `loadPlayerFile` also reads answered requests: bounded to the last 12, with only the columns it needs. `formHistory` labels them with the form title.
6. **Alerts.** An answer matching `alert_on` marks the queue row as danger (the same as a new injury).
7. **Dates.** All of them use `localDate()`. No `Math.random`.

## Acceptance
- [x] Unit tests for `dueRequests`, the reminder rules, `formSnapshot` and the merge with check-ins.
- [x] Tests for device draft recovery, stable answer IDs, one-statement submission, failed writes and confirmed retries (online-first reviewer revision).
- [x] A PGlite test: the full flow of send → answer → `answered_at` → captain review.
- [x] Flag-off tests: the player home, the player routes and the captain workspace are unchanged.
- [ ] All gates pass.

## Out of scope
- Converting old check-ins.
- Email or WhatsApp delivery.
- New dependencies.

## Implementation notes

- `0093_form_schedules.sql` uses the existing hosted pg_cron mechanism; nothing was applied to a live database. The guarded jobs require the owner to mirror the UI deployment flag with the database setting `app.captain_workspace_enabled = '1'`. Leave that setting unset while the flag is off.
- Scheduled and manual sends share a form-row lock and reuse pending requests. Monthly day 29–31 schedules clamp to month end. Workers are owner-only; the manual-send function uses caller RLS.
- Submission is one bulk insert, followed by payload confirmation. Already submitted forms are immutable in this UI; a retry can confirm the same payload after captain review. No sync RPC, core/offline change, dependency, or budget change.
- Answer eligibility follows 0091's ownership and unreviewed-request policies; no new subscription restrictions were added to existing requests.
- Notification integration completed under the reviewer exception: both reminder paths use the dedicated `form_requested` type and `{name, request_id, form_id}` payload. The notification opens `/player/forms/[requestId]` and says «الكابتن مستني ردّك على {name}» / “Your captain is waiting for: {name}”. The bell and unread count hide this type while the workspace flag is off. PGlite verifies all 16 prior types remain accepted and `form_requested` is the only addition.
- Notes for reviewer: `supabase/functions/send-push/` is outside the granted Files list. Its separate push-message dictionary does not yet support `form_requested`; this card's notification integration covers the in-app bell. Push delivery for the new type needs a separately scoped template/link change there.

## Verification (2026-11-12)

- `npx tsc --noEmit -p .`: passed.
- `npx eslint .`: passed.
- Full fallback after the dedicated notification change: `npx vitest run --maxWorkers=2 --configLoader native --pool=threads`: **511 files, 3,553 tests passed**. Focused notification/PGlite tests also passed (12 files, 69 tests).
- `npm run audit:release` and therefore `npm run check` stop at Windows `spawnSync git EPERM`, after typecheck and lint pass. The same audit rules, with the file list supplied by PowerShell, passed for 2,038 tracked and new files: 0 findings.
- `npm run build`: compilation succeeds, then the TypeScript subprocess fails with Windows `spawn EPERM`. Standalone TypeScript passes. Removal of `.next` was rejected by sandbox command policy; no clean build is claimed.
- Next's own `writeRouteBundleStats` regenerated diagnostics from the current compiled manifests after the interrupted build. The perf test passed with its existing budgets. New `/[locale]/player/forms/[requestId]`: **257.71 KiB gzip** first-load JavaScript; this is a compilation measurement, not a completed build.
