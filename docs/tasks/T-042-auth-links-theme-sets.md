# T-042 — Auth links, theme kept across language switch, and «مجموعة» for sets

**Phase:** 3 · **Depends on:** none · **Status:** ready (urgent, owner found these while testing)

## 1. Sign-up and sign-in buttons open the demo
- On the landing page «ابدأ مجاناً», «دخول» and «ابدأ مجاناً بـ 5 لاعبين» take the visitor to `/demo`.
- Known cause in `src/features/marketing/components/site-header.tsx`: the login link uses `content.links.demo`. Check every CTA in `src/features/marketing/**` (header, hero, pricing, footer, mobile menu if present).
- Correct targets: sign-in → `/login`; sign-up → `/login?tab=signup` (already `content.links.signup`). Add `links.login` in `content.ts` if missing. Only «جرّب الديمو» goes to `/demo`.
- Test: every marketing CTA's `href` matches its label (sign-in, sign-up, demo).

## 2. Light mode resets to dark after switching language
- The theme lives in `src/lib/theme-mode.ts`, `src/ui/theme-switch.tsx` and the `themeBootScript` in `src/app/[locale]/layout.tsx` (no next-themes; do not add it).
- Reproduce: choose light, switch Arabic ↔ English, the page comes back dark. Find why (the language switch may reload or re-render without the stored choice, the boot script may read a different key, or a cookie and localStorage disagree) and fix it at the source.
- The chosen theme must survive a language switch, a reload and navigation, on both the landing page and the app. Store it in `localStorage` (and a cookie only if the server render needs it), with try/catch around storage.
- Tests in `src/lib/theme-mode.test.ts`: the stored choice is read by the boot script and kept after a locale change.

## 3. «ست» → «مجموعة»
- Arabic only. Replace the word «ست» meaning a training set with «مجموعة» (plural «مجموعات»), in every `messages.ts` and any Arabic text in components, on both captain and player screens.
- «تم الست» and similar → «تمت المجموعة»; a button that finishes a set → «إنهاء المجموعة». Fix grammar around it (feminine agreement: «المجموعة الجاية», «مجموعة واحدة», counts like «٣ مجموعات»).
- Be careful: do not change unrelated words that contain «ست» (e.g. «ستة», «استنى», «استخدم», «ستوري»). Review each match by hand.
- English stays "set".
- Update any test that asserts the old Arabic text.

## Requirements
- Edit Arabic only with the file-editing tool, never PowerShell `Set-Content`. No new dependencies. Tokens only.

## Acceptance
- [ ] Every marketing sign-in or sign-up button reaches `/login`; only the demo button reaches `/demo`.
- [ ] Light mode stays light after switching language and reloading.
- [ ] No Arabic string calls a training set «ست».
- [ ] `npm run check`, `npm run build` and the perf budget pass.
