# T-056 — Captain voice note reaches the player with the weekly reply

**Phase:** 3 · **Depends on:** — · **Status:** ready (blocker, owner report 2026-11-04)

## Problem (diagnosed)
The captain's voice note in the weekly check-in reply never reaches the player.
- The hosted DB has **0 rows** in `voice_notes` and **0 files** in the `voice-notes` bucket. No upload request reached Storage in the last 24 h. Storage policies, the bucket and signed URLs are fine.
- Cause 1, which loses the note:
  - In `src/features/inbox/components/inbox-screen.tsx`, `VoiceRecorder` has its own separate «ابعت» button.
  - The reply `send()` calls `setSelected(null)` at once, which unmounts the dialog and the recorder.
  - So a clip that was recorded but not sent separately is silently discarded when the captain sends the written reply.
- Cause 2, which hides the note:
  - The player sees voice notes only on `/player/captain` (`PlayerVoiceNotes`).
  - The player's check-in history in `src/features/progress` shows neither the captain's reply text nor the voice note linked by `voice_notes.context_kind = 'checkin'` and `context_id`.

## Changes
1. **One send for reply and voice** (inbox):
   - Lift the recorded clip so the reply's send uploads it with `sendVoiceNote` (context `{ kind, id }`) together with `reviewItem`.
   - A reply may be text only, voice only or both. Voice only is valid: allow an empty text reply when a clip is attached.
   - Never close the dialog while a recorded, unsent clip would be lost. If the upload fails, keep the dialog open with the clip and an error and retry; do not mark the item reviewed without the voice.
   - Remove the separate voice send button, or keep it only as the same single action.
   - Also do this for form-check replies (same dialog).
   - Leaving the dialog with an unsent clip asks for confirmation («فيه تسجيل لسه متبعتش»).
2. **Player sees the reply** (progress check-in history):
   - Each reviewed check-in shows the captain's reply text, plus that check-in's voice notes in a styled glass audio player.
   - The player uses the existing `AudioPlayer` from `@/ui`, restyled if needed with tokens only: play/pause ≥ 48 px, a progress bar and a time readout.
   - Load notes with one query by `context_id in (...)` (no N+1), signed with `createSignedUrls`.
   - Playing marks the note listened, as `PlayerVoiceNotes` does.
   - States: loading, error and empty; no reply yet shows «الكابتن لسه مردش».
   - Also show the form-check reply voice in the same way wherever the player sees form-check feedback, if such a view exists.
   - Notes stay listed on `/player/captain` too.
3. **iPhone playback:**
   - Chrome/Windows records `audio/webm`. Older iOS Safari may not play WebM/Opus.
   - When `audio.canPlayType(mime)` is empty, show a clear message («الصوت ده مش بيشتغل على جهازك، حدّث iOS») instead of a dead player. No transcoding, no new dependency.
   - Keep the mime type known on the client (from the path extension, as `uploadPrivateMedia` names files).
4. Tests:
   - The inbox send uploads the clip and then reviews.
   - An upload failure keeps the dialog and the clip.
   - Voice-only replies are allowed.
   - The progress view groups notes by check-in and runs a single query.
   - The unsupported-format message.
   - Inject `now`; no network.

## Out of scope
Storage and RLS policies (already correct), new migrations, push notifications.

## Requirements
- No new dependencies.
- Egyptian Arabic and English strings in `messages.ts`.
- Tokens only, with `glass` / `glass-strong`.
- Logical RTL properties.
- Files under 250 lines.
- Translated `aria-label`s on icon buttons.

## Acceptance
- [ ] A captain records, writes or skips the text, presses send once, and the note and reply are saved (row + file).
- [ ] The player opens the progress check-in and sees the reply and a playable voice note.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
