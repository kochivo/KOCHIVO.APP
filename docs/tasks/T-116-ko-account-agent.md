# T-116 KO account agent

Use the verified Kochivo session for KO training reads and edits, draft training and nutrition plans, day-based renewals, workout reminders and player meal-photo matching. Require a signed, single-use preview for every write. Account data stays behind the existing database policies, and activation requires an explicit server feature flag and a paid Gemini key. Exercise and meal photo answers use plan data for quantities.

Scope covers `src/features/ko-account/`, `src/features/ko-entry/`, `src/features/ko-preview/`, the KO routes, the captain and player shells, database type additions, KO migrations 0071–0073, their tests, and this card.

Run local integration tests on the Kochivo schema before applying the production migration. Never exercise the mutation path on real player records during verification.

## Rollout settings

- `KO_ENABLED=1` activates the authenticated pilot.
- `KO_GEMINI_PAID=1` attests that the configured server credential uses Gemini Paid Services for user data.
- `GOOGLE_GENERATIVE_AI_API_KEY` is the server-only paid credential.
- `KO_ORIGIN` is the exact HTTPS origin used by pilot browsers.
- `KO_APPROVAL_SECRET` is a dedicated random secret of at least 32 characters.
- `KO_PILOT_USER_IDS` is a comma-separated allowlist of approved captain and player account UUIDs.

Apply KO migrations 0071–0073 before activating the pilot. Keep `ko_private` outside the Data API exposed schemas. Set the matching secret in the private `security_private.ko_approval_config` singleton using an owner session and a bound parameter. Keep that secret out of logs, chat and source control. Pilot launch requires a consent and privacy review for audio and meal photos, smoke tests with authorized test accounts, and rate limits at the deployment boundary. Approvals last 10 minutes. Creating training and nutrition plans saves drafts. The workout reminder goes through the existing notification pipeline and deduplicates per player per Cairo day.
