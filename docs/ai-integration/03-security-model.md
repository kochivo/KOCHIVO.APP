# 03: Security model

## 1. Authentication

| Entry | How the caller is identified |
|---|---|
| KO panel (`/api/ko`) | Supabase session cookie, as today. The origin and host are checked, and the user must be on the pilot list while KO is gated. |
| MCP (`/api/mcp`) | `Authorization: Bearer <access token>` from the OAuth flow. No cookies. No API keys pasted into clients. |

OAuth requirements:
- authorization code + PKCE (S256) only;
- exact redirect URI match;
- access tokens live 1 hour or less;
- refresh tokens are rotated, stored hashed, and revocable from KOCHIVO settings («الأدوات المتصلة» → «افصل»);
- scopes `kochivo.read` and (later) `kochivo.write`;
- tokens are bound to the audience `https://kochivo.site/api/mcp`.

A plain Supabase session token is **never** accepted on `/api/mcp`. The token must carry the MCP audience and client id. The service-role key is never used in any AI path.

## 2. Authorization (checked on every call, in this order)

1. The token or session is valid and the user is not suspended (`is_suspended()`).
2. The role allows the tool (the registry's `roles`).
3. The scope allows the tool kind (`read` vs `propose`).
4. Tenant: the actor is always the token's user. **Tool arguments can never name the actor or the captain.** Player references are resolved only inside `captain_roster()`, so another captain's player resolves to `not_found`, the same as a missing one.
5. Data access goes through the user-scoped Supabase client, so RLS is the final gate (AGENTS.md §3).
6. Players can call self-only tools. A player token on a captain tool returns `forbidden`.

Multi-coach: today a player has one active captain (unique index), and archived links give no access. If multi-coach is ever added, the active-link check in `captain_roster()` already scopes by `captain_id`.

## 3. Prompt injection

- Stored text (notes, form answers, exercise steps, chat) is returned inside fields marked as data. It never goes into the system prompt.
- Every tool call is re-authorized whatever the model "decided". The model has no power beyond the caller's own permissions.
- Writes are proposals only, and a human approves them inside KOCHIVO.
- The T-390 eval includes injection cases. The gate is zero `unsafe_action` outcomes before any release.

## 4. Privacy and minimization

- Tools return only the fields they need: display name, not phone or email; money as totals per player, not receipt images; health notes (pain, cycle, Ramadan) **excluded** from MCP v1.
- The first MCP connection shows a consent screen that says which data leaves KOCHIVO to the coach's chosen AI company.
- Players are never exposed to MCP in v1 (captain-only connector).
- Under the Gemini paid tier, data is not used for training (`KO_GEMINI_PAID=1` gate stays).

## 5. Audit log (new table `ai_audit_log`, additive migration)

Columns:
- `id`, `created_at`, `user_id`, `captain_id`;
- `client` (`ko`, or `mcp:<client_id>`), `tool`, `kind`;
- `status` (`ok`, `error code`, `proposed`, `applied`, `rejected`, `expired`);
- `duration_ms`, `correlation_id`, `proposal_id` (nullable).

Rules:
- **Not logged:** prompts, tool arguments with names, tokens, results.
- RLS: a captain reads their own rows. Admins read everything. Rows are insert-only through a `security definer` function.
- Retention: 180 days.

## 6. Abuse limits

| Limit | Value |
|---|---|
| Per-user rate | Existing `ko_rate_take` (12 per minute), shared by KO and MCP |
| Per-client daily cap | Added per client |
| Credits | Per captain («رصيد KO») |
| Payload size | Requests over 64 KB are rejected |
| Read timeout | 8 s per tool |
