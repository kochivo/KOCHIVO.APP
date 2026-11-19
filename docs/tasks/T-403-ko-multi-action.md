# T-403: KO handles up to 3 requests in one message, each with its own confirm card

The owner approved the mockup on 2026-11-19: `docs/mockups/ko/stage2/ko-stage2.png` (panels 2 and 3). The HTML is `docs/mockups/ko/stage2/index.html`.

## The look must not change (hard rule)
- The KO panel, chat bubbles, composer, header, colors, fonts and spacing stay exactly as they are.
- The only new UI is the **action card**. Build it exactly as in the mockup, from existing classes:
  - Card: `space-y-inline rounded-control border border-line p-stack`.
  - Title: `text-sm font-bold`, prefixed with the number: "1.", "2." or "3.". Use Latin digits, as the repo's digit rule requires.
  - Buttons: the same two buttons `KoConfirm` renders today, in the same variants and classes ("نفّذ" and "إلغاء").
  - Done state: `✓` in `text-lime-ink` before the title, the buttons removed, and the server's result line under the title in `text-xs text-muted`.
  - Cancelled state: the buttons removed, and the existing `confirmCancelled` text under the title in `text-xs text-muted`.
  - Expired state: the existing `confirmExpired` text.
- No dashed outlines. Those exist only in the mockup to mark what is new.

## Read first
`AGENTS.md`, `DESIGN.md`, `docs/ko/eval/2026-11-19-final.md` (the current KO score, 99/100), and these files:
- `src/features/ko-account/data/intents.ts`, `ground.ts`, `execute.ts`, `route.ts` and `approval.ts`
- `src/features/ko-agent/gemini.ts` (`requestKoTool`)
- `src/features/ko-core/wire.ts`
- `src/features/ko-preview/components/ko-chat.tsx` and `ko-confirm.tsx`
- `src/features/ai-tools/tools/log-my-meal.ts` and `run-tool.ts`

## What to build

### 1. Several intents per message (server)
- `requestKoTool` today returns a call only when Gemini sent exactly one. Add a way to get **1 to 3** function calls. Ignore any calls after the third. Keep the existing single-call behavior for the demo `selectKoTool`.
- `planIntent` returns `Intent[]`, with 1 to 3 items in the order Gemini sent them.
  - Add to the system text: "Call one function per distinct request in the message, at most 3. Never split one request into several calls."
  - Each item goes through `parseIntent` (an invalid one becomes its clarify marker) and then `groundIntent` (see `route.ts` for how text and the last KO question are used).
  - When two items are the same tool with the same args, drop the duplicate.
- Execution in `route.ts` and `execute.ts`:
  - Read and clarify intents run in order. Their texts are joined with a blank line into one KO bubble.
  - Each mutation intent (`update_exercise`, `create_training`, `create_nutrition`, `renew_subscription`, `send_reminder`, `log_meal`) becomes one **action**: `{ id, title, detail, token }`.
    - `title` is the short line, such as «تجديد اشتراك يوسف 30 يوم».
    - `detail` is the preview text that the confirm bubble shows today, before/after included.
    - `token` is the existing signed approval.
  - When there are no read texts, the bubble shows a short fixed line, such as «جهزتلك الطلبات دي، أكّد كل واحد لوحده.» or «جهزتلك الطلب ده.».
  - When only one mutation came back and nothing else, the reply is still one action card. The old single `confirm` flow becomes the same card.
  - `meal_photo` and `swap_exercise` keep their current flows. When either is in the list, handle only that intent, as today, and ignore the others.

### 2. Wire format
- In `src/features/ko-core/wire.ts`, `accountReplySchema` `message` gets an optional `actions: { id, title, detail, token }[]`, max 3.
  - Keep the `confirm` kind only for compatibility. The server stops sending it.
- `playerReply` must pass `actions` through.
  - Player tokens other than `swap_options` are sent in the body like captain tokens.
  - The swap cookie flow stays unchanged.

### 3. Confirming one action
- A new request shape: form fields `confirm=1` and `token=<one action token>`.
- The route verifies the token as today and runs it:
  - `exercise | training | nutrition | renew | reminder` go through `commitApproval`, captain only, as today.
  - The new `meal_log` kind is player only. It runs `runTool(ctx, 'log_my_meal', { mealId, eaten })` from `@/features/ai-tools/server`, with `client: 'ko'`. The reply is a fixed line, such as «سجّلت {meal} إنها اتاكلت.»
- The reply is `{ kind: 'message', text }`. The client shows `text` as the card's done line.
- Keep the old typed «نفذ» path working for one pending action, the newest card that is not yet confirmed.
- Add `'meal_log'` to the approval `kind` enum in `approval.ts`. Payload: `{ mealId, eaten, name }`.

### 4. New player intent `log_meal`
- Schema: `{ meal: title, eaten: boolean default true }`. It is in the player tool list only.
- Description: "Player says they ate / finished / skipped a meal in their plan (خلصت الغدا، كلت الفطار، ماكلتش العشا). Use the plan meal name."
- Execution:
  - Load today's plan with `playerNutritionPlan` from `src/features/ai-tools/data/player-nutrition.ts`. Export what you need through `@/features/ai-tools/server`; no deep imports.
  - Match the meal by name with the existing `matchNamed`/`normalizeName` helpers.
  - No match or several matches → clarify with a new fixed message, such as «أنهي وجبة؟ عندك: {names}.»
  - A match → an action with the title «تسجيل وجبة {name} إنها اتاكلت» (or «إنها ما اتاكلتش» when `eaten` is false).
- Grounding: `log_meal` needs no number, so leave it out of `groundIntent`.

### 5. Client (`ko-chat.tsx`, plus a new `ko-action-card.tsx`)
- Render the KO bubble, then one `KoActionCard` per action, as in the mockup.
- Each card has its own approval timer. Reuse `createApproval` and the expiry logic from `ko-confirm.tsx`.
- Confirm posts `confirm=1` and that card's token, then updates only that card to done or failed. Show the server's error text in the card in `text-xs text-muted`.
- Focus moves to the first card's «نفّذ» button, as `KoConfirm` does today.
- Cards stay in the log with their state, and history entries keep only text.
- Remove `KoConfirm` if nothing uses it anymore.
- Keep `ko-chat.tsx` under 250 lines. Move logic into a hook if needed, for example `hooks/use-ko-actions.ts`.

## Messages
Every new string goes in `messages.ts`: `ar` (Egyptian), `arStd`, and `en`. Use Latin digits only.

## Out of scope
- Natural replies and sources chips. That is the next card, T-404.
- The meal photo flow.
- The MCP endpoint, the eval files, and the database. No migration is needed: `ai_log_meal` exists, and ko_apply_action is not used for `meal_log`.
- No new dependency. No `.env*` changes.

## Tests (deterministic)
- `planIntent` with a fake fetcher that returns 2 and then 4 function calls: 2 intents, then 3 (the 4th ignored). Duplicates are dropped. An invalid call becomes its clarify marker.
- Route: one read plus two mutations gives one bubble with the read text and 2 actions with valid tokens. Only mutations gives the fixed line plus actions.
- Confirm: a valid captain token runs `commitApproval`. A valid player `meal_log` token calls `runTool` with `log_my_meal`. Wrong actor, expired, or a captain using `meal_log` → expired text.
- `log_meal`: matching, missing and ambiguous meal names.
- `KoActionCard`: pending, done, cancelled and expired states; confirm sends only its own token; the 48px targets stay.

## Rules
AGENTS.md:
- max 250 lines per file;
- one component per file;
- no `any`;
- `import type`;
- strings in `messages.ts`;
- logical CSS properties only;
- min-h-12 targets.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ko-account src/features/ko-agent src/features/ko-core src/features/ko-preview src/features/ai-tools`
- `npx vitest run src/features/ko-account src/features/ko-agent src/features/ko-core src/features/ko-preview src/features/ai-tools`

Report in the AGENTS.md final format, with a one-line description of every visible change.
