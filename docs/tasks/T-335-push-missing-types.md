# T-335 — Push text for 4 notification types that never reach phones

**Source:** found on 2026-11-16 while deploying T-333. The `send-push` edge function has no message for `chat_message`, `form_requested`, `renewal_requested` or `player_rank_up`. For these types, `dictionary[key]` is undefined, `.replace` throws, and the function returns 500. The in-app bell works; the phone push never arrives. The owner asked for a fix now.

**Files:**
- `supabase/functions/send-push/messages.ts`
- `supabase/functions/send-push/payload.ts`
- `supabase/functions/send-push/index.ts`, only if the recipient id must be passed through
- tests next to them

No migration and no app UI changes.

## What each type needs
| Type | Recipient | Payload | Push text (ar / en) | Opens (copy `src/features/notifications/format.ts`) |
|---|---|---|---|---|
| `chat_message` | the other side of the chat | `name` (sender), `player_id` | «{name} بعتلك رسالة» / "{name} sent you a message" | if recipient is the player (`user_id === payload.player_id`): `/player/captain`; else `/captain/players/{player_id}/chat` |
| `form_requested` | player | `name` (form title), `request_id`, `form_id` | «الكابتن مستني ردّك على {name}» / "Your captain is waiting for: {name}" | `/player/forms/{request_id}`, or `/player` |
| `renewal_requested` | captain | `name` (player), `player_id`, `request_id` | «{name} بعت طلب تجديد» / "{name} requested a renewal" | use the same link the in-app bell uses for this type (read `format.ts`) |
| `player_rank_up` | captain | `display_name`, `player_id`, `medal` | «{name} اترقّى لرتبة جديدة» / "{name} reached a new rank" | the player's file `/captain/players/{player_id}` |

- `chat_message` needs to know who receives it. Pass `user_id` from the row that `index.ts` already selects into `pushPayload`, for example as an optional field on `PushNotificationRow`. Keep `index.ts` otherwise unchanged.
- Add `arStd` text for the 4 types. Plain standard Arabic, no emoji.
- **Defensive fallback:** if a future type has no message, `pushPayload` must not throw. Use a generic body (`messages[locale].fallback`: «عندك إشعار جديد» / "You have a new notification") and the in-app default path. Add a test that every value in `src/types/enums.ts` `notificationTypes` produces a non-empty body for `ar` and `en`. The `send-push` tests already use a TypeScript transpile harness; follow it.

## Gates
`npm run check` and the `supabase/functions/send-push` tests.

## Out of scope
- Deploying the function (the reviewer does it).
- In-app notification text.
- `chat_message` upsert behaviour. Later messages update the unread row and do not re-push; that is existing behaviour, so leave it.
