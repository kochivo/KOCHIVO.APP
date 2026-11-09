# T-124 — KO page context and suggestion chips

**Phase:** KO core · **Depends on:** T-116 · **Status:** draft

## Goal
KO knows which screen the user is on. On a player's page, "add one set to bench" means that
player, with no follow-up question. When KO opens, it shows two or three suggestion chips that
fit the screen. This makes KO easier to use and *reduces* free-tier usage, because messages get
shorter and fewer clarify round-trips are needed.

## Files
Create or modify only these:
- `src/features/ko-preview/context.ts`: `KoContext` type and `contextFromPath(pathname)` (pure)
- `src/features/ko-preview/suggestions.ts`: `suggestionsFor(role, context)` (pure, message keys only)
- `src/features/ko-preview/components/ko-panel.tsx`: context chip under the header, with an "x" to drop it
- `src/features/ko-preview/components/ko-chat.tsx`: send `context` in the form; render suggestion chips while the chat is empty
- `src/features/ko-preview/messages.ts`
- `src/features/ko-preview/context.test.ts`
- `src/features/ko-account/route.ts`: read and validate `context`
- `src/features/ko-account/intents.ts`: one context line added to the system text
- `src/features/ko-account/execute.ts`: default the `player` target from context when the intent omits it
- `src/features/ko-account/context.test.ts`
- This task card.

## Requirements
1. `KoContext` is a closed union:
   - `{ screen: 'player', playerId }`
   - `{ screen: 'program', programId }`
   - `{ screen: 'inbox' }`
   - `{ screen: 'nutrition' }`
   - `{ screen: 'home' }`

   It is derived from the route, never from page text.
2. **The server never trusts context for access.** It re-resolves `playerId` with
   `resolvePlayer` for the caller (the captain's own active players only). A foreign or unknown
   id is ignored silently, as if there were no context.
3. The model receives only `Current screen: player "<display name>"`. Ids never go to Gemini.
   When an intent leaves `player` empty and the context has one, use the context player. An
   explicit different name in the message wins.
4. **Chips** (tapping one sends its text):
   - captain on home: "What needs me today?" (answered by the T-123 feed, no AI call)
   - captain on a player: "How is <name> doing?", "Generate a program"
   - player on home: "My workout today", "My next meal"

   A chip that maps to a fast-path command must not call Gemini.
5. The chip row is hidden after the first message. The context chip can be removed for the
   current conversation.

## Acceptance
- [ ] Unit tests for `contextFromPath` over every captain and player route, plus unknown routes → `home`
- [ ] Server test: a foreign `playerId` in context is ignored; an omitted player falls back to the context player
- [ ] UI tests: ar/en, RTL, chips hidden after the first message
- [ ] `npm run check` and `npm run build` pass

## Out of scope
- Conversation history (separate card)
- New KO tools

## Implementation notes

- Plan: pure route/suggestion tests, route parsing and message keys, validated server target resolution, chat/context chips, then repository gates.
- The existing KO feed remains below the panel header and context chip.
- Context-only requests resolve display names through the authenticated roster without an AI call.
- The live entry currently navigates to `/ko`; preserving the source route requires changing `ko-entry`, which is outside this card's file list.
- The workout suggestion currently returns the existing clarification response without AI; a whole-workout reader is not among the existing KO tools.
- The existing nutrition reader returns assigned portions, not the next unlogged meal; the meal suggestion currently uses that reader.
- The local interactive preview cannot resolve account player names; its player-status suggestion stays disabled. Live player-name lookup requires account mode.
- Remaining acceptance gaps: source-route preservation in the live launcher, whole-workout/next-meal answers, and interaction-level tests for removing context and hiding chips after send. The tests currently cover server authorization/defaults, route parsing, translated markup and suggestion visibility policy.
- Verification: focused context/server/panel suites passed (3 files, 32 tests) using native config loading and thread workers. Default Vitest spawning is blocked by sandbox EPERM.
- `npm run check`: TypeScript and ESLint passed; release audit blocked by `spawnSync git EPERM`.
- `npm run build`: blocked only by Google Fonts fetching Alexandria, Changa and Manrope.

## Review (2026-11-09)

- `resolveContext` takes the player from the caller's `captain_roster` row by id (no name lookup), so players sharing a name keep their context; a player id outside the roster is dropped.
- Removed the player "My workout today" chip: no KO tool can answer it yet, so it only returned "unclear". Re-add it with a workout reader tool.
- Landed in the working tree only, uncommitted: `ko-account` and `ko-preview` are still untracked (T-114 to T-116 KO work).
- The live `/ko` page has no source route, so production context waits for the KO popup in production (`ko-entry`).
