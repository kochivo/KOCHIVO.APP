# T-202 feature inventory

The flag-off route and legacy dashboard components remain unchanged. This inventory describes the flag-on home.

| Existing feature, data, action or state | Location after T-202 |
| --- | --- |
| Captain name, date and greeting | Header; local clock injected through `WorkspaceHome.now` |
| Invite sheet and its existing mutation/error handling | One header action, or step 1 for an empty roster; `HomeInviteEntry` lazily loads the existing roster control |
| Three first-player setup steps | `HomeStart`, replacing the needs list for an empty roster |
| Active player count and plan capacity | Active-player tile; pending, frozen and expired players excluded |
| Pending check-ins, videos and assessments | Header summary and triaged needs rows; full list through “افتح المتابعة” |
| Weekly adherence and progress value | Adherence tile, with previous-week comparison; value also remains in accessible button text |
| Monthly money received | Paid tile, using payment amounts and captain-local calendar month |
| Late money and number of unpaid players | Paid-tile amber hint and header summary |
| Ending subscriptions and count | Side card and header summary; each row links to billing |
| Late-player count and ending-player count | Active-player tile → players-and-alerts panel |
| Player search, search clearing, recent players, program labels, last-seen dates and player links | Active-player tile → original `PlayerFinder` |
| Dropout radar, reasons, WhatsApp actions, no-phone disabled state, show-all, loading/error/all-clear | Active-player tile → original `RadarCard`; absent players also appear in the four-row needs list |
| Smart alerts: expired access, grace, dues, reviews, expiry, missing program; show-more and empty state | Active-player tile → original `SmartAlerts` |
| Coach public link and existing copy/share controls | Active-player tile → supplied coach-link slot |
| Latest workouts, set counts, answered assessments, weights, player links and empty activity | Adherence tile → original `WorkspaceActivity` |
| Missing-program and missing-meal-plan actions | Adherence tile → `HomeTasks` |
| Review, renewal, payment, absence and all-player task actions | Adherence tile → `HomeTasks`; secondary actions throughout |
| Last payment dates and task context | Adherence tile → `HomeTasks` |
| Join requests and existing accept/decline controls | Side card → “شوفه” → supplied join-request slot |
| Captain plan, usage and upgrade controls | Paid tile → supplied plan slot; settings link retained |
| Billing navigation | Paid tile panel and expiry rows |
| Roster read error and retry | `WorkspaceError`; no fabricated counts |
| Summary/follow-up/contact read errors and retry | `WorkspaceError`; unavailable metrics and no false all-clear |
| Loading | Existing route Suspense plus lazy-entry skeletons and invite fallback |
| Empty lists | Three start steps, needs all-clear, hidden empty side cards, original detail-panel empty states |
| Localization | Dedicated home `messages.ts` with `ar`, `en`, and gated `standard-messages.ts` |
| Existing tools collapsible | Removed; its functions are reached through the relevant tiles and cards |

The default page follows the mockup section order and breakpoints. Tiles act as accessible dialog triggers to retain supplementary features without adding default-page cards.

Join requests deliberately show name and arrival time, without duration. T-208 / migration 0102 will supply the selected package. The name/detail column remains flexible and the detail line can accommodate the short duration without changing the row grid or action placement.

Visual screenshot verification and production bundle measurement remain unavailable in this sandbox: browser launch, build workers and performance tooling encounter `EPERM`. No build or performance command was run for this revision, per reviewer instructions.
