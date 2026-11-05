# Browser tests

Run the built app with the public Supabase configuration, then run Playwright:

```powershell
foreach ($line in Get-Content -Encoding utf8 Dockerfile) {
  if ($line -match '^ARG (NEXT_PUBLIC_SUPABASE_(?:URL|PUBLISHABLE_KEY))=(.+)$') {
    [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
  }
}
npm run build
npm run test:e2e
```

Do not read environment files. Playwright starts `next start` on port 3100 and
reuses an existing server there; stop any stale server before testing a new build.
It does not build the app. Use installed Microsoft Edge; do not download browsers.
Set `E2E_CHANNEL` to override `msedge` with another already installed channel.
Projects cover a 393 × 851 mobile viewport (Pixel 7 size) and a 1440 × 900 desktop.
If PowerShell blocks npm's script launcher, use `npm.cmd` and `npx.cmd`.

Only the public `/ar/demo` may create test data. Each running demo test uses its
own isolated browser context and anonymous sandbox. Never create real accounts,
use passwords, call admin routes, or seed hosted data through privileged APIs.
Turnstile-protected demos are skipped with an explicit reason; never bypass captcha.
These network-dependent tests are manual and are excluded from `check` and deploy CI.

HTML reports are in `playwright-report/`; failure traces are in `test-results/`.
Open a trace with `npx playwright show-trace <trace.zip>`.

## Current coverage gap

The current public demo signs in only a captain (`start-demo.ts`). Its player view
is a read-only preview (`preview-screen.tsx`), and sample players never sign in.
Consequently the player online/offline logging and player-home RTL cases report
explicit skips. They do not claim coverage of those flows. Enabling them requires
a public demo player session, which is outside T-061's permitted product changes.

To check that a spec detects a broken flow, temporarily change a control's rendered
accessible label without changing its messages dictionary, rebuild, and run the
relevant spec with `npm run test:e2e -- e2e/public.spec.ts`. Restore the label and
rebuild before running the full suite. A done-button mutation cannot be validated
until the public demo supports player writes.
