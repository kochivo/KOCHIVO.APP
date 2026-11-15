# T-282 phone glass and motion

## Implementation and verification plan

1. Add deterministic observer lifecycle and CSS scan tests, then wire KO, rank and
   marketing loops to viewport/tab visibility without changing their durations.
   Enroll built-in Tailwind loops from the root, including lazy fallbacks.
2. Precompose touch glass, retain small overlay blur, contain the static orbs and
   defer captain player, inbox, library and food search rows.
3. Run contrast/depth tests, the full check, production build and unchanged route
   budgets. Capture the two real home routes in Edge at 390px and 4× CPU slowdown.

## Measurement status (2026-11-15)

No measured numbers are available from this environment. Git Bash fails at startup
with Windows error 5; Vitest configuration loading fails with `spawn EPERM`.
The production build cannot resolve the worktree's externally linked Next package
inside its Turbopack filesystem root. A usable local app was therefore not available
for an authenticated Edge recording. These are unmeasured values, not zero costs.

The native-config/thread-worker Vitest fallback passes the full suite with two
workers: 838 files passed, 2 skipped; 5,153 tests passed, 3 skipped (549.01s).
Command: `npm run test -- --configLoader native --pool threads --maxWorkers 2`.
TypeScript and ESLint pass. The exact full check stops at release audit because
spawning Git is denied. The first unrestricted parallel test attempt hit multiple
database setup timeouts and was cancelled; isolated fleet-player (5) and timezone
equivalence (7) reruns pass. The exact perf-budget command fails during default
config loading; with native config it skips without production bundle statistics.
This is not evidence that the budget passes.

Source comparison covered the liquid glass and atmosphere definitions in
`docs/mockups/landing/index.html` and `demo.html`. Desktop/390px live screenshot
comparison is still outstanding. The unused legacy `marketing-sweep` definition
now uses opacity rather than repainting background-position; the current landing
uses `landing.module.css` and has no elements using that legacy slogan class.

| Route | Before scripting/rendering | After scripting/rendering | Before/after long tasks |
| --- | --- | --- | --- |
| Player home | Not recorded | Not recorded | Not recorded |
| Captain home | Not recorded | Not recorded | Not recorded |

Reviewer capture procedure: serve the baseline and changed production builds with
the same account/data, Edge viewport 390px (same height), touch emulation and 4× CPU
slowdown. After loading and settling, record a 3-second scroll over the same distance.
Read Scripting and Rendering totals from the selected interval and count main-thread
tasks over 50ms (include their maximum duration). Repeat three times and report the
median totals and long-task count here. Keep screenshots at desktop and phone widths
for glass, light theme, sticky navigation and open sheets. No budgets were raised.
