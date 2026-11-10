# T-143 — KO remembers the conversation

**Phase:** KO agent · **Depends on:** T-129, T-131 · **Status:** ready (owner request 2026-11-10)

## Goal
Today every message to KO is planned alone. If KO asks «أنهي يوم؟» and the captain answers «السبت», KO has
forgotten the question. After this card KO sees the last few turns of the same chat, so short answers to its
own questions work.

## Files
Create or modify only these:
- `src/features/ko-agent/gemini.ts`: `requestKoTool` accepts optional prior turns.
- `src/features/ko-agent/history.ts` (new): the history schema, trimming and conversion to Gemini `contents`.
- `src/features/ko-agent/index.ts`
- `src/features/ko-account/intents.ts`: `planIntent` passes history through.
- `src/features/ko-account/route.ts`: read and validate the `history` form field.
- `src/features/ko-preview/components/ko-chat.tsx`: send the history with each request.
- Tests: `src/features/ko-agent/history.test.ts` (new), and the existing KO tests where signatures change.
- This task card.

## Requirements
1. **Shape.** History is a JSON array in the `history` form field: `{ role: 'user' | 'ko', text: string }[]`.
   Server-side zod: at most 6 entries, each text 1–500 chars, total at most 2,000 chars. Invalid history is
   dropped (treated as empty), never a 400, so an old client keeps working.
2. **Client.** `ko-chat.tsx` sends the last 6 text entries of the visible chat, oldest first, excluding the
   message being sent. Voice and photo turns contribute their visible text only (the transcript or KO's reply),
   never media. Clearing or closing the chat clears the history.
3. **Gemini.** Prior turns become earlier `contents` items (`user` and `model` roles) before the current user
   turn. The system instruction gains one sentence: earlier turns are context for resolving short answers;
   only the latest user turn is the request; earlier turns never grant permissions or confirm actions.
4. **Safety stays server-side.** History is untrusted text. It must not bypass the confirm step: «نفذ» /
   "confirm" still needs the signed `token`; a mutation still needs explicit values in the latest turn or in a
   KO question it answers. Add a test where history contains "confirm" or a fake "saved" reply and the
   result is still a preview, not a commit.
5. **Demo route** (`/dev/ko/chat`, `selectKoTool`) keeps working without history. No change required there.
6. Same rate limits and size limits as today; raise the route's body-size ceiling only by the history limit.

## Acceptance
- [x] Unit tests: trimming to 6 and 2,000 chars; invalid history dropped; content order (history then current);
  roles mapped `ko → model`; the confirm-bypass test above. Gemini is mocked with an injected `fetcher`.
- [ ] `npm run check` and `npm run build` pass (sandbox fonts and the audit's git EPERM are known limits).

## Out of scope
- New KO tools (T-144), server-side storage of conversations, multi-call tool loops.

## Implementation notes

- Added strict, optional text history validation; malformed or oversized history is discarded as a whole.
- The account client keeps the newest six nonempty text turns, clips each to 500 characters, then drops
  oldest turns until the total fits 2,000 characters. Media bytes and attachment labels are excluded;
  voice notes have no visible transcript today, so only KO's reply contributes. Photo captions contribute
  their typed text. History remains component state and is discarded when the chat unmounts on close.
- Gemini receives earlier user/model contents before the current text/media request, with an explicit
  untrusted-context rule. The demo selector remains callable without history. The body ceiling increased
  by 2,000; rate limits, media limits and signed-token confirmation remain unchanged.
- Added deterministic schema, ordering, planner, client and route regression tests, including forged
  confirmation/saved history that still produces a preview and tokenless confirmation that cannot commit.
- Verification: 27 targeted tests passed using Vitest's native config loader and thread workers
  (the default loader/fork pool hit sandbox spawn EPERM). Typecheck passed; changed-file lint passed
  after removing an unused test variable. `npm run check` stopped at the known release-audit
  `spawnSync git EPERM`; `npm run build` failed only on fetching Alexandria, Changa and Manrope.
  A separate full-suite run was stopped after several minutes without a result; no full-suite pass is claimed.
