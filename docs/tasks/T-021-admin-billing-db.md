# T-021 — Admin and captain plans: data and security

**Phase:** 3 · **Depends on:** 0014 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
The owner runs KOCHIVO from an admin panel. Captains pay on WhatsApp (InstaPay or cash), and the admin activates their plan by hand. This card builds only the database side:
- who is an admin
- the four plan tiers and their player limits
- the activation and suspension actions
- an audit log
- the read function the admin screen needs

The UI is a later card (T-021b, mockup board AdminConsole).

The owner confirmed these tiers. They must match `src/features/marketing/content.ts`:

| Tier | Price (EGP/month) | Active players |
|---|---|---|
| `entry` | 0 | 5 |
| `champion` | 399 | 20 |
| `legend` | 699 | 40 |
| `empire` | 1499 | 100 |

## Files
- `supabase/migrations/0015_admin_billing.sql` (new)
- `supabase/tests/rls-admin.test.ts` (new)
- `supabase/tests/harness.ts`:
  - add `email text` and `email_confirmed_at timestamptz` to the stub `auth.users`
  - add a helper `makeAdmin(db, userId)` that inserts into `public.admins` as superuser
  - change nothing else

## Requirements
1. **Admins.**
   - Table `public.admins (user_id uuid primary key references public.profiles(id) on delete cascade, created_at timestamptz not null default now())`.
   - Enable RLS with **no policies**, and grant nothing to `anon` or `authenticated`. Rows are added only by the owner in the SQL editor. Put that one-line SQL in a comment at the top of the migration.
   - `public.is_admin()`: `security definer`, `stable`, `set search_path = ''`, returns boolean for `auth.uid()`. Grant execute to `authenticated` only.
   - An admin keeps their normal `profiles.role`. Do not add a value to `user_role`.
2. **Tiers.**
   - Table `public.plan_tiers (tier text primary key, price_egp int not null check (price_egp >= 0), player_limit int not null check (player_limit > 0), position smallint not null unique)`.
   - Seed the four rows above.
   - Authenticated users get `select` (the pricing is public anyway). No write grants.
   - Do **not** use or alter the old `captain_plan` enum or `profiles.plan`. Leave both in place and add a comment that they are superseded by `captain_subscriptions`. Removing them is a later migration.
3. **Subscriptions.**
   - Table `public.captain_subscriptions`:

     | Column | Type and constraint |
     |---|---|
     | `id` | `uuid` pk, default `gen_random_uuid()` |
     | `captain_id` | references `profiles`, on delete cascade |
     | `tier` | references `plan_tiers` |
     | `starts_at` | `timestamptz not null` |
     | `ends_at` | `timestamptz not null`, check `ends_at > starts_at` |
     | `payment_ref` | `text`, check length ≤ 80 |
     | `amount_egp` | `int not null` |
     | `activated_by` | references `profiles` |
     | `created_at` | `timestamptz not null default now()` |

   - Add an index on `(captain_id, ends_at desc)`.
   - RLS: a captain can select only their own rows. No client writes.
   - `public.current_tier(p_captain uuid) returns text`: `security definer`, `stable`. It returns the tier of the subscription where `now()` falls inside `[starts_at, ends_at)`, picking the highest `position` if several overlap, else `'entry'`. Grant execute to `authenticated`.
4. **Player limit.**
   - Replace `enforce_player_limit()` with `create or replace`, keeping it a trigger function with no grants.
   - It counts active (`archived_at is null`) players for `new.captain_id` and compares the count against `plan_tiers.player_limit` of `current_tier(new.captain_id)`.
   - Raise `P0001` with a message that includes the limit.
   - An expired paid plan falls back to `entry`. Existing players are never archived or deleted; only new ones are blocked.
5. **Suspension.**
   - Add `profiles.suspended_at timestamptz`.
   - Replace `guard_profile_update()` with `create or replace`. It is a copy of the 0013 body, plus `suspended_at` added to the protected columns.
   - A suspended captain cannot create invites. Recreate the `coach_invites` insert path (read 0003 for the exact policy name) to require `not exists (select 1 from public.profiles where id = auth.uid() and suspended_at is not null)`, using a security definer helper `public.is_suspended()` with a grant to `authenticated`.
6. **Admin RPCs.** Each is `security definer`, `set search_path = ''`, and starts with `if not public.is_admin() then raise exception ... using errcode = '42501'`. Grant execute to `authenticated` only.
   - `admin_activate_plan(p_captain uuid, p_tier text, p_months int, p_payment_ref text) returns uuid`:
     - `p_months` must be between 1 and 12.
     - The target must be a captain.
     - `starts_at` is the later of `now()` and the end of the captain's latest active subscription, so renewing early stacks.
     - `amount_egp` = tier price × months.
     - It writes an audit row.
   - `admin_set_suspended(p_user uuid, p_suspended boolean, p_reason text) returns void`: it sets or clears `suspended_at` and writes an audit row. An admin cannot suspend themselves.
   - `admin_captains(p_search text default null, p_limit int default 50, p_offset int default 0)` returns a table with these columns:
     - `id`, `full_name`, `email`, `email_confirmed boolean`, `created_at`
     - `tier`, `tier_ends_at`
     - `active_players int`, `player_limit int`
     - `suspended boolean`

     Rules:
     - Search uses case-insensitive `ilike` on name or email, with `%` and `_` in the input escaped.
     - `p_limit` is capped at 100.
     - Order by `created_at desc`.
     - It reads `auth.users` inside the definer.
7. **Audit log.**
   - Table `public.admin_audit_log`:

     | Column | Type and constraint |
     |---|---|
     | `id` | `uuid` pk |
     | `admin_id` | references `profiles` |
     | `action` | `text not null`, check in (`activate_plan`, `suspend`, `unsuspend`) |
     | `target_id` | `uuid not null` |
     | `details` | `jsonb not null default '{}'` |
     | `created_at` | `timestamptz not null default now()` |

   - RLS: select only when `is_admin()`. No client insert, update, or delete. Only the RPCs write it.
8. **Grants (from 0014).** New functions are closed by default. Grant execute explicitly to `authenticated` for every function a policy or the app calls, and to no one for trigger functions. Never grant anything to `anon`.

## Acceptance (`rls-admin.test.ts`, PGlite)
- [ ] A non-admin calling any `admin_*` RPC gets `42501`, and cannot select `admins` or `admin_audit_log`.
- [ ] An admin activates `legend` for 1 month:
  - `current_tier` returns `legend`
  - `amount_egp` is 699
  - one audit row exists
  - an early renewal starts at the old `ends_at`
- [ ] Player limit:
  - an `entry` captain is blocked at player 6
  - a `champion` captain is allowed player 6
  - after the subscription is expired (`update ... set ends_at` as superuser), player 6 is blocked again, and the existing 6 players remain active
- [ ] A suspended captain cannot insert an invite, and an unsuspended one can again.
- [ ] A captain cannot change their own `suspended_at` through `profiles` update (`42501`).
- [ ] `admin_captains` returns email and `email_confirmed`, filters by search, escapes `%`, and caps the limit at 100.
- [ ] `anon` has no execute on any new function (`has_function_privilege`).
- [ ] Existing tests still pass, including the free plan limit tests. Update their expected error text only if it changed.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- The admin UI and routing (T-021b)
- Deleting unconfirmed accounts automatically (needs `pg_cron`, T-015)
- Payments integration
- Removing `captain_plan`
