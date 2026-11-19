# T-410: KO launch fixes: honest privacy text, clear "busy" message

Owner, 2026-11-19: KO opens to everyone on the **free Gemini tier**.

On the free tier, Google may use prompts and outputs to improve its products, and people at Google may review them. Our texts currently say providers process data "only to run the service". That is not true for KO on the free tier.

## 1. Privacy text
- **`src/features/marketing/legal/messages.ts`, `privacy5Body`** (`ar`, `arStd`, `en`):
  - Keep the existing sentence for the other providers.
  - Add a separate sentence for KO: the text, voice and photos a user sends to KO go to an AI provider. That provider may use them to improve its services and may review them.
  - Advise users not to send KO private medical or sensitive information.
  - Keep the rule in `legal.test.ts`: no vendor names (Google, Gemini and so on) in the legal page.
  - Arabic (Egyptian):
    > «مساعد KO الذكي: الرسايل والفويس والصور اللي بتبعتها لـ KO بتروح لمقدّم خدمة ذكاء اصطناعي، وممكن يستخدمها أو يراجعها عشان يحسّن خدماته. ما تبعتش لـ KO معلومات طبية أو شخصية حساسة.»
  - Write `arStd` and `en` to match.
- **In-app note `accountPrivacy`** in `ko-preview/messages.ts` and the arStd file:
  > «رسالتك أو الفويس أو الصورة بيتبعت لـ Gemini لما تدوس ابعت، وGoogle ممكن تستخدمها لتحسين خدماتها. ما تبعتش بيانات حساسة.»
  - English: "Your text, recording or photo is sent to Gemini when you press send, and Google may use it to improve its services. Don't send sensitive information."
  - Same size and place as today.

## 2. Clear message when Gemini is busy or out of quota
- **Today:** a Gemini 429 (daily free quota or rate limit) or 503 throws `Gemini HTTP 429`. The route returns `{ error: 'failed' }` with 502, and the user sees a generic error.
- **Change:**
  - In `ko-agent/gemini.ts`, throw a typed error carrying the status (for example `class KoModelError extends Error { status }`), exported through the ko-agent entry.
  - In `ko-account/data/route.ts`:
    - On 429, reply 200 with a normal KO message `koBusy`: «KO عليه ضغط كبير النهارده. جرّب تاني بعد شوية، ولو لسه مش شغال جرّب بكرة الصبح.» Add the T-406 `quick` buttons, so the free answers still work.
    - On 503, reply with `koBusyNow`: «KO مشغول دلوقتي، جرّب كمان دقيقة.»
    - **Do not** count the message against the user's daily cap when Gemini failed. Refund it, or take usage only after a successful model call; pick the simplest correct option and explain it in the notes.
  - Log `console.warn('KO model busy', status)` once per request, with no user data.
- Keep the demo route (`/dev/ko`) as it is.

## Files
- `src/features/marketing/legal/messages.ts` (+ its arStd part if separate)
- `src/features/ko-preview/messages.ts`, `src/features/ko-preview/standard/messages.ts`
- `src/features/ko-agent/gemini.ts`, `src/features/ko-agent/index.ts`
- `src/features/ko-account/data/route.ts`, `src/features/ko-account/messages.ts`, `src/features/ko-account/standard/messages.ts`
- `src/features/ko-account/data/usage.ts` (only if the refund needs it)

## Out of scope
- Paid tier, migrations, UI layout.
- No new dependency.

## Tests
- `legal.test.ts` still passes, and the privacy page contains the new KO sentence.
- Route with mocked fetch:
  - 429 → 200 with `koBusy` text and quick buttons, and usage is not consumed;
  - 503 → `koBusyNow`;
  - 500 → today's generic error.
- i18n coverage passes.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ko-account src/features/ko-agent src/features/ko-preview src/features/marketing`
- `npx vitest run src/features/ko-account src/features/ko-agent src/features/ko-preview src/features/marketing src/core/i18n/coverage.test.ts`
