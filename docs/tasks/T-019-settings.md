# T-019 — Settings: profile, invite message, download my data, delete my account (7 days)

**Phase:** 3 · **Depends on:** T-003, T-008 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
One settings feature serves both roles.
- **Captain:** `/captain/settings`
- **Player:** `/player/settings`, reached from the «الكابتن» tab

Sections:
1. **البروفايل:** full name (1–80) and WhatsApp phone in E.164 (`+201…`), the same rule as `profiles.phone`.
2. **رسالة الدعوة** (captain only): a default message (≤ 500 characters) that the roster's invite sheet will use later. This task only stores it.
3. **نزّل بياناتك:** downloads one JSON file with the caller's own rows. The browser builds it from a server action's result.
4. **امسح الحساب:** asks for confirmation by typing «امسح». It sets a deletion request and shows «حسابك هيتمسح يوم {date}. تقدر تلغي قبلها». The request can be cancelled. The actual purge runs 7 days later.

Mockup board: **CaptainSettings** (`docs/mockups/CaptainSettings.dc.html`).

## Files
- `supabase/migrations/0020_settings.sql` (new):
  - `alter table public.profiles add column invite_message text check (char_length(invite_message) <= 500), add column deletion_requested_at timestamptz;`
  - `create or replace function public.guard_profile_update()`: copy the 0015 body exactly and add `deletion_requested_at` to the protected columns. Users change it only through the RPCs below.
  - `public.request_account_deletion() returns timestamptz` and `public.cancel_account_deletion() returns void`:
    - `security definer`, `set search_path = ''`
    - act on `auth.uid()` only
    - request returns `deletion_requested_at + interval '7 days'`
    - grant execute to `authenticated` only
  - `public.purge_deleted_accounts() returns int`:
    - `security definer`
    - `delete from auth.users where id in (select id from public.profiles where deletion_requested_at < now() - interval '7 days')`
    - returns the count
    - Revoke it from `public`, `anon`, and `authenticated`. It is meant for `pg_cron`; the owner schedules it. Add a SQL comment with the `cron.schedule` line, but do not call `cron` in the migration.
- `supabase/tests/rls-settings.test.ts` (new):
  - a user can update their own name, phone, and invite message, but not `deletion_requested_at` directly
  - request and cancel work, and only on yourself
  - `purge_deleted_accounts` deletes only users requested more than 7 days ago (backdate the column as superuser), and the profile cascades
  - `authenticated` and anon cannot execute `purge_deleted_accounts`
- `src/features/settings/` (new):
  - `index.ts`
  - `schema.ts` (pure): zod schemas for the profile and the invite message, and `deletionDate(requestedAt)`
  - `export.ts` (pure): `buildExport({ profile, rows }, now)` returns `{ exported_at, profile, ...tables }` and `exportFileName(now)` returns `kochivo-data-YYYY-MM-DD.json`
  - `data/settings.ts`, `'use server'`, own session, RLS:
    - `loadSettings()`
    - `saveProfile(input)`
    - `saveInviteMessage(input)` (it refuses unless the role is captain)
    - `requestDeletion()`
    - `cancelDeletion()`
    - `exportMyData()`: own `profiles`, `workout_sessions`, `set_logs`, `meal_logs`, `check_ins`, `form_checks`, and `player_intake` for a player; for a captain: profile, `coach_clients`, programs, and nutrition plans. Media paths are included as paths only; no files.
  - `components/settings-screen.tsx`, `components/profile-form.tsx`, `components/invite-message-form.tsx`, `components/export-card.tsx`, `components/delete-account-card.tsx`
  - `settings.test.ts`
- `src/app/(captain)/captain/settings/page.tsx` and `src/app/(player)/player/settings/page.tsx` (new, thin)
- `src/features/player-shell/components/captain-screen.tsx`: add a single «الإعدادات» link to `/player/settings` under the card. This is the only change there.

## Requirements
1. Danger actions are ghost buttons with a `danger` token. There is one lime primary per section («احفظ»).
2. Never log profile or health data. The export runs only on the caller's own rows, and RLS enforces it.
3. Download with `Blob` and `URL.createObjectURL`, then revoke the URL. No new dependency.
4. States: loading, error with retry, saved «اتحفظ», and a pending-deletion banner.
5. Files are under 250 lines, use tokens only, use RTL logical properties, have targets ≥ 48px, and use Egyptian Arabic.

## Acceptance
- [ ] The SQL tests above pass.
- [ ] `settings.test.ts` covers:
  - the profile and phone schema (valid, missing `+`, too long)
  - the invite message length
  - `deletionDate`
  - `buildExport` and `exportFileName` with an injected `now`
  - `saveInviteMessage` refusing a player, with a mocked client
- [ ] Both routes build, and `npm run check` and `npm run build` pass.

## Out of scope
- Notification preferences (push is not built)
- Editing the intake answers
- Using `invite_message` in the invite sheet
- Scheduling `pg_cron`
- The captain nav (T-009c)
- Email change
