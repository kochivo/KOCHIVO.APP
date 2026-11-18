# 04: Roadmap

Each milestone is one or more cards (T-3xx), implemented by Codex and reviewed by Claude. Each lands behind a flag (`AI_TOOLS`, `MCP_ENABLED`), is reversible by turning the flag off, and needs the owner's OK before going live.

| # | Milestone | Reuses | Likely files | DB | Size | Done when |
|---|---|---|---|---|---|---|
| 0 | KO baseline eval (T-390, running) | `planIntent` | `ko-account/eval/*` | none | S | Report with pass %, unsafe actions, latency and tokens per message |
| 1 | Audit and security design (these docs) | n/a | `docs/ai-integration/*` | none | S | Owner approves |
| 2 | Shared read-only registry; KO moves onto it | KO intents, read-progress, roster RPCs | new `features/ai-tools/*`; `ko-account/data/intents.ts` becomes an adapter | `ai_audit_log` (additive) + RLS test | M | All KO tests and the eval stay the same or better; 10 read tools with input and output schemas; audit rows written |
| 3 | OAuth spike, then the MCP endpoint | registry, Supabase Auth | `app/api/mcp/route.ts`, `.well-known/*`, consent page, «الأدوات المتصلة» in settings | `ai_clients` / `ai_grants` only if the Supabase OAuth server is not usable | M–L | Claude connects, lists tools and reads the roster; ChatGPT tested; revoke works; captain A cannot read captain B (PGlite + route tests) |
| 4 | KO answers in its own words, from data | registry, provider adapter | `ko-agent/providers/*`, KO panel | none | M | Eval: numbers in replies match tool data 100%; Egyptian tone checked |
| 5 | Write proposals and approvals | `ko_apply_action`, approval tokens, receipts | `ai-tools/propose/*`, approve page | maybe extend `ko_apply_action` (new migration) | M | No write without the «نفذ» step; retries are idempotent; MCP writes go through the approve link |
| 6 | Hardening | Sentry, rate RPC | limits, credits UI, usage view | credits tables (additive) | M | Credits enforced, 80% alert, dashboards |
| 7 | Automation (morning brief, follow-ups) | registry | cron route | none | M | Only after 2–6 have been stable for 2 weeks |

## Needed from the owner

1. Approve this plan (no code before that).
2. Approve the dependency `@modelcontextprotocol/sdk` (official MCP SDK), or say no and we hand-write the protocol.
3. Allow a spike to check that the Supabase OAuth 2.1 server is available on the project. It uses dashboard settings only and changes no data.
4. Decide which AI clients you want first: Claude only, or Claude and ChatGPT.

## Cost

| Item | Cost |
|---|---|
| Hosting | No new infrastructure. It stays on the current Vercel and Supabase. |
| MCP | **No model cost for us.** The coach's own AI subscription pays for the model. |
| KO panel | Gemini per message. The real number comes from T-390, before the credit numbers are set. |

## Rollback

- Each milestone has its own flag; turn it off and the feature is gone.
- Migrations only add (`ai_audit_log` and the client tables), so turning a flag off leaves no broken data.
- Tokens can be revoked all at once by rotating the signing secret.
