# T-264 — Automatic welcome message on accept

**Phase:** data gaps · **Depends on:** none · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 12.

## Goal
The captain writes one welcome message in settings and can turn it off. When the captain accepts a join request, the message is sent in chat as the captain, with `{الاسم}` (or `{name}`) replaced by the player's first name. The accept toast then says «اتقبل <الاسم> واتبعتله رسالة الترحيب». Today the toast is honest and says only «اتقبل».

## Files
- `supabase/migrations/<next>_welcome_message.sql`:
  - `profiles.welcome_message text` (≤500, nullable);
  - `profiles.welcome_enabled boolean not null default false`.
  - The existing accept path inserts one `chat_messages` row from the captain when the message is enabled and not empty. It does this in the same transaction and is idempotent per request.
- `supabase/tests/welcome-message.test.ts`
- `src/features/settings/`: a «رسالة الترحيب» card with a toggle, a text area and a placeholder hint.
- `src/features/join/`: the toast copy depends on whether a message was sent.

## Requirements
1. Off by default. Nothing changes for captains who never set it.
2. Accepting twice never sends twice.

## Acceptance
- [ ] Enabled: accepting sends the message with the name filled in.
- [ ] Disabled: nothing is sent.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Scheduled follow-up messages.
