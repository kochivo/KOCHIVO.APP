# T-322 — Exercise video stuck loading on iPhone

Owner, 2026-11-16, iPhone screenshot: «الفيديوهات مبتشتغلش بتفضل كده تحمل منغير حركه».

**What the screenshot shows:**
- The YouTube Shorts embed opens in the workout video dialog. The title, channel avatar, mute, CC and progress bar all show.
- The spinner then turns forever and the video never plays.
- The "not loading" button and the "open" link sit below the 65dvh frame. The player never sees them, because only the footer "Back to the set" is on screen.
- That footer button is in English while the rest of the screen is Arabic. Check that `videoMessages.back` resolves through `useT` with the right locale.

**Desktop check:** the same embed URL, served with the app's exact headers (CSP, COOP, Referrer-Policy), loads normally in Edge. The stall is iOS Safari or the installed PWA, and we cannot reproduce it here. So the fix is detection plus a fallback that always works.

## Where
- `src/features/workout/components/exercise-video.tsx`
- `src/lib/exercise-video.ts` (embed URL)
- `src/features/workout/video-messages.ts` (plus the `standard/` copy if one exists)

## Do
1. **Watch the player state.**
   - Add `enablejsapi=1` and `origin=<window.location.origin>` to YouTube embed URLs. Add the origin at render time on the client; keep `parseExerciseVideo` pure and give it an optional `origin` argument.
   - Listen for `message` events, only from `https://www.youtube-nocookie.com`. Parse YouTube's `infoDelivery` / `onStateChange` JSON safely: ignore anything that isn't valid JSON or whose shape is wrong.
   - After the iframe loads, post `{"event":"listening"}` to it so the player starts sending state.
2. **Detect a stall.** The video counts as stalled if any of these happens:
   - the state stays buffering (3) for 8 s;
   - the state is playing but `currentTime` does not advance for 8 s;
   - no state message arrives within 10 s of the player's first tap or of the iframe load.

   When it stalls, show a clear panel directly under the video. It does not replace the video. It holds:
   - a primary (lime) button «افتح الفيديو على يوتيوب» that opens the original YouTube link in a new tab (`rel="noopener noreferrer"`). On iOS this opens the YouTube app, which always plays.
   - a secondary «جرب تاني» button that remounts the iframe.

   Inject the timers with an injectable clock so tests are deterministic.
3. **Always-visible escape.**
   - Even before any stall, show a small «افتح على يوتيوب» link right under the frame, above the fold.
   - Reduce the frame to `max-h-[55dvh]` so the link and the muted note fit on a phone screen.
   - Remove the old "not loading" button that sits below the fold; the new panel replaces it.
4. **Footer locale.** Fix the English footer text if it is a locale bug. Arabic must read «ارجع للمجموعة».
5. Drive and file videos keep their current behavior. Add the same always-visible "open" link for Drive.

## Tests
- `exercise-video.test.ts`: the URL gets `enablejsapi=1` and `origin` when an origin is passed, and stays unchanged without one.
- New pure module, for example `video-stall.ts`, with a reducer `(state, event, now) => { stalled }`. Cover:
  - buffering for 8 s means stalled;
  - playing with time advancing means not stalled;
  - no messages for 10 s means stalled;
  - messages from a wrong origin are ignored;
  - malformed JSON is ignored.
- A render test: the "open on YouTube" link is present in the dialog markup.

## Rules
AGENTS.md applies in full:
- Tokens only and logical properties.
- Every string goes in messages: ar, arStd and en.
- Files under 250 lines.
- No new dependencies.
- Keep the /player/workout perf budget.

## Gates
npm run typecheck, npm run lint, and the workout and lib tests. The orchestrator runs build and check.
