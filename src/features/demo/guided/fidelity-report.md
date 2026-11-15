# T-288 review handoff

This is a partial implementation. Shared presentation is in place for the main home content, both navigation bars, task/roster rows, conversation lists and bubbles, billing tiles and owed rows, workout rows, nutrition editor rows and some player overview metrics. Full screen fidelity is not established.

| Demo screen | Element / cause before | Real view used after | Left as copy and why | Regression coverage |
| --- | --- | --- | --- | --- |
| Captain navigation | Separate top tabs and labels drifted | CaptainFrameNavView, CaptainNavGroups | No for navigation; demo header remains | Rendered local links, existing real nav count tests |
| Captain home | Separate ring hero, three tiles and needs rows | HomeHeroView, HomeTilesView, HomeTaskListView, MoneyOwedView | Yes: activity feed and surrounding composition; not a shared full-screen view | Reducer-driven counts/money, real revenue ring tests, 13-step render |
| Tasks | No dedicated demo tasks destination | TaskRow | Yes: list wrapper; full production filters/detail flow still need extraction | Screen render and shared import tests |
| Inbox/chat | Demo-only list and bubble markup | ConversationList, ConversationBubbles | Yes: conversation header, quick replies and composer; recording/lifecycle controls need their own view boundary | All screen renders, tour message reducer and shared import tests |
| Players | Generic demo rows | RosterRowView | Yes: search/list wrapper and package label. Billing loader is passed as a slot in production, excluded in demo | Local-link confinement, screen render |
| Player file | Generic metrics | TrainingAdherence, Measurements | Yes: header, chart, remaining overview. Header uses page-bar portals and server actions; complete overview includes routed data panels | Player file render, tour chart target retained |
| Programs | Generic exercise rows | ProgramPrescriptionRow | Yes: program list/editor. Reuses real summary prescriptions, not the editor's mutation/library graph | Screen render, tour add exercise reducer |
| Nutrition | Separate food-row markup | V11FoodRowView | Yes: meal sections/macros wrapper. Food rows are read-only; real row controls remain in the production wrapper | Existing nutrition views, demo food render, tour swap reducer |
| Money | Generic tiles and owed rows | WorkspaceBillingTiles, MoneyOwedView | Yes: payment-method/package breakdown. Pay/remind callbacks are slots inside shared owed rows | Reducer-driven owing balance and payment step |
| Add player | Separate invite form | None | Yes: real form has extra phone/date/validation and assessment-preview dependencies; adapting those while preserving the existing guide is unfinished | Existing invite reducer/render tests retained |
| Player workout | Separate logged-set drawing | SetRowsView | Yes: exercise/rest/upcoming composition; real set inputs, history editing and validation are shared. Old standalone compact steppers are replaced by the real v6 set inputs | Rendered history/input/source, immutable edit reducer, 13-step tour |
| Player food | Separate food panel | None | Yes: real MealCard performs offline writes and lives in nutrition, outside the allowed production edit paths | Existing meal reducer preserved |
| Player coach chat | Separate bubbles | ChatThreadView | Yes: composer/header; recorder requires a separate boundary | Shared import, full tour message reducer/render |
| Player me | Separate progress screen | None | Yes: real progress screen lives outside allowed production edit paths and owns data hooks | Existing render preserved |
| Player navigation | Separate four-button bar | PlayerTabsView / PillNav | No for tabs | Local fragment links and callback capture tests |

Production wrappers retain translations, data hooks, confirmation dialogs, billing loaders and actions. Shared views do not import server entries or Supabase clients. Demo callbacks use fragment destinations so middle-click and context-menu navigation cannot open a real account route. Production hrefs and prefetch defaults are retained.

The 13 steps, guide, intro, summary, success toasts, fixture label and account-demo entry are retained. Demo-only content still uses guided messages; shared labels use real feature messages.

## Outstanding verification

- No screenshot comparison or browser console/overflow validation at 390px or 1440px has been completed.
- `npm run build` fails because Turbopack's root excludes the junction target containing Next.js. No production bundle artifacts exist to verify the 280 KiB demo ceiling or the +1 KiB route deltas.
- Plain Vitest cannot load its config because Vite's Windows realpath helper hits `spawn EPERM`. The local workaround is `--configLoader native --pool threads`.
- `npm run check` passes typecheck and lint, then stops in the unchanged release audit at `spawnSync git EPERM`.
- Final application-only workaround run: 4,427 tests passed, one source-path assertion failed, three skipped. The assertion was updated solely to follow the extracted roster view; the subsequent focused run passed 74 tests across nine files, including the tour, navigation confinement, spacing, timezone and prefetch guards.
- Database-inclusive workaround runs encountered resource-related test/setup timeouts and were not green. No database code changed.
- Final standalone typecheck and lint passed; `git diff --check` passed.

No dependency, migration, environment file, brand asset, commit, push or branch change was made.
