# T-354 — The player asks to freeze; the captain approves in one tap

**Migration:** `0150_freeze_requests.sql`

**Source:** on 2026-11-17 the owner approved this feature, which was proposed after audit round 2.

The problem today:
- Only the captain can freeze a player, through `set_player_frozen(p_link, p_frozen)` in 0060.
- The player cannot ask for a freeze.
- There is no limit on freeze days.
- Nothing unfreezes on its own.

## Behaviour
1. **Package limit**
   - Add `captain_packages.max_freeze_days int null`, with a check of 0..90.
   - `null` or 0 means the player cannot ask for a freeze on that package.
   - The captain edits it in the existing package editor: one optional number field, «أقصى أيام تجميد».
2. **Which package applies:** the package of the player's latest `player_payments` row with this captain whose period covers today.
   - The player may ask only when that package has `max_freeze_days > 0`.
   - The days already frozen in that period (approved requests in that period) plus the new request must not exceed the limit.
3. **The player asks**
   - A new table `freeze_requests`:
     - `id uuid` (uuidv7 from the client);
     - `player_id`, `captain_id`;
     - `days int` (1..90);
     - `note text null`, 200 characters or fewer;
     - `status`: pending / approved / declined / cancelled;
     - `created_at`, `decided_at`.
   - Rules:
     - Only one pending request per player and captain, enforced by a partial unique index.
     - The player can insert only for their own active, unfrozen, non-pending link, through an RPC.
     - The player can cancel their own pending request.
     - The captain can read their players' requests.
4. **The captain approves or declines**
   - Use `decide_freeze_request(id, approve boolean)`, a security definer function that locks the request and the link.
   - Approving freezes the link exactly as `set_player_frozen` does (`frozen_at=now()`), and sets a new column `coach_clients.frozen_until date = user_today(captain)+days`.
   - Declining only changes the status.
   - A request that was already decided raises a clear error. A retry with the same decision is a no-op.
5. **Unfreezing on its own**
   - Write a function `security_private.release_due_freezes()`. It unfreezes every link where `frozen_until <= user_today(captain_id)`.
   - It uses the same access extension as the manual unfreeze in 0060: `access_until += whole days frozen`, then `frozen_at=null` and `frozen_until=null`.
   - Schedule it daily with `cron.schedule`, guarded the way 0067 does it (only if `pg_cron` exists).
   - When the captain unfreezes by hand, `set_player_frozen(..., false)` must also clear `frozen_until`. Patch it; do not rewrite it.
   - A manual captain freeze keeps working with no end date (`frozen_until` null).
6. **Notifications**
   - The captain gets a notification when a request arrives.
   - The player gets one when the request is approved or declined.
   - Add the new types to `notifications_type_check` the way 0135 did it.
   - Add push text in ar, arStd and en if push is wired for important types.

## UI
- **Player**
  - In the subscription and renewal area, next to the renewal choice, show a «اطلب تجميد» button only when it is allowed.
  - It opens a small sheet: a days stepper (1..remaining), an optional note, and a send button.
  - While the request is pending, show «طلبك مستني رد الكابتن» with a cancel button.
  - While the player is frozen, show the return date.
- **Captain**
  - Show the pending freeze requests where renewal requests already show (`src/features/billing/choice/renewal-requests.tsx` / the requests entry), with «موافقة» and «رفض».
  - The player file billing row shows «متجمّد لحد <date>» when `frozen_until` is set.
- Every string goes in ar, arStd and en. The UI is optimistic and has loading, error and empty states.

## Tests (PGlite in `supabase/tests/freeze-requests.test.ts`, plus vitest for the TS model)
- The player cannot ask when the package has no limit, or when the request goes over the remaining days.
- A second pending request fails.
- Another player or captain cannot read or decide the request (RLS).
- Approving sets `frozen_at` and `frozen_until`, and blocks writes (`player_can_write()` is false).
- Declining and cancelling work, and a decided request cannot be decided again.
- `release_due_freezes()` on the due date unfreezes the link and extends `access_until` by the frozen days. Before the due date it does nothing.
- A manual unfreeze clears `frozen_until`.

## Files (expected)
- `supabase/migrations/0150_freeze_requests.sql` and `supabase/tests/freeze-requests.test.ts`.
- `src/features/billing/**`: data actions, the player sheet, captain request rows, package editor field, messages.
- `src/types/database.ts`: add only the new table, the new columns and the new functions.

## Out of scope
- T-353 (landing and demo UI) runs in parallel. Do not touch `src/features/marketing` or `src/features/demo`.
- Do not change how renewals and receipts work.

## Rules
- **Database:**
  - Put all DB changes in ONE new migration, `0150_freeze_requests.sql`, and do not apply it.
  - Keep it additive: new table and columns, `create or replace`, or patching. Do not rewrite or delete data.
  - Never edit old migrations.
  - Every new table gets RLS and a test.
- **Patch, do not rewrite:** to change an existing function, follow the pattern of 0139/0141/0144:
  1. read `pg_get_functiondef(...)`;
  2. `replace()` an exact fragment;
  3. raise on drift (the fragment count must be exactly 1);
  4. `execute` the result.
- **Dates:** use `user_today(captain_id)` in SQL and `localDate()` in TS. Ids use `uuidv7()`.
- **UI:**
  - Use tokens only and logical properties.
  - Touch targets are 48px or more.
  - Files have 250 lines or fewer.
  - Lime is the only action color.
- **Gates:** `npm run check` and `npm run build`.
