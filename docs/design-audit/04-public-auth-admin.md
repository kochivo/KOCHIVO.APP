# Public, auth and admin

Scores reflect a read-only code review. Rendered contrast, text scaling, and assistive-technology behavior remain unverified. A 0 in component semantics, states and feedback, or accessibility marks a screen as **not ready**.

## `/` — Explain KOCHIVO and lead visitors to signup or the demo

| Category | Score 0–2 | Why |
|---|---:|---|
| Task clarity | 2 | The hero distinguishes signup from trying the demo. |
| Information hierarchy | 1 | Header, hero, pricing, demo section, and closing banners all use filled actions. |
| Component semantics | 1 | FAQ uses native disclosures. Static workout previews retain control styling. |
| Token discipline | 1 | Colors use brand tokens. Landing layout still uses literal spacing extensively. |
| Adaptive behavior | 1 | Pricing adapts from four columns to two to horizontal scroll. Section navigation disappears at 1100px. |
| States & feedback | 1 | Preview weight changes are announced. The compact record message renders before any interaction. |
| Accessibility | 1 | The main controls have names and focus styling. Compact users lose direct section navigation. |
| Expressive restraint | 1 | Hero effects, mock notifications, and repeated bright actions compete with the product explanation. |

**Must fix**

- The section nav disappears without a compact replacement → visitors must scroll through the landing page to reach pricing or FAQ → add a compact section menu with the same destinations. `src/features/marketing/components/landing.module.css:196`
- The compact workout card displays “New record” before a set is logged → visitors see success before acting → show feedback only after the sample action and announce it. `src/features/marketing/components/set-preview.tsx:14`

**Nice to have**

- Use quieter styling for the demo-section action and reserve the strongest emphasis for signup. `src/features/marketing/components/demo-section.tsx:16`

## `/c/[slug]` — Evaluate a coach and request training or join the waitlist

| Category | Score 0–2 | Why |
|---|---:|---|
| Task clarity | 1 | The workspace variant promotes the waitlist when full, while package cards still invite requests. |
| Information hierarchy | 2 | Coach identity leads, with packages, app preview, and background grouped separately. |
| Component semantics | 1 | Duration selectors expose pressed state. Waitlist instances keep independent state. |
| Token discipline | 1 | Glass and price tokens are consistent in the workspace variant. The legacy branch uses literal spacing. |
| Adaptive behavior | 1 | The hero is two-column on wide screens. The compact action appears after scrolling past the name. |
| States & feedback | 1 | Route loading, retry, and request status exist. Waitlist feedback stays local to the clicked control. |
| Accessibility | 1 | CTAs have names and 48px heights. Duration selection is distinguished visually by color alone. |
| Expressive restraint | 1 | The name, verification badge, package label, and offers all compete for lime emphasis. |

**Must fix**

- A full coach can show “Join waitlist” alongside package request buttons → visitors get conflicting instructions → apply the coach’s acceptance state to package actions. `src/features/coach-page/components/public-coach-layout.tsx:32`, `src/features/coach-page/components/public-tier-cards.tsx:37`
- Hero, footer, and dock mount independent waitlist controls → another copy can still invite submission after success → share pending and result state across placements. `src/features/coach-page/components/public-coach-layout.tsx:44`, `src/features/coach-page/components/public-waitlist.tsx:11`

**Nice to have**

- Add a checkmark or weight change to the selected duration. `src/features/coach-page/components/public-duration-tabs.tsx:13`

## `/demo` — Try a guided coach and player simulation, with an optional sample account

| Category | Score 0–2 | Why |
|---|---:|---|
| Task clarity | 2 | The initial choice sets the scenario, and the guide names each task. |
| Information hierarchy | 1 | The fixed guide competes with the workspace and its navigation on compact screens. |
| Component semantics | 1 | The visible Search button opens the roster without starting a search. |
| Token discipline | 1 | Surfaces use theme roles. Demo-specific CSS duplicates spacing values. |
| Adaptive behavior | 1 | Wide screens show both panes. Compact screens switch panes but hide language and restart controls. |
| States & feedback | 1 | Lazy panels and sample setup have feedback and retry. Guide progress is hidden from assistive technology. |
| Accessibility | 1 | View buttons expose selection. Closing the guide removes the focused control without moving focus to Resume. |
| Expressive restraint | 1 | The floating guide, simulated chrome, and highlighted targets draw attention simultaneously. |

**Must fix**

- The fixed guide overlays the fixed captain nav on phones → guide users can lose access to destinations while following instructions → give the guide and nav separate vertical space, or put the guide in flow. `src/features/demo/guided/guided.css:91`, `src/features/demo/guided/guided.css:96`
- Compact CSS hides the language switch and header restart → phone users lose language switching and mid-tour restart → put both in a compact menu. `src/features/demo/guided/demo-header.tsx:22`, `src/features/demo/guided/guided.css:85`

**Nice to have**

- Rename Search to Players or open the roster with search focused. `src/features/demo/guided/captain-pane.tsx:45`

## `/privacy` — Explain data collection, use, and privacy choices

| Category | Score 0–2 | Why |
|---|---:|---|
| Task clarity | 2 | The title names the policy, and support has a dedicated link. |
| Information hierarchy | 1 | Eleven titled sections are rendered in sequence without a contents list. |
| Component semantics | 2 | Home and support are links. Collected data is a real list. |
| Token discipline | 2 | Uses semantic text, surface, spacing, and button roles. |
| Adaptive behavior | 2 | The header wraps, and the document has a readable maximum width. |
| States & feedback | 2 | Static document with an update label and a contact path. |
| Accessibility | 2 | Landmarks, heading levels, section labels, and list markup are present. |
| Expressive restraint | 2 | Plain document styling keeps the policy readable. |

**Must fix**

- None identified in code.

**Nice to have**

- Add jump links for frequently sought topics and link directly to Terms. `src/features/marketing/legal/legal-page.tsx:22`

## `/terms` — Explain the service terms and provide a contact path

| Category | Score 0–2 | Why |
|---|---:|---|
| Task clarity | 2 | The title and first section establish what the document covers. |
| Information hierarchy | 1 | Readers must scan eleven sequential headings for a specific clause. |
| Component semantics | 2 | Sections use headings, and navigation uses links. |
| Token discipline | 2 | Uses shared typography, surfaces, spacing, and link styles. |
| Adaptive behavior | 2 | The reading column is bounded and the header wraps. |
| States & feedback | 2 | Static document includes an update label and support link. |
| Accessibility | 2 | Main landmark and labeled sections provide a navigable structure. |
| Expressive restraint | 2 | No decorative elements interrupt reading. |

**Must fix**

- None identified in code.

**Nice to have**

- Link the section headings from a compact contents list and provide a direct Privacy link. `src/features/marketing/legal/legal-page.tsx:26`

## `/login` — Sign in or create a coach or player account

| Category | Score 0–2 | Why |
|---|---:|---|
| Task clarity | 1 | Sign-in methods are clear. The coach-link branch retains a create-account heading in sign-in mode. |
| Information hierarchy | 2 | The main form leads, with Google and alternate paths quieter. |
| Component semantics | 1 | Sign-in methods are keyboard-operable radios. During submission they still appear enabled. |
| Token discipline | 1 | Shared controls and surfaces are used alongside non-scale heading sizes. |
| Adaptive behavior | 2 | Forms stay readable at wide widths and the header can wrap. |
| States & feedback | 1 | Pending, status, and errors are present. OTP entry replaces the email field without moving focus. |
| Accessibility | 1 | Fields have labels. Form errors lack field associations. |
| Expressive restraint | 2 | Each form has one dominant submit action. |

**Must fix**

- The method selector ignores activation while pending but still accepts keyboard focus → focus can move to an option that cannot be selected → expose and enforce the disabled state. `src/features/auth/components/login-methods.tsx:40`, `src/ui/segmented.tsx:27`
- OTP entry removes the email field without moving focus to the new step → keyboard users must find the code input again → focus the first code field and announce the destination email. `src/features/auth/components/login-methods.tsx:49`, `src/features/auth/components/login-methods.tsx:54`

**Nice to have**

- Change the coach-linked heading and submit label when the user switches to an existing account. `src/features/auth/components/coach-signup.tsx:24`, `src/features/auth/components/coach-signup.tsx:47`

## `/forgot-password` — Request a reset code and choose a new password

| Category | Score 0–2 | Why |
|---|---:|---|
| Task clarity | 2 | The request, inbox, and password steps have distinct copy. |
| Information hierarchy | 2 | Instructions precede the fields, with resend and sign-in below the submit action. |
| Component semantics | 2 | The form submits natively, and resend is a separate action with a cooldown. |
| Token discipline | 1 | Shared glass and controls are used. The heading bypasses the type scale. |
| Adaptive behavior | 2 | The reading column is bounded and the recipient address can wrap. |
| States & feedback | 1 | Pending, resend, error, and success are handled. The recipient cannot be corrected in place. |
| Accessibility | 1 | Code digits are labeled individually. The OTP parser discards Arabic-Indic digits. |
| Expressive restraint | 2 | The current submit action is the only filled CTA. |

**Must fix**

- Sending a code removes the email field and only offers resend to that address → a typo forces the user to leave the flow and start again → add a Change email action that preserves the address for editing. `src/features/auth/components/forgot-password-flow.tsx:53`, `src/features/auth/components/forgot-password-flow.tsx:65`
- Code entry strips Arabic-Indic and Eastern Arabic-Indic digits → Arabic users can enter a visually valid code and see nothing accepted → normalize both digit sets in the shared OTP input. `src/features/auth/components/otp-input.tsx:11`

**Nice to have**

- Focus code entry after the request succeeds. `src/features/auth/components/forgot-password-flow.tsx:34`

## `/reset-password` — Set a new password from a recovery link

| Category | Score 0–2 | Why |
|---|---:|---|
| Task clarity | 2 | The heading and password requirements explain the immediate task. |
| Information hierarchy | 2 | Requirements, inputs, and save action follow the order of use. |
| Component semantics | 2 | Password fields support password managers, and the recovery action is a separate button. |
| Token discipline | 1 | Uses shared glass and controls with a non-scale heading size. |
| Adaptive behavior | 2 | The bounded form can grow vertically. |
| States & feedback | 1 | Invalid links offer recovery after submission. Success redirects silently to login. |
| Accessibility | 1 | Inputs have labels. Password guidance and field-specific errors lack programmatic associations. |
| Expressive restraint | 2 | One action is prominent in each state. |

**Must fix**

- The form validates passwords before detecting an invalid recovery link → users can create and confirm a password before learning they need a new link → surface unusable recovery state before password entry, while preserving valid recovery sessions. `src/features/auth/data/update-password.ts:13`, `src/features/auth/data/update-password.ts:21`
- Successful save goes straight to login → users receive no confirmation that the password changed → carry a translated success status into login. `src/features/auth/components/reset-password-form.tsx:36`

**Nice to have**

- Connect password requirements and confirmation errors to their respective fields. `src/features/auth/components/reset-password-form.tsx:27`

## `/welcome` — Start onboarding, choose a role, or enter a player invite

| Category | Score 0–2 | Why |
|---|---:|---|
| Task clarity | 2 | Start, sign in, role choice, and invite entry each have a clear purpose. |
| Information hierarchy | 2 | Each step centers one decision with one prominent action. |
| Component semantics | 2 | Role cards behave as a keyboard-operable radio group. |
| Token discipline | 1 | Colors use theme roles, while the sheet and role cards use literal spacing and radii. |
| Adaptive behavior | 1 | The same phone-sized panel and tall decorative area persist on wide or short windows. |
| States & feedback | 1 | Invalid invite input gets an associated error. The server entry suppresses profile-read errors. |
| Accessibility | 1 | Step changes focus the heading. Role selection uses color as its only visible indicator. |
| Expressive restraint | 1 | Lime artwork occupies substantial space and competes with Start. |

**Must fix**

- The role cards distinguish selection only through lime border, tint, and icon color → users who miss those cues cannot see which route Continue will take → add a selected marker or visible radio indicator. `src/features/welcome/components/welcome.module.css:69`, `src/features/welcome/components/welcome.module.css:83`

**Nice to have**

- Reduce the decorative area's minimum height in short windows. `src/features/welcome/components/welcome.module.css:17`

## `/i/[code]` — Preview an invitation and connect a player account

| Category | Score 0–2 | Why |
|---|---:|---|
| Task clarity | 2 | Names the coach and offers account connection or email/Google entry. |
| Information hierarchy | 2 | The invitation precedes the authentication choice. |
| Component semantics | 2 | Account connection and code submission use distinct, appropriately labeled controls. |
| Token discipline | 1 | Uses shared controls and surfaces. The heading bypasses the type scale. |
| Adaptive behavior | 2 | The compact form stays at a readable width on larger windows. |
| States & feedback | 0 | Loading and generic retry exist. Expired links and coach-account errors get the same ineffective retry. |
| Accessibility | 1 | Inputs are named and code delivery is announced. Moving to OTP entry leaves focus unmanaged. |
| Expressive restraint | 2 | One filled action is visible at each stage. |

**Must fix**

- Expired invites and coach-account mismatches both offer Try again → users repeat the same failed request → distinguish permanent outcomes from transient failures and offer a new-invite or account-switch path. `src/features/auth/data/invite-preview.ts:16`, `src/features/auth/components/player-invite-flow.tsx:38`
- Switching to code entry removes the email field without moving focus → keyboard users must locate the replacement fields → focus the code group and include the address in its instructions. `src/features/auth/components/player-invite-flow.tsx:51`

**Nice to have**

- Give Resend and Change email distinct actions. `src/features/auth/components/player-invite-flow.tsx:59`

## `/oauth/consent` — Inspect a tool’s requested access and allow or deny it

| Category | Score 0–2 | Why |
|---|---:|---|
| Task clarity | 2 | Identifies the requesting tool, account, and scope before the decision. |
| Information hierarchy | 2 | Access details precede approval and denial. |
| Component semantics | 0 | The ineligible screen labels a deny submission “Back.” |
| Token discipline | 2 | Uses semantic surfaces and shared action variants. |
| Adaptive behavior | 2 | Uses a bounded column and allows long client names to wrap. |
| States & feedback | 1 | Loading, pending, and decision failure are covered. A missing ID gives no recovery action. |
| Accessibility | 1 | Controls have names. The load-error branch has no page heading. |
| Expressive restraint | 2 | Decorative connection icons are hidden from assistive technology, and the decision remains prominent. |

**Must fix**

- “Back” submits an OAuth denial → an ineligible user cannot tell that leaving changes the request → label the submission “Deny and return,” or make Back ordinary navigation. `src/features/ai-connect/components/consent-actions.tsx:19`
- A missing or duplicate authorization ID produces an alert with no exit → users cannot recover from an incomplete link → give that state a heading and direct users to restart from the requesting tool. `src/features/ai-connect/components/consent-page.tsx:29`

**Nice to have**

- Isolate provider and account names when they appear inside RTL sentences. `src/features/ai-connect/components/consent-page.tsx:48`

## `/suspended` — Explain the account pause and offer support or sign-out

| Category | Score 0–2 | Why |
|---|---:|---|
| Task clarity | 2 | The heading explains the pause and the text names the recovery path. |
| Information hierarchy | 1 | Lime emphasizes sign-out while the stated recovery action is secondary. |
| Component semantics | 2 | Support is a link, and sign-out is a button. |
| Token discipline | 2 | Uses shared strong glass, spacing, and control roles. |
| Adaptive behavior | 2 | The bounded panel can grow with its content. |
| States & feedback | 1 | Sign-out shows pending and error feedback. An unusable WhatsApp URL removes the recovery link. |
| Accessibility | 2 | Named 48px controls, a heading, and an alert are present. |
| Expressive restraint | 2 | The pause is communicated plainly without decorative escalation. |

**Must fix**

- The recovery instruction always points to WhatsApp, while the link is conditional → users can be told to contact support with no way to do so on the page → provide a fallback and make support the primary action when available. `src/features/auth/components/suspended-screen.tsx:13`, `src/features/auth/components/suspended-screen.tsx:17`

**Nice to have**

- Make sign-out visually secondary to recovery. `src/features/auth/components/suspended-screen.tsx:20`

## `/offline` — Explain lost connectivity and open a cached workout

| Category | Score 0–2 | Why |
|---|---:|---|
| Task clarity | 1 | The offline heading is clear. The player message claims a workout is saved before checking storage. |
| Information hierarchy | 1 | Fallback copy, workout selection, and the active workout render in the same centered stack. |
| Component semantics | 1 | Day buttons open the cached workout. The legacy Back action routes to `/player` instead of the picker. |
| Token discipline | 1 | Shared controls are used, but the offline title uses a non-scale size. |
| Adaptive behavior | 1 | The fallback has a simple responsive stack. The embedded workout inherits its centered layout. |
| States & feedback | 0 | The route can claim a saved workout and then report that no workout is available. |
| Accessibility | 1 | Controls are named. Opening the legacy workout nests a `<main>` inside the page’s `<main>`. |
| Expressive restraint | 2 | Recovery uses plain text and simple controls. |

**Must fix**

- The saved-workout promise depends on device role alone → players can expect a workout that is absent → derive availability copy from the verified snapshot and give the empty state a next step. `src/ui/offline-message.tsx:12`, `src/features/workout/components/offline-workout.tsx:25`
- The legacy workout nests a main landmark and its Back action leaves the picker → assistive-technology users get ambiguous page structure and offline users can be routed away from cached choices → use one main landmark and return to the cached-day list. `src/app/[locale]/offline/page.tsx:17`, `src/features/workout/components/focus-screen.tsx:73`

**Nice to have**

- Offer a page-level retry that returns to the requested destination when connectivity resumes. `src/app/[locale]/offline/page.tsx:17`

## Not-found page — Explain a missing URL and offer a way home

| Category | Score 0–2 | Why |
|---|---:|---|
| Task clarity | 2 | The missing-page title and Home link explain what to do. |
| Information hierarchy | 2 | Logo, heading, and recovery link form a short reading order. |
| Component semantics | 2 | Home is a genuine navigation link. |
| Token discipline | 2 | Uses shared surface, type, spacing, and control roles. |
| Adaptive behavior | 2 | The card has a bounded width and sits in a padded viewport. |
| States & feedback | 2 | Unmatched localized routes reach a dedicated fallback with recovery. |
| Accessibility | 2 | One main landmark, a heading, and a named focusable link are present. |
| Expressive restraint | 2 | One action and minimal decoration suit the error state. |

**Must fix**

- None identified in code.

**Nice to have**

- Preserve the active locale in the Home URL when the missing URL was explicitly locale-prefixed. `src/features/marketing/not-found/not-found-page.tsx:18`

## `/admin` — Review operational metrics, manage captains, and audit changes

| Category | Score 0–2 | Why |
|---|---:|---|
| Task clarity | 1 | Dashboard counts look platform-wide, while captain filters and export act on fetched rows only. |
| Information hierarchy | 2 | Decisions lead, with captain management and supporting panels grouped below. |
| Component semantics | 0 | Dashboard filter actions narrow a single page, and Export CSV silently exports only that page. |
| Token discipline | 1 | Uses shared surfaces and controls. The suspend dialog uses literal spacing and type sizes. |
| Adaptive behavior | 2 | Offers mobile cards, a desktop table, and a wide supporting column. |
| States & feedback | 1 | Dashboard and table support retry. Activity errors are discarded and audit errors lack local retry. |
| Accessibility | 1 | Tables, search, and the dialog have names. Compact search moves visually while keeping its original tab order. |
| Expressive restraint | 2 | Large figures highlight operational decisions and cards group related work. |

**Must fix**

- Dashboard filters operate on at most 100 fetched captains → a real match on another page can appear as an empty result → filter server-side and reset pagination when a filter changes. `src/app/[locale]/admin/page.tsx:19`, `src/features/admin/components/admin-screen.tsx:63`
- Export CSV uses the current unfiltered page → admins can mistake a partial export for the whole matching dataset → export the declared query scope and state that scope in the action label. `src/features/admin/components/admin-screen.tsx:73`
- The route discards captain activity read errors → activity-dependent filters can quietly omit captains → show an unavailable state and offer retry. `src/app/[locale]/admin/page.tsx:21`, `src/features/admin/dashboard-ui.ts:14`

**Nice to have**

- Align compact search’s visual position with its keyboard order. `src/features/admin/components/admin-topbar.tsx:29`

## Top 5 across this group

1. **`/admin`** — Apply captain filters and CSV export to their declared dataset. Page-limited results can hide accounts that need action. `src/app/[locale]/admin/page.tsx:19`, `src/features/admin/components/admin-screen.tsx:63`
2. **`/oauth/consent`** — Give denial an explicit label. “Back” currently submits a consent decision. `src/features/ai-connect/components/consent-actions.tsx:19`
3. **`/offline`** — Verify the local snapshot before promising a saved workout, and return from a cached workout to the offline picker. `src/ui/offline-message.tsx:12`, `src/features/workout/components/focus-screen.tsx:78`
4. **`/i/[code]`** — Replace ineffective retries for expired invites and coach-account mismatches with recovery specific to each outcome. `src/features/auth/data/invite-preview.ts:16`, `src/features/auth/components/player-invite-flow.tsx:38`
5. **`/c/[slug]`** — Apply waitlist availability to package actions and share submission status across placements. `src/features/coach-page/components/public-coach-layout.tsx:32`, `src/features/coach-page/components/public-tier-cards.tsx:37`