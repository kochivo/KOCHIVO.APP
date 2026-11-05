# T-015 — Security review of every migration, server action, and storage path (report only)

**Phase:** 5 · **Depends on:** migrations 0001–0023 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
Before real users arrive, do an adversarial review of how KOCHIVO enforces security. The rule is that **RLS is the real security** (AGENTS.md §3). Find every way one user could:
- read data that isn't theirs
- write data that isn't theirs
- escalate their role or plan
- bypass the plan player limit
- read another player's private media
- abuse a server action

This is a **report task**. Do not change code or migrations.

## Scope to read
- `supabase/migrations/0001`–`0023`, every function, policy, grant, and trigger. Later migrations replace earlier objects, so always judge the **final** state.
- `supabase/tests/*.ts`, to see what is already proven.
- Every `'use server'` file under `src/features/**/data/`, `src/features/auth`, and `src/proxy.ts`.
- `src/core/storage/*`, `src/core/offline/transport.ts`, and `src/core/offline/media-queue.ts`.

## What to check, at least
1. Every table:
   - RLS is enabled
   - grants match the policies (0014: anon has nothing except `invite_preview`)
   - no policy uses `true` for writes
2. Every `security definer` function:
   - `search_path = ''`
   - it checks `auth.uid()` itself
   - execute is revoked from `public` and `anon`
   - no SQL injection through dynamic SQL
3. Every `security invoker` function: does it rely on RLS for something RLS doesn't cover (for example a cross-table invariant)?
4. Triggers that guard columns (`guard_profile_update`, `guard_coach_client_update`, `guard_review_update`): can a user change a protected column through another path (upsert, RPC, cascade)?
5. Plan limits and suspension:
   - can a captain exceed `player_limit` through `redeem_invite`, un-archive, `renew_player`, or a race between two redemptions?
   - can a suspended captain still act anywhere?
6. Storage:
   - `storage_owner(path)`
   - captain reads through `is_captain_of`
   - can a player upload into another folder, or reference another player's path in `check_ins` or `form_checks`?
7. Server actions:
   - any that trust a client-sent id for ownership without RLS
   - any that use the service role
   - any that leak errors or paths
8. Information disclosure:
   - definer functions that return other users' data (for example `current_tier(p_captain)` taking any id, or `invite_preview`)
   - enumeration risks
9. Auth:
   - `siteOrigin()` and the redirect handling
   - the role confirmation flow (0013)

## Deliverable
`docs/SECURITY-REVIEW.md` (new), in English, with:
- a summary table: id, severity (critical / high / medium / low / info), area, one-line title
- one section per finding with:
  - the exact file and object name
  - the attack in concrete steps
  - why the current code allows it
  - the minimal fix, as SQL or code in a fenced block (a proposal only)
  - a test that would prove it, as a description
- a short "verified safe" list of the important things you checked and found correct, so the reviewer knows what was covered

Rank by real exploitability. Don't pad with theoretical issues; mark uncertain ones "needs confirmation" and say what would confirm them.

## Rules
- Write only `docs/SECURITY-REVIEW.md`. No other file changes.
- If you want to confirm an attack, you may write a throwaway test, but **delete it before finishing** and describe it in the report instead.

## Acceptance
- [ ] `docs/SECURITY-REVIEW.md` exists and follows the structure above.
- [ ] `npm run check` passes, which proves the tree is unchanged apart from the doc.

## Out of scope
- Fixing anything (separate cards will follow from the report)
- Performance and a11y (later T-015 parts)
