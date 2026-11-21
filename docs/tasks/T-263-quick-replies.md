# T-263 — Saved quick replies in chat

**Phase:** data gaps · **Depends on:** none · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 11.

## Goal
The captain saves replies they send often. The replies show as chips above the chat composer, and tapping one fills the composer, ready to edit or send. The captain adds a reply from the chips («+ رد جديد»), and edits or deletes replies from settings.

## Files
- `supabase/migrations/<next>_quick_replies.sql`:
  - new table `public.captain_quick_replies`:
    - `id uuid` (uuidv7);
    - `captain_id`;
    - `body text` (1..300);
    - `position smallint`;
    - `created_at`.
  - Only the captain reads or writes their own rows. Maximum 20 rows per captain (enforced by a trigger).
- `supabase/tests/quick-replies.test.ts`
- `src/features/chat/` (or the inbox feature): chips row plus an add sheet.
- `src/features/settings/`: a «الردود السريعة» card to edit, delete and reorder.

## Requirements
1. Tapping a chip fills the composer and does not auto-send.
2. With no saved replies, show only «+ رد جديد».

## Acceptance
- [ ] Add, use, edit and delete all work.
- [ ] Another captain cannot read the replies.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Default or shared reply packs.
