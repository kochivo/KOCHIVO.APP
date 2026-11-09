# T-128 — KO speaks Egyptian, premium popup, smaller animated launcher

**Phase:** KO core · **Depends on:** T-123, T-124 (both edit the popup) · **Status:** implemented; verification limited by sandbox

## Goal
KO should feel like a friendly Egyptian coach, not a form. Every Arabic reply, whether a template
or written by Gemini, uses everyday Egyptian Arabic. The popup looks premium and calm, the launcher
is smaller, and KO moves: it breathes, the panel opens smoothly, messages rise in, and a typing
indicator shows while KO thinks. There are no new AI calls and no new dependencies.

## Files
Create or modify only these:
- `src/features/ko-agent/gemini.ts`: system text, Egyptian voice rule
- `src/features/ko-account/intents.ts`: system text, Egyptian voice rule
- `src/features/ko-account/messages.ts`: rewrite the Arabic in the KO voice; English stays short and plain
- `src/features/ko-preview/messages.ts`: same for the popup strings
- `src/features/ko-agent/voice.ts`: the shared voice rule string used by both prompts (pure; exported through `ko-agent/index.ts` if `ko-account` needs it)
- `src/features/ko-agent/index.ts`: export the voice rule if needed
- `src/features/ko-preview/components/ko-widget.tsx`: smaller launcher, idle motion, badge pop
- `src/features/ko-preview/components/ko-avatar.tsx`: optional `motion` prop (`idle` | `none`), crossfade on expression change
- `src/features/ko-preview/components/ko-panel.tsx`: premium surface, header redesign, open/close animation
- `src/features/ko-preview/components/ko-chat.tsx`: bubbles, composer, typing indicator (extract parts if near 250 lines)
- `src/features/ko-preview/components/ko-message.tsx`: new, one bubble (KO or user)
- `src/features/ko-preview/components/ko-typing.tsx`: new, typing dots
- `src/app/globals.css`: KO keyframes only (`ko-breathe`, `ko-pop-in`, `ko-rise`, `ko-typing`), no new colors
- Existing tests that assert changed strings; `src/features/ko-preview/ko-polish.test.ts` (new)
- This task card.

## Requirements
1. **Voice (Arabic):**
   - Egyptian colloquial, warm and short, like a coach who knows the player: `عايز`, `دلوقتي`,
     `ماشي`, `تمام`, `خليني`, `ابعتلي`, `مش`, `كده`.
   - Never Modern Standard Arabic forms such as `أريد`, `لم`, `سوف`, `يرجى` or `الرجاء`.
   - No emoji (AGENTS.md).
   - One idea per message, at most about 2 short sentences.
   - Address the user directly. Captains may be called `يا كابتن` at most once per reply.

   Examples (rewrite all Arabic templates in this spirit):

   | Before | After |
   |---|---|
   | `اسم اللاعب مش واضح في قائمتك. اكتب الاسم الكامل مع الطلب.` | `مش لاقي اللاعب ده عندك. ابعتلي اسمه كامل.` |
   | `قولّي طلبك بالتفصيل، واذكر اسم اللاعب أو التمرين لو مطلوب.` | `مش فاهمك أوي. قولّي عايز تعمل إيه ولمين.` |
   | `راجع التفاصيل. لو تمام، اكتب «نفّذ».` | `بص على التفاصيل، ولو تمام اكتب «نفّذ».` |
   | `KO بيفهم طلبك…` | `ثانية واحدة…` |

   English stays short and plain.
2. **Voice (Gemini):** both system texts add one rule from `voice.ts`. When the user writes or
   speaks Arabic, any text KO writes (for example a `clarify` question) is in Egyptian colloquial
   Arabic, with no MSA and no emoji; otherwise it uses the user's language. Keep every existing
   safety sentence unchanged.
3. **Launcher:**
   - The visual is 52px (`size-13`), down from 64px. The touch target stays at least 48px.
   - Keep the existing KO character PNGs. Do not draw a new KO mark.
   - Idle "breathe": translateY up to −3px plus a soft lime glow pulse, about a 3.5s loop, only while closed.
   - Hover lifts it slightly.
   - The urgent badge pops (scale in) when the count changes.
   - The hover tooltip stays.
4. **Panel (premium):**
   - Use the `glass-strong` surface with the existing tokens, plus a thin lime hairline on the top edge (a token-based gradient, no hex).
   - Header:
     - a 40px avatar with a small lime "online" dot on its bottom end corner;
     - two lines: `KO`, and a muted subtitle ("مساعدك في Kochivo" / "Your Kochivo coach");
     - the close button stays.
   - Remove the bordered status pill. The context chip from T-124 stays.
   - The KO feed (T-123) stays above the chat.
   - Open: fade, scale 0.96→1 and rise 8px from the launcher corner (`transform-origin` at bottom start), about 200ms ease-out.
   - Close: the reverse, about 150ms, then unmount.
5. **Chat:**
   - KO bubbles sit on the start side with a 24px avatar, on a soft glass fill.
   - User bubbles sit on the end side on `surface-raised`.
   - Each new bubble rises in (about 160ms).
   - While busy, show `ko-typing`: three dots bouncing in sequence next to the `thinking` avatar. It replaces the "working" text, and the status is still announced (`role="status"` with a translated label).
   - Composer: a pill input. Send is the only lime button (the one primary action), round, with a translated `aria-label`.
6. **Motion safety:**
   - Every animation is off under `prefers-reduced-motion` (`motion-reduce:` or a media query in the keyframes block).
   - No animation loops while the panel is open, except the typing dots while busy.
   - Use transforms and opacity only, with no layout-shifting animation.
7. **RTL and tokens:**
   - Use logical properties only, and mirror `transform-origin` for RTL.
   - No hex values in components; new keyframes go in `globals.css`.

## Acceptance
- [x] Unit tests:
  - the voice rule appears in both system texts;
  - no Arabic message in `ko-account` or `ko-preview` contains `يرجى`, `الرجاء`, `سوف`, `أريد` or `لم `;
  - no emoji in any KO message.
- [x] UI tests (server render): smaller launcher class, header subtitle, typing indicator with `role="status"`, KO and user bubble sides, `motion-reduce` present on animated elements, ar/en, RTL.
- [x] The existing KO tests (ko-preview, ko-account, ko-agent, ko-feed) still pass.
- [ ] `npm run check` and `npm run build` pass (the Google Fonts fetch failure in the sandbox is a known limit).

## Out of scope
- Confirm or cancel buttons replacing typing «نفّذ» (follow-up card)
- Conversation memory, streaming replies, and voice replies
- Bringing the popup to production (`ko-entry`)
- Changing or compressing the KO PNGs (owner assets)

## Implementation notes

- The native dialog keeps its opaque `sheet` shell; its contents and header use `glass-strong` to preserve the shared sheet-surface contract.
- Exit uses a separate `ko-rise` timeline so it restarts after entry completes. Reduced-motion changes during exit also dismiss the panel.
- The shared pure voice module is re-exported through `ko-agent/index.ts` as specified above; `ko-preview/index.ts` stays outside this card's edit scope.
- Browser motion verification was unavailable because no Playwright Chromium binary is installed.
- Sandbox verification limits: Google Fonts fetches fail; release audit cannot spawn Git (`EPERM`); the performance-budget test sees missing chunks from the incomplete build.

## References
- `src/features/ko-preview/components/*`, `src/app/globals.css` (`surface-in`, `marketing-float` keyframes as patterns)
- Memory: keep the Codex helmet KO; never draw a new mark
