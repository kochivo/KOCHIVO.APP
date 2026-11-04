# T-081 — Post-workout RPE and notes, plus the rest-timer ring and chime

**Phase:** V1 · **Status:** ready (owner V1 audit, 2026-11-05)

## Audit result
- "Last time" under each exercise: **exists**. `ExerciseHeader` shows `lastTime` from `data/last-performance.ts` / `remote-last-session.ts`. Nothing to do.
- Coach templates (save, copy, assign to a player in one tap): **exists** (`src/features/templates`, `copy_template`, assign sheet). Nothing to do.
- Rest timer: **exists**.
  - It auto-starts when a set is logged (`use-focus-session.ts` → `rest.start`).
  - It has a big countdown, +30 s and skip, survives a lock, and vibrates and flashes in the last 3 s.
  - **Missing:** a progress ring and a sound.
- Post-workout RPE and notes: **missing**. `workout_sessions` has no RPE/notes columns, and `DonePanel` only says "workout complete".

## 1. Post-workout feedback
- **Migration `supabase/migrations/0059_session_feedback.sql`** (0058 is taken by T-079):
  - `workout_sessions` gets:
    - `session_rpe smallint check (session_rpe between 1 and 10)`
    - `player_note text check (char_length(player_note) <= 500)`
  - Update the session sync RPC (latest definition in `0023_sync_orphans.sql` / `0014_hardening.sql`; recreate it in 0059) so both fields round-trip with the same last-write-wins rule as the other columns.
  - **Notify the coach:** a new notification type `workout_feedback`, sent when a session gets a `player_note`, or an RPE ≥ 9.
    - Add it to the `notifications.type` check by dropping and re-adding the constraint (see 0052).
    - Payload: `{ session_id, rpe, has_note }`. Never the note text, since push payloads leave the server.
    - Fire it once per session (guard against resync).
    - Add Arabic and English push copy for the new type in `supabase/functions/send-push/messages.ts` and `payload.ts`, with the URL to the coach's player screen.
  - PGlite test `supabase/tests/session-feedback.test.ts`:
    - ranges and length
    - the player writes only their own session
    - the active coach reads it
    - the notification is created once
- **Player UI:**
  - After finish, the focus screen shows a feedback sheet before `DonePanel`, as a `glass-strong` panel.
    - RPE 1–10 as 10 big buttons (≥ 48 px, `aria-pressed`), with the anchors «سهل جدًا» ("very easy") at 1 and «أقصى مجهود» ("max effort") at 10.
    - An optional note textarea «ملاحظة للكابتن (وجع، تعب…)» ("note for the coach: pain, tiredness…").
    - «ابعت» ("send") as the primary button, and «تخطّي» ("skip") as secondary.
  - Saved through `saveAndQueue()` on the session row, so it works offline.
  - Then `DonePanel` is shown.
- **Coach UI:** wherever the coach sees a player's completed sessions (player profile / history, find the existing view), show the RPE as a small chip and the note text under the session. Empty when missing.
- **Offline types:** extend the Dexie session type and the transport mapping. Bump the Dexie version only if the schema index changes.

## 2. Rest-timer ring and chime
- In `rest-panel.tsx`, wrap the countdown in an SVG progress ring:
  - `stroke` uses `currentColor` with `text-lime`
  - the track uses `text-line`
  - it shrinks with `remaining / total`
  - `use-rest-timer` must expose `total`, including +30 s extensions
  - `motion-reduce` keeps it static, without transitions
- Chime at zero: a short beep generated with Web Audio (an `OscillatorNode`, ~0.25 s, two tones). No audio file, no dependency.
  - Play it once, at the same moment as the existing vibrate. Never on reopen of a rest that already ended (keep that guard).
  - Fail silently where audio is blocked.
  - Add a small «صوت» ("sound") toggle on the rest panel, stored in localStorage, default on.

## Out of scope
- "Last time" and templates (they already exist).
- Per-set RPE.

## Tests
- Unit: the RPE picker's bounds; the feedback save uses `saveAndQueue` with the right fields; skip saves nothing.
- `use-rest-timer`: `total` includes extensions; the chime is called once at zero and not on a reopen after the end (inject `now`, fake the audio).
- The SQL test as above.

## Requirements
- No new dependencies. Files ≤ 250 lines. Tokens only, logical RTL, strings in `messages.ts` (Egyptian Arabic + English), no emoji.
- Perf budgets unchanged: the workout route at master level.

## Acceptance
- [ ] After «خلّصت التمرين» ("I finished the workout") the player rates 1–10 and can leave a note, offline included. The coach sees both, and gets a push for a note or RPE ≥ 9.
- [ ] The rest timer shows a shrinking ring and chimes once at zero (toggleable).
- [ ] All gates pass: `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build`, perf budget.
