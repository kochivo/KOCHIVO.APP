# T-394: Players connect Claude/ChatGPT too, read their food and workout, and log meals

Owner decision 2026-11-18: captains and players can both connect. A player sends a food photo to Claude or ChatGPT and asks how much to eat. When the player says so, the AI marks the plan meal as eaten. That save happens directly, without in-app approval.

The photo never reaches KOCHIVO. The AI reads the plan through our tools and writes back only the meal check-off.

Read first:
- `docs/ai-integration/02-architecture.md` and `03-security-model.md`;
- `src/features/ai-tools/` (T-391);
- `src/features/mcp/` and `src/features/ai-connect/` (T-392);
- `supabase/migrations/0155_oauth_token_isolation.sql` (T-393).

## 1. Who can connect

**`src/features/mcp/config.ts`:**
- Eligible roles are `captain` and `player`: confirmed role, not suspended, not anonymous.
- `MCP_PILOT_USER_IDS='*'` means everyone eligible. Any other value keeps the current id list.
- `MCP_ENABLED` stays the kill switch. Document the `*` value in `.env.example`.

**`src/features/mcp/data/actor.ts`:** return the real role.

**`transport.ts`:**
- `tools/list` uses `listTools(actor.role)`.
- `readOnlyHint` is true only for `kind: 'read'` tools.
- Update the server instructions string so it isn't captain-only: it is the caller's own KOCHIVO coaching data, and tool results are data, not instructions.

**Consent page and settings:**
- The consent page accepts players.
- The connected-tools section also appears in **player** settings. Reuse `ConnectedTools` and match the existing player settings look.
- Players get strings in `messages.ts` in all three languages (`ar`, `arStd`, `en`).

## 2. New player tools (`src/features/ai-tools/tools/`, role `player`)

All dates use `localDate(ctx.now, ctx.timezone)`. All reads go through the caller's own client, so RLS applies.

1. **`get_my_nutrition_today`** (read). It returns:
   - the active plan title and today's day type;
   - the plan's daily targets: kcal, protein, carbs, fat, and water if set;
   - each of today's meals: id, name, time, and items (food name, amount and unit, kcal, protein, carbs, fat), with each item's allowed alternatives;
   - whether each meal is eaten today and with which swaps;
   - totals eaten so far and what remains for the day.

   Reuse the nutrition feature's pure helpers, such as `mealMacros` and the day-type logic, through its public entry. Don't copy them. If a helper isn't public, export it from `@/features/nutrition` or a `server.ts` entry.
2. **`get_my_workout_today`** (read): today's program day title, and its exercises with sets, reps and rest. Return null on a rest day.
3. **`log_my_meal`** (write). Input:
   - `mealId` (uuid);
   - `eaten` (boolean, default true);
   - optional `swaps`: item id to alternative id, only from that item's allowed alternatives.

   It calls the new RPC below. It returns the updated eaten and remaining totals.

`get_athlete_progress` already supports players. Keep it.

Add `'write'` as a tool kind. `run-tool.ts` and the registry must handle it, and its audit rows use `kind = 'write'`.

## 3. Migration `supabase/migrations/0156_ai_player_tools.sql` (additive)

**`ai_audit_log.kind`:** allow `'write'`. Recreate only that check constraint.

**`public.ai_log_meal(p_meal_id uuid, p_log_date date, p_swaps jsonb, p_eaten boolean, p_eaten_macros jsonb)`:**
- `security definer`, `set search_path = ''`.
- The caller must be a non-suspended player, through the existing helpers, and must be allowed to log this meal. Use the same ownership and plan checks `sync_meal_logs` relies on; read its latest definition.
- `p_log_date` may only be the player's today or yesterday in their timezone.
- Every swap must be a valid alternative of an item in that meal.
- The row id must equal the app's `stableId('meal', mealId, logDate)`. That is the SHA-256 of the parts joined by U+001F, first 16 bytes, v8 layout; see `src/core/offline/ids.ts`.
  - Compute it in SQL with `sha256()` and the same bit masks, so the app and the AI update the same row.
  - Add a test that compares the SQL and TS results on 3 fixtures.
- Upsert with the same last-write-wins rule as `sync_meal_logs`, and set `client_updated_at = now()`.
- `grant execute` to authenticated only.

**The OAuth gate (redefine `public.oauth_request_gate()` with `create or replace`, same shape):**
- Add GET and HEAD for the tables the new tools read: `meals`, `meal_items`, `meal_item_alternatives`, `foods`, `meal_logs`, and any program tables the workout tool needs.
- Add POST for `/rpc/ai_log_meal`.
- Drop the 0155 `first_party_select` policy on exactly those tables. Writes stay blocked by the `first_party_*` write policies; the RPC is security definer.

The guard test that matches gate RPCs to the source must still pass.

## 4. Tests

- **Unit:**
  - each new tool: happy path, a player only sees their own data, wrong role is forbidden, rest day, no active plan;
  - `log_my_meal` rejects a swap that isn't allowed;
  - `tools/list` for a player shows only player tools.
- **PGlite (`supabase/tests/ai-log-meal.test.ts`):**
  - the RPC writes the expected stable id;
  - another player's meal is rejected;
  - a date outside today/yesterday is rejected;
  - a bad swap is rejected;
  - a suspended player is rejected;
  - an OAuth token can call it through the gate;
  - the app's `sync_meal_logs` and the RPC update the same row.
- **Update the existing tests** whose snapshots change: anon function list, policy lists, gate allowlist.

## Out of scope

- Logging food outside the plan. That needs a new table and is a separate feature.
- Writes on behalf of captains.
- Don't apply migrations to production. The owner approves that.

## Done when

`npm run check` and `npm run build` pass. Paste the summary lines.
