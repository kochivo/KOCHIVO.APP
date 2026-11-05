# T-001 — Link Supabase, apply migrations, generate types

**Phase:** 1 · **Depends on:** none · **Status:** blocked on owner (needs a Supabase project)
**Owner:** Claude (reviewer) runs this one directly; it touches a live project, so it is not delegated.

## Goal
The real database matches `supabase/migrations/`, and `src/types/database.ts` is generated from it instead of hand-written.

## Steps
1. The owner creates the project (region: Frankfurt, closest to Egypt) or authorizes the Supabase connector.
2. Apply `0001`–`0009` in order, then run the security and performance advisors. Fix any advisor warning in a new migration `0010_*`.
3. Generate types into `src/types/database.ts` and delete the hand-written `SyncFn` placeholder.
4. Make `src/core/offline/transport.ts` compile against the generated `Functions['sync_*']['Args']` without casts.
5. Fill `.env.local` with the URL and publishable key. The file is not committed; `.env.example` stays as-is.

## Acceptance
- [ ] `list_migrations` shows 9 (or 10) applied
- [ ] Advisors report no security warnings
- [ ] `npm run check` and `npm run build` pass with generated types
- [ ] `supabase/tests/rls.test.ts` still passes (PGlite, unchanged)

## Out of scope
- Auth providers (T-003) and seeding (T-004)
