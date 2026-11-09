# T-125 — Check-in triage and "Send and next"

**Phase:** KO core · **Depends on:** none · **Status:** draft

## Goal
A captain with 40 weekly check-ins sees the ones that need attention first, each with a short
reason ("Weight flat for 2 weeks", "Sleeping under 6 h"). They can reply and jump straight to
the next one with **Send and next**. All flags come from fixed rules with **no AI calls**.

## Files
Create or modify only these:
- `src/features/inbox/triage.ts`: pure `triage(item, history, dailyChecks, now)` → `{ group, flags[] }`
- `src/features/inbox/triage.test.ts`
- `src/features/inbox/data/triage-inputs.ts`: last 4 check-ins and last 7 `daily_checks` for the listed players (one query each, RLS-scoped)
- `src/features/inbox/components/inbox-groups.tsx`: "Needs attention" / "Routine" sections and the All / Needs attention / Routine filter
- `src/features/inbox/components/flag-chip.tsx`
- `src/features/inbox/components/inbox-screen.tsx`: use the groups; keep the file under 250 lines (move logic out if needed)
- `src/features/inbox/components/reply-box.tsx`: add "Send and next"
- `src/features/inbox/components/checkin-detail.tsx`: show deltas versus the last check-in and the 7-day sleep and soreness averages
- `src/features/inbox/messages.ts`
- This task card.

## Requirements
1. **Flags** (each a message key with values):
   - `weight_flat`: |change| < 0.3 kg over the last 3 check-ins while the goal is fat loss or muscle
   - `weight_jump`: |change| ≥ 2 kg since the last check-in
   - `low_sleep`: 7-day average sleep < 6 h (at least 3 logs)
   - `high_soreness`: 7-day average soreness ≥ 4 (at least 3 logs)
   - `no_logs`: no `daily_checks` in 7 days
   - `note_present`: the player wrote notes (always worth reading)
2. Any flag except `note_present` → group `attention`; otherwise `routine`. Within a group,
   sort by flag count, then oldest first.
3. **Send and next:** saves the reply with the existing review path, then moves focus to the
   next open item in the same group. When there are none, show "All caught up" (an empty state,
   not an error). It is the primary action; plain Send becomes secondary.
4. Deltas display "+0.1 kg since Oct 29" style text using locale formatting. Missing previous
   data shows nothing (never "0").
5. No schema change. Inputs read through existing RLS (the captain reads only their players).

## Acceptance
- [x] Unit tests per flag at its boundary, missing data, and grouping order, with injected `now`
- [x] UI tests: groups, filter, "Send and next" advancing, all-caught-up state, ar/en, RTL
- [ ] `npm run check` and `npm run build` pass

## Out of scope
- AI reply drafts (T-126)
- Push for flagged check-ins
- Changing the player check-in form

## Implementation plan
- [x] Add deterministic flag, missing-data, ordering, and UI tests in triage.test.ts.
- [x] Implement pure triage and RLS-scoped batched inputs in the listed new files.
- [x] Add translated groups, chips, check-in comparisons, and Send and next using the existing review path.
- [x] Run npm run check and npm run build; review scope and file sizes (environment blockers below).

Decisions: use the Cairo calendar day and the preceding six days for daily averages;
ignore deleted and future daily logs. Include the current check-in in the three-check-in
weight window, without skipping missing measurements. Form videos stay routine unless
their note is present; health flags apply to weekly check-ins only.

Goal lookup: profiles and player_intake have no categorical fat-loss/muscle goal.
Onboarding saves only weight_kg and optional target_weight_kg; a gain target does not
establish a muscle goal. Per reviewer fallback, weight_flat applies to everyone.
History is the last four weekly check-ins per listed player using an embedded
per-player limit; daily logs are today plus six prior Cairo dates, excluding deletions.

Review: triage inputs must finish before showing grouped rows or advancing a reply.
If loading triage inputs fails, rows still show (unflagged, as routine) with the retry banner,
plain Send keeps working, and only "Send and next" is hidden (reviewer fix: a triage
failure must never block replying). Show all resets both
filters. UI tests follow existing server-render/element-handler patterns; browser
focus behavior still relies on the existing ResponsiveDialog implementation.

Verification notes: the inbox suite passes with Vitest's native config loader and
thread pool (the sandbox blocks default child processes). A full suite run passed
390 files / 2671 tests; perf-budget.test.ts alone failed because a .next chunk was
missing after the unsuccessful font build. npm run check passes typecheck and lint,
then the release audit is blocked by spawnSync git EPERM. Running the same audit
rules with paths piped from git reports two existing unguarded dev/ko routes
(page.tsx and chat/route.ts), outside this card. Build cannot fetch Alexandria,
Changa, and Manrope from Google Fonts in the sandbox. No schema or dependency
changes, and no commits.
