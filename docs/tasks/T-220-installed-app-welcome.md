# T-220: App welcome screens when KOCHIVO is opened from the phone home screen

**Phase:** App (owner request 2026-11-13) · **Depends on:** none · **Status:** ready

## Goal
When a player or captain opens KOCHIVO from the icon on their phone's home screen (installed PWA, `display-mode: standalone` or iOS `navigator.standalone`), they should land on app screens, not a web login card. In a normal browser nothing changes: `/` is still the landing page and `/login` still shows today's card.

The owner showed a reference flow from another app: a welcome screen, then a «who are you?» screen with one card per role, then the existing auth. Build that flow with KOCHIVO's own identity: the real logo (`public/brand/logo-primary.png` / `logo-primary-light.png`), the app tokens (`glass`, `glass-strong`, `rounded-card`, `Button` from `@/ui`, lime as the one action color), KO icons from `src/ui/icons`. Do not copy the reference app's name, logo, colors or text.

## Files
- New route `src/app/[locale]/(auth)/welcome/page.tsx` (thin).
- `src/features/auth/components/` (new welcome screens, kebab-case, one component per file), `src/features/auth/index.ts`, `messages.ts`, `standard/messages.ts`, tests.
- `src/app/manifest.ts`: `start_url` becomes `/welcome`.
- `src/features/marketing/components/installed-app-redirect.tsx`: redirect to `/welcome` instead of `/login`.
- `src/app/[locale]/(auth)/login/page.tsx`, only to mount a tiny client island (next item).
- This card.

## Requirements
1. **Entry.**
   - New installs start at `/welcome` (manifest).
   - Older iOS installs keep `/login` as their start URL. On `/login`, a tiny client island checks the installed-app test (reuse and move `isInstalledApp` so both places share it). When the app is installed and the URL has no `tab`, `coach` or `error` parameter, it calls `location.replace('/welcome')`.
   - A signed-in user who opens `/welcome` goes to their home, the same as `/login` does today.
   - `/welcome` in a normal browser still works; it just isn't linked from the landing page.
2. **Screen 1, welcome** (full height, content at the bottom third like a native app, safe-area padding top and bottom):
   - the logo;
   - the kicker «أهلاً»;
   - the slogan as the heading, exactly «YOUR NEXT MOVE STARTS HERE.» with MOVE in lime (owner rule: the slogan never changes);
   - the line «خطوتك الجاية بتبدأ من هنا»;
   - primary «يلا نبدأ» (goes to screen 2) and a secondary glass button «سجّل دخولك» (goes to `/login`).
3. **Screen 2, «إنت مين؟»:**
   - At the top: the language switch (`@/ui/language-switch`) and a step label «01 أهلاً».
   - Heading «إنت مين؟», sub line «اختار طريقك عشان نجهّزلك التطبيق.»
   - Two large glass role cards (min 88px tall), each with a KO icon in a rounded tile, a title, a one-line description, and a lime chevron that points the reading direction:
     - **«لاعب»**, «معاك دعوة أو كود من كابتنك», goes to screen 3;
     - **«كابتن»**, «تابع لاعيبتك ونظّم شغلك في مكان واحد», goes to `/login?tab=signup`.
   - The player card is the highlighted one (featured glass with a lime hairline), as in the reference.
   - Under the cards: a glass button «عندي حساب بالفعل» going to `/login`, and a small text link «جرّب الديمو» going to `/demo`.
   - Back goes to screen 1.
4. **Screen 3, player code:**
   - Heading «ادخل كود الدعوة», one text field that accepts the code or the full invite link, and primary «كمّل».
   - Extract the code with the existing `parseInviteCode` (from a full link, take the part after `/i/`) and navigate to `/i/<code>`. An invalid value shows a translated error under the field.
   - Note: «مفيش كود؟ اطلبه من كابتنك.»
   - Back goes to screen 2.
5. Screens 1 to 3 are one client component with local step state, so there are no page loads between them. The browser/phone back gesture should return to the previous step: push a history entry per step and listen to `popstate`.
6. **Motion:** one gentle entrance per step (fade and slide 8px); no loops; `prefers-reduced-motion` turns it off.
7. **Rules:** tokens only, logical properties, both themes work, RTL and LTR, 48px minimum targets, all strings in messages (`ar`, `arStd`, `en`), no emoji. There is no privacy or terms page yet, so don't add those links.

## Acceptance
- [ ] Tests:
  - the installed-app check (standalone, iOS standalone, plain browser);
  - `/login` redirects only when installed and without parameters;
  - code extraction from a code, from a full invite link, and from junk;
  - each step's primary navigation;
  - the slogan text is exact.
- [ ] Manifest `start_url` is `/welcome`.
- [ ] `npm run check` and `npm run build` pass; `/welcome` stays within the 200 KiB public budget. Report its size.

## Out of scope
- Changes to the login or signup forms themselves.
- Privacy and terms pages.
- Push permission or install prompts.
