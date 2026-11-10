# T-154 — KO "coming soon" teaser for everyone, with a waitlist

**Phase:** KO agent · **Depends on:** T-129 · **Status:** ready (owner decision 2026-11-10)

## Goal
In production KO is visible to pilot accounts only. Everyone else does not know it exists. After this card
every signed-in captain and player sees KO's button with a «قريبًا» badge. Tapping it opens a short, polished
panel: who KO is, three things it will do for this role, and one action «عايز أجربه أول واحد» that joins a
waitlist. Pilots keep the real KO. No AI call happens for anyone outside the pilots.

## Files
Create or modify only these:
- `supabase/migrations/0090_ko_waitlist.sql` (new), `supabase/tests/ko-waitlist.test.ts` (new)
- `src/types/database.ts`
- `src/features/ko-entry/config.ts`: `koTeaserEnabled()` reads `KO_TEASER_ENABLED === '1'`.
- `src/features/ko-entry/ko-account-link.tsx`: pilot → real widget (unchanged); otherwise, when the teaser is
  enabled and the user is signed in and not anonymous → teaser; otherwise nothing.
- `src/features/ko-entry/ko-teaser.tsx` (new, client), `src/features/ko-entry/ko-teaser-panel.tsx` (new),
  `src/features/ko-entry/data/join-waitlist.ts` (new), `src/features/ko-entry/messages.ts`
- `src/features/admin/components/ko-waitlist-count.tsx` (new) and its place in `admin-screen.tsx`: the count of
  captains and players on the waitlist, nothing more.
- `.env.example`: `KO_TEASER_ENABLED=` with a one-line comment.
- Tests: `src/features/ko-entry/ko-teaser.test.ts` (new) and the admin count render.
- This task card.

## Requirements
1. **Gate.** The same path rule as the real KO: hidden on `/player/workout…` and `/player/onboarding…`.
   Pilots never see the teaser. `KO_TEASER_ENABLED` unset means today's behaviour exactly.
2. **Button.** The same KO avatar button and position as the real widget (reuse `KoAvatar` from
   `@/features/ko-preview`), with a small «قريبًا» / "Soon" badge and a gentle idle motion that stops under
   `prefers-reduced-motion`. Translated `aria-label` «KO جاي قريب» / "KO is coming soon". At least 48px.
   Load the panel lazily so the teaser adds almost nothing to first-load JavaScript.
3. **Panel** (`ResponsiveDialog`, opaque `sheet` surface as the sheet-surfaces test requires):
   - KO avatar with the `welcome` expression; title «أنا KO، مساعدك في الجيم»; one line «لسه بتدرّب، وقريب هكون معاك.»
   - Three example chips, not clickable, per role:
     - captain: «اعمل برنامج 4 أيام لأحمد», «مين من لاعيبتي غاب الأسبوع ده؟», «جدّد اشتراك سارة شهر»
     - player: «فاضلي كام على التاج؟», «الجهاز مشغول، بدّلي التمرين», «صوّر وجبتك وأنا أراجعها»
   - One lime button «عايز أجربه أول واحد» / "I want to try it first". After joining, the button is replaced by
     «تمام! هنبلغك أول ما ييجي دورك» / "Done! We'll tell you when it's your turn" with a check icon. If the user
     already joined, the panel opens in that state.
   - Close button with a translated `aria-label`.
   - Short English versions of every string; Egyptian Arabic; no emoji.
4. **Waitlist table** `public.ko_waitlist(user_id uuid primary key references profiles on delete cascade,
   role public.user_role not null, created_at timestamptz not null default now())`. RLS on.
   - A signed-in, non-suspended, non-anonymous user can insert only their own row, with `role` equal to their
     profile role (enforce in a `with check` or a `security definer` RPC `join_ko_waitlist()`; pick one and say why).
   - A user reads only their own row. No update. Delete own row is not needed.
   - Admins (`public.is_admin()`) read all rows. Anon nothing. Grants restated explicitly.
5. **Cost guard.** The teaser never calls `/api/ko`. Add a test that rendering and joining make no request to
   `/api/ko`.
6. Join is optimistic with rollback and an error line on failure.

## Acceptance
- [x] PGlite tests: own insert works once (second insert is a no-op or a clean conflict the UI treats as joined);
  role spoofing refused; reading another user's row refused; admin reads all; anon and suspended refused.
- [x] Render tests ar and en: captain and player examples, joined and not-joined states, badge, reduced motion
  class, no `/api/ko` call. Gate tests: pilot → real widget, non-pilot with teaser on → teaser, teaser off →
  nothing, workout path → nothing.
- [x] `src/ui/sheet-surfaces.test.ts` and `src/ui/route-loading.test.ts` pass.
- [ ] `npm run check` and `npm run build` pass (known sandbox limits).

## Owner step (not part of this card)
Set `KO_TEASER_ENABLED=1` in Vercel production to turn it on; remove it to turn it off.

## Out of scope
- Notifying waitlisted users, promoting them to pilots automatically, an admin list of names.

## Implementation notes

- Used INSERT `WITH CHECK` to enforce ownership and the current profile role under RLS, avoiding a
  security-definer RPC. Only SELECT and INSERT are granted; duplicate key `23505` means already joined.
- Joined state is read on the server. The client loads the dialog only when opened, confirms joins
  optimistically, and rolls back with translated retry copy on failure. No teaser path calls `/api/ko`.
- Admin counts use two exact, head-only role queries under RLS; zero is displayed as a count.
- Owner-approved scope additions: `ko-preview/index.ts` exports `KoAvatar`; `admin/messages.ts`
  supplies the waitlist heading and role labels; `ko-entry.test.ts` mocks `koTeaserEnabled`.
- Required regression groups passed with `--configLoader native --pool threads --maxWorkers 2`:
  KO entry, KO preview, admin, waitlist RLS, sheet surfaces, and route loading: 19 files, 174 tests.
  `npx tsc --noEmit` passed. `git diff --check` passed.
- `npm run build` fails only because the sandbox cannot fetch Alexandria, Changa, and Manrope
  from Google Fonts. No missing-export or other build errors remain.
- `npm run check`: type checking and lint passed; the release audit stopped with `spawnSync git
  EPERM` before its test stage, because the sandbox blocks the audit's Git subprocess.
- Full suite with the native loader and thread workers: 413 files passed, 1 failed; 2980 tests passed,
  1 failed. The sole failure is out-of-scope `src/lib/perf-budget.test.ts`: saved bundle diagnostics
  reference missing generated chunk `.next/static/chunks/2fdu89w59yo39.js` after the failed build.
  No source or test changes were made outside the card plus the three explicitly approved files.
