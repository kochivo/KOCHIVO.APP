# T-309: the captain's exercise video plays inside KOCHIVO

Mockup approved by the owner on 2026-11-15: `docs/mockups/training/exercise-video-v1.html` (screenshot `exercise-video-v1.jpg`). Open it and match it.

## Today
- **Saving the link:** captains can save a `video_url` on their own exercises.
  - Form: `src/features/captain-workspace/library/exercise-form.tsx`, `src/features/programs/components/custom-exercise-sheet.tsx`.
  - Validation: `src/features/programs/custom-exercises.ts` (`https://` only, max 500).
- **Delivery to the player:** the snapshot carries `video_url` (`src/features/player-home/data/program-snapshot.ts`, and `SnapshotExercise.video_url` in `src/core/offline/db.ts`).
- **What the player sees:** an external link in `src/features/workout/components/exercise-header.tsx` that leaves the app.
- **The media spot** above the set is `ExerciseLightbox` (GIF) in `workout-set.tsx`.
- **CSP:** `src/lib/security-headers.ts` and its test allow only Cloudflare in `frame-src` and Supabase in `media-src`.

## Do

### 1. Pure parser: `src/lib/exercise-video.ts`
`parseExerciseVideo(url)` returns `{ kind, embedUrl, vertical, label } | { kind: 'external', url, label } | null`.

| Link | Kind | What happens |
|---|---|---|
| YouTube: `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `m.youtube.com`, `youtube.com/embed/` | `youtube` | Embed `https://www.youtube-nocookie.com/embed/<id>?mute=1&playsinline=1&rel=0&modestbranding=1`. Shorts are `vertical: true`. Keep a `t=`/`start=` time as `start=`. The id must match `^[A-Za-z0-9_-]{11}$`. |
| Google Drive: `drive.google.com/file/d/<id>/...` or `open?id=` | `drive` | Embed `https://drive.google.com/file/d/<id>/preview`. |
| Direct video: an https URL whose path ends in `.mp4`, `.webm` or `.mov` | `file` | Native `<video>`. |
| Instagram, TikTok, Facebook, and any other https link | `external` | Opens outside. |
| Anything not https, or invalid | `null` | Nothing to show. |

- The labels («يوتيوب», «شورتس», «جوجل درايف», «فيديو», «انستجرام», «تيك توك», «لينك») come from messages, not the parser.
- The parser never trusts the raw URL in an iframe; it always rebuilds the embed URL from the parsed id.

### 2. CSP (`src/lib/security-headers.ts` and its test)
- `frame-src`: add `https://www.youtube-nocookie.com` and `https://drive.google.com`.
- `media-src`: add `https:`, for direct video files.
- Nothing else changes.

### 3. Player component: `src/features/workout/components/exercise-video.tsx`, client
- **The thumbnail card** (16:9) sits in the media spot above the set, with:
  - a lime round play button (the play triangle is never mirrored in RTL);
  - a tag «فيديو من الكابتن»;
  - no network request until tapped.
  - YouTube may show `https://i.ytimg.com/vi/<id>/hqdefault.jpg` as the thumbnail; if so, add only that origin to `img-src`. Otherwise use a neutral token-colored placeholder with the play button.
- **On tap**, it opens a full-screen sheet (the existing `ResponsiveDialog`/sheet pattern) with:
  - a close button with a translated aria-label;
  - the exercise name;
  - the player itself: an `iframe` for youtube/drive, with `allow="autoplay; encrypted-media; picture-in-picture; fullscreen"`, `allowFullScreen`, `referrerPolicy="strict-origin-when-cross-origin"`, `loading="lazy"`, and a title;
  - or a `<video controls muted playsInline autoPlay>` for files;
  - vertical videos shown 9:16, centred, with max height;
  - the hint «الفيديو شغال من غير صوت. دوس عليه عشان الصوت.»;
  - a secondary button «ارجع للمجموعة».
- Closing returns focus to the opener and keeps the set state untouched.
- **External kind:** the card shows the source tag, and a secondary button «افتح الفيديو» opens it in a new tab (`noopener noreferrer`).
- **Offline:** `navigator.onLine === false`, or an iframe/video error, shows the warn note «الفيديو محتاج نت. تقدر تكمّل تمرينك عادي، وكل حاجة بتتحفظ.» and a greyed card. It never blocks the set controls.

### 4. Where it shows
- **Workout set screen (`workout-set.tsx`):** when the exercise has a playable or external `video_url`, show `ExerciseVideo` in the media spot.
  - The captain's video comes first.
  - If there is also a GIF (`media_path`), keep the GIF available as a small «الصورة المتحركة» toggle under the card. Do not show both large.
- **`exercise-header.tsx`:** replace the external link with the same component (compact) where it appears outside the focus screen. Remove the old external link.
- **The alternative exercise** (`alternative_exercises[].video_url`) uses the same component when chosen.
- **Captain exercise library detail (`library/exercise-detail.tsx`):** the same player.
- **Player program preview (`player-preview/components/preview-program.tsx`):** a small play chip on exercises with a video, which opens the same sheet.

### 5. Captain form preview
In `exercise-form.tsx` and `custom-exercise-sheet.tsx`, under the link field, live as the captain types (debounced, no network):
- **valid and playable:** a lime check line «لينك <label> سليم. هيشتغل جوه KOCHIVO.» and the thumbnail card exactly as the player will see it (tappable to test);
- **external:** a warn line «اللينك ده هيفتح برا KOCHIVO. يوتيوب وجوجل درايف بيشتغلوا جوه.»;
- **invalid:** the existing field error;
- small chips under it: «يوتيوب», «شورتس», «جوجل درايف», «لينك mp4».

### 6. Copy
- Messages in ar, arStd and en. arStd is gated as the existing files do.
- English: "Video from your coach", "Back to the set", "Open video", "Video needs internet. You can keep training; everything is saved.", "Plays muted. Tap for sound."
- No emoji. Logical properties, tokens only, targets of at least 48px, the T-278 spacing scale and T-275 click cues. Keep the v11 look and the liquid buttons.

## Tests
- **`src/lib/exercise-video.test.ts`:**
  - every YouTube form (watch, youtu.be, shorts → vertical, m., embed, with `t=`);
  - Drive `file/d` and `open?id`;
  - mp4/webm/mov;
  - Instagram and TikTok → external;
  - http → null;
  - `javascript:` → null;
  - a bad YouTube id → external, not an embed;
  - the embed URL always starts with the allowed origins.
- **Security headers test:** the new `frame-src` and `media-src` values.
- **UI render-to-string tests:**
  - the card renders with a lime play button and no iframe before tap;
  - external shows «افتح الفيديو»;
  - the offline note renders and the set button is still enabled;
  - the captain form shows the ok, warn and error states.
- Tests are deterministic; no network.

## Out of scope
- Uploading video files to storage.
- Database changes (none are needed).
- The ranks work (T-307/T-308).

## Gates
1. The new tests.
2. `npx vitest run src/lib src/features/workout src/features/captain-workspace src/features/programs src/features/player-preview`
3. `npm run typecheck`
4. `npm run lint`
