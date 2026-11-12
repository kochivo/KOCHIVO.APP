# T-191: Assessments library and per-player scheduling (mockup v6, screens ٥ and ٦)

**Phase:** Captain workspace v6 (owner approval 2026-11-12: "نفس الشكل 100%"; name «التقييمات» / "Assessments") · **Depends on:** T-188 · **Status:** implemented; visual and standard-Arabic reviewer reconciliation pending
**Migration:** `0096_assessment_schedules.sql`, **additive only**, not applied. Applying it to production needs the owner's approval.
**Flag:** behind `captainWorkspaceEnabled()`; flag off byte-identical.

## Goal
"Forms" become **Assessments** (التقييمات): question sets the captain asks players to answer once, weekly, monthly, every N days, or when a player joins. Today a schedule belongs to the whole form and goes to every player. The owner wants to schedule an assessment **per player** at a time the captain chooses. Build screens ٥ and ٦ exactly.

Read first: `docs/mockups/captain-workspace/v6-owner-review.html` (screens ٥ and ٦), `docs/mockups/captain-workspace/v6-spec.md`, migrations `0091_custom_forms.sql` and `0093_form_schedules.sql`, and `src/features/forms/`.

## Files
- `supabase/migrations/0096_assessment_schedules.sql` + PGlite tests in `supabase/tests/`.
- `src/types/` database overlay for the new table.
- `src/features/forms/` (library page, builder, schedule editor, request picker, data) and `src/features/captain-workspace/forms/` (player tab), tests, messages (`ar`/`en` only).
- The التقييمات tab slot in the T-188 shell and `/captain/players/[playerId]/assessments` content.
- This card.

## Requirements
1. **Database (additive):**
   - New table `public.assessment_schedules`: `id uuid pk`, `form_id` → forms, `captain_id`, `player_id` (nullable = all active players of the captain), `kind text check in ('once','week','month','days','on_join')`, `every_days int null` (2–60 for `days`), `weekday int null`, `day int null`, `hour int`, `minute int default 0`, `starts_on date`, `ends_on date null`, `max_times int null`, `remind_after_hours int null`, `paused_at timestamptz null`, `created_at`, `updated_at`. Checks for each kind's required fields.
   - RLS: captain can CRUD own rows only; player can read rows that target them; nobody else. PGlite RLS tests.
   - New owner-only worker function `queue_assessment_schedules(p_now)` that creates `form_requests` for due schedules using the **player's timezone** (`profiles.timezone`, default Cairo), idempotent per period (same pattern as `queue_form_schedules`). Register its cron job gated by the same `app.captain_workspace_enabled` setting. Do **not** change or drop `queue_form_schedules` or `forms.schedule`; existing whole-form schedules keep working and show in the UI as "all players".
2. **Library = screen ٥:** header «التقييمات» + subline + primary «تقييم جديد»; four tiles (مستني رد، اتردّ عليه الأسبوع ده، نسبة الرد، متوسط وقت الرد) from the existing metrics; rows: name + «{n} أسئلة · …», who receives it («{n} لاعيبة» / player name / «كل لاعب جديد»), schedule summary with icon, response rate, chevron; «ابدأ من قالب جاهز» chips: متابعة أسبوعية، قياسات شهرية، تقييم بداية، صور تطور (use the existing templates; add «صور تطور» as a template).
3. **Schedule for a player = screen ٦** (from the player file التقييمات tab and from an assessment's page):
   - Side panel «تقييمات {name}» with each assessment and its next date or last answer, and «ابعت تقييم دلوقتي» (existing manual send).
   - Step ١ «أنهي تقييم؟» chips + «جديد». Step ٢ «امتى؟»: مرة واحدة / كل أسبوع / كل شهر / كل كام يوم, with the matching fields (كل {n} أيام، الساعة، يبدأ من) and end: لحد ما أوقفه / لحد {date} / عدد مرات. Step ٣ «لو ماردّش»: من غير تذكير / فكّره بعد 12 ساعة / فكّره بعد يوم.
   - The lime summary sentence that states exactly what will happen, in the player's timezone, including the count of sends when it ends.
   - «جدولة» (primary) and «إلغاء». Edit, pause and delete an existing schedule.
4. **Rename:** every captain and player string says «تقييم / التقييمات» ("Assessment(s)"). Routes and code names stay `forms`.
5. Copy every Arabic string from the mockup exactly. `ar` + `en` only.

## Acceptance
- [ ] Matches mockups ٥ and ٦ at 1440×900 and 390×844 (differences listed).
- [x] PGlite: table checks, RLS (captain/player/other captain/anon), worker idempotency, player-timezone due times (Cairo, Riyadh, London DST), on_join.
- [x] Unit tests: summary sentence, next-date maths for every kind, end conditions.
- [x] Existing form schedules and requests unchanged (test).
- [ ] Flag off byte-identical; all gates pass; budgets unchanged.

## Out of scope
- T-183 (moving the old Cairo-only database functions to per-user timezones).
- Applying the migration to production.

## Feature inventory

| Existing feature, action, data or state | Destination |
|---|---|
| Library active forms, question counts, recipient counts, response rates, average response time | Screen ٥ rows and four metric tiles; active/sent counts retained as supplementary facts |
| Five existing templates, title/question/option editing, required fields, mappings, alerts, reorder/delete, player preview | Template chips and existing lazy autosaving builder; add progress-photo template |
| Autosave pending/saving/saved/error/retry, invalid drafts, discard, navigation lock | Existing builder with shared save status; input retained on failure |
| Existing whole-form weekly/monthly Cairo schedule and reminder editor | Preserved builder section, explicitly all players; new schedule editor alongside |
| Manual send, optional due date, pending requests, manual reminders, deep-linked requests | Player panel manual-send action and existing request manager below scheduler |
| Answer review/reply, alerts, mapped facts, photos/signing/recovery | Existing custom request review and legacy forms timeline/detail below scheduler (v6-spec extension) |
| Legacy intake/check-in history, selection, mobile detail, review lock, loading/empty/error/retry | Existing player forms content retained below new scheduling layout |
| Player offline answers, photo upload/draft recovery and submit | Unchanged player answering flow; assessment terminology already present |

## Implementation plan

1. Add failing deterministic recurrence/summary and PGlite access/worker tests.
2. Add migration 0096, table overlay, timezone recurrence model and per-player schedule actions. Keep legacy objects unchanged.
3. Build screen ٥ with bulk data reads and real metrics, existing builder/templates and all-player legacy schedule summaries.
4. Build screen ٦ in the existing assessments tab extension, including manual send and schedule create/edit/pause/delete; preserve review/history below.
5. Run all requested gates and attempt desktop/mobile browser verification; record exact limitations and backend findings here.

## Backend findings

- Existing `forms.schedule` is whole-form and Cairo-based; it remains intact. New per-player scheduling uses `profiles.timezone` directly, independently of the international UI flag.
- Existing `form_requests` has no schedule/period foreign key. An owner-only private delivery ledger is needed to retain idempotency and per-player send counts without altering that table or its rows. It also snapshots reminder timing per delivery.
- No production schema changes will be applied. The new schedule UI requires migration 0096 to be applied by the owner/reviewer.
- Legacy `queue_form_reminders` reads `forms.remind_after_hours` for all requests. Two new trigger guards apply only to ledger-backed deliveries, so their no-reminder/12h/24h choice survives legacy worker runs. Paused/deleted schedules suppress automatic reminders; explicit captain reminders still work. Deleted schedules leave private request provenance (`schedule_id` becomes null) rather than making requests eligible for legacy reminders.
- Recurring workers retain the existing pending-request suppression pattern. Summary counts represent planned slots; inactive recipients or an outstanding unanswered request can reduce actual sends. Old Cairo-only functions and `forms.schedule` have not been altered.

## Public entries and file map

- `supabase/migrations/0096_assessment_schedules.sql`: additive checked schedule table, ownership/recipient RLS, private delivery ledger, owner-only queue/reminder functions, caller-scoped count projection, additive reminder guards, and flag-gated cron registration. No existing function or row is rewritten.
- `supabase/tests/assessment-schedules.test.ts`: real PGlite access/constraints, per-player clocks, London DST, on-join, month clamping, once catch-up, counts, duplicate prevention, eligibility, reminders and legacy coexistence including pause/delete. Existing `form-schedules.test.ts` remains unchanged and passes.
- `src/types/assessment-schedules.ts`, `app-database.ts`: the typed new-table/RPC overlay; generated `database.ts` is untouched.
- `forms/assessment-recurrence.ts`, `assessment-summary.ts`, `assessment-schema.ts`: deterministic calendar recurrence, finite counts (including periods longer than ten years), exact mockup summary, join eligibility, and validated writes. Their recurrence/summary tests cover the boundary cases.
- `forms/assessments/messages.ts`: new ar/en assessment copy only. `forms/messages.ts`: approved template names. No arStd or `standard/` edits.
- `forms/data/assessment-workspace.ts`, `assessment-library.ts`: bulk selected-column reads, profile timezones, counts and real library metrics; no per-row query fanout. `assessment-actions.ts`: flag/auth guarded create/update/pause/delete and workspace reads.
- `forms/components/assessment-library-list.tsx`, `assessment-library-metrics.tsx`, `forms-library-page.tsx`: screen ٥ rows, four tiles, four approved chips, retained injury/data-update templates in a disclosure, and selected assessment scheduling.
- `assessment-schedule-entry.tsx`, `assessment-workspace.tsx`, `assessment-panel.tsx`, `assessment-editor.tsx`, `assessment-fields.tsx`: lazy screen ٦, player/all-player targets, three steps, timezone summary, optimistic writes with rollback, retained input on errors, edit/pause/delete, legacy schedules and manual send.
- `forms/components/form-builder.tsx`, `schedule-section.tsx`, `library-workspace.tsx`, `library-list.tsx`: shared save status, explicitly labeled existing all-player editor, full-width initial library and retained lazy builder/navigation lock.
- `forms/model.ts`, `templates.ts`, `types.ts`: new progress-photo template with fresh IDs and unchanged persisted kind enum. Existing templates remain available.
- `forms/data/request-load.ts`, `request-bulk.test.ts`: request history now uses bulk reads and retains questions, answers and photo paths. `assessment-ui.test.ts` checks panel status/controls, matching fields and legacy/template visibility; `request-boundaries.test.ts` follows the renamed lazy schedule entry.
- `captain-workspace/forms/forms-screen.tsx`: existing tab slot loads the new public schedule entry even when legacy history is loading or failed, then retains all timeline/detail/review/photo behavior. No shared player-file shell or route modification was necessary; the existing assessments route already loads this slot.

## Verification and Notes for reviewer

- Feature inventory is above. No commit, push, branch, dependency, budget, `.env*`, shared player-file shell, other card folder, generated database type or standard-Arabic edit.
- Browser verification at **1440×900** and **390×844** remains incomplete: `npm run dev -- --hostname 127.0.0.1 --port 3191` fails with `spawn EPERM`; Playwright launch using installed Edge (`channel: 'msedge'`) also fails with `spawn EPERM` before either viewport can open. Screens ٥ and ٦ were read from the approved markup in full.
- Intended UI extensions/differences to review: the shared shell header/tabs stay above the tab; native accessible date/time controls replace static mockup values; additional existing templates are in a disclosure, legacy/manual request review and legacy history remain below, and schedule edit/pause/delete actions use an overflow menu. Data is real rather than mockup sample literals. Legacy whole-form schedules remain explicitly Cairo-based (T-183 is out of scope).
- `npm run check` reaches typecheck/lint successfully but fails at `npm run audit:release` because `spawnSync git EPERM`. The unchanged `scanFile`/`scanRoutes` audit was also run using `git ls-files --cached --others --exclude-standard` piped through the shell, including new files: **0 findings**.
- Normal `npx vitest run` fails loading its config with `spawn EPERM`. The exact requested fallback is `npx vitest run --maxWorkers=2 --configLoader native --pool=threads`.
- Normal `npm run build` compiles but fails starting its TypeScript subprocess with `spawn EPERM`. An in-memory fallback enables `experimental.workerThreads=true` and `experimental.useTypeScriptCli=false`, without editing configuration. It completed production generation of **61 static pages**. Public Supabase settings are absent in this workspace; the fallback uses process-only non-secret placeholders (`https://test.invalid`, `sb_publishable_test_build_placeholder`) and `NEXT_PUBLIC_CAPTAIN_WORKSPACE=1`. It does not verify a live database or authenticated route.
- The only intended test exceptions are `src/core/i18n/coverage.test.ts` (new assessment arStd coverage) and `dictionary-gating.test.ts` (complete standard dictionary). The brief explicitly forbids this card from adding/reconciling arStd. Do not weaken those gates; reviewer reconciliation is required.
- Final complete fallback suite: **Test Files 2 failed | 602 passed (604); Tests 2 failed | 3864 passed (3866)**. Both failures are exactly the standard-Arabic gates above; all forms, offline, RLS and legacy scheduler tests pass. An earlier run overlapped a rebuild and saw stale chunk paths; the complete suite was rerun without rebuilding and its budget check passed.
- `npx tsc --noEmit -p .`, `npx eslint .` and `git diff --check` pass. No scoped source file exceeds 250 lines.
- Final post-build budget gate: `npx vitest run src/lib/perf-budget.test.ts --maxWorkers=2 --configLoader native --pool=threads` passes with the ceilings unchanged (**Test Files 1 passed (1); Tests 1 passed (1)**). Measured gzip KiB: player assessments **244.41**, assessment library **228.26**, player settings **298.58**.

Build fallback used (process-only test settings, no file edits):

```powershell
$env:NEXT_PUBLIC_CAPTAIN_WORKSPACE='1'
$env:NEXT_PUBLIC_SUPABASE_URL='https://test.invalid'
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_test_build_placeholder'
node -e "process.execArgv=[];const c=require('next/dist/server/config-shared').defaultConfig;c.experimental.useTypeScriptCli=false;c.experimental.workerThreads=true;process.argv=['node','next','build'];require('next/dist/bin/next')"
```
