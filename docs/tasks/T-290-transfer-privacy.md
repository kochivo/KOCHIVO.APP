# T-290: privacy after a player changes captain (audit SEC-06 HIGH, SEC-07 MEDIUM)

## Problem 1 (SEC-06): voice audio
The live storage policy is exactly:

`voice_notes_read: bucket_id = 'voice-notes' AND (storage_owner(name) = auth.uid() OR is_captain_of(storage_owner(name)))`

It comes from `supabase/migrations/0038_voice_notes.sql:44`; chat audio uses the same bucket (`0104_chat_messages.sql:8,41`, `src/core/storage/private-media.ts:26`). Any **current** captain of player P can read every audio file under `P/`, including the chat audio P exchanged with a previous captain. Chat rows themselves are correctly scoped to the conversation's captain.

The `chat_voice_cleanup` policy uses the same captain branch, guarded by `chat_audio_cleanup_allowed(name)`. Check whether it has the same problem.

## Problem 2 (SEC-07): assessment answers
Answer inserts and the answer guard (`0091_custom_forms.sql:111,121,123,132,170`) check only `r.player_id = auth.uid() and r.reviewed_at is null`. After P moves from captain A to captain B, P can still answer A's open request and A can read the new answers. The assessment photo upload policy has the same gap.

The start gate (`src/features/player-shell/data/start-gate.ts:13`, `my-captain.ts:39`) selects blocking requests by player only. An old captain's unanswered blocking form can therefore block P under the new captain.

## Files
- New migration `supabase/migrations/0113_transfer_privacy.sql`. Additive: `drop policy if exists` plus `create policy` with the same names, and `create or replace function`. A permissive policy cannot be narrowed by adding another one, so replace it.
- `src/features/player-shell/data/start-gate.ts` and any helper it needs: scope to the current captain.
- New test `supabase/tests/transfer-privacy.test.ts`, using the existing two-captain fixtures (`cross-tenant-fixture.ts`, `fleet-*`). Update the unit test for the start gate if one exists.

## What to do
1. Voice read: a captain may read an object only when a `chat_messages` row or a `voice_notes` row has that exact path and the caller is that row's captain. The player keeps access to their own folder. An upload that is not yet attached (the uploader's own object) stays readable by its uploader. Suspension rules stay.
2. Assessment answers: answer insert, the answer trigger and the assessment-photo upload also require that the request's captain has a current, non-archived link to the player. Keep the player's read of their own history. The former captain keeps reading answers that were given while the link was active (old data). Block only new writes after the link ends.
3. Start gate: only requests from the current captain block.
4. PGlite tests:
   - After the transfer from A to B, B cannot select A–P chat audio, and B can select B–P chat audio.
   - P can still read all of P's own audio.
   - After the transfer, P cannot insert an answer to A's open request.
   - P can still answer B's request.
   - A's old answers given before the transfer stay readable to A (or document the chosen rule).
   - The start gate ignores A's request.
   - All existing chat, voice, forms and assessment tests still pass.

## Out of scope
Old migrations, other findings, UI changes. Do not apply anything to a hosted database.

## Gates
`npx vitest run supabase/tests/transfer-privacy.test.ts supabase/tests/chat-messages.test.ts supabase/tests/custom-forms.test.ts supabase/tests/assessment-schedules.test.ts`, then `npm run check`.
