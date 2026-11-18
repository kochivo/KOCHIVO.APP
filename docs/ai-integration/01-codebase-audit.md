# 01: Codebase audit for AI integration

Date: 2026-11-18. Read-only inspection. No application behavior changed.

## 1. Current architecture (verified)

| Area | What the code shows |
|---|---|
| Framework | Next 16.4.6 (App Router, Turbopack), React 19.3, TypeScript strict, Tailwind v4. Routes under `src/app/[locale]/…`; route handlers are under `[locale]/api/*` too (`api/ko`, `api/captain/task-count`, `api/share/rank`). |
| Structure | Feature folders `src/features/<name>` with `index.ts` and `server.ts` entries. Import direction `app → features → (ui, core, lib)`, 250-line file limit (AGENTS.md). |
| Data | Supabase Postgres. 150 migrations (`0001`–`0153`). RLS on every table, enforced in tests (`supabase/tests`, PGlite). |
| Auth | Supabase Auth with email code (Resend SMTP). Session cookies through `@supabase/ssr`. Roles in `profiles` (captain / player / admin). |
| Hosting | Vercel (fra1), production on `kochivo.site`. CI on GitHub Actions: tsc, eslint, release audit, vitest, build, perf budgets. Deploy is `staging` branch → promote → `master`. |
| Monitoring | Sentry (`@sentry/nextjs`). |
| AI today | **KO** (`src/features/ko-*`). Gemini `gemini-3.5-flash-lite` over plain `fetch` with function calling (`ko-agent/gemini.ts`). There is no AI SDK dependency. |

## 2. The existing AI layer (KO): most of the foundation already exists

| Piece | File | Notes |
|---|---|---|
| Tool definitions | `ko-account/data/intents.ts` | 15 tools with Zod schemas. Player: `my_progress`, `why_not_counted`, `read_exercise`, `read_nutrition`, `swap_exercise`, `meal_photo`. Captain: `player_summary`, `team_summary`, `read_exercise`, `update_exercise`, `create_training`, `create_nutrition`, `renew_subscription`, `send_reminder`. Both roles: `clarify`. Tools are filtered by role. |
| Model call | `ko-agent/gemini.ts` | `requestKoTool()`, 18 s timeout, `mode: ANY` (always exactly one tool). History is limited to 6 turns. |
| Execution | `ko-account/data/execute.ts`, `read-progress.ts`, `swap.ts`, `drafts.ts` | Runs with the **user's own Supabase client** (RLS applies) and never with the service role. |
| Write approval | `ko-account/data/approval.ts` + `ko_apply_action(p_token)` (migration 0071) | HMAC-signed action token, captain taps «نفذ», and the database re-checks before applying. `ko_action_receipts (captain_id, action_id)` makes it idempotent. |
| Rate limit | `ko_rate_take` RPC | 12 requests per 60 s per user. |
| Gating | `ko-entry/config.ts` | `KO_ENABLED`, `KO_GEMINI_PAID`, `KO_PILOT_USER_IDS`, `KO_ORIGIN`, `KO_APPROVAL_SECRET`, `GOOGLE_GENERATIVE_AI_API_KEY`. |
| UI | `ko-preview` (the «قريبًا» teaser and panel), `ko-feed`, `ko-account/messages.ts` (ar, arStd, en) | |
| Eval | `ko-account/eval/cases.ts` (T-390, in progress) | 100 Egyptian, English and Franco prompts. |

**Conclusion:** the internal assistant this brief asks for is KO. KO already has tools, role filtering, RLS-scoped execution, signed approvals and idempotency. The work is to **lift KO's tools into a shared registry** that both KO and an MCP server call, not to build a second assistant.

## 3. Data model facts that change the brief's assumptions

| Brief assumption | Reality in the schema |
|---|---|
| "An athlete may belong to multiple coaches." | **False today.** `coach_clients_one_active_captain`: a **unique** index on `player_id where archived_at is null`. A player has at most one active captain; older links are archived. Tools must still scope by `captain_id = auth.uid()` and an active link, which RLS and `captain_roster()` already do. |
| `get_upcoming_bookings` / "PT sessions" | There is **no calendar or booking table**. PT is session packages: `coach_clients.sessions_left`, `session_deductions` (0060, 0116). `assessment_schedules` covers check-in timing only. Bookings would be a new subsystem, so this is **not proposed**. A `get_pt_balances` tool is proposed instead. |
| Payments | `player_payments`, `payment_collections`, `payment_receipts`, `captain_packages`, `captain_package_tiers`, the `captain_dues()` RPC. These are financial data. In v1 they are read-only and summarized; there is no MCP write. |
| Tenancy | There is no "organization" table. The tenant is the **captain** (`profiles.id` with role captain), and all captain data is keyed by `captain_id`. Players read their own rows. |
| Audit | `admin_audit_log` exists for admin actions only, and `ko_action_receipts` stores ids only. **There is no general AI audit log.** This is missing. |

## 4. Reusable functions for the tools

| Proposed tool | Reuse |
|---|---|
| `get_coach_profile` | `profiles`, `fetchPlanSummary()` (billing/server) |
| `list_athletes` | `captain_roster()` RPC |
| `get_athlete_details` / `get_athlete_progress` | `read-progress.ts` (player summary), `team_leaderboard()`, `body_scans`, `workout_sessions`, `set_logs` |
| `list_workout_programs` / `get_workout_program` | `programs`, `program_days`, `program_exercises` (templates feature) |
| `list_exercises` | `exercises` (catalog plus the captain's own, RLS-scoped) |
| `get_expiring_subscriptions` | `coach_clients.access_until`, plus `team_summary` logic in `read-progress.ts` |
| `get_coach_analytics` | `team_leaderboard()`, dashboard home loaders (`features/dashboard`) |
| `get_dues` (new name) | `captain_dues()` RPC |
| Write: update sets/reps, renew, remind, drafts | `ko_apply_action` plus `drafts.ts`, which already go through approval |

## 5. Security findings

1. Good: every KO query uses the caller's JWT, so RLS decides. Nothing in the AI path uses the service role.
2. Good: writes need a signed, single-use token plus a database re-check.
3. Gap: there is no AI audit trail (who, which tool, result, duration, and from which client).
4. Gap: rate limiting is per user only, with no per-client or per-day budget (the «رصيد KO» credits were approved by the owner on 2026-11-16 but are not built).
5. Risk: route handlers live under `[locale]`. An MCP endpoint needs a fixed path without a locale prefix (`/api/mcp`), and the proxy must not rewrite it.
6. Risk: stored text (form answers, notes, check-in comments, exercise instructions) reaches the model. It must always be passed as data and never as instructions, and tools must never grant more than the caller's RLS allows.
7. Risk for MCP: an external client's own "approve tool call" button is **not** a KOCHIVO approval. Writes must keep the KOCHIVO-hosted confirmation.

## 6. Missing infrastructure

- OAuth 2.1 authorization server for MCP clients (discovery metadata, PKCE, dynamic client registration, consent, revocation).
- An MCP transport endpoint (Streamable HTTP).
- A shared tool registry with output schemas, a permission per tool, and read/write class.
- An `ai_audit_log` table, plus per-client connection records and revocation.
- Per-captain usage limits (KO credits).

## 7. Recommended strategy (short)

Keep KO. Extract its tools into `src/features/ai-tools` (the registry). KO's Gemini loop and a new MCP route both call `runTool(actor, name, args)`, which validates, authorizes, executes with the user's RLS client, and audits. Read-only first. Writes reuse the existing `ko_apply_action` approval flow. For OAuth, check Supabase Auth's OAuth 2.1 server first (see 02); build our own only if it doesn't fit.
