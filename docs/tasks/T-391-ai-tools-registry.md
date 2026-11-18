# T-391: Shared AI tool registry (read-only) + AI audit log

Milestone 2 of `docs/ai-integration/04-roadmap.md`. Read `docs/ai-integration/01..03` first.

## Goal
Add one place that defines and runs the read-only AI tools. Both KO and the MCP server (T-392) will call it.

- Every call is checked, runs with the **caller's own Supabase client** (RLS), and writes an audit row.
- This card adds no route and no UI, and KO is not changed yet.

## Build

### 1. Migration `supabase/migrations/0154_ai_audit_log.sql` (additive only)

**Table `public.ai_audit_log`** with these columns:
- `id uuid primary key default gen_random_uuid()`
- `created_at timestamptz not null default now()`
- `user_id uuid not null references profiles(id) on delete cascade`
- `client text not null`, checked with `client ~ '^(ko|mcp:[A-Za-z0-9._-]{1,80})$'`
- `tool text not null`, checked with `tool ~ '^[a-z_]{2,60}$'`
- `kind text not null`, checked with `kind in ('read','propose')`
- `status text not null`, checked with `status in ('ok','unauthorized','forbidden','invalid_input','not_found','rate_limited','timeout','unavailable')`
- `duration_ms int not null`, checked with `duration_ms between 0 and 600000`
- `correlation_id uuid not null`

Index `(user_id, created_at desc)`.

**Access:**
- RLS on.
- `revoke all` from public, anon and authenticated.
- `grant select` to authenticated, with a policy `user_id = (select auth.uid())`.
- The restrictive `not is_suspended()` policy, like the other tables.

**Insert only through `public.ai_audit_write(p_client text, p_tool text, p_kind text, p_status text, p_duration_ms int, p_correlation uuid)`:**
- `security definer`, `set search_path = ''`;
- `user_id = auth.uid()`, rejected if null;
- `grant execute` to authenticated only.

Do not log arguments, prompts or results.

### 2. PGlite test `supabase/tests/ai-audit-log.test.ts`
- A user can write and read only their own rows.
- A direct `insert` is denied.
- Another user reads 0 rows.
- An anonymous caller cannot call the function.
- Bad `client`, `tool` or `status` values are rejected.

### 3. Feature `src/features/ai-tools/`

Public API in `index.ts` (types) and `server.ts` (`runTool`, `listTools`).

**`types.ts`:**
- `AiActor = { id: string; role: 'captain' | 'player'; db: SupabaseClient<Database> }`, reusing the `KoActor` shape from `ko-account/data/account.ts` if it fits.
- `ToolContext = { actor; client: 'ko' | \`mcp:${string}\`; correlationId: string; now: Date; timezone: string; signal: AbortSignal }`.
- `AiTool<I, O> = { name; description /* English, for models */; input: z.ZodType<I>; output: z.ZodType<O>; roles; kind: 'read'; run(ctx, input): Promise<O> }`.
- `ToolResult = { ok: true; data } | { ok: false; error: { code; message } }`. The codes are the same as the `status` values in step 1.

**`run-tool.ts`, `runTool(ctx, name, rawArgs)` does these steps in order:**
1. If the tool is unknown, return `not_found`.
2. If the role isn't allowed, return `forbidden`.
3. Parse the input; on failure return `invalid_input`, with Zod issue paths only and no values.
4. Run the rate limit: the existing `ko_rate_take` RPC (12 per 60 s). On fail-closed, return `rate_limited`.
5. Run the tool with an 8 s timeout combined with `ctx.signal`. On timeout return `timeout`.
6. Parse the output. If it doesn't match, return `unavailable` and `console.error` once.
7. Write the audit row through `ai_audit_write`. If the audit write fails, still return the result and `console.warn`.

Any other thrown error becomes `unavailable`, and the error text never reaches the caller.

**`listTools(role)`** returns `{ name, description, inputJsonSchema }` using `z.toJSONSchema(schema, { target: 'draft-7' })`.

**Tools, one file each under `tools/`.** Reuse existing queries and RPCs; no service role, no new SQL.

| Tool | Roles | Input | Output (keep minimal) | Source |
|---|---|---|---|---|
| `get_coach_profile` | captain | `{}` | `{ name, timezone, plan: { tier, used, limit } }` | profiles + `fetchPlanSummary()` |
| `list_athletes` | captain | `{ status?: 'active' \| 'ending_soon' \| 'inactive' }` | `[{ id, name, accessUntil, lastTraining, program }]`, max 200 | `captain_roster()` |
| `get_athlete_details` | captain | `{ athleteId: uuid }` | name, access_until, sessions_left, frozen, program title, nutrition plan title, last training | `captain_roster()` + `coach_clients` (own link only) |
| `get_athlete_progress` | captain (any roster player), player (self only; athleteId omitted or equal to self) | `{ athleteId?: uuid }` | `{ month: { done, planned, adherence }, rank, points, lastBodyScan }` | reuse the logic in `ko-account/data/read-progress.ts`; extract a shared pure helper if needed, without changing KO behavior |
| `list_workout_programs` | captain | `{ athleteId?: uuid }` | `[{ id, title, athlete, status, days }]` | `programs` |
| `get_workout_program` | captain | `{ programId: uuid }` | days with exercises: name, sets, reps_min, reps_max, rest | `program_days`, `program_exercises`, `exercises` |
| `list_exercises` | captain | `{ query?: string(2..40), muscle?: string }` | max 50 `[{ id, name, muscle, equipment, own }]` | `exercises` |
| `get_expiring_subscriptions` | captain | `{ days: int 1..30 }` | `[{ id, name, accessUntil, daysLeft }]` | `captain_roster()` with `localDate(now, timezone)` |
| `get_coach_analytics` | captain | `{}` | `{ active, adherenceThisMonth, adherenceLastMonth, leader }` | `team_leaderboard()` for both months |
| `get_dues` | captain | `{}` | `[{ id, name, dueEgp }]` and a total | `captain_dues()` |

**Never return:** emails, phones, receipt URLs, pain, cycle, Ramadan or chat data.

**Every uuid argument is checked against the caller's own data:**
- A player id that is not in `captain_roster()` returns `not_found`, both for another captain's player and for one that doesn't exist.
- A player calling with another `athleteId` gets `forbidden`.

**Dates:** use `localDate(now, timezone)` with both arguments (repo rule).

### 4. Tests: `src/features/ai-tools/ai-tools.test.ts` and more files if needed
Mock the Supabase client. Inject `now`. No network.

Cover:
- unknown tool;
- wrong role (a player calling `list_athletes`);
- invalid input;
- a foreign `athleteId` returns `not_found`;
- a player calling another player's progress gets `forbidden`;
- a timeout (fake timers);
- an output that doesn't match its schema returns `unavailable`;
- a rate limit returns `rate_limited`;
- an audit row is written with the right status and no args;
- an audit failure still returns the data;
- `listTools('player')` returns only `get_athlete_progress`.

## Out of scope
- KO code (`ko-account`, `ko-agent`): no behavior change. Extracting a pure helper from `read-progress.ts` is allowed only if KO's tests still pass unchanged.
- Any route, any UI, write tools, OAuth.
- No new dependency. No `.env*`. Do not edit migrations 0001–0153. Do not apply the migration anywhere.

## Rules
AGENTS.md:
- 250 lines per file;
- no `any` and no `!` without a comment;
- `import type`;
- no `console.log`.

## Checks (all must pass)
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ai-tools`
- `npx vitest run src/features/ai-tools src/features/ko-account supabase/tests/ai-audit-log.test.ts`
