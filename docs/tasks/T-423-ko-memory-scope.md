# T-423 — KO memory is scoped per player

**Phase:** fix · **Depends on:** none · **Status:** ready

## Goal
A captain's note about one player never leaks into another player's answers, and never collides on save. Today the unique index is `(user_id, lower(text))` with no player, the load reads every memory for the user, and the route feeds all of them to Gemini — so "prefers mornings" saved for Ahmed then Youssef fails the second insert, and a note about Ahmed can be applied when the captain asks about Youssef.

## Design decisions (read first — they are load-bearing)
1. **`player_id` already exists — the scoping is missing, not the column.** `supabase/migrations/0162_ko_memory.sql` already has `player_id uuid references profiles(id)` and `saveMemory` (`src/features/ko-account/data/memory.ts`) already inserts it via `validateMemory` (`memory-validation.ts` returns `{ kind, text, player_id }`). The bugs are: the unique index ignores it, `loadMemory` selects only `id, text` with no player filter, and the route feeds every memory regardless of `contextPlayer`.
2. **Scope = (user, player).** `loadMemory(actor, playerId)` filters: a player actor loads their own memories (`player_id IS NULL` — players can never set a player target, see `validateMemory`); a captain with a context player loads only `player_id = <that player>`; a captain with no context player loads only `player_id IS NULL` (their own general notes). A memory must never be fed to Gemini for a different player. Thread the context player through `readChatMemory` / `rememberFromPlan` (`chat-memory.ts`) — read `resolveContext` (`context.ts`) and the route's `contextPlayer` first and define the exact filter there; the existing `existing` strings passed to `validateMemory` for dedup must come from the same scoped load, so dedup is scoped too.
3. **Unique index must treat NULL as a value.** Postgres treats NULLs as distinct in a unique index, so a plain `(user_id, player_id, lower(text))` index would let two general (NULL-player) memories with the same text both insert. Use `NULLS NOT DISTINCT` if the project's Postgres supports it (check what other migrations use), otherwise an expression index on `coalesce(player_id, '00000000-0000-0000-0000-000000000000')`. Either way the invariant is: same user + same player (including NULL) + same text (case-insensitive) = one row.
4. **Backfill is a no-op by construction.** Existing rows already carry the `player_id` they were saved with, so no data rewrite is needed. Document this in the migration comment; rows that cannot be attributed do not exist (every row was saved with either a resolved player or NULL by design). The 30-row trim trigger (`ko_trim_memories`) stays per-user and needs no change.
5. **The old collision test must change.** `supabase/tests/ko-memory.test.ts:36` currently asserts that inserting the same text for a different player rejects with `/unique/`. That assertion encodes the bug — replace it with: same text + same player rejects, same text + different player succeeds, same text + NULL player succeeds alongside a player-scoped one.

## Files
Create or modify only these:
- `docs/tasks/T-423-ko-memory-scope.md`: this card
- `src/features/ko-account/data/memory.ts`: `loadMemory(actor, playerId?)` filters by the scoped player (see decision 2); `saveMemory` unchanged except it must keep passing the scoped `existing` list (verify the callers pass it).
- `src/features/ko-account/data/chat-memory.ts`: thread the context player id through `readChatMemory` and `rememberFromPlan` so load and dedup use the same scope.
- `src/features/ko-account/data/route.ts`: pass the resolved `contextPlayer` id into the memory load (the `readChatMemory` call next to `loadFacts`); nothing else in the route changes.
- `src/features/ko-account/data/memory-validation.ts`: only if the dedup needs an explicit player parameter — otherwise leave untouched and say so in Notes.
- `supabase/migrations/0166_ko_memory_scope.sql`: new additive migration — drop `ko_memories_text_idx`, create the re-scoped unique index per decision 3. No other change. Never edit an applied migration.
- `supabase/tests/ko-memory.test.ts`: update the collision assertion per decision 5; add per-player cases (see Tests).
- `src/features/ko-account/memory.test.ts`: extend for scoped load/dedup (see Tests).

## Requirements
1. A captain saving the same note text for two different players succeeds twice (two rows); saving it twice for the same player is a single row (dedup/unique, no error surfaced).
2. When the captain asks about player B, only B's memories reach Gemini; A's memories never appear in `[memory]` facts. When there is no context player, only general (NULL) memories are fed.
3. A player sees only their own (NULL-player) memories; a captain's player-scoped memories are never visible to another player (RLS already enforces owner reads — verify, do not weaken it).
4. The 30-row trim still works per user; the memory view ("KO فاكر إيه عنك") shows the same memories as before for a player (their own scope).
5. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log`, TypeScript strict.

## Acceptance
- [ ] Same text for Ahmed and Youssef saves twice; same text twice for Ahmed saves once.
- [ ] `[memory]` facts for a Youssef question contain no Ahmed memory (test asserts on the fed facts, not just the DB rows).
- [ ] Player load returns only the player's own memories.
- [ ] `supabase/tests/ko-memory.test.ts` passes with the updated assertions; targeted vitest files pass; `npx tsc --noEmit` and `npx eslint` on touched files pass.
- [ ] No change to the memory view UI, the learning switch, feedback, or KO answers other than the scoping.

## Tests (deterministic, inject `now`, no real timers, no network; mock Gemini)
- `supabase/tests/ko-memory.test.ts` (PGlite): insert same text for two roster players as captain (both succeed); insert same text twice for the same player (second rejects unique); insert same text with NULL player alongside a player-scoped one (both succeed); roster/RLS cases from the existing test still pass.
- `src/features/ko-account/memory.test.ts`: scoped `loadMemory` returns only the requested player's rows (+ NULL rows only when no player is given for a captain); `saveMemory` dedups against the scoped list only (same text for a different player is not treated as a duplicate).

## Out of scope
- Changing the 30-row cap, the trim trigger, the learning switch, or the memory view UI.
- The memory-validation gaps in the audit (spaced 6-digit codes, prices) — separate fix, note under Notes.
- Voice-input grounding (T-424/T-425 area) and prompt-injection hardening — separate work.
- Do not apply the migration to any real database.
- No new dependency.

## Notes for reviewer
- Record here: the NULLS NOT DISTINCT vs coalesce choice with the Postgres evidence, and whether `memory-validation.ts` needed a change.
- **Choice: `NULLS NOT DISTINCT`** (migration 0166). It needs Postgres 15+ (PostgreSQL docs, `CREATE INDEX ... NULLS [NOT] DISTINCT`); Supabase runs Postgres 15 or 17 on the platform, and the PGlite test database is PostgreSQL 18.6 (verified by running `select version()` in this clone). No migration in the repo uses `NULLS NOT DISTINCT` yet, and none uses a coalesce expression index for uniqueness, so this sets the precedent. The coalesce fallback was not needed.
- **`memory-validation.ts` needed no change.** `validateMemory` already takes the player id and dedups against the `existing` list it is given; the scoping happens at the load (`loadMemory`), and `rememberFromPlan` reuses that scoped load for `existing`, so dedup is scoped without touching validation. `rememberFromPlan` also needed no signature change for the same reason — the context player reaches it through the scoped `state`, not a new parameter.
- **Memory view consequence of decision 2:** `learning-route.ts` calls `loadMemory(actor)` with no player, so a captain's "KO فاكر إيه عنك" list now shows only their general (NULL-player) notes; player-scoped notes no longer appear there. That follows decision 2 as written, and the view UI is unchanged. If captains should still manage per-player notes from that view, that is a follow-up (learning-route is outside this card's Files list).
- **Mock fix found by independent verification:** the scoped `loadMemory` calls `.is('player_id', null)`, but the `memoryQuery` mock in `src/features/ko-account/answer-route.test.ts` had no `is`, so 11 answer-route tests failed with "KO memory read failed" (the mock threw, the read caught it and returned no memories). Production code is correct — the real Supabase client has `.is()`. Fix was one line in the test mock only (`is: () => memoryQuery`, line 32), verified 23/23 in that file and 318 passed / 1 skipped for the full KO suite.
- The pre-existing `npm run check` lint failure in `src/features/templates/components/workspace-programs-view.tsx` is out of scope; verify it is byte-identical to HEAD and do not fix it here.

## References
- `docs/ARCHITECTURE.md` §3, §5
- `supabase/migrations/0162_ko_memory.sql` (table, unique index, trim trigger, RLS), `supabase/tests/ko-memory.test.ts`
- `src/features/ko-account/data/memory.ts`, `memory-validation.ts`, `chat-memory.ts`, `facts.ts` (`appendMemoryFacts`), `route.ts` (`readChatMemory` call), `context.ts` (`resolveContext`)
