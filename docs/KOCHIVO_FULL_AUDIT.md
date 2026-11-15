# KOCHIVO — full production-readiness audit

Date: 2026-11-15. Code audited: commit `5c5d4d01` (live in production) plus `76bed9c0` (T-286, local). Migrations 0001–0110.

## How this audit was done

| Part | Method | Who |
|---|---|---|
| Architecture, live database, advisors, gates, e2e | Direct inspection, read-only SQL on production, local build and tests | Claude |
| Security, auth, RLS, storage | Code review + PGlite probes with two captains and a shared player (read-only, no network) | Codex D |
| Database design, integrity, performance | All 110 migrations replayed in PGlite, catalog queries, caller tracing | Codex C |
| Business logic and bugs | Workflow tracing UI → action → RPC → tables, targeted tests | Codex E |

Verification labels:

- **VERIFIED (live)**: read-only query against production.
- **VERIFIED (PGlite)**: reproduced against the full migration chain in an in-memory Postgres.
- **VERIFIED (test run)**: an existing or new automated test shows it.
- **CODE-REVIEW ONLY**: read in source, not executed.
- **BLOCKED**: could not be run safely or with the access available.
- **NOT TESTED**: out of reach for this audit.

No production data was changed. No accounts were created. No secrets or env files were read.

## 1. Architecture (summary)

- **App:** Next.js 16.4 (Turbopack), React 19, Tailwind v4 tokens. Hosted on Vercel (fra1), domain kochivo.site.
- **Data:** Supabase Postgres with RLS as the security boundary. Auth uses email, OTP and Google. Private and public Storage buckets.
- **Layers:** `src/app` (thin routes) → `src/features/*` (UI, hooks, data) → `src/core`, `src/ui`, `src/lib`.
- **Offline:** player writes (sessions, sets, meal logs) go through `saveAndQueue()` into a Dexie queue, then sync RPCs. Ids come from `stableId()`.
- **Roles:**
  - captain (approved by admin);
  - player (linked to one active captain through `coach_clients`);
  - admin (`admins` table);
  - anonymous demo users.
- **Scheduled work (pg_cron, VERIFIED live):** 10 active jobs, all succeeding in the last 7 days.
  - account purge, daily;
  - demo purge, every 30 minutes;
  - workout and expiry reminders;
  - form and assessment schedules and reminders;
  - crown reminders and freeze.

## 2. Confirmed defects

| ID | Severity | Title | Verification | Live exposure today |
|---|---|---|---|---|
| DB-01 | HIGH | One custom form blocks the whole account-deletion purge | VERIFIED (PGlite) | None yet: 0 accounts waiting for deletion (live) |
| SEC-06 | HIGH | A new captain can read the previous captain's chat audio | VERIFIED (PGlite); policy confirmed live | None yet: 0 players have had two captains (live) |
| SEC-07 | MEDIUM | A former captain keeps receiving new assessment answers after a transfer | VERIFIED (PGlite) | None yet (same reason) |
| DB-02 | MEDIUM | Nutrition template copy and assign drop `day_type`, `time_of_day` and `unit` | VERIFIED (PGlite) | Yes, whenever a template is used |
| DB-03 | MEDIUM | Two session ids for the same day and date can take two PT credits | VERIFIED (PGlite) | No duplicates live (0); the normal client uses stable ids |
| DB-04 | MEDIUM | Saving a form is several requests, so a failure leaves a half-saved form | CODE-REVIEW ONLY | Possible on bad networks |
| PERF-01 | MEDIUM | Inbox previews make one request per player every 60 s | CODE-REVIEW ONLY | Grows with roster size |
| PERF-02 | MEDIUM | The forms library runs queries per form, one after another | CODE-REVIEW ONLY | Grows with form count (11 forms live) |
| SEC-08 | LOW | `safe_timezone(uuid)` returns any user's timezone, even to suspended callers | VERIFIED (PGlite) | Metadata only |
| PERF-03 | LOW | Two duplicate indexes | VERIFIED (PGlite) | Small write overhead |
| DB-05 | LOW | Deleting a meal or exercise leaves logs without their reference (`ON DELETE SET NULL`) | VERIFIED (live): old rows with NULL refs from 2026-11-03 | History loses its label |

Logic and bug findings (BL/BUG) are in section 4.

### DB-01 — One custom form blocks the whole account-deletion purge (HIGH)

- **Where:**
  - `supabase/migrations/0020_settings.sql:41` (purge);
  - `0091_custom_forms.sql:4,43,44,59`;
  - `0096_assessment_schedules.sql:6,56`.
- **Evidence:** `purge_deleted_accounts()` runs one `delete from auth.users where id in (...)`. `forms.captain_id` references `profiles(id)` without `on delete cascade`. A PGlite probe with one captain who owns a form, plus two other overdue accounts, failed:
  ```
  SQLSTATE 23503 ... violates foreign key constraint "forms_captain_id_fkey"
  remaining overdue fixture accounts: 3
  ```
- **Live:** the cron job `purge-deleted-accounts` runs daily and has not failed in 30 days. That is because no account has been due yet. 11 forms exist, so the first captain with a form who deletes their account will stop every deletion, every night.
- **Related risk (CODE-REVIEW ONLY):** `purge_demo_workspaces()` deletes demo users the same way. It is safe today, with 0 failures in 7 days, but it would break the same way if a demo seed ever created forms.
- **Impact:** deletion requests are not honoured, a privacy and legal promise. One bad row blocks everyone.
- **Fix:** an additive migration that deletes the forms, requests, answers, schedules and deliveries graph for purged users before the `auth.users` delete. Alternatively, change those FKs to cascade only for the owner columns. Add a regression test: a purge with a populated form plus an unrelated due account deletes both.

### SEC-06 — A new captain can read the previous captain's chat audio (HIGH)

- **Where:**
  - `supabase/migrations/0038_voice_notes.sql:44`;
  - `0104_chat_messages.sql:8,41`;
  - `src/core/storage/private-media.ts:26`.
- **Evidence (live policy, exact):**
  ```
  voice_notes_read: bucket_id = 'voice-notes' AND (storage_owner(name) = auth.uid() OR is_captain_of(storage_owner(name)))
  ```
  Any current captain of the player can read every audio file under that player's folder, including the chat with the old captain. PGlite after a transfer from A to B:
  ```
  NEW_CAPTAIN_MESSAGES []
  NEW_CAPTAIN_OLD_AUDIO [{"name":"<P>/chat/private.webm"}]
  ```
- **Live:** 4 voice objects. 0 players have had more than one captain, so no real leak has happened yet.
- **Impact:** private health or coaching audio from another captain's conversation becomes readable by the new captain.
- **Fix:** an additive migration that replaces `voice_notes_read`. The captain branch must match the exact path in `chat_messages` or `voice_notes`, with the caller as the recorded captain. Player access stays. Regression test in PGlite.

### SEC-07 — A former captain keeps receiving new assessment answers (MEDIUM)

- **Where:**
  - `supabase/migrations/0091_custom_forms.sql:111,121,123,132,170`;
  - `src/features/forms/data/submit-answers.ts:17`;
  - `src/features/player-shell/data/start-gate.ts:13`.
- **Evidence:** answer insert checks `r.player_id = auth.uid() and r.reviewed_at is null`, with no current-link check. In PGlite, A read a new answer the player sent after moving to B. The start gate also selects blocking requests by player only, so an old captain's unanswered form can block the player under the new captain (CODE-REVIEW ONLY).
- **Fix:** require a current, non-archived link to the request's captain for answer writes, the answer trigger and assessment photo uploads. Scope the start gate to the current captain. Additive migration plus PGlite test.

### DB-02 — Nutrition templates drop meal day type, meal time and item unit (MEDIUM)

- **Where:**
  - `supabase/migrations/0022_templates.sql:60`;
  - `0028_template_not_empty.sql:73`;
  - `0036_locked_starter_templates.sql:134`;
  - `src/features/templates/data/templates.ts:100,115,133`.
- **Evidence:** the copy functions still insert only `(plan_id, position, name)` and `(meal_id, food_id, grams, position)`. In PGlite, a source meal with `day_type=training, time_of_day=13:00, unit=loaf` came back as `{day_type:'all', time_of_day:null, unit:null}`.
- **Impact:** a captain assigns a template and the player gets a changed plan: training-day meals show every day, and times and units vanish.
- **Fix:** an additive migration that replaces the three functions with the full column list, plus round-trip tests.

### DB-03 — Duplicate logical sessions can take two PT credits (MEDIUM)

- **Where:**
  - `supabase/migrations/0006_workout_logs.sql:5`;
  - `0059_session_feedback.sql:10,16`;
  - `0064_package_rules.sql:118,120`;
  - `0097_timezone_aware_functions.sql:81`.
- **Evidence:** `sync_workout_sessions` resolves conflicts only on `id`, and nothing makes `(player_id, program_day_id, training_date)` unique. In PGlite, two ids for one day gave 2 sessions and took the PT balance from 3 to 1.
- **Live:** 0 duplicate logical sessions.
- **Impact:** needs a non-standard client or a direct RPC call by the player. The normal app uses `stableId`.
- **Fix:** in the RPC, deduplicate the PT deduction on the logical key. That is safer than a unique index, because orphaned history rows have a NULL day. Test it.

### DB-04 — Form save is not atomic (MEDIUM, CODE-REVIEW ONLY)

- **Where:** `src/features/forms/data/save-form.ts:45,51,56,58`.
- **Evidence:** the parent upsert, then one position update per question, then a question upsert, then a delete. Each is a separate request. A failure part way returns `{ok:false}` but keeps the earlier writes.
- **Fix:** one `save_form` RPC in a transaction. This is an architectural change, so it needs approval.

### PERF-01 — Inbox preview N+1 (MEDIUM, CODE-REVIEW ONLY)

- **Where:** `src/features/inbox/data/conversation-previews.ts:8-9`, `src/features/chat/data/chat.ts:18,26`, `unread-counts.ts:5`.
- **Evidence:** `Promise.all(players.map(... listMessages(limit 1)))`, polled every 60 s, signs audio URLs for previews, and counts unread messages in JS.
- **Impact:** 100 players means 101 requests every minute per open inbox.
- **Fix:** one RPC that returns the latest message and unread count per player. Sign audio only on playback.

### PERF-02 — Forms library sequential queries (MEDIUM, CODE-REVIEW ONLY)

- **Where:** `src/features/forms/data/library.ts:16,19,30,33`, `metrics.ts:27,33`.
- **Evidence:** 20 forms means 84 requests, most of them awaited one after another.
- **Fix:** batch the question reads with `in(form_id)` and compute metrics from one read.

### SEC-08 — Timezone helper leaks timezone (LOW)

- **Where:** `supabase/migrations/0097_timezone_aware_functions.sql:4,16,27`.
- **Evidence:** a security definer with no caller check. An outsider, and even a suspended caller, got `Pacific/Auckland` for another user.
- **Fix:** keep an internal function and expose a checked wrapper. Do not just revoke it, because policies depend on it.

### PERF-03 — Duplicate indexes (LOW)

- `daily_checks_player_date` duplicates the unique `(player_id, log_date)`.
- `assessment_deliveries_request` duplicates the primary key.
- **Fix:** a drop-index migration. It is safe, but it is still a production schema change.

### DB-05 — History loses references when a meal or exercise is deleted (LOW)

- **Evidence (live):** set and meal logs with NULL `program_exercise_id`/`meal_id`, all from 2026-11-03. They are not duplicates. The cause is `ON DELETE SET NULL`.
- **Impact:** old history shows without its exercise or meal name.
- **Fix (later):** store a name snapshot on the log row. This is a design change, so it is listed only.

## 3. Suspected risks and configuration (not defects in code)

| ID | Severity | Item | Verification |
|---|---|---|---|
| CFG-01 | MEDIUM | Supabase Auth "leaked password protection" is off | VERIFIED (live advisor) |
| CFG-02 | LOW | Anonymous sign-ins are on (needed by the demo). Abuse is limited by the 24 h demo purge | VERIFIED (live advisor + cron) |
| CFG-03 | LOW | `pg_net` extension sits in the `public` schema | VERIFIED (live advisor) |
| PERF-04 | LOW | 16 unindexed FKs, 13 unused indexes, 29 tables with several permissive policies, 4 `auth_rls_initplan` warnings (`ko_approval_config`, `ko_action_receipts`, `ko_waitlist`, `coach_waitlist`) | VERIFIED (live advisor) |
| DEP-01 | LOW | `npm audit`: 5 moderate, all in Sentry build tooling, none in runtime code | VERIFIED (test run) |
| RL-01 | MEDIUM | The KO AI endpoint throttle lives in process memory, so it is not shared across Vercel instances | CODE-REVIEW ONLY |
| AUTH-01 | — | Hosted Auth settings (OAuth allowlist, email templates, OTP rate limits) | NOT TESTED (dashboard only) |

## 4. Business logic and bugs (confirmed)

The logic audit ran 763 test files (4,495 tests passed, 2 skipped), typecheck and lint, all passing. Then it traced each workflow.

| ID | Severity | Title | Verification | Live exposure today |
|---|---|---|---|---|
| BL-01 | **HIGH** (raised from MEDIUM: live) | The player sees training-day and rest-day meals together, and totals add both | CODE-REVIEW ONLY; affected data VERIFIED (live) | **1 active plan has day-typed meals** |
| BL-02 | MEDIUM | Same as DB-02 (template copy drops meal metadata) | VERIFIED (PGlite) | Whenever a template is used |
| BUG-01 | MEDIUM | A KO edit of sets fails when the exercise has a per-set plan, and a reps edit "succeeds" without changing the per-set targets | VERIFIED (PGlite) | When KO edits are used |
| BUG-02 | MEDIUM | Deleting a custom exercise used only as an alternative leaves a dangling id that blocks later edits of that program exercise | VERIFIED (PGlite) | When it happens |
| BL-03 | MEDIUM | A cardio-only day can be assigned but cannot be completed | CODE-REVIEW ONLY | 0 cardio-only days live |
| BL-04 | MEDIUM | Answered custom assessments never show in Home or Tasks | CODE-REVIEW ONLY (`tasks.ts:19,25` pass `skipRequests: true`; `buildTasks` drops kind `request`) | 0 unreviewed answered requests live |
| BUG-03 | LOW | Data export leaves out body scans, forms, chat, payments and the program and meal details | CODE-REVIEW ONLY | Every export |

### BL-01 — The player sees meals from both day types (HIGH)

- **Where:**
  - `src/features/nutrition/data/nutrition-snapshot.ts:33,46`;
  - `nutrition-screen.tsx:45`;
  - `day-type.tsx:32`.
- **Evidence:** the player select is `meals(id,position,name,meal_items(...))`, with no `day_type`, `time_of_day` or `unit`. The screen renders `snapshot.meals.map(...)` unfiltered. `DayType` only changes a label.
- **Live:** 1 active player plan has meals marked `training` or `rest`. That player sees both menus every day.
- **Impact:** a wrong prescription on the player's main screen, and wrong macro totals.
- **Fix:** app-only, no migration. Carry the three fields into the offline snapshot, filter by today's day type, and show the time and unit. Card T-291.

### BUG-01 — KO edits ignore `set_plan`

- **Where:**
  - `src/features/ko-account/data/execute.ts:72,97`;
  - `supabase/migrations/0071_ko_account_actions.sql:145`;
  - `0100_exercise_alternatives_set_plan.sql:26`.
- **Evidence:** a sets change failed with `23514 set_plan length must equal sets`. A reps-only change returned success, but the per-set targets stayed `8–12`.
- **Fix:** an additive migration that resizes or updates `set_plan` together with sets and reps.

### BUG-02 — Dangling alternative ids

- **Where:** `src/features/programs/data/custom-exercise.ts:50`, `0100_exercise_alternatives_set_plan.sql:4,18`.
- **Evidence:** a delete succeeded while the uuid stayed in `alternatives[]`. The next edit then failed with `23514 alternative must be visible to the program captain`.
- **Fix:** a delete guard that raises `23503` when the exercise is referenced in `alternatives`. The existing archive fallback then runs.

### BL-03 — A cardio-only day cannot be finished

- **Where:**
  - `0050_weekly_cycle.sql:73`;
  - `src/features/workout/queue.ts:10`;
  - `focus-screen.tsx:69,90`;
  - `use-focus-session.ts:103,109`.
- **Fix:** a "finish" action for cardio-only days, using `stableId` and `saveAndQueue()`.

### BL-04 — Custom assessments are missing from Home and Tasks

- **Where:** `src/features/captain-workspace/queue/data/tasks.ts:19,25`, `page.ts:47`, `tasks-model.ts:19`.
- **Fix:** include requests in `loadTasks()` and keep kind `request` in the task model, so the counts stay shared.

### BUG-03 — Incomplete data export

- **Where:** `src/features/settings/data/settings.ts:130,147`.
- **Fix:** add the missing owned tables and child rows, and say clearly what is excluded.

**Checked and fine (logic):**

- Dexie row and outbox writes share one transaction, and revision checks keep edits made during a sync.
- Receipt and offer decisions are atomic.
- Home, Tasks and nav counts share `loadTasks()`.
- No `Math.random` ids and no `toISOString().slice(0,10)` dates in production sources.
- Earlier CH-01 and CH-02 are fixed.

## 4b. Severity totals

| | CRITICAL | HIGH | MEDIUM | LOW |
|---|---|---|---|---|
| Confirmed defects (sections 2 and 4, BL-02 counted once with DB-02) | 0 | 3 (DB-01, SEC-06, BL-01) | 10 | 4 |
| Suspected risks and configuration (section 3) | 0 | 0 | 2 | 4 |

## 5. Checked and fine

**Tenant isolation, reads (VERIFIED live, read-only impersonation inside rolled-back transactions):**

- Captain A sees 0 rows of captain B across about 25 tables.
- A player sees only their own rows.
- Anon sees only the published package catalog.

**Tenant isolation, writes (VERIFIED PGlite):**

- Foreign mutations return `42501`.
- A second active link for a player fails with `23505`.
- After a transfer, the old captain loses access to sessions, sets, meals and body scans. The player keeps their history.

**Production write isolation: BLOCKED.** Even a rolled-back impersonated UPDATE on production was refused by the session's safety policy. PGlite covers it.

**Other checks:**

- **RLS:** every public table has RLS and a restrictive `active_caller` policy, except the intentional profile self-read (VERIFIED PGlite).
- **Security definer functions:** all have a pinned empty `search_path` (VERIFIED PGlite).
- **Anon RPCs:** limited to `invite_preview`, `coach_public_page`, `coach_public_profile`, `coach_public_stats` and `package_catalog_published` (VERIFIED PGlite).
- **Admin:** regular users cannot call admin RPCs or insert into `admins` (VERIFIED PGlite).
- **Suspension:** blocks tenant reads (VERIFIED PGlite). SEC-08 is the one exception.
- **Storage:** private buckets have MIME and size limits, and receipt paths bind player and captain (VERIFIED PGlite). The public buckets are media and avatars, by design (VERIFIED live).
- **Auth redirects:** callback targets are fixed internal paths and `next=` is ignored. No open redirect (CODE-REVIEW ONLY).
- **XSS:** the only `dangerouslySetInnerHTML` is the app boot script (CODE-REVIEW ONLY).
- **SQL injection:** searches escape PostgREST values (CODE-REVIEW ONLY).
- **Earlier review findings:**
  - SEC-01..05 (T-015) are fixed by 0025–0027, and their tests pass.
  - The 20th-set bug (T-041) is fixed by 0041.
- **Cron:** all 10 jobs succeeded in the last 7 days (VERIFIED live).
- **Migrations:** 0001–0110 apply cleanly in order (VERIFIED PGlite). Production has 0110 applied (VERIFIED live).
