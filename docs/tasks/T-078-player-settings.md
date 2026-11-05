# T-078 — Player settings on their own, with WhatsApp number and photo

**Phase:** V1 freeze · **Status:** ready (owner report 2026-11-04: "the player's settings live inside the coach tab; we want them on their own, and the player can add a WhatsApp number and a photo").

## Today
- The only way into `/player/settings` is a link at the bottom of `/player/captain` (`player-shell/components/captain-screen.tsx`).
- `/player/settings` renders the shared `SettingsScreen`. It already has `ProfileForm` (name and WhatsApp `phone`).
- Captains have an avatar uploader (`settings/components/captain-profile-card.tsx`, bucket `captain-avatars`, path `<uid>/…`, `profiles.avatar_path`). Players have none.

## Changes
1. **Its own entry point.**
   - Add a settings icon button (lucide `Settings`, translated `aria-label`, ≥48px) in the player shell's sticky top bar, next to `NotificationBell`, linking to `/player/settings`.
   - Remove the settings link from `captain-screen.tsx`.
   - Keep the bottom nav at 4 items.
   - `/player/settings` shows a back link to `/player`, and the settings icon shows as active while you're on it.
2. **The player's profile at the top of their settings.**
   - Put a "My profile" card first: photo, name, and WhatsApp number, saved by the existing `saveProfile`.
   - The WhatsApp field is **optional** for players, so a player can save a name without a phone. Captains keep it required: same validation as today when it's filled, empty allowed for players only.
   - Photo upload:
     - Reuse the captain uploader logic, extracted into a shared component or hook inside `settings`; don't copy it.
     - Same bucket `captain-avatars` and path rule `<uid>/<uuidv7>.webp|jpg`. The storage policies already allow any authenticated user's own folder; verify this with the existing PGlite storage test, or add one.
     - Resize/compress client-side as the captain uploader does.
     - Max size per the bucket limit (512 KB).
   - Every async state has loading and error, plus an empty avatar placeholder (initials).
3. **The coach sees it.**
   - The roster row and the player profile header show the player's photo when `avatar_path` is set (public URL from `captain-avatars`), otherwise the current initials.
   - The player profile also shows a WhatsApp button when the player saved a phone (reuse `whatsappUrl`).
   - Check which roster/profile queries need `avatar_path` and `phone`. RLS already lets a captain read their players' profiles; confirm with a test.
- No new migration unless the phone `not null` or a check blocks players saving it empty. If one is needed, it is `0058_*.sql` (0057 is taken).

## Out of scope
- The bottom nav layout and the captain settings screen (except the shared uploader extraction).

## Tests
- `saveProfile`: a player can save with no phone; a captain cannot; a bad phone is rejected for both.
- The shell renders the settings button with an aria-label on nav routes; the captain screen no longer links to settings.
- The roster/profile show the avatar URL when `avatar_path` is set and fall back to initials when not.
- Storage policy (PGlite): a player uploads only into their own folder.

## Requirements
- No new dependencies. Files ≤ 250 lines. Tokens only, logical RTL, strings in `messages.ts` (Egyptian Arabic + English).
- Perf budgets unchanged: player 300, captain 310 KB. The uploader must be lazy (`next/dynamic`) on the player settings route.

## Acceptance
- [ ] The player reaches settings from a top-bar icon on every main tab.
- [ ] The player sets a photo and a WhatsApp number, and the coach sees both.
- [ ] All gates pass: `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build`, perf budget.
