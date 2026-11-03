# T-015 security review

Reviewed 2026-11-03 against migrations **0001–0023 applied in order**. This is a report only; all fixes below are proposals for subsequent cards.

## Summary

| ID | Severity | Area | Title |
| --- | --- | --- | --- |
| SEC-01 | high | Suspension / RLS | Suspended captains retain data access and most mutations |
| SEC-02 | medium | Subscription authorization | A new captain's subscription unlocks the previous captain's active content |
| SEC-03 | medium | Inbox integrity | Players can forge captain review fields during insertion |
| SEC-04 | low | Role authorization | Player accounts can issue invites and acquire captain privileges over consenting players |
| SEC-05 | low | Definer disclosure | Authenticated outsiders can resolve private hierarchy IDs and another captain's tier |

No critical finding was identified. Severity reflects the demonstrated capability and prerequisites, rather than treating every definer or missing explicit UID check as an exploit.

## Method and evidence limits

Read every migration and `supabase/tests/*.ts`; all 27 files containing a `use server` directive under feature data directories; auth helpers, callback, routing and validation; `src/proxy.ts`; all `src/core/storage/*`; offline transport and media queue. Followed the common server client and session refresh implementation to check the credential boundary. Later definitions supersede earlier ones, notably the guards in 0015/0020 and sync RPCs in 0023.

Ran an in-memory probe using the existing PGlite harness through `node --experimental-strip-types --input-type=module`. It applied every migration without alteration and reproduced SEC-01's direct access renewal, SEC-02's old-plan read, SEC-03's forged review, and SEC-05's meal-to-plan disclosure. No throwaway file was created. Catalog queries returned no public table without RLS, only `invite_preview` executable by anon, and an empty search path on every public definer.

SEC-04 and the other branches of these findings are established by source inspection; they were not individually exercised. PGlite's auth/storage schemas are stubs, not a deployed Supabase Storage/Auth service. Live default grants, JWT validation, signed URL delivery, OAuth allowlists, rate limits and two-connection concurrency were not independently verified. No production data or network was accessed.

## SEC-01 — Suspended captains retain data access and most mutations

**Objects:** `supabase/migrations/0015_admin_billing.sql`: `is_suspended`, `coach_clients_captain_update`, `guard_coach_client_update`; `0003_coach_clients.sql`: `is_captain_of`; `0005_programs.sql`: `programs_captain`, `can_edit_program`, `can_read_program`; `0007_nutrition.sql`: corresponding plan policies/helpers; `0008_inbox.sql`: captain select/review policies; `0009_storage.sql`: `private_media_read`. `src/core/supabase/session.ts` and `src/features/auth/routing.ts` do not gate suspension either.

**Attack:**

1. A captain establishes a normal player relationship and retains a valid session.
2. An administrator suspends that captain.
3. The captain directly updates their `coach_clients.access_until`, or calls the existing archive/review/program/template actions. The direct update bypasses the suspension check in `renew_player`.
4. The captain continues selecting player health/history and signing private media URLs through their existing relationships.

**Why allowed:** Suspension is checked when inserting invites, admitting players through the limit trigger, and inside `renew_player`. Most existing RLS predicates check ownership only. `is_captain_of` ignores suspension. The relationship guard permits changing `access_until`; it does not require use of the payment RPC. PGlite returned the player's ID from an authenticated update to `current_date + 365` after setting the captain's `suspended_at`.

**Minimal fix proposal:** Enforce a database-wide suspended-caller boundary, retaining explicit exceptions only if product requirements demand them. Restrictive policies prevent existing permissive policies from reopening access. Also deny suspended administrators in `is_admin`, since admin definers bypass table RLS. This blocks fresh URL issuance; already-issued bearer URLs retain their expiry and need a separate product decision if immediate revocation is required.

```sql
-- Proposed new migration, not executed. Existing permissive policies still apply.
do $$
declare t record;
begin
  for t in select tablename from pg_catalog.pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'create policy active_caller on public.%I as restrictive for all '
      'to authenticated using (not public.is_suspended()) '
      'with check (not public.is_suspended())', t.tablename);
  end loop;
end;
$$;
create policy active_caller on storage.objects as restrictive
  for all to authenticated
  using (not public.is_suspended())
  with check (not public.is_suspended());

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select not public.is_suspended() and exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;
```

**Proof test:** Suspend a linked captain and retain the same authenticated identity. Assert direct relationship renewal/archive, content CRUD, template RPCs, inbox review, health/history queries, and storage SELECT all fail or return no rows. Verify another active captain remains unaffected, invite redemption and `renew_player` remain blocked, and unsuspension restores access. Include a suspended admin invoking each admin definer. Existing `rls-admin.test.ts` covers invite suspension, and `rls-player-payments.test.ts` covers the renewal RPC, but neither covers the direct-update bypass or the general data boundary.

## SEC-02 — A new subscription unlocks the previous captain's content

**Objects:** `supabase/migrations/0003_coach_clients.sql`: `player_can_read`; `0005_programs.sql`: `programs_player_select`, `can_read_program`; `0007_nutrition.sql`: `nutrition_plans_player_select`, `can_read_plan`. No later migration ties these checks to the content's captain.

**Attack:**

1. Player P has active assigned content from captain A.
2. A archives the relationship, or its access window expires beyond grace. A leaves the content status active.
3. P redeems an invite from captain B, including a second captain account controlled by P. Archiving A's relationship is necessary before redemption if it remains unarchived.
4. P directly selects A's plans and their child rows again, without renewing with A.

**Why allowed:** Content checks `player_id = auth.uid()` and the existence of *any* current readable relationship. `player_can_read()` has no captain argument. The new relationship satisfies it for A's still-active content too. PGlite returned A's `nutrition_plans.title` after archiving A and linking B. This is an access-window bypass for previously assigned content, not a read of arbitrary players' plans. Archiving players to free roster slots can also leave content accessible through a cooperating second captain; it does not bypass the literal unarchived-row count.

**Minimal fix proposal:** Bind content authorization to its own captain, including both the parent policies and definer helpers used by child policies. Keep the zero-argument helper for consumers whose authorization is intentionally relationship-wide.

```sql
create function public.player_can_read_from(p_captain uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.coach_clients
    where player_id = (select auth.uid()) and captain_id = p_captain
      and archived_at is null and current_date <= access_until + 3);
$$;
revoke all on function public.player_can_read_from(uuid) from public, anon;
grant execute on function public.player_can_read_from(uuid) to authenticated;

alter policy programs_player_select on public.programs using (
  player_id = (select auth.uid()) and status = 'active'
  and public.player_can_read_from(captain_id));
alter policy nutrition_plans_player_select on public.nutrition_plans using (
  player_id = (select auth.uid()) and status = 'active'
  and public.player_can_read_from(captain_id));

create or replace function public.can_read_program(p_program uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.programs p where p.id = p_program and (
    p.captain_id = (select auth.uid()) or (
      p.player_id = (select auth.uid()) and p.status = 'active'
      and public.player_can_read_from(p.captain_id))));
$$;
create or replace function public.can_read_plan(p_plan uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.nutrition_plans p where p.id = p_plan and (
    p.captain_id = (select auth.uid()) or (
      p.player_id = (select auth.uid()) and p.status = 'active'
      and public.player_can_read_from(p.captain_id))));
$$;
```

**Proof test:** For both hierarchies, create A's active assigned content, archive A's relationship, redeem B's invite, and assert A's parent and every child table are hidden while B's eligible content remains visible. Repeat with A's expired relationship before and after grace. Existing access tests cover expiry under one captain, not a transfer.

## SEC-03 — Players can forge captain review fields on insert

**Objects:** `supabase/migrations/0008_inbox.sql`: `set_inbox_captain`, `guard_review_update`, both review triggers; `0014_hardening.sql`: final `check_ins_player_insert` and `form_checks_player_insert`. `src/features/inbox/data/inbox.ts`: `listInbox`, `reviewItem`.

**Attack:**

1. A subscribed player directly inserts a check-in with `reviewed_at` populated and `captain_reply` containing an invented captain response.
2. Alternatively insert a form check with the same fields and a path in the player's own folder.
3. The record appears reviewed and disappears from the open-task list. The player and captain see a response the captain never wrote.

**Why allowed:** Ownership, path and subscription checks pass. The insert trigger replaces `captain_id` but leaves review fields untouched. `guard_review_update` runs only on UPDATE. PGlite confirmed the captain sees `{ reviewed: true, captain_reply: 'forged review' }`. The existing inbox test proves players cannot *update* reviews, not that they cannot supply them initially.

**Minimal fix proposal:** Add a restrictive insert policy to each inbox table, alongside the existing ownership/path policy.

```sql
create policy review_initially_empty on public.check_ins as restrictive
  for insert to authenticated
  with check (reviewed_at is null and captain_reply is null);
create policy review_initially_empty on public.form_checks as restrictive
  for insert to authenticated
  with check (reviewed_at is null and captain_reply is null);
```

**Proof test:** Attempt each field separately and together on both tables through direct INSERT and INSERT ON CONFLICT. Require rejection and no stored forged row. Ordinary inserts must remain open; captain review UPDATE must still work. No service-role exception is needed for the player-facing insert contract.

## SEC-04 — Player accounts can acquire captain capabilities

**Objects:** `supabase/migrations/0015_admin_billing.sql`: `coach_invites_captain_insert`, `enforce_player_limit`; `0003_coach_clients.sql`: `redeem_invite`, `is_captain_of`; `0005_programs.sql` / `0007_nutrition.sql`: captain ownership policies. `src/features/roster/data/create-invite.ts`: `createInvite` contains a role check absent from RLS.

**Attack:**

1. Sign in as a confirmed player; the profile's immutable role remains `player`.
2. Bypass `createInvite` and insert a `coach_invites` row directly with the caller as `captain_id`.
3. Have a second player redeem that invite.
4. The first player now passes `is_captain_of(second_player)` and can read that player's intake, logs and private media, and author assigned programs/plans through the Data API.

**Why allowed:** Invite insertion checks caller ID and suspension only. Redemption checks the redeemer's player role, not the inviter's captain role. The player-limit trigger reads a tier for any profile ID and defaults to entry. Relationship-based helpers then confer captain capabilities regardless of role/confirmation. This needs a cooperating or misled invite recipient; it does not expose unrelated users automatically. Captain registration is open, so this is a low-severity role-boundary bypass rather than admin or paid-plan escalation.

**Minimal fix proposal:** Restrict invite creation to confirmed captains and defensively validate the inviter inside the relationship-admission trigger, preventing consumption of previously created invalid invites. Preserve its existing lock, suspension and count checks.

```sql
alter policy coach_invites_captain_insert on public.coach_invites
  with check (captain_id = (select auth.uid())
    and not public.is_suspended()
    and exists (select 1 from public.profiles
      where id = (select auth.uid()) and role = 'captain' and role_confirmed));

-- Add inside enforce_player_limit(), after its profile lock and before insertion:
if not exists (select 1 from public.profiles
  where id = new.captain_id and role = 'captain' and role_confirmed) then
  raise exception 'confirmed captain required' using errcode = '42501';
end if;
```

**Proof test:** A confirmed player and an unconfirmed account must both fail direct invite insertion. Seed an old invite owned by a player as database owner; redemption must fail and leave it unused. A confirmed captain's invite must still redeem normally. Keep the existing once-only and one-hour confirmation tests. The above trigger fragment is a proposal to merge into the existing function, not standalone SQL.

## SEC-05 — Definer helpers disclose unrelated users' metadata

**Objects:** `supabase/migrations/0007_nutrition.sql`: `plan_of_meal`, `plan_of_item`; `0015_admin_billing.sql`: `current_tier(uuid)` and its authenticated EXECUTE grant; `0014_hardening.sql`: authenticated EXECUTE grants for the hierarchy helpers.

**Attack:**

1. Obtain a target meal/item or captain UUID, for example from content previously shared with the caller.
2. As any authenticated account, call `plan_of_meal(target)` or `plan_of_item(target)` to obtain its private parent-plan UUID despite SELECT RLS hiding the hierarchy.
3. Call `current_tier(target_captain)` to discover the captain's current paid tier, even though subscription rows are restricted to their owner.

**Why allowed:** These definers query protected tables with no caller authorization. Authentication-only EXECUTE does not constrain the supplied UUID. The PGlite probe reproduced an unrelated player's meal-to-plan lookup. The tier behavior follows directly from the final function body. Neither operation yields plan contents or payment references. Random UUID enumeration is impractical, and `entry` also represents unknown IDs; this is limited metadata disclosure, not a general user directory.

**Minimal fix proposal:** Authorize hierarchy lookups through the existing content-read check. Move the unfiltered tier lookup into a non-exposed, owner-only schema and put authorization in the public wrapper. Update owner-run admission/admin functions to use the internal lookup, so checking an invited captain's tier never depends on the redeemer's subscription permissions.

```sql
create or replace function public.plan_of_meal(p_meal uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select m.plan_id from public.meals m
  where m.id = p_meal and public.can_read_plan(m.plan_id);
$$;
create or replace function public.plan_of_item(p_item uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select m.plan_id from public.meal_items i
  join public.meals m on m.id = i.meal_id
  where i.id = p_item and public.can_read_plan(m.plan_id);
$$;

create schema if not exists security_private;
revoke all on schema security_private from public, anon, authenticated;
create function security_private.current_tier(p_captain uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select s.tier from public.captain_subscriptions s
    join public.plan_tiers t on t.tier = s.tier
    where s.captain_id = p_captain and s.starts_at <= now() and s.ends_at > now()
    order by t.position desc, s.ends_at desc, s.id limit 1), 'entry');
$$;
revoke all on function security_private.current_tier(uuid)
  from public, anon, authenticated;

create or replace function public.current_tier(p_captain uuid) returns text
language sql stable security definer set search_path = '' as $$
  select security_private.current_tier(p_captain)
  where p_captain = (select auth.uid()) or public.is_admin();
$$;
-- In enforce_player_limit() and admin_captains(), replace their call to
-- public.current_tier(...) with security_private.current_tier(...).
-- Keep security_private out of the Data API's exposed schemas.
```

The two internal call-site replacements are required parts of the proposal. Keep the existing public function's authenticated grant and revoked anon/PUBLIC privileges. The private schema/function must be owned by the same trusted migration role as the admission/admin definers.

**Proof test:** A stranger must get no parent ID for known private meal/item UUIDs and no tier for a known paid captain. Owners, eligible players and admins retain appropriate results. Exercise child-table SELECT policies to rule out helper recursion and verify an invited player can still redeem a captain's invite at the correct tier limit.

## Verified safe and coverage

- **Tables and grants:** All 23 public tables enable RLS: `profiles`, `coach_clients`, `coach_invites`, `exercises`, `programs`, `program_days`, `program_exercises`, `workout_sessions`, `set_logs`, `foods`, `nutrition_plans`, `meals`, `meal_items`, `meal_item_alternatives`, `meal_logs`, `check_ins`, `form_checks`, `player_intake`, `admins`, `plan_tiers`, `captain_subscriptions`, `admin_audit_log`, and `player_payments`. No final write policy has an unconditional `true` predicate. `plan_tiers_select` intentionally permits authenticated catalog reads. Migration 0014 removes anon table/sequence access; later tables explicitly revoke access. `admins` has no client access; billing and audit tables have no client writes. The harness does not simulate every Supabase default grant, so this is verification of the migrated model, not a live grant audit.
- **Definers:** Every final public definer pins `search_path = ''`. API-callable mutation definers bind to `auth.uid()` or `is_admin()`, subject to the findings above. `handle_new_user`, `set_inbox_captain`, and `enforce_player_limit` receive trusted trigger context and need not require a user UID for owner/seed operations. `purge_deleted_accounts` is intentionally owner-only. Trigger functions and purge are not executable by authenticated/anon callers. `invite_preview` intentionally works without UID; SEC-05 covers the unjustified lookup exceptions. No migration function interpolates client input into dynamic SQL.
- **Profile and relationship guards:** Final `guard_profile_update` in 0020 protects role, legacy plan, confirmation, suspension, deletion-request timestamp and creation time using database role rather than editable JWT metadata. No profile INSERT grant permits upsert creation. `confirm_role` is caller-bound, once-only and restricted to the first hour; setting captain metadata at initial signup is consistent with open captain registration, not admin membership. `guard_coach_client_update` blocks reassignment, changing start/creation dates and unarchiving. Captains cannot directly INSERT relationships. SEC-03 covers the review guard's INSERT gap; no other reachable RPC bypass to these protected columns was identified.
- **Player limits:** `redeem_invite` locks the invite; the admission trigger locks the captain profile before counting all unarchived relationships, including expired ones. Distinct invites therefore serialize on one captain. Unarchiving is blocked; `renew_player` locks an existing unarchived owned relationship and creates no new one. `rls-invites.test.ts` and `rls-admin.test.ts` prove sequential limits, no consent-free attachment, and suspended-invite rejection. A real two-connection race test remains **needs confirmation**: start at limit minus one, redeem two distinct invites concurrently, and require exactly one commit. PGlite's single-connection harness does not prove concurrency. Existing excess players after paid-tier expiry are explicitly retained by an admin test; that is established product behavior, not a newly reported race.
- **Private storage:** Both private buckets are non-public, with size/MIME restrictions; INSERT requires the caller's UUID folder and an active write window. SELECT requires that folder's player or their active captain. No client UPDATE/DELETE policy enables overwriting another object. `storage_owner` parses only the first UUID segment; malformed matching input may raise a cast error, but does not authorize access. Migration 0014 validates every check-in path, the form video's owner folder and any set reference. Forged foreign paths and foreign sets are covered by `rls-hardening.test.ts`; object isolation is covered by `rls-storage.test.ts`. Signing uses the caller's client, not a privileged signer. SEC-01 qualifies captain suspension. Path normalization and signed URL expiry require Storage integration tests; no foreign-folder read exploit was demonstrated.
- **Invoker RPCs:** Final sync RPCs retain invoker security and ownership policies. Migration 0023 nulls unowned/missing optional references without accepting another player's session or row; conflict updates remain subject to RLS. Assignment/save/activation/template RPCs enforce source ownership and target relationships; unique active-content indexes enforce cross-row uniqueness. Nutrition save rejects conflicting meal ownership and is transactional. Roster/radar operate under invoker RLS and filter caller relationships. No SQL-injection path was found. Client timestamps can falsify the caller's own history, but do not grant cross-user writes.
- **Server actions:** Reviewed admin activation/suspension; all auth actions; billing; inbox; meal-plan activation/search/IO; intake; player captain lookup; program activation/search/IO; roster archive/invites/radar; settings/export/deletion; and templates. These use the cookie-bound publishable-key server client and RLS/RPC checks, not service-role credentials. Client-sent IDs are constrained by RLS; errors are generally mapped to fixed Arabic messages. Offline transport forwards the database error message to its local caller, while the media queue stores sanitized error codes; no privileged data/path disclosure was demonstrated. SEC-01 applies to actions whose underlying RLS omits suspension.
- **Auth and enumeration:** Production `siteOrigin()` is fixed to `https://kochivo.site`, so attacker Host headers cannot poison outgoing reset/signup/OAuth links. Auth callback paths are fixed or use validated invite codes; no arbitrary client `next` redirect is accepted. Callback/proxy redirects use the request's origin: reverse-proxy trusted-host configuration was not available to verify, and no credential-bearing external redirect exploit was demonstrated. Session refresh validates claims and looks up database role/confirmation. `invite_preview` exposes only first name and validity for a supplied code, with identical expired/unknown output; generated invite codes have 72 random bits. Auth errors are mapped instead of reflecting raw provider errors. Provider-side throttling/email behavior and deployment redirect allowlists still require integration verification.

## Validation record

The targeted probe confirmed four finding paths and the RLS/definer catalog checks described above. No persistent regression tests or `it.fails` cases were added because the card permits only this report. Suggested tests are specifications for the fix cards. A passing suite is coverage evidence, not proof that the newly identified attacks are denied.

- Used `npm.cmd` because PowerShell blocks the `npm.ps1` launcher.
- `npm run check`: typecheck and lint passed; the default Vitest config loader failed with `spawn EPERM`.
- Requested fallback `npm run test -- --configLoader native --pool threads`: failed with `Fatal process out of memory: Zone` during worker startup.
- Retried with `--maxWorkers 1`: **Test Files 41 passed (41); Tests 588 passed (588)**, exit 0.
- `npm run build`: **Compiled successfully in 6.6s**, then **spawn EPERM** at `Running TypeScript ...`, exit 1. This was a process-spawning failure, not a Google Fonts fetch failure. The independent typecheck above passed; the complete build gate remains unverified.
- `git diff --check` passed; final status contains only the new report.
