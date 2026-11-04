# V1 journey QA

Use a disposable local or staging Supabase stack with migrations applied, a seeded exercise
library (at least two chest exercises with chest muscle metadata), and confirmed coach/player password
accounts. The player must already belong to the coach with active access, completed intake and
no workout history (the spec asserts this prerequisite).
The journey assigns a new active programme, archiving the player's current programme; it leaves
the template, assigned copy and logs for inspection. Reset the disposable stack afterwards.

Export `E2E_COACH_EMAIL`, `E2E_COACH_PASSWORD`, `E2E_PLAYER_EMAIL`, `E2E_PLAYER_PASSWORD`,
and `E2E_BASE_URL` (normally `http://localhost:3100`). Also export the app's public
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for that same stack.
No service-role key is used. Build against that stack with `npm run build`, then run
`npx playwright test --project=journey`. PowerShell may require `npm.cmd` / `npx.cmd`.
The existing Playwright web server starts `npm run start` on port 3100; for staging, start
the local server too or supply an already-running local server. The spec uses E2E_BASE_URL.
Missing variables or a URL containing `kochivo.site` skip the journey before browser setup.
The dedicated project runs once without retries to avoid concurrent account mutations.
Coach sign-in uses the UI; the OTP-only player entry uses a test-only password helper that
writes normal Supabase SSR cookies. UI selectors use the Arabic message dictionaries.
The final set tap automatically finishes the workout; there is no separate finish button.
The player session reads today's session and six sets back from Supabase; the coach opens
analysis, sees exactly six chest sets in the body map, and reads the completed session with
their own session.

`npx vitest run supabase/tests/journey.test.ts --maxWorkers=2` runs the deterministic SQL
journey without network: template save, independent assignment, player/coach visibility,
three exact set values, session completion, replay, stale writes, invalid weights/reps,
sibling ownership, suspension and anonymous demo denial. Completed SQL sets permit null
reps; the app guard rejects absent reps. Off-program exercises remain valid history while
the sync RPC clears an invalid programme-exercise reference. These are documented behaviours,
not RLS changes. Unit tests also cover integer reps and partial-batch queue recovery on reload.

Accepted advisor warnings: SECURITY DEFINER helpers are guarded inside (`admin_*` check
`is_admin()`); anonymous-sign-in lint comes from the demo; `pg_net` is in public;
leaked-password protection is an owner action.
