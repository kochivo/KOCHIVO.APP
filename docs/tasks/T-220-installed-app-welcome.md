# T-220: App welcome screens when KOCHIVO is opened from the phone home screen

**Phase:** App (owner request 2026-11-13) · **Depends on:** none · **Status:** ready

## Goal
When a player or captain opens KOCHIVO from the icon on their phone's home screen (installed PWA, `display-mode: standalone` or iOS `navigator.standalone`), they should land on app screens, not a web login card. In a normal browser nothing changes: `/` is still the landing page and `/login` still shows today's card.

**Design: option B in `docs/mockups/app-welcome/app-welcome-options.html` (owner choice 2026-11-13).** Match its two B phones and its sign-in phone (the last phone, under C). Options A and C are rejected, and so is the older `app-welcome.html`. Use KOCHIVO's own pieces: the real logo (`public/brand/logo-primary.png` / `logo-primary-light.png`), the app tokens (`glass`, `glass-strong`, `rounded-card`, `Button` from `@/ui`, lime as the one action color), and KO icons from `src/ui/icons`.

## Files
- New route `src/app/[locale]/(auth)/welcome/page.tsx` (thin).
- `src/features/auth/components/` (new welcome screens, kebab-case, one component per file), `src/features/auth/index.ts`, `messages.ts`, `standard/messages.ts`, tests.
- `src/app/manifest.ts`: `start_url` becomes `/welcome`.
- `src/features/marketing/components/installed-app-redirect.tsx`: redirect to `/welcome` instead of `/login`.
- `src/app/[locale]/(auth)/login/page.tsx`, only to mount a tiny client island (next item).
- `src/features/auth/components/captain-auth-card.tsx` (split into smaller files if it passes 250 lines) and a new `src/features/auth/data/sign-in-email-code.ts` for 4b.
- Design reference: `docs/mockups/app-welcome/app-welcome-options.html` (option B and the sign-in phone).
- This card.

## Requirements
1. **Entry.**
   - New installs start at `/welcome` (manifest).
   - Older iOS installs keep `/login` as their start URL. On `/login`, a tiny client island checks the installed-app test (reuse and move `isInstalledApp` so both places share it). When the app is installed and the URL has no `tab`, `coach` or `error` parameter, it calls `location.replace('/welcome')`.
   - A signed-in user who opens `/welcome` goes to their home, the same as `/login` does today.
   - `/welcome` in a normal browser still works; it just isn't linked from the landing page.
2. **Screen 1, welcome (B):**
   - The top part fills the space above the sheet and is the brand art: the logo at the top start, plus the logo's skewed slashes drawn large (a lime one cropped at the end edge and a narrower ivory one), all decorative (`aria-hidden`). The background is a soft dark radial; no blur.
   - The bottom sheet: the panel surface with a top hairline and large top radius, overlapping the art a little, with a small handle bar. Inside it:
     - the slogan as a small lime kicker, exactly «YOUR NEXT MOVE STARTS HERE.» (owner rule: the slogan never changes);
     - the heading «خطوتك الجاية بتبدأ من هنا.»;
     - pill primary «يلا نبدأ» (goes to screen 2) and a pill ghost «سجّل دخولك» (goes to `/login`).
   - Safe-area padding at the top and bottom.
3. **Screen 2, «إنت مين؟» (B):**
   - Top bar: the logo and the language switch (`@/ui/language-switch`).
   - Heading «إنت مين؟», sub line «هنجهّزلك التطبيق على حسب اختيارك.»
   - Two pill-shaped role options, a radio group with `role="radiogroup"` and keyboard arrows. Each option is at least 76px tall and has a round KO icon tile, a title and a one-line description:
     - «أنا لاعب», «معايا دعوة من كابتن»;
     - «أنا كابتن», «عايز أتابع لاعيبتي».
   - The selected option gets the lime hairline and a lime icon. «أنا لاعب» is selected by default.
   - Pill primary «كمّل»: player goes to screen 3, captain goes to `/login?tab=signup`.
   - Footer line «عندك حساب؟ سجّل دخولك» (link to `/login`).
   - Back goes to screen 1.
4. **Screen 3, player code:**
   - Heading «ادخل كود الدعوة», one text field that accepts the code or the full invite link, and primary «كمّل».
   - Extract the code with the existing `parseInviteCode` (from a full link, take the part after `/i/`) and navigate to `/i/<code>`. An invalid value shows a translated error under the field.
   - Note: «مفيش كود؟ اطلبه من كابتنك.»
   - Back goes to screen 2.
4b. **Sign in with an email code (all `/login` visitors, browser and app).** Players who joined through an invite with an email code have no password, and today `/login` only offers a password or Google, so they cannot get back in. In login mode:
   - Add a segmented choice «كود على الإيميل» | «كلمة السر». In the installed app the email code is the default; in the browser, the password is.
   - The email-code path: an email field, then «ابعتلي كود» calls `signInWithOtp` with `shouldCreateUser: false`, so it never creates an account.
   - Then the existing `OtpInput` (6 digits) and «كمّل». Verify with the email OTP and redirect with `homeFor(user)`, the same way a password sign-in does. Captains who still need role confirmation get the same message as password sign-in.
   - An unknown email shows a neutral message that never says whether the account exists: «لو الإيميل ده عليه حساب، هيوصلك كود».
   - Keep Google under both choices.
   - The sign-in screen's footer line «لاعب جديد؟ ادخل كود الدعوة» links to `/welcome` step 3. Use `/welcome#code`, with screen 3 reading the hash on load.
   - Signup mode is unchanged.
5. Screens 1 to 3 are one client component with local step state, so there are no page loads between them. The browser/phone back gesture should return to the previous step: push a history entry per step and listen to `popstate`.
6. **Motion:** one gentle entrance per step (fade and slide 8px); no loops; `prefers-reduced-motion` turns it off.
7. **Rules:** tokens only, logical properties, both themes work, RTL and LTR, 48px minimum targets, all strings in messages (`ar`, `arStd`, `en`), no emoji. There is no privacy or terms page yet, so don't add those links.

## Acceptance
- [ ] Tests:
  - the installed-app check (standalone, iOS standalone, plain browser);
  - `/login` redirects only when installed and without parameters;
  - code extraction from a code, from a full invite link, and from junk;
  - each step's primary navigation;
  - the slogan text is exact;
  - email-code sign-in: `shouldCreateUser: false`, the neutral message for unknown emails, the redirect after verify, and the default tab in the installed app vs the browser.
- [ ] Manifest `start_url` is `/welcome`.
- [ ] `npm run check` and `npm run build` pass; `/welcome` stays within the 200 KiB public budget. Report its size.

## Out of scope
- Other changes to the login or signup forms (only the email-code sign-in in 4b is in scope).
- Privacy and terms pages.
- Push permission or install prompts.
