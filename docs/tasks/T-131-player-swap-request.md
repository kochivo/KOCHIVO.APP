# T-131 — Player asks KO to swap an exercise (captain approves)

**Phase:** KO core · **Depends on:** T-120 (generator tags), T-123 (feed), T-116 (KO account) · **Status:** implemented; review pending

## Goal
A player tells KO "ركبتي بتوجعني في السكوات" ("my knee hurts on squats"). KO offers up to 3
injury-safe alternatives from the generator tags for that exercise's movement pattern. The
player picks one, and KO sends a swap request to their captain. The captain sees a
`swap_requested` card in the KO feed and approves or declines with one tap. Only the captain
changes the program.

Choosing alternatives uses no AI. Gemini is used only to understand the free-text request,
through the existing intent path.

## Files
Create or modify only these:
- `supabase/migrations/0080_exercise_swap_requests.sql`:
  - the `exercise_swap_requests` table with RLS;
  - `request_exercise_swap()`;
  - `decide_exercise_swap()`;
  - `ko_feed()` replaced to add `swap_requested`.
- `supabase/tests/exercise-swap-requests.test.ts`
- `src/features/program-generator/swap-options.ts`: pure `swapOptions(exerciseId, injuries, candidates)` → up to 3 candidates with the same pattern and no stress on the given injuries
- `src/features/program-generator/index.ts`: export `swapOptions`
- `src/features/ko-account/intents.ts`: player tool `swap_exercise { exercise, injury: 'knee' | 'shoulder' | 'lower_back' }`
- `src/features/ko-account/execute.ts` (or a new `swap.ts` beside it if `execute.ts` would pass 250 lines): resolve the exercise in the player's active program, compute options, reply with choices
- `src/features/ko-account/messages.ts`: new strings (Egyptian Arabic plus short English)
- `src/features/ko-account/swap.test.ts`
- `src/features/ko-account/approval.ts`: add the signed options token kind using the existing HMAC helper.
- `src/features/ko-account/route.ts`: verify signed numeric choices behind the existing pilot and rate gates.
- `src/features/ko-feed/data/load-feed.ts`: accept `swap_requested` in the strict feed kind allowlist.
- `src/features/ko-feed/types.ts`, `rank.ts`, `messages.ts`, `components/feed-card.tsx`: the `swap_requested` kind with approve and decline
- `src/features/ko-feed/data/decide-swap.ts`: calls `decide_exercise_swap`
- `src/features/ko-feed/ko-feed.test.ts`
- `src/types/database.ts`
- This task card.

## Requirements
1. **Table `exercise_swap_requests`:**
   - Columns: id, player_id, captain_id, program_exercise_id, from_exercise_id, to_exercise_id, injury, status (`pending` | `approved` | `declined`), created_at, decided_at.
   - RLS: the player reads their own rows; the linked captain (`is_captain_of`) reads them; nobody inserts or updates directly. All writes go through the RPCs.
   - Also add the restrictive `active_caller` policy.
2. **`request_exercise_swap(p_program_exercise_id, p_to_exercise_id, p_injury)`:**
   - Security definer, `search_path = ''`.
   - The caller must be the player who owns that program exercise in an active program.
   - The target must have the same pattern in `exercise_generator_tags`, with no stress on `p_injury`.
   - At most 1 pending request per program exercise; a new one replaces the old pending one.
3. **`decide_exercise_swap(p_id, p_approve)`:**
   - Security definer; the caller must be that player's captain.
   - On approve, it updates that program exercise's `exercise_id` and keeps sets, reps and rest.
   - The request can be decided only once.
4. **`ko_feed()`:** for captains, add urgent `swap_requested` with data `{request_id, from, to, injury}`.
   Keep every existing rule, its order and the 8-row limit. Copy the function from 0077 and add to it; do not edit 0077.
5. **Player chat flow:**
   - The intent resolves the exercise by name in the player's active program.
   - KO replies with numbered options, e.g. "بدل السكوات ممكن: 1) …، 2) …. ابعتلي الرقم."
   - The player's numeric reply calls `request_exercise_swap`.
   - Option state is held in a signed short-lived token, reusing the approval HMAC helper with a new kind. No server memory.
   - If there are no safe options: "مفيش بديل آمن دلوقتي، كلّم الكابتن."
6. **Feed card:**
   - Shows the player's name, from → to, and the injury.
   - "وافق" (approve) is the lime primary button; "ارفض" (decline) is secondary.
   - The update is optimistic, with a rollback on error. Uses the existing feed card patterns.
7. **Safety:** this never runs for captains through the player tool. There is no direct program write from the client.

## Acceptance
- [x] PGlite tests:
  - a player can request only for their own active program;
  - the pattern and injury rule is enforced;
  - only the linked captain can decide;
  - decide-once;
  - approve swaps only `exercise_id`;
  - a suspended caller is blocked;
  - the feed shows the card to the right captain only.
- [x] Unit tests: `swapOptions` (same pattern, injury filter, max 3, excludes the current exercise), intent parsing, the numeric choice path, token expiry.
- [x] UI tests: the feed card's approve and decline, ar/en, RTL.
- [ ] `npm run check` and `npm run build` pass (sandbox fonts are a known limit).

## Out of scope
- Swaps without an injury reason, swapping several exercises at once, and captain-initiated swaps
- Applying migrations to production (the owner applies them)

## Notes
- Migration numbers 0078 and 0079 are reserved for T-126 and T-127.
- Implementation plan: test deterministic option filtering and SQL authorization first;
  add migration 0080 and database types; connect the player intent and signed numeric
  choice flow; add optimistic captain decisions and bilingual feed rendering; run the
  targeted Vitest suite, `npm run check`, and `npm run build`.
- Reviewer authorized the three integration files added above. The ten-minute options
  token uses the existing approval secret and an HttpOnly, SameSite=Strict cookie
  scoped to `/api/ko`, leaving the parallel chat component unchanged. Numeric replies
  verify signature, actor, player, expiry and token kind before calling the request RPC.
- Design: alternatives sort by exercise id for deterministic choices. Replacing a
  pending request deletes the previous pending row; decided rows remain as history.
  Swap feed keys include request id so multiple exercise requests remain distinct.
- Existing captain approval kinds, HMAC verification, expiry and database single-use
  behavior are unchanged. The options cookie is cleared after a choice or an unrelated
  player reply. Captain numeric messages retain their existing intent path.
- Validation: targeted Vitest passed 10 files / 99 tests; expanded feature and all
  `supabase/tests` Vitest passed 87 files / 751 tests. `npm run check` passed TypeScript
  and lint, then the release audit was blocked by sandbox `spawnSync git EPERM`.
  `npm run build` failed only fetching Alexandria, Changa and Manrope from Google Fonts.
