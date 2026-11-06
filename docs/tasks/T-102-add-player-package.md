# T-102 — Add player with package, payment and start date in one step

**Phase:** V1 coach CRM · **Depends on:** none · **Status:** ready (owner approved the mockup on 2026-11-06)

## Goal
Today the captain sends an invite with a generic 7/30/90-day picker. After the player joins, the player is `pending`, and the captain must open a second "activate" sheet to pick a package, price and paid amount. After this card, the captain fills everything once when adding the player:
- name (required)
- WhatsApp number (optional)
- one of the captain's own packages, or a custom duration and price
- price (prefilled from the package, editable for discounts)
- amount paid
- start date (default today)

The invite carries all of it. When the player opens the link, the link is created **already active**, with the payment recorded, and there is no second activation step.

The old activate flow stays for players who arrive without package data: old invites, and join requests from the public coach page.

## Current code to read first
- `supabase/migrations/0003_coach_clients.sql`: `coach_invites`.
- `supabase/migrations/0065_fleet_fixes.sql`: the latest `redeem_invite`.
- `supabase/migrations/0064_package_rules.sql`: the latest `activate_player` and `renew_player`.
- `0037`/`0060`: `captain_packages`, including `kind`/`sessions`.
- `0019`: `player_payments`.
- `supabase/tests/rls-invites.test.ts`, `package-rules.test.ts`, `pt-packages.test.ts`.
- `src/features/roster/components/invite-sheet.tsx`, `invite-button.tsx`, `data/create-invite*.ts`.
- `src/features/billing/components/activate-sheet.tsx`, `data/pt-actions.ts`.
- The join route `src/app/[locale]/(auth)/i/[code]`.

## Database: `supabase/migrations/0069_invite_package.sql` (new)
1. **`coach_invites` gets nullable columns:**
   - `player_name text` (1–60 chars after trim)
   - `whatsapp text` (digits only, 8–15)
   - `package_id uuid references captain_packages(id)`
   - `kind text check (kind in ('days','sessions'))`
   - `quantity int`
   - `price_egp int`
   - `paid_egp int`
   - `free_trial boolean`
   - `starts_on date`

   All of them are null for old invites. Add a check that the plan columns are either all null or all set and valid, using the same ranges as `activate_player`: quantity 1–365 days or 1–200 sessions, price 0–100000, paid 0–price.
2. **`create_player_invite(...)`**
   - Takes `p_name, p_whatsapp, p_package, p_kind, p_quantity, p_price_egp, p_paid_egp, p_free_trial, p_starts_on`, and returns the invite `code`.
   - `security definer`, `search_path = ''`, starts with `require_active_caller()`.
   - The caller must be a captain who is not in a demo, matching the guards `createInviteAt` uses today.
   - The package must belong to the caller and not be archived. In that case the package decides `kind`/`quantity`, exactly like `activate_player`.
   - `p_starts_on` must be between Cairo-today minus 30 days and Cairo-today plus 60 days.
   - Free trial forces price and paid to 0.
   - Set `access_until`:
     - days: `starts_on + quantity - 1`
     - sessions: `starts_on + coalesce(pkg.days, 60)`

     Match how `activate_player` computes `d`, and document the off-by-one you choose in a comment. It must agree with `activate_player`.
   - Grant execute to `authenticated` only.
   - Direct `insert` into `coach_invites` by captains must not be able to set the new columns. Restrict the column grants or route all inserts through the RPC, then update `createInviteAt`/the old picker accordingly. The old 7/30/90 path is removed from the UI.
3. **`redeem_invite(p_code)`: `create or replace` from the 0065 version.**
   - When the invite has plan columns, attach the player with `access_until` from the invite.
   - Then activate in the same transaction:
     - `pending = false`, `billing_started_at = now()`
     - `sessions_left` for sessions packages
     - accept any pending join request
     - insert the `player_payments` row with `period_start = starts_on`, the period end, price, paid, `package_id`, and `notes = 'free_trial'` for trials

     Factor the shared part of `activate_player` into a private helper in `security_private` taking a start date, so both paths stay identical. Keep `activate_player`'s signature and behaviour.
   - Without plan columns, behave exactly as today (`pending = true`).
   - The player limit and the other guards inside `attach_coach_player` still apply.
4. **Tests: PGlite, `supabase/tests/invite-package.test.ts`:**
   - happy path days and sessions
   - discount and partial payment recorded
   - free trial zeroes the money
   - another captain's package is rejected
   - an archived package is rejected
   - paid > price is rejected
   - a start date out of range is rejected
   - a player is active after redeem and has exactly one payment row with the right period
   - an old-style invite still redeems as pending
   - a captain cannot write the plan columns through a direct insert
   - a demo captain is blocked

   Keep `rls-invites`, `package-rules` and `pt-packages` green. Regenerate the needed bits of `src/types/database.ts` by hand to match.

## UI: `src/features/roster`
- **Replace the body of `invite-sheet.tsx`** (split it into small files under 250 lines, e.g. `invite-form.tsx`, `invite-result.tsx`, `package-picker.tsx`, plus a pure `invite-plan.ts` for defaults and derived values). The sheet keeps the opaque `sheet` surface (required by `src/ui/sheet-surfaces.test.ts`); use glass only inside it.
- **Form, in this order:**
  1. **Player name** (required).
  2. **WhatsApp number** (optional; `inputMode="tel"`, `dir="ltr"`; normalise an Egyptian `01xxxxxxxxx` to `201xxxxxxxxx`; show a validation error for anything else that is not 8–15 digits).
  3. **Package:** radio cards from the captain's non-archived `captain_packages`, showing name, duration (days or sessions) and price, then a last card «مدة وسعر مخصوص». Custom shows a days/sessions segmented control and a quantity stepper, reusing what `activate-sheet.tsx` does.
  4. **Price:** prefilled from the package, editable. Under it, «خصم X ج» when it is lower than the package price.
  5. **Paid:** defaults to the price. Under it, «فاضل X ج» in `text-warn` when it is lower.
  6. **Free trial** chip, as in the activate sheet.
  7. **Start date:** a native date input, default `localDate()` today, limited to −30/+60 days. Under it, «ينتهي يوم ...», computed in the pure helper with the same rule as the SQL.
  8. **One lime button:** «اعمل لينك الدعوة».
- **No packages yet:** show a short line with a link to the packages page, and open on «مدة وسعر مخصوص».
- **Result view:**
  - A check mark, «لينك {name} جاهز», and «ابعته له، وأول ما يفتحه حسابه يشتغل على طول».
  - A summary list: package, from–to, price, paid and remaining.
  - The link: the existing `/i/<code>` route on `https://kochivo.site`.
  - Primary «ابعته على واتساب»: `https://wa.me/<number>?text=...` when a number was given, otherwise `https://wa.me/?text=...`, with a short Egyptian message including the captain's first name and the link (the message lives in `messages.ts`).
  - Secondary «انسخ اللينك», with a `role="status"` result.
- **Server action:** a new `create-player-invite.ts` calling the RPC. Validate with zod first, map errors to friendly strings (player limit reached, package not found, invalid values), and `revalidatePath('/captain/players')` and `('/captain/billing')`.
- **Strings:** all in `messages.ts`, ar + en. Use logical properties, `min-h-12` targets, and an `aria-label` on icon buttons.
- **Perf:** the captain budget is 310 KB. The sheet is already lazy; keep the new code inside the lazy chunk.

## Tests (vitest)
- `invite-plan.ts`:
  - defaults from a package
  - discount and remaining amounts
  - free trial
  - end date for days and for sessions
  - WhatsApp normalisation
- Server action: the zod rejects, and RPC errors map to messages.
- Render:
  - the form with packages
  - the form with none
  - the result view with and without a WhatsApp number (the link `href`s)
  - ar and en

## Out of scope
- Showing unredeemed invites in the roster.
- Editing or cancelling an invite.
- Online payments.
- Changing the activate sheet or the renew flow (beyond the shared SQL helper).

## Acceptance
- [ ] A captain with packages adds a player in one sheet. The player opens the link and lands active, with the payment visible on the payments page and the remaining amount in dues.
- [ ] Old invites and join requests still go through the activate step.
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npm run build`, `npx vitest run --maxWorkers=2` (includes the PGlite tests and the perf budget).
