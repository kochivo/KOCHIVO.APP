# KO account agent implementation plan

**Goal.** Connect KO to verified Kochivo accounts, real plan data and approved account actions.

**Architecture.** Model function calling proposes scoped operations. The server resolves all targets under the logged-in user's Supabase session. A signed preview and transactional receipt protect writes. Photos are matched to existing meal-plan portions.

**Spec.** `docs/tasks/T-116-ko-account-agent.md`

- [x] Prove tenant scope, signed approval enforcement, replay rejection and rollback with production migrations in PGlite.
- [x] Wire verified auth, plans, catalog lookup, audio, photos and localized replies.
- [x] Verify the production build with the pilot disabled, check the route bundle budget and apply KO migrations 0071–0073.
- [x] Complete `npm run check` with 2,633 tests passing.
- [ ] Connect the Vercel project, provision the matched signing secret and enable the two-account pilot.

Production metadata confirms the designated accounts share a coach relationship and have active training and nutrition plans. The Gemini smoke test used synthetic Arabic exercise requests and a public meal image. Supabase reports no KO advisory findings. The public rollout stays disabled while deployment credentials and the signing secret are pending.
