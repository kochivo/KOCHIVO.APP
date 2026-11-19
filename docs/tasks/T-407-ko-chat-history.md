# T-407: KO keeps the chat after closing and reopening

Owner report, 2026-11-19: closing the KO panel and opening it again loses the whole conversation. Today the history lives only in React state in `ko-chat.tsx` (`useState<Entry[]>`).

## What to build
- Keep the KO conversation **on the device, per account**, so it survives:
  - closing and opening the panel;
  - navigating between pages;
  - closing and reopening the app.
- **Storage:** `localStorage`, key `kochivo.ko.chat.<userId>`.
  - Wrap every read and write in try/catch. Storage may be blocked, and then the chat simply works as today.
  - Pass `userId` to the widget from `KoAccountLink`, which already reads the claims on the server. Add it to `KoAccountWidget` props and pass it down to `KoChat`.
- **What is saved:** at most the last **40 entries**.
  - For each entry, save the speaker, the text, the `contextText` (if any), and a timestamp.
  - For each action card, save its `title` and its **final** state only: done with its result text, cancelled, or failed with its text.
  - **Never save approval tokens, swap option tokens, photos, audio, or the credit meter.**
  - A card that was still pending when the chat was saved comes back in the expired state, with the existing `confirmExpired` text.
- **Expiry:** drop entries older than **7 days** when loading.
- **Restore:** load once on mount, before the first render of the log if possible (a lazy `useState` initializer guarded for SSR). Scroll to the bottom.
  - The welcome bubble and the suggestion chips show only when there is no saved history, as today when the log is empty.
- **The history sent to the server** keeps using the same `history` field and limits (`maxHistoryChars`), now built from the restored entries too. Follow-up questions therefore keep working after reopening.
- **"Clear chat":** a small text button in the KO header, «امسح المحادثة», with a translated `aria-label`, `min-h-12`, using the existing secondary/ghost button style.
  - It empties the log and the storage key.
  - It is shown only when the log has entries.
- **Sign-out:** remove every `kochivo.ko.chat.*` key. Find the existing sign-out cleanup (where offline/local data is wiped) and add it there. If there is no central cleanup, do it in the sign-out button handler and say so in the reviewer notes.

## The look must not change
The only new UI is the «امسح المحادثة» button. Use only existing classes and tokens.

## Files
- `src/features/ko-preview/components/ko-chat.tsx`. Keep it under 250 lines; move the storage logic into a new `src/features/ko-preview/hooks/use-ko-history.ts`.
- `ko-account-widget.tsx`, `ko-account-link.tsx`, and the widget chain in between.
- `messages.ts` and `standard/messages.ts`: `clearChat` in `ar`, `arStd` and `en`.
- The sign-out cleanup file.

## Out of scope
- Server-side chat storage.
- Syncing between devices.
- The demo KO widget.
- Route or Gemini changes.
- No new dependency.

## Tests (deterministic, inject `now`)
- `use-ko-history`:
  - save and load round trip;
  - capped at 40;
  - entries older than 7 days dropped;
  - no tokens in the saved JSON;
  - pending cards come back as expired;
  - blocked storage (setItem throws) does not crash;
  - keys are per user.
- Chat:
  - restored entries render;
  - «امسح المحادثة» empties the log and the storage;
  - the welcome shows only when empty.
- Sign-out removes the keys.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ko-preview`
- `npx vitest run src/features/ko-preview src/features/ko-entry`

Report in the AGENTS.md final format, with a one-line description of every visible change.
