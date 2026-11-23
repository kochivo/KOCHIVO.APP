# T-436 — Incidental live findings: notifications duplication/garble, invite label

**Phase:** fix · **Depends on:** none · **Status:** ready

## Goal
Two incidental findings from the live review (2026-11-22, kochivo.site, captain Ali Esmail, Arabic dark), outside the six assigned screens: (a) the Notifications page repeats the same pain report several times and has a garbled line "متمرّنش بقاله 3 أيام أو أكتر من 5 ساعات"; (b) the invite form's package option reads "0 شهر 500 ج" while its summary spans a month (22 Nov → 21 Dec).

## Design decisions (read first)
1. **(a) The garbled line is a composition bug, not a typo.** Two real strings exist: `src/features/notifications/messages.ts:52` `player_inactive: '{name} متمرّنش بقاله 3 أيام أو أكتر'` and `src/features/ko-feed/messages.ts:4` `digestInactive: 'لاعب واحد متمرّنش من 5 أيام'`. The live line "متمرّنش بقاله 3 أيام أو أكتر من 5 ساعات" reads like two different alerts stitched together (a 3-days inactivity line + a "5 ..." fragment from another alert). Find where the notifications page composes its lines (`src/features/notifications/components/captain-notification-format.ts`, `captain-notifications-entry.tsx`, and the ko-feed digest if the page renders it) and fix the composition so each notification renders exactly one complete, correct sentence.
2. **(a) Dedup identical notifications.** The same pain report appears several times. Deduplicate identical notifications (same type + same player + same underlying event) keeping the latest, at the point where the list is built — not by hiding rows in CSS. If the duplicates are genuinely distinct events, say so in Notes for reviewer with the evidence and fix only the garbling.
3. **(b) The option label must match the real duration.** The invite form's package option says "0 شهر 500 ج" while the summary spans a month (22 Nov → 21 Dec). The duration formatter is `src/features/billing/package-choice.ts:14-19` (`durationLabel`: `days === 30` → `t('month')`, else months/days). Find where the option label is composed (invite form / package choice) and fix the month count so a 30-day package reads as one month, not "0 شهر". The summary is already right; make the option agree with it.

## Files
Create or modify only these:
- `docs/tasks/T-436-notifications-invite-label.md`: this card
- (a) `src/features/notifications/components/captain-notification-format.ts` and `src/features/notifications/components/captain-notifications-entry.tsx` (line composition + list dedup)
- (a) `src/features/notifications/messages.ts` (only if a string must change; ar/arStd/en)
- (a) `src/features/ko-feed/digest.ts` — ONLY if the garbled line comes from the digest (this card owns digest.ts; T-429 must not edit it)
- (b) `src/features/roster/components/invite-form.tsx` (option label composition)
- (b) `src/features/billing/package-choice.ts` (duration label, if the month count is wrong here) and `src/features/billing/pricing.ts` (only if the price/days input to the label is wrong here)
- Tests: notification tests under `src/features/notifications/` and ko-feed `digest.test.ts` (extend for the garbled line + dedup); invite-form/package-choice tests if any exist (create a focused test for the label if none does)

Do not edit any file outside this list. Do not touch the staged log-cleanup entries, any T-421 file, any KO file (`src/features/ko-account/**`, `src/features/ko-entry/config.ts`, migrations 0164–0167, `src/types/app-database.ts`). If a fix genuinely needs another file, implement everything else and report the file + lines + reason in your final message instead of editing it. Do not commit or push.

## Requirements
1. (a) Every notification on the Notifications page renders one complete, correct sentence; the "3 أيام أو أكتر من 5 ساعات" stitching is gone.
2. (a) Identical notifications (same type + player + event) appear once, latest first.
3. (b) A 30-day package option reads as one month (e.g. "شهر واحد 500 ج" / "1 شهر 500 ج" per the existing label format), matching the summary's month span.
4. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log`, tokens only, logical RTL properties only, touch targets ≥ 48px, every user-facing string in `messages.ts` (ar/arStd/en), no emoji.

## Acceptance
- [ ] Notifications page: no repeated identical pain report; no garbled inactivity line.
- [ ] Invite form: the package option label duration matches the summary (30 days = one month).
- [ ] `npm run check`, `npm run build` and `npx vitest run src/lib/perf-budget.test.ts` pass.

## Tests (deterministic, inject `now`, no real timers, no network)
- Notification format/digest tests: the inactivity line renders exactly once, complete, for one player; two identical pain reports collapse to one (latest kept).
- Package label test: a 30-day package option renders the one-month label; the summary span and the option agree.

## Out of scope
- The KO badge count (T-429) — if the badge count turns out to come from the digest, report it; do not change the count here.
- Notification read/unread behaviour, mark-as-read.
- A live re-check on kochivo.site (not possible until deploy).

## Notes for reviewer
- State what stitched the garbled line together, and whether the duplicates were identical events or distinct ones.
- (a) What stitched the line together: **not the digest and not two alerts.** The Notifications page never renders the ko-feed digest (its inactive line says "5 أيام", not "5 ساعات"), so `digest.ts` was left untouched. The garble is the `player_inactive` sentence ending in the dangling comparator "أو أكتر" rendered directly above its own relative timestamp "من 5 ساعات" in the same row (`captain-notifications-entry.tsx`): "[name] متمرّنش بقاله 3 أيام أو أكتر" + "من 5 ساعات" reads as one false sentence, "...3 أيام أو أكتر من 5 ساعات". Fixed by closing the sentence — `player_inactive` is now "{name} متمرّنش من 3 أيام" (arStd "لم يتمرّن {name} منذ 3 أيام", en "{name} has not trained for 3 days") — and by giving the timestamp top margin in the entry, matching the dropdown.
- (a) Duplicates: the repeated pain rows are **distinct pain reports that render identically**, not same-event duplicates. Evidence: the `notify_pain()` trigger (`supabase/migrations/0123_pain_reports.sql`) inserts exactly one notification per `pain_reports` row with a distinct `report_id`; writes are deduplicated by `stableId('pain', session, exercise, set)` (`src/features/workout/data/save-pain.ts`) and `sync_pain_reports` uses `on conflict(id) do nothing`, so a retry/double-submit cannot re-fire the trigger for the same event. They look identical because the text ("{name} بلّغ عن وجع") carries no area/severity. The list now collapses them anyway — `deduplicateNotifications` in `captain-notification-format.ts`, applied in the entry, keeps the latest `player_pain` / `player_inactive` row per player. Every other type is left alone: their payloads identify distinct events (form requests, check-ins, receipts) and collapsing those would hide real work. All reports stay reachable via the player file's `#pain-reports` link.
- (a) Out-of-scope note: the notification dropdown (`notification-dropdown.tsx`) renders the same `useNotifications` rows and was not in this card's Files list, so it still shows un-deduped rows; the exported helper can be applied there by a follow-up.
- (b) The "0 شهر" shape is exactly what `durationLabel` produced for a 0-day duration: `months.other` ("{n} شهر") with count 0. A saved 30-day package rendered "شهر" in HEAD (verified by rendering `InviteForm`); the summary was already right. `durationLabel` now routes 30 days through the plural months form with n=1 ("شهر واحد" / "1 month") and labels a zero/missing duration as days ("٠ يوم"), so a 0 month-count can never render again. The `month` dictionary entries are now unused by `durationLabel` (only by it) and were left in place.

## References
- `src/features/notifications/messages.ts:52` (`player_inactive`)
- `src/features/ko-feed/messages.ts:4,22` (`digestInactive`, `inactive`)
- `src/features/billing/package-choice.ts:14-19` (`durationLabel`)
- `src/features/notifications/components/captain-notification-format.ts`
