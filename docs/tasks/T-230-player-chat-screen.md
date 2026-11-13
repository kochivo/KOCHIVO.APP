# T-230 — Player: the captain tab becomes a real chat

**Phase:** player v3 · **Depends on:** T-229, T-231 · **Status:** ready

## Goal
On v3, the captain tab is a real chat. The player writes or records, and the message goes to the captain inside the app, not to WhatsApp. The captain's voice notes and replies show in the same thread. Captain details, subscription and assessments move to the pages from T-231.

## Files
Create or modify only these:
- `src/features/chat/components/chat-thread.tsx` (new, shared with T-232): bubbles, day separators, read ticks, «اتقرت»
- `src/features/chat/components/chat-composer.tsx` (new, shared with T-232): text, send, record states
- `src/features/chat/components/*-entry.tsx` and `src/features/chat/index.ts` as needed
- `src/features/player-shell/components/captain-screen.tsx`: v6 branch only
- `src/features/player-shell/components/captain-heading.tsx`: becomes a link to `/player/captain/profile`
- `src/features/player-shell/components/captain-pending-assessment.tsx`: link to `/player/assessments`
- `src/features/player-home/components/captain-row.tsx` and `v3-home.tsx`: last message and unread from chat
- messages files (`ar`, `arStd`, `en`) and tests

## Requirements
1. **Screen** (mockup screens 1 and 2, 390×844):
   - Header: avatar, «كابتن <name>», and the subline «كابتنك من … · دوس لبياناته واشتراكك» with a chevron. The whole header is one link to `/player/captain/profile`.
   - If an assessment is due, the gold banner «عندك تقييم مطلوب» links to `/player/assessments`.
   - Then the thread.
2. **Thread** (`ChatThread`, props `items`, `viewer: 'player' | 'captain'`):
   - Incoming bubbles sit at the start with `rounded-es-[6px]` and `bg-surface-raised`. Your own bubbles sit at the end with `rounded-ee-[6px]`, `bg-lime` and `text-on-lime`.
   - A voice bubble uses `AudioPlayer` and the waveform look the current `CaptainThread` uses. Own voice bubbles are lime with a dark play button.
   - Time in Manrope. Own messages show ✓ when sent and ✓✓ when read. «اتقرت» appears under the last own message that was read.
   - Day separators: «النهارده» / «أمس» / date, reusing `threadDay`.
   - On open, and when a new message arrives, it scrolls to the bottom. Bottom padding keeps the last bubble above the composer.
   - A failed send shows a small «ما اتبعتتش · جرّب تاني» button.
3. **Composer** (`ChatComposer`), fixed above the pill nav as now:
   - The input «اكتب للكابتن» (max 1000) and a mic button.
   - When the text is not empty, the mic becomes a lime send button.
   - Recording state: a delete button, a red dot (`danger` token), a Manrope timer, «بيسجّل…», and a lime send. It stops automatically at 120 s. Use `useRecorder` from `@/features/voice-notes`.
   - If microphone permission is denied, show the existing voice-notes error message.
   - Enter sends. Each control is at least 48px and has a translated `aria-label`.
4. **Data:** `useChatThread` from T-229, with the current captain from `useCaptainContext` and the viewer id from the session hook used elsewhere in player-shell.
5. **Remove from the v6 captain tab** (they live in the T-231 pages now): the assessments `<details>`, the renewal, the captain-details `<details>`, and the WhatsApp-forwarding `CaptainQuestion`. The legacy (non-v6) branch keeps everything as is, including `CaptainQuestion`.
6. **Home `CaptainRow`:** show the latest incoming item (message or voice) and its time. Show the unread dot when anything is unread. Use the same data as the thread; a lightweight `listMessages(limit 1)` plus `voice_notes` is fine.
7. **States:**
   - an empty thread shows «ابدأ الكلام مع الكابتن» with one line;
   - a loading state;
   - an error state with retry;
   - with no captain, the existing "no captain" empty state.
8. Rest-day mood applies through tokens. Use no new colors.
9. **Perf:** `/player` ≤ 300 KiB first load. Keep chat client code behind the existing dynamic `captain-screen-entry`, and import nothing chat-related into the home first load except what `CaptainRow` needs.

## Acceptance
- [ ] Tests:
  - [ ] own vs incoming rendering and read ticks;
  - [ ] day separators;
  - [ ] the composer switching mic/send;
  - [ ] the recording state (mocked recorder);
  - [ ] failed send and retry;
  - [ ] the header link and banner link;
  - [ ] the v6 tab no longer renders renewal, assessments or WhatsApp, while the legacy branch still does.
- [ ] `npm run check`, `npm run build` and the perf budget pass.

## Out of scope
- The captain-side chat (T-232).
- Images, deleting messages, realtime.

## References
- Mockup: `docs/mockups/player-v3/12-chat-split.html`, screens 1 and 2. `docs/mockups/player-v3/README.md` shared rules.
