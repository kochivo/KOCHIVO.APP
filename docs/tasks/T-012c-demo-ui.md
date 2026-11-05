# T-012c (UI) — "Try the demo" button and demo mode

**Phase:** 3b · **Depends on:** the T-012c (DB) contract (built in parallel; mock it in tests) · **Status:** ready
**Delegate to:** Codex

Start by reading PLAN.md T-012c and docs/tasks/T-012c-demo-db.md, in particular its "Contract" section. Build against that contract exactly. The database part is being built at the same time, so do not touch `supabase/`.

## Flow

1. **The button.** The landing page's demo action (`content.links.demo`, which currently goes to `/login`) becomes a «جرّب الديمو» button on a new route, `/demo`. Make the marketing hero copy match: it must not promise anything the demo doesn't do.
2. **`/demo` page.** One primary action, «ادخل الديمو». Under it, one line: «حساب تجريبي بيتمسح بعد ٢٤ ساعة».
3. **Starting the demo.** On click:
   - Run `signInAnonymously()`, passing `options.captchaToken` when a Turnstile token exists.
   - Then call `rpc('create_demo_workspace')`.
   - Then go to `/captain`.
4. **Turnstile.** Add `turnstileSiteKey` to `src/lib/public-config.ts`, read from `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, defaulting to `''`.
   - If there is a key, render the Cloudflare Turnstile widget from `https://challenges.cloudflare.com/turnstile/v0/api.js`, as a plain script tag. That is not an npm package.
   - Enable the button only once a token exists.
   - If there is no key, skip the widget. Supabase only requires the token once the owner turns CAPTCHA on.
5. **Errors.** Show each one in Arabic, with a retry:
   - `demo_limit`: «الديمو زحمة دلوقتي، جرّب بعد شوية»
   - any captcha failure: «اتأكد إنك مش روبوت وجرّب تاني»
   - anonymous sign-in disabled, or any other error: «الديمو مش متاح دلوقتي»
6. **Demo banner.** Show it in the captain layout whenever the profile has `demo_expires_at`. It is a slim `glass-strong` bar saying «وضع الديمو · بيتمسح بعد X ساعة», with a lime link «اعمل حسابك» to `/login?tab=signup` that signs the anonymous user out first.
7. **Hidden in the demo.** The invite button and sheet show «الدعوات مقفولة في الديمو» instead of creating an invite; the database blocks it too. Billing upgrade and account deletion are hidden in demo mode.
8. **Routing.** An anonymous user who never created a workspace and lands on `/captain` or `/player` goes to `/demo`.

## Files

- `src/app/demo/page.tsx` (thin)
- `src/features/demo/` (new feature: `index.ts`, components, hooks, data, `demo.test.ts`)
- `src/lib/public-config.ts` and its test
- the marketing content and hero
- the captain layout banner slot
- the routing and session files that need the anonymous case
- invite, billing and settings: the demo guards only

## Requirements

1. Follow AGENTS.md UI rules: tokens only, RTL logical properties, `min-h-12`, Egyptian Arabic, no emoji, Arabic `aria-label`s, and loading, error and empty states.
2. Read the demo flag from the profile. The generated `Database` type does not have `demo_expires_at` yet, so validate it at the boundary with zod. Do not cast.
3. Tests mock Supabase. They must cover:
   - success navigates to `/captain`
   - each error maps to its message
   - the captcha token is passed through only when present
   - the banner's hours calculation, with an injected `now`
   - the invite guard
4. **Do not touch:** `supabase/`, `.env*`, `src/types/database.ts`. Add no dependency.

## Acceptance

- [ ] The demo flow works against the contract, with mocked tests.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope

- The database functions and the purge (T-012c DB)
