# T-009 — Captain shell, player roster, and invite link

**Phase:** 3 · **Depends on:** T-003 (merged), 0015 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
A captain signs in and lands on «اللاعبين». The screen shows:
- every active player with a status (active, late, ending soon, in grace)
- when each player last logged a workout
- each player's current program and when their access ends

From here, one lime button creates an invite and opens WhatsApp with the link ready to send. Mockup boards: **CaptainClients** (desktop) and **CaptainMobile** (phone).

## Files
- `supabase/migrations/0016_captain_roster.sql` (new): `public.captain_roster()` returns a table with these columns:
  - `player_id`, `full_name`
  - `access_until date`, `started_on date`
  - `last_training_date date`: the max `training_date` of that player's sessions
  - `program_title text`: the active program for that player, or null
  - `open_tasks int`: unreviewed `check_ins` plus `form_checks` for that player

  Rules:
  - `language sql stable security invoker set search_path = ''`, so RLS of the caller applies.
  - It returns rows only for `coach_clients` where `captain_id = auth.uid()` and `archived_at is null`.
  - Order by `full_name`.
  - Per 0014: `grant execute on function public.captain_roster() to authenticated` explicitly, with nothing to anon.
- `supabase/tests/rls-roster.test.ts` (new)
- `src/features/roster/` (new):
  - `index.ts`
  - `status.ts` (pure): `playerStatus({ accessUntil, lastTrainingDate, today })` returns `'ending' | 'grace' | 'expired' | 'late' | 'active'`:
    - `expired`: today is more than 3 days after `accessUntil`
    - `grace`: today is 1–3 days after `accessUntil`
    - `ending`: `accessUntil` is within the next 7 days
    - `late`: no training in the last 4 days, or never trained after `started_on` + 4 days
    - otherwise `active`

    Check them in that order. Also add `lastSeenLabel(date, today)`: «النهارده», «امبارح», «من n أيام», or «لسه مبدأش».
  - `invite.ts` (pure):
    - `inviteUrl(code)` returns `https://kochivo.site/i/${code}`.
    - `whatsappShareUrl(text)` returns `https://wa.me/?text=${encodeURIComponent(text)}`.
    - `inviteMessage(captainFirstName, url)` returns «كابتن {name} بيدعوك تبدأ معاه على كوتشيفو. افتح اللينك: {url}».
  - `data/roster.ts`: a server-only `fetchRoster()` that calls the RPC and maps rows
  - `data/create-invite.ts`: a `'use server'` action. It inserts a `coach_invites` row for the session user with `access_until` = today + `days` (7, 30, or 90; validate with zod), and returns `{ code } | { error }`. A suspended captain gets the RLS error mapped to «حسابك موقوف. كلّم الدعم».
  - `data/archive-player.ts`: a `'use server'` action that sets `archived_at = now()` on the captain's `coach_clients` row for `player_id`. Confirm in the UI first.
  - `components/roster-screen.tsx`:
    - the header «ROSTER · n لاعب» and title «اللاعبين»
    - 4 count tiles (نشط, متأخر, هيخلص قريب, مهام مستنياك)
    - filter chips (الكل, متأخر, هيخلص قريب)
    - a search `TextField`
    - the list
  - `components/roster-row.tsx`: on desktop a table row, on mobile a stacked `GlassCard` (one component; use responsive classes). It shows name, a status tag, the last seen label, the program or «من غير برنامج», and the access end date. `open_tasks` appears as a lime badge.
  - `components/invite-sheet.tsx`: a dialog or bottom sheet. It holds a `Segmented` choice of 7, 30, or 90 days, then calls `createInvite`, then shows the link with «ابعت على واتساب» (lime, opens `whatsappShareUrl`) and «انسخ اللينك» (ghost, `navigator.clipboard` with a fallback message).
  - `components/captain-shell.tsx`: on desktop, a sidebar with اللاعبين, البرامج, الأنظمة الغذائية, صندوق المهام, القوالب, الاشتراكات, الإعدادات. On mobile, `BottomNav` with اللاعبين, البرامج, المهام, الإعدادات. Only اللاعبين is a real route now; the others link to `/captain/...` with `TODO` comments.
  - `roster.test.ts`
- `src/app/(captain)/captain/page.tsx`: replace the placeholder. Keep it thin: `fetchRoster()` plus the captain's first name, rendered in `CaptainShell` and `RosterScreen`. Keep sign-out reachable in the shell.
- `src/app/(captain)/captain/layout.tsx` (new) only if needed for the shell; otherwise compose in the page.

## Requirements
1. States:
   - loading
   - error with retry
   - empty «لسه مفيش لاعبين. ابعت أول دعوة.», with the invite button as its action
   - no search results «مفيش لاعب بالاسم ده»
2. Dates: `today` = `localDate(new Date())` on the server, passed down. Pure functions take `today`.
3. Never trust a `player_id` for reads. The RPC is scoped by `auth.uid()`, and the archive action relies on RLS (`captain_id = auth.uid()`).
4. Files under 250 lines, RTL logical properties, ≥ 48px targets, no hex, Egyptian Arabic, `aria-label` on icon buttons, and one lime primary action per screen (the invite button).

## Acceptance
- [ ] `rls-roster.test.ts` covers:
  - a captain sees only their own active players
  - `last_training_date` and `open_tasks` are correct
  - an archived player is excluded
  - a player calling it gets zero rows
  - anon has no execute
- [ ] `roster.test.ts` covers every `playerStatus` branch, including precedence, plus `lastSeenLabel`, `inviteUrl`, `whatsappShareUrl` encoding of Arabic, and invite `days` validation.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- The player detail page
- The withdrawal radar (T-009b)
- Program and nutrition builders
- Billing screens (T-018)
- Editing `access_until`
