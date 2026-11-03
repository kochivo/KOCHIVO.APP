# T-041 — final permissions and set-log audit

Scope: effective state after migrations 0001–0040, including replacements and revocations.
Local verification uses the complete migration chain in PGlite with the fixed harness clock
`2026-11-03T10:00:00Z`. This is a repository audit, not a claim about hosted grants or deployment.

## Permission notation and shared conditions

- `A`: authenticated, unsuspended caller. Anonymous **sign-ins** also carry this database role;
  demo access is limited by the same ownership predicates. Bare `anon` has no table privileges.
- `C`: row owner (`captain_id=auth.uid()`); this denotes an ID match, not an implicit role check.
  Captain-role requirements are stated separately. `P`: row's player; `R`: current unarchived relationship.
- `read window`: the matching captain relationship exists and today is at most `access_until + 3`.
- `write window`: an unarchived player relationship exists and today is at most `access_until`.
- `—`: no client permission. All public tables retain restrictive `active_caller` policies.
  Profiles alone permit a suspended caller to read their own profile; their writes still fail.
- Owner/service operations bypass client RLS. These are trusted administrative operations, not
  permissions available to captains, players or demo users. Private schema usage is revoked.
- Trigger checks, constraints, column grants and RLS all apply together. A permissive `ALL`
  policy never grants SQL privileges that have been revoked. Starter templates and their children
  are immutable even to their owning captain; assignment/copy creates editable descendants.

## Tables and views

All names below are in `public` unless qualified. Conditions include `A` unless stated otherwise.

| Object | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | Self, current captain's players, player's current captain | —; auth trigger creates self | Self: name, phone, timezone, invite message, tour timestamp; authorization, creation, deletion and demo fields guarded | — |
| coach_clients | Owning C or P | —; invite/demo RPC only | C: access deadline and archive only; identities/start/creation fixed, no unarchive | — |
| coach_invites | C | Confirmed C owning invite; demo captains rejected | —; redeem RPC only | C |
| exercises | Global, own, or current captain's | Captain with owner=self | Owner=self | Owner=self |
| programs | C; P only assigned active program in matching read window | Owner ID=self (no role check); assigned P must be current client, or template has no player | C=self, same relationship constraint; starter lock | C=self; starter lock |
| program_days | Readable parent program | Editable parent program; starter lock | Old and new parent editable; starter lock | Editable parent; starter lock |
| program_exercises | Readable ancestor program | Editable ancestor; starter lock | Old and new ancestor editable; starter lock | Editable ancestor; starter lock |
| workout_sessions | P or current C of P, irrespective of expiry | P=self in write window; day null or owned by P | Own row, write window, same day ownership check | — |
| set_logs | P or current C of P | P=self in write window, own session, program exercise null or owned | Own row with same write/reference checks | —; soft-delete timestamp through sync |
| foods | Global, own, current captain's | Owner=self (policy does not require captain role) | Owner=self; custom photo must use own captain-food-photos prefix | Owner=self |
| nutrition_plans | C; assigned P only active plan in matching read window | Owner ID=self (no role check); assigned P must be current client, or template has no player | Same owner/relationship checks; starter lock | C=self; starter lock |
| meals | Readable ancestor plan | Editable ancestor; starter lock | Old and new ancestor editable; starter lock | Editable ancestor; starter lock |
| meal_items | Readable ancestor plan via protected parent lookup | Editable ancestor; starter lock | Old and new ancestor editable; starter lock | Editable ancestor; starter lock |
| meal_item_alternatives | Readable ancestor plan via protected parent lookup | Editable ancestor; starter lock | Old and new ancestor editable; starter lock | Editable ancestor; starter lock |
| meal_logs | P or current C of P, irrespective of expiry | P=self in write window; meal null or owned | Own row, write window, same meal check | —; soft-delete timestamp through sync |
| check_ins | P or recorded C | P=self in write window, own photo paths, no prefilled review; trigger derives C | Recorded C: review timestamp/reply only | — |
| form_checks | P or recorded C | P=self in write window, own video folder and own set or null; no prefilled review; trigger derives C | Recorded C: review timestamp/reply only | — |
| inbox_items (view) | Invoker union of check_ins and form_checks; same row policies | — | — | — |
| player_intake | P or current C of P | P=self | P=self | — |
| admins | —; is_admin checks caller internally | — | — | — |
| plan_tiers | All A | — | — | — |
| captain_subscriptions | Own captain with role=captain | —; admin RPC | — | — |
| admin_audit_log | Active admin only | —; admin RPCs | — | — |
| player_payments | Recorded C or P | —; renewal/demo RPC | — | — |
| captain_packages | C=self | C=self with role=captain | C=self: name, price, days, archive only | — |
| payment_collections | Recorded C or P | —; collection RPC | — | — |
| voice_notes | Recorded C or P | C=self and current captain of P; audio prefix=P | P=self: listened_at only | Recorded C=self |
| security_private.starter_templates | — | — | — | — |
| security_private.starter_template_receipts | — | — | — | — |
| security_private.demo_workspaces | — | — | — | — |

The private tables are owner-only implementation state. Starter catalog/receipt operations run
through protected profile triggers; demo receipts persist until expiry/purge.

## Storage buckets

Bucket configuration rows are owner-managed. The following permissions describe files in
`storage.objects`, not direct writes to `storage.buckets`. No file UPDATE policy exists.

| Bucket | SELECT / download | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| checkin-photos (private) | A: path's P or current C of path's P | A: own player folder in write window | — | — |
| form-videos (private) | A: path's P or current C of path's P | A: own player folder in write window | — | — |
| voice-notes (private) | A: path's P or current C of path's P | A: current C of path's P | — | A: note with matching audio_path and recorded C=self |
| exercise-media (public) | Public URL; no client object-list SELECT policy | —; service seed only | — | — |
| food-media (public) | Public URL; no client object-list SELECT policy | —; service seed only | — | — |
| captain-food-photos (public) | Public URL; authenticated object-list SELECT for bucket | A with captain role, path starts own UUID/ | — | A with captain role, path starts own UUID/ |

Public food photos are an intentional exception to cross-tenant file confidentiality in 0039.
Hiding their rows would not make their public download URLs private. Private player media has
no such exception. Tests grant UPDATE/DELETE to the storage stub to exercise RLS itself.

## Callable functions / RPCs

`D` means SECURITY DEFINER, `I` SECURITY INVOKER. Each listed caller is an EXECUTE grant,
with the internal authorization condition spelled out. “Read” means a function's observable
result or necessary scoped lookup; it does not confer independent SELECT privileges.
All functions pin an empty search_path. PUBLIC execution is revoked.

| RPC (public schema) | Mode / caller and authorization | Read | Insert | Update | Delete |
|---|---|---|---|---|---|
| is_captain_of(uuid) | D / A; active check, captain_id=auth.uid(), unarchived R | Boolean about caller's R | — | — | — |
| player_can_read() | D / authenticated; player_id=auth.uid(), unarchived read window | Boolean about own R | — | — | — |
| player_can_read_from(uuid) | D / authenticated; own R to specified C, read window | Boolean about own R | — | — | — |
| player_can_write() | D / A; active check and own write window | Boolean about own R | — | — | — |
| my_captain_id() | D / A; active check, own unarchived R | Own captain ID | — | — | — |
| can_edit_program(uuid) | D / A; active check and C=auth.uid() | Own program predicate | — | — | — |
| can_read_program(uuid) | D / authenticated; C=self or P=self, active, matching read window | Scoped boolean | — | — | — |
| can_edit_plan(uuid) | D / A; active check and C=auth.uid() | Own plan predicate | — | — | — |
| can_read_plan(uuid) | D / authenticated; C=self or P=self, active, matching read window | Scoped boolean | — | — | — |
| plan_of_meal(uuid) | D / authenticated; can_read_plan of ancestor | Plan ID only when readable | — | — | — |
| plan_of_item(uuid) | D / authenticated; can_read_plan of ancestor | Plan ID only when readable | — | — | — |
| owns_meal(uuid) | D / A; active check, ancestor P=auth.uid() | Own-reference boolean | — | — | — |
| owns_session(uuid) | D / A; active check, session P=auth.uid() | Own-reference boolean | — | — | — |
| owns_program_day(uuid) | D / A; active check, ancestor P=auth.uid() | Own-reference boolean | — | — | — |
| owns_program_exercise(uuid) | D / A; active check, ancestor P=auth.uid() | Own-reference boolean | — | — | — |
| is_admin() | D / authenticated; auth.uid() membership and not suspended | Own admin boolean | — | — | — |
| is_suspended() | D / authenticated; profile id=auth.uid() | Own suspension boolean | — | — | — |
| current_tier(uuid) | D / authenticated; target=self or active admin | Authorized target tier | — | — | — |
| require_active_caller() | I / authenticated; calls own suspension predicate | True or 42501 | — | — | — |
| confirm_role(user_role) | D / A; id=auth.uid(), unconfirmed and younger than 1h; anonymous guard | Own profile | Starter copies via profile trigger if C | Own role/confirmation | — |
| invite_preview(text) | D / anon and authenticated; active check; exact secret invite code | Validity and captain's first name only | — | — | — |
| redeem_invite(text) | D / A; own player role, valid unused code; anonymous and captain-admission guards | Exact invite | Relationship for auth.uid() | Marks invite redeemed by self | — |
| request_account_deletion() | D / A; active check, id=auth.uid(), requires existing profile | Own deadline | — | Own deletion request | — |
| cancel_account_deletion() | D / A; active check, id=auth.uid(), requires existing profile | — | — | Own deletion request | — |
| admin_activate_plan(uuid,text,int,text) | D / active admin via is_admin(auth.uid()) | Target captain, tier, renewal queue | Subscription and audit | — | — |
| admin_set_suspended(uuid,boolean,text) | D / active admin; cannot suspend self | Target profile | Audit | Target suspension | — |
| admin_captains(text,int,int) | D / active admin; checks is_admin before query | Captain roster, email, subscription history, limits | — | — | — |
| renew_player(uuid,int,int,int,uuid) | D / A with captain role; own active R; package must be own and unarchived | Own R/package | Own player payment | Own R deadline | — |
| collect_player_payment(uuid,int) | D / A with captain role; own R including archived; only own dues | Own payments/dues | Own collections, bounded by due amount | — | — |
| create_demo_workspace() | D / nonnull auth.uid(), anonymous JWT, active existing profile; rate/receipt locks | Own admission and global starter data | Own demo receipt, synthetic players/R/plans/history/payments | Own profile/demo receipt | — |
| captain_roster() | I / authenticated; RLS and c.captain_id=auth.uid() | Own active players and summaries | — | — | — |
| captain_dropout_radar(date) | I / authenticated; RLS and c.captain_id=auth.uid() | Own active players' activity | — | — | — |
| captain_last_payments() | I / authenticated; RLS and captain_id=auth.uid() | Own latest payments | — | — | — |
| captain_dues() | I / authenticated; RLS and captain_id=auth.uid() | Own dues | — | — | — |
| activate_program(uuid) | I / authenticated; owns program, non-template/nonempty, RLS | Own program/children | — | Activates own program, archives visible predecessor | — |
| activate_nutrition_plan(uuid) | I / authenticated; owns plan, assigned/nonempty, RLS | Own plan/children | — | Activates own plan, archives visible predecessor | — |
| save_nutrition_plan(uuid,jsonb) | I / authenticated; owns plan, RLS on every row | Own plan | Own hierarchy | Own plan and surviving meals | Removed meals and replaced items/alts |
| assign_program_template(uuid,uuid) | I / authenticated; current captain of player, owns nonempty template, RLS | Own template hierarchy | Assigned copy and children | Archives visible predecessor | — |
| assign_nutrition_template(uuid,uuid) | I / authenticated; current captain of player, owns nonempty template, RLS | Own template hierarchy | Assigned copy and children | Archives visible predecessor | — |
| program_to_template(uuid,text) | I / authenticated; owns assigned source, RLS | Own hierarchy | Own template copy | — | — |
| nutrition_plan_to_template(uuid,text) | I / authenticated; owns assigned source, RLS | Own hierarchy | Own template copy | — | — |
| copy_template(text,uuid,text) | I / authenticated; owns source template, validated title/kind, RLS | Own hierarchy | Own editable template copy | — | — |
| sync_workout_sessions(jsonb) | I / authenticated; player RLS/write window; invalid plan refs become null | Own/conflict rows | Own sessions | Newer timestamp only | — |
| sync_set_logs(jsonb) | I / authenticated; player RLS/write window and own session; invalid plan refs become null | Own/conflict rows | Own sets | Newer timestamp only, including soft delete | — |
| sync_meal_logs(jsonb) | I / authenticated; player RLS/write window; invalid meal refs become null | Own/conflict rows | Own meals | Newer timestamp only, including soft delete | — |
| storage_owner(text) | I / authenticated; pure path parser | Derived UUID, no data lookup | — | — | — |
| valid_intake_training_days(smallint[]) | I / authenticated; pure validation | Boolean, no data lookup | — | — | — |

`invite_preview` is deliberately code-authorized rather than user-authorized: it supports logged-out
invite landing pages. The read-only relationship/ownership definers test auth.uid() directly or
delegate to a helper that does. Some read predicates do not themselves reject suspension;
restrictive table policies still reject data access. No caller-controlled tenant bypass was found.

## Non-client functions (EXECUTE revoked from anon/authenticated)

These are not public RPC entry points. An internal owner-only function need not pretend to
authorize an end-user; its boundary is revoked EXECUTE/schema usage or a database trigger.

| Function | Mode | Authorized use / data effect |
|---|---|---|
| public.touch_updated_at() | I | Trigger: updates touched row timestamp |
| public.handle_new_user() | D | Auth INSERT trigger: creates profile for NEW.id; anonymous guard applies |
| public.guard_profile_update() | I | Trigger: rejects protected field changes by API roles |
| public.enforce_player_limit() | D | Relationship INSERT trigger: confirmed/unsuspended C, serializes count/limit, demo exemption |
| public.guard_coach_client_update() | I | Trigger: rejects identity/start/creation changes and unarchiving |
| public.set_inbox_captain() | D | Inbox INSERT trigger: derives current C from NEW.player_id; player RLS authorizes insert |
| public.guard_review_update() | I | Trigger: permits only review fields to change |
| public.purge_deleted_accounts() | D | Owner job: deletes auth users past request grace; skips admins; cascades app data |
| security_private.current_tier(uuid) | D | Owner billing/admission/demo logic: unrestricted tier lookup |
| security_private.starter_uuidv7() | I | Internal UUID generation, no table access |
| security_private.copy_starter_templates(uuid) | D | Profile trigger/backfill: confirmed unsuspended C, receipt deduplication; inserts owned copies |
| security_private.on_captain_confirmed() | D | Profile trigger: copies/marks starters on first captain confirmation |
| security_private.mark_starter_templates(uuid) | D | Trigger/backfill: marks own catalog-matching templates immutable |
| security_private.guard_starter_template() | D | Trigger: rejects edits/deletes of starter parents, allows account-deletion cascade |
| security_private.in_starter_template(text,jsonb) | D | Internal ancestry predicate, no client result |
| security_private.guard_starter_child() | D | Trigger: rejects insertion/edit/delete under starter ancestors |
| security_private.guard_demo_expiry() | I | Profile trigger: rejects client changes to demo expiry |
| security_private.guard_demo_invite() | D | Invite INSERT trigger: rejects demo captain invites |
| security_private.demo_stable_id(text[]) | I | Internal pure deterministic ID generation |
| security_private.demo_history(uuid,int,int,int) | D | Demo admission only: inserts synthetic session/set history |
| security_private.demo_meal_logs(uuid,int) | D | Demo admission only: inserts synthetic meal history |
| security_private.purge_demo_workspaces() | D | Owner job: deletes expired workspace users/receipts and stale anonymous users |
| security_private.is_anonymous_user(uuid) | D | Internal auth.users predicate |
| security_private.guard_anonymous_profile() | D | Profile trigger: prevents anonymous confirmation outside demo |
| security_private.guard_anonymous_client() | D | Relationship trigger: prevents real-player enrollment by anonymous users |
| security_private.payment_due(uuid) | D | Renewal/collection internals: payment minus initial amount and collections |

Historical `renew_player(uuid,int,int)` was dropped by 0037 and has no effective permissions.
Replaced function definitions share the final signature/permissions listed above. No other views
or buckets are created in 0001–0040. PostgreSQL/Supabase extension and system-owned objects are
not application RPCs and are outside this inventory.

## Set logging trace and evidence

1. `focus-screen.tsx` binds Done to `useFocusSession.complete()`. It starts a session only for
   the first set, then calls `logSet()` with the tap timestamp. The set ID uses
   `stableId('set', session, programExercise, index)`; session IDs include `'session'`, day and date.
2. `log-set.ts` calls `saveAndQueue()`. Its single Dexie transaction puts the local row and creates
   or revises one outbox entry. Failure to enqueue rolls back the row. `useLiveQuery` drives
   done sets/progress from local storage. The completion callback never waits for a network call.
3. `runner.ts` flushes on startup, online, visible resume and every 30 seconds, with one flush in
   flight. `flushOutbox()` sends due entries in session/set/meal order and batches of 50. Failed
   sends retain entries with exponential backoff, capped at five minutes.
4. `supabaseTransport()` calls `sync_set_logs` through the lazy-loaded browser client. The RPC
   runs as the player, retains RLS, and upserts by ID only when the incoming timestamp is newer.
   Unowned/deleted program-exercise references become null; own-session checks remain enforced.
5. Success and failure handling both compare the sent revision. An edit while sending survives
   for the next flush, without inheriting the older request's backoff. Closing/reopening the
   same IndexedDB retains both the log and queue. A lost
   acknowledgement replays the same ID; PostgreSQL retains one row, including after reload.

New tests cover sibling/tenant/demo CRUD and RPCs, suspension, all six bucket write boundaries,
public photo exceptions, private-schema grants and the invoker view. Set tests cover live local
visibility before acknowledgement, transaction rollback, reload/backoff, in-flight edits and
failed older requests, real
transport-to-PostgreSQL replay and stale-version rejection.

Known limitation: last-write-wins uses device timestamps; equal timestamps retain the existing
server version, and incorrect device clocks can win conflicts (already accepted in architecture).
The audit also reproduced a separate existing mismatch: the queue emits indexes 1–20 but the
0006 set constraint accepts 0–19. The twentieth set remains locally queued after a server rejection.
Its resolution is subject to the task card's explicit no-migration rule when no RLS hole is found.

The minimal proposed fix, if permitted, is a new `0041_rls_hardening.sql` containing:

```sql
alter table public.set_logs drop constraint set_logs_set_index_check;
alter table public.set_logs add constraint set_logs_set_index_check
  check (set_index between 0 and 20);
```

Zero remains valid for existing demo/history records; 20 admits the live UI's final set.
This changes no policies, RPC grants, log IDs or timestamps. The added twentieth-set test
currently reproduces the rejection and must pass before acceptance can be claimed.

RLS outcome: no cross-tenant authorization hole reproduced; advisor warnings on intentional
definers alone do not justify changing them. No RLS migration is needed on that evidence.
The queue failure race was reproduced with a failing test and fixed in `sync.ts` by applying
backoff only when the persisted revision still matches the failed batch.

## Verification status

- `npx tsc --noEmit -p .`: exit 0.
- `npx eslint .`: exit 0.
- `npx vitest run --maxWorkers=2`: Windows `spawn EPERM` loading Vite config.
  With `--configLoader native --pool=threads`: 163 files passed, one failed;
  1244 tests passed, only the new twentieth-set reproduction failed.
- `npm run build`: compiled successfully in 17.9s, then `spawn EPERM` launching the TypeScript worker.
- Post-build perf command: default config loader hit the same EPERM; native-loader run failed
  on ENOENT for a chunk referenced by the incomplete build's route statistics.
- `npm run check`: typecheck/lint completed, test startup blocked by the default loader EPERM.
- Read-only independent review: no critical/important findings beyond the pending set-index decision;
  corrected its minor ownership-versus-role wording finding in this report.

Acceptance is not complete: the twentieth-set decision and successful build/performance gates remain.
