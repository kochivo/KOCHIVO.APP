# T-085 — New captain intake form (before approval)

**Phase:** V1 · **Status:** ready (owner request 2026-11-05: collect sales info from new coaches without friction)

## Today (read before coding)
- New captains are `captain_status = 'pending'` (0061) and land on `/captain/pending` (`src/features/captain-approval/`, route `src/app/[locale]/(captain)/captain/pending/page.tsx`, guard `src/features/roster/data/captain-approval.ts`).
- A pending captain can still update their own profile: the `active_caller_update` policy uses `is_account_suspended()`.
- `profiles` already has:
  - `full_name`
  - `social jsonb` with `whatsapp` and `instagram` keys, validated by `valid_profile_social` (0046)
  - `avatar_path`
- Admin approvals list: `src/features/admin/components/captain-requests.tsx`, RPC `admin_pending_captains()` (0061).

## Changes
1. **Migration `0062_captain_intake.sql`** (new; never edit older ones):
   - `profiles.captain_intake jsonb` (null until submitted).
   - A check function validating exactly these keys:
     - `current_tool` in (`whatsapp_excel`, `other_app`, `just_starting`)
     - `main_challenge` in (`time_on_tables`, `tracking_progress`, `unprofessional_look`)
     - `players_range` in (`1-10`, `11-50`, `50+`)
   - Grant update of `captain_intake` to authenticated. The existing policies already scope updates to self.
   - Recreate `admin_pending_captains()` to also return `full_name`, `whatsapp` (from `social`), `instagram` and `captain_intake`.
     - Drop and recreate if the return type changes. Keep it admin-only.
2. **Intake form** on `/captain/pending`, shown while `captain_status = 'pending'` and `captain_intake is null`. After submit, the existing "under review" screen shows.
   - Fields:
     - Full name: pre-filled, editable, required.
     - WhatsApp: `type="tel"`, required. Normalize to digits with an optional leading `+`. Validate Egyptian and international formats with zod. Accept Arabic digits; reuse `parseTypedNumber`-style digit normalization or a small helper.
     - Instagram: optional; accepts a username or a link, stored as a username. Use the lucide `Instagram` icon if available in the installed lucide version; otherwise `AtSign`. Do not add dependencies.
     - Three tap-to-pick questions as radio cards (`role="radiogroup"`, real `<input type="radio">` inside labels, ≥ 48 px, `glass` cards, lime ring when selected, keyboard arrows work):
       - «بتستخدم إيه حالياً لمتابعة لاعيبتك؟» ("what do you use now to follow your players?"): «واتساب وإكسيل» ("WhatsApp and Excel") / «تطبيق تاني» ("another app") / «لسه ببتدي» ("just starting").
       - «إيه أكبر تحدي بيواجهك؟» ("what's your biggest challenge?"): «تضييع الوقت في الجداول» ("wasting time on tables") / «متابعة تطور اللاعبين» ("tracking player progress") / «شكل الشغل مش احترافي» ("the work doesn't look professional").
       - «عندك كام لاعب؟» ("how many players do you have?"): `1-10` / `11-50` / `50+`.
     - English copy is short and plain.
   - One lime primary «إرسال الطلب» ("send request") with a pending spinner (`Loader2` + `motion-reduce` handling) and disabled while submitting. Errors go in a `role="alert"` line.
   - A server action saves `full_name`, `social.whatsapp`, `social.instagram` and `captain_intake` in one update. Preserve the other `social` keys.
   - The card uses `glass-strong` (tokens only; not `bg-black/40`).
3. **Admin approvals:** show WhatsApp (as a `wa.me` link), Instagram and the three answers (translated labels) under each pending captain, so the founder can call them before approving. A captain without intake shows «لسه ماملاش البيانات» ("hasn't filled in the details yet").

## Out of scope
- Changing the approval rules.
- Player onboarding.
- Email.

## Requirements
- AGENTS.md: files ≤ 250 lines, strings in `messages.ts` (Egyptian Arabic + English), logical RTL, tokens only, lucide icons with `aria-label`s, no new dependencies.
- RLS stays the real security. A user can only write their own `captain_intake`.
- **Perf:** this lives on `/captain/pending` and `/admin` only. Do not add weight to other captain routes (player detail is 306.5/310 KB). Budgets unchanged.

## Tests
- PGlite (`supabase/tests/`):
  - a pending captain can save their intake
  - invalid keys or values are rejected
  - a user cannot write another user's intake
  - `admin_pending_captains` returns the new fields for an admin only
- Unit tests for WhatsApp and Instagram normalization. Render tests for the form (radio groups named, required fields, the submit button) and the admin row.

## Acceptance
- [ ] A new captain fills the form once, then sees "under review". The founder sees the answers in `/admin` and can tap WhatsApp.
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npm run build`, `npx vitest run --maxWorkers=2`.
