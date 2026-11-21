# T-241 — Captain v11: inbox

**Phase:** captain v11 fidelity · **Depends on:** T-238 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first. It is part of this card.

## Goal
`/captain/inbox` matches the mockup `inbox` screen exactly.

## Files
- `src/features/inbox/*`: the workspace inbox components and their messages. New files are allowed.
- tests in `src/features/inbox/`

## Requirements
1. **Header:** «صندوق الوارد».
2. **Two columns** (`g12 inb`):
   - **Conversation list.**
     - Each row shows avatar, name, the last message preview, and an unread count pill.
     - A voice note previews as «رسالة صوتية · 0:18».
     - A message the captain sent starts with «انت:».
     - The selected row is highlighted.
   - **Chat pane.**
     - A head row with avatar, name, «<goal> · باقي <n> يوم» and a «الملف» button.
     - Bubbles: the player's on the start side, the captain's lime on the end side, each with its time.
     - Voice notes show as a waveform with the duration.
     - Quick-reply chips (`qr`) above the compose box. Use the captain's saved replies if they exist, otherwise three fixed ones from messages, like the mockup.
     - The compose box: a mic icon button, a text field, and a lime send button.
3. **Mobile:** the list shows first. Opening a chat shows the chat with a back icon button, exactly like `S.chatOpen`.
4. Keep the existing chat data, realtime, voice notes and send path (T-229 to T-232). This card changes the layout only.
5. The pane is at least 470px tall on desktop, as in the mockup.

## Acceptance
- [ ] Desktop and 390px match the mockup `inbox`.
- [ ] There are tests for the preview text: voice, own message and unread count.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Chat data and storage.
