# T-393: Keep third-party OAuth tokens read-only and limited to the AI tools' data

This blocks turning on the Supabase OAuth Server in production. T-392 reviewer note, 2026-11-18.

## Why

A token that Supabase OAuth issues to Claude or ChatGPT is a normal `authenticated` JWT. The only difference is an extra `client_id` claim.

So with today's policies, whoever holds that token can call the Supabase Data API directly. They get everything the captain can do in the app, including writes and security-definer RPCs.

The MCP endpoint itself is read-only. That isn't enough, because the token can be used outside it.

Supabase's guidance is to check `auth.jwt() ->> 'client_id'` in policies. See https://supabase.com/docs/guides/auth/oauth-server/token-security.

## Build

### Migration `supabase/migrations/0155_oauth_token_isolation.sql` (additive only)

1. **`public.is_oauth_client()`**
   - `stable`, `set search_path = ''`.
   - Returns true when `(auth.jwt() ->> 'client_id')` is not null.
   - `grant execute` to authenticated.
2. **`public.require_first_party()`**
   - Raises `insufficient_privilege` when `is_oauth_client()` is true.
3. **Restrictive write policy on every `public` table with RLS on.** Generate it in a `do` block over `pg_tables`:
   - one restrictive policy each `for insert`, `for update` and `for delete`, `to authenticated`;
   - the policy is `not public.is_oauth_client()`.
4. **Restrictive select policy on every `public` table except this allowlist:**
   - the tables the AI tools read: `profiles`, `coach_clients`, `nutrition_plans`, `programs`, `exercises`, `plan_tiers`, `body_scans`;
   - `ai_audit_log`.

   For all other tables, an OAuth token reads nothing.
5. **Write and sensitive RPCs reject OAuth tokens.** Every `security definer` function in `public` that changes data, or returns data the tools don't use, gets `perform public.require_first_party();` as its first statement.
   - Recreate each one with `create or replace` and keep its exact body otherwise.
   - These read RPCs stay callable: `captain_roster`, `captain_dues`, `current_tier`, `team_leaderboard`, `my_points`, `ai_audit_write`, `ko_rate_take`.
6. **Storage.** A restrictive policy on `storage.objects` blocks OAuth tokens for all operations.

### Tests: `supabase/tests/oauth-token-isolation.test.ts` (PGlite)

Use a JWT with a `client_id` claim and one without it.

**OAuth token:**
- insert, update and delete fail on 3 sample tables;
- select on a non-allowlisted table returns 0 rows;
- the allowlisted reads still work under the normal captain RLS;
- a write RPC (for example `ko_apply_action`) raises an error;
- `captain_roster` works.

**Normal app token:** nothing changes. Run the existing suites.

**Guard test:** list every `security definer` function in `public` that is not in the read allowlist, and fail if its body lacks `require_first_party`. New RPCs can't forget the check.

## Out of scope

- No app code changes. The MCP endpoint and tools stay as they are.
- Don't apply the migration to production. The owner approves that.

## Done when

- `npm run check` and `npm run build` pass.
- The new PGlite test passes.
- The full `supabase/tests` suite still passes.
