# T-268 — Captain settings: notification preferences and certificates

**Phase:** data gaps · **Depends on:** none · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 16.

## Goal
1. **Notification preferences.** The captain turns each kind of notification on or off. The kinds are:
   - new video;
   - receipt;
   - answered form;
   - new chat message;
   - player absent 3 days;
   - subscription ending.

   An off kind creates no bell row and no push.
2. **Certificates.** The captain lists certificates, each with a title, an optional year and an optional image. They show in captain settings and on the public captain page (`/c/[slug]`).

## Files
- `supabase/migrations/<next>_captain_settings_data.sql`:
  - `profiles.notification_prefs jsonb not null default '{}'`. A missing key means on.
  - A `security_private.captain_wants(captain, kind)` helper, used by the notification triggers, including the T-262 ones.
  - New table `public.captain_certificates`:
    - `id` (uuidv7);
    - `captain_id`;
    - `title` (1..80);
    - `year smallint`;
    - `image_path`;
    - `position`.
  - Captain write. Public read only through the existing public page data function (0103 pattern).
- `supabase/tests/captain-settings-data.test.ts`
- `src/features/settings/`: the «الإشعارات» toggles card and the «الشهادات» list with add and delete.
- `src/features/public-page/` (or wherever `/c/[slug]` renders): a certificates row. Mind the `/c/[slug]` size ceiling of 205 KiB.

## Requirements
1. The default for every kind is on, so nothing changes for existing captains.
2. Certificate images go in a storage bucket with public read only for the image path.

## Acceptance
- [ ] Turning a kind off stops its notifications.
- [ ] Certificates show in settings and on the public page.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Exercise alternatives in the library. `program_exercises.alternatives` already exists per program exercise; library-level defaults need their own card if wanted.
