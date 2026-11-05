# T-012 — Captain inbox: form-check videos, weekly check-ins, quick reply

**Phase:** 3 · **Depends on:** T-009 (merged), 0014 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
The captain opens «المهام» and sees one list of everything waiting for them, newest first:
- form-check videos (`form_checks`)
- weekly check-ins (`check_ins`)

Opening an item shows the media and the details. The captain can then reply in one tap with a quick-reply chip, or write a short reply, and mark the item reviewed. Reviewed items leave the open list and can be seen under «اتراجعت».

Mockup board: **CaptainInbox** (`docs/mockups/CaptainInbox.dc.html`). Schema:
- `supabase/migrations/0008_inbox.sql`: the captain may only change `reviewed_at` and `captain_reply` (the `guard_review_update` trigger)
- `0009_storage.sql`: the private buckets `checkin-photos` and `form-videos`. `private_media_read` already lets a captain read their players' files.

No migration is needed.

## Files
- `src/features/inbox/` (new):
  - `index.ts`
  - `types.ts`: an `InboxItem` union with `kind: 'form' | 'checkin'`, plus player name, created_at, reviewed_at, and reply
  - `merge.ts` (pure):
    - `mergeInbox(forms, checkIns)` returns one list sorted by `created_at` desc, with ties broken by id
    - `ageLabel(createdAt, now)` gives Arabic labels: «دلوقتي», «من 3 ساعات», «إمبارح», «من 4 أيام». Use the same plural rule as `roster/status.ts`: `أيام` for ≤ 10, `يوم` above.
    - `quickReplies(kind)` gives fixed Arabic chips:
      - form: «الفورم ممتاز», «ضهرك مفرود أكتر», «نزّل الوزن شوية»
      - checkin: «تقدم ممتاز كمّل», «ركّز على الأكل الأسبوع ده», «كلمني نظبط البرنامج»
  - `data/inbox.ts` (server-only, `'use server'` actions, using the captain's session and RLS):
    - `listInbox({ status: 'open' | 'reviewed', limit: 50 })` reads both tables:
      - open rows have `reviewed_at is null`; reviewed rows are the newest 50 reviewed
      - player names come from `profiles`
      - exercise names (`name_ar`) for form checks come from `exercises`
      - It returns `{ data }` or `{ error }` with Arabic messages.
    - `reviewItem({ kind, id, reply })`: zod-validated (reply trimmed, ≤ 1000, may be empty). It sets `reviewed_at = now()` and `captain_reply` (null when empty). It never sends `captain_id` or any other column.
    - `mediaUrls({ kind, id })`: reads the row (RLS limits it to the caller's own players), then calls `storage.from(bucket).createSignedUrls(paths, 600)` on the server client. Never use the service role, and never log paths.

      Do **not** create or edit `src/core/storage/private-media.ts`; another task (T-013) owns that file.
  - `components/inbox-screen.tsx`:
    - header «INBOX · المهام» with the open count
    - tabs «مستنياك» and «اتراجعت»
    - filter chips «الكل», «فيديوهات», «تحديثات»
    - a list of `inbox-row.tsx`
    - a detail panel: a side column on desktop, a full-screen sheet on mobile
  - `components/inbox-row.tsx`: player initial, name, kind tag, exercise name or week, and the age label
  - `components/form-check-detail.tsx`: `<video controls playsInline preload="metadata">` with the signed URL, exercise name, and the player's note
  - `components/checkin-detail.tsx`: weight, waist, notes, and up to 3 photos (`next/image` with `unoptimized`, signed URLs)
  - `components/reply-box.tsx`:
    - quick-reply chips that fill the text
    - a `TextField` (≤ 1000 characters)
    - «ابعت الرد» (lime, the one primary action)
    - optimistic: the item leaves the open list at once and comes back with an error if the action fails
  - `inbox.test.ts`
- `src/app/(captain)/captain/inbox/page.tsx` (new, thin)

## Requirements
1. RLS is the security. There are no client Supabase writes, and nothing ever comes from the client except `kind`, `id`, and `reply`.
2. Signed URLs last 10 minutes. When one expires (the media fails to load), refetch once.
3. States:
   - loading
   - error with retry
   - empty open «مفيش حاجة مستنياك. عاش»
   - empty reviewed «لسه مراجعتش حاجة»
   - media failed «الفيديو مش راضي يفتح» with retry
4. Files are under 250 lines, use tokens only with no hex, use RTL logical properties, have targets ≥ 48px, use Egyptian Arabic, and give icon buttons an Arabic `aria-label`.

## Acceptance
- [ ] `inbox.test.ts` covers:
  - `mergeInbox` ordering and ties
  - `ageLabel` (now, hours, yesterday, days, and the plural rule)
  - `quickReplies`
  - with a mocked server client:
    - `reviewItem` sends only `reviewed_at` and `captain_reply`
    - an empty reply becomes null
    - a reply over 1000 characters is rejected before any network call
    - an error maps to an Arabic `{ error }`
- [ ] `/captain/inbox` builds, and `npm run check` and `npm run build` pass.

## Out of scope
- Push notifications
- Player-side form-check upload (T-006b)
- Roster badge links
- Migrations
- `src/core/storage/private-media.ts`
