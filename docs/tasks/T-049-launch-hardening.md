# T-049 — Launch hardening: in-app browser warning, upload guards, progress indexes

**Phase:** 3 · **Depends on:** none · **Status:** ready (launch)

## Already done (do not redo)
- **Image compression:** `src/lib/compress-image.ts` runs before check-in photo and food photo uploads.
- **Bucket size limits:**
  - `checkin-photos` 5 MB
  - `form-videos` 50 MB
  - `voice-notes` 2 MB
  - `captain-food-photos` 1 MB
- **Offline-first writes:** sets, sessions and meal logs write locally through `saveAndQueue()` first, so they are optimistic.
- **Indexes that already exist:**
  - `set_logs (player_id, exercise_id, completed_at desc)`
  - `workout_sessions (player_id, training_date desc)`
  - `meal_logs (player_id, log_date desc)`
  - `voice_notes (player_id, created_at desc)`
- **PWA:** `src/app/manifest.ts` and `public/sw.js`.

## 1. In-app browser warning
- Add `src/lib/in-app-browser.ts` with a pure `detectInAppBrowser(userAgent)`. It returns `'instagram' | 'facebook' | 'messenger' | 'tiktok' | 'snapchat' | null`, based on tokens such as `Instagram`, `FBAN`, `FBAV`, `FB_IAB`, `Messenger`, `musical_ly`/`BytedanceWebview` and `Snapchat`.
- Unit tests with real user-agent strings, including normal Chrome and Safari, which must return null.
- Add a small client component, mounted once in the locale layout. If detected, show a persistent warning toast or banner (using `useToast` or a dismissible banner from `src/ui`):
  - Arabic: «افتح الرابط في كروم أو سفاري عشان تسجيل الدخول يشتغل»
  - English: "Open this link in Chrome or Safari so sign-in works"
  - Include a copy-link button.
- Also show it at the top of `/login`.
- Remember the dismissal for the session in `sessionStorage`, with try/catch around storage.

## 2. Client upload guards
- Before uploading a form-check video, reject files over 50 MB or longer than 60 s, reading the duration via a `<video>` element's metadata. Show a clear message instead of a failed upload.
- Voice notes: cap recording at 120 s, and auto-stop with a toast. Reject a blob over 2 MB before upload.
- Tests for the guards, as pure functions.

## 3. Progress indexes
- `supabase/migrations/0045_progress_indexes.sql`, using `create index if not exists`:
  - `check_ins (player_id, created_at desc)`
  - `form_checks (player_id, created_at desc)`
  - any other player timeline read that `EXPLAIN` shows as a seq scan in the player progress and history queries. List them in the final message with the query each one serves.
- No duplicates of the indexes listed above.
- PGlite test: the migration applies, and the indexes exist (query `pg_indexes`).

## 4. PWA check
- Confirm the manifest has `id`, `start_url`, `scope`, `display: standalone`, maskable 192 and 512 icons, and `theme_color`/`background_color` from the tokens.
- Report anything missing and fix only the manifest. Do not change the service worker caching strategy.

## Requirements
- No new dependencies. Tokens only. RTL logical properties. Files under 250 lines. Messages in Egyptian Arabic and English.

## Acceptance
- [ ] Opening the site inside Instagram or Facebook shows the warning. Normal browsers show nothing.
- [ ] Oversized videos and voice notes are stopped before upload, with a clear message.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
