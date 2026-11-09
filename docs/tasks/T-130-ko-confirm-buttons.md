# T-130 — KO confirm and cancel buttons

**Phase:** KO core · **Depends on:** T-116, T-128 · **Status:** draft

## Goal
When KO proposes a change (edit sets or reps, renew, reminder, draft), the captain taps
**نفّذ** or **إلغاء** under that reply instead of typing a command. Typing «نفّذ» keeps working.
The security model does not change: the same HMAC approval token is used, it lasts 10 minutes,
it works once, and the server re-checks it.

## Files
Create or modify only these:
- `src/features/ko-preview/components/ko-chat.tsx`: render the confirm row for the latest `confirm` reply
- `src/features/ko-preview/components/ko-confirm.tsx`: new; the two buttons and the expired/used states
- `src/features/ko-preview/messages.ts`: new strings only (Egyptian Arabic plus short English); keep existing copy
- `src/features/ko-preview/ko-confirm.test.ts`: new
- This task card.

## Requirements
1. **When the buttons show:** only under the latest KO reply of kind `confirm`, and only in account mode.
   - At most one active confirm row exists at a time.
   - The row disappears after it is used, after a new message is sent, or on cancel.
2. **"نفّذ":**
   - Lime primary button, the one primary action.
   - It sends the same request as typing «نفّذ» (text plus `token`), so the server path is unchanged.
   - While the request runs, both buttons are disabled and the typing indicator shows.
   - A double tap never sends twice.
3. **"إلغاء":**
   - Ghost button; it makes no server call.
   - It clears the approval token locally and adds a local KO line: "تمام، لغيته." / "Cancelled."
4. **Expiry:**
   - After 10 minutes from the reply (injected `now` in tests), the row turns into a muted "الطلب ده خلص وقته. ابعته تاني." / "This request expired. Send it again." with no buttons.
   - The server's own `expired` and `replay` replies show as normal KO messages.
5. **Accessibility:**
   - The buttons are at least 48px high.
   - The row is a `group` with a translated label.
   - Focus moves to "نفّذ" when the row appears.
   - Under reduced motion there is no animation.
6. Keep `ko-chat.tsx` under 250 lines; move the logic into `ko-confirm.tsx` or a small hook if needed.

## Acceptance
- [ ] Unit and UI tests:
  - the row appears only for `confirm` replies;
  - "نفّذ" sends the token once;
  - "إلغاء" sends nothing and clears the token;
  - the row disappears after a new message;
  - expiry at exactly 10 minutes;
  - typing «نفّذ» still works;
  - ar/en and RTL.
- [ ] Existing KO suites pass. `npm run check` and `npm run build` pass (sandbox fonts are a known limit).

## Out of scope
- Server or approval-token changes, and undo after commit
- Production popup wiring (T-129)

## Implementation notes
- Account confirmations reuse the existing text/token form and synchronous in-flight guard.
- Approval is consumed or cleared when sending; cancellation appends a local KO reply.
- The row has translated labels, focus on confirm, 48px controls, no animation, and a local ten-minute expiry timer.
- Confirm is temporarily disabled while a recording or attachment is pending, so it cannot accidentally send media instead of the confirmation text.
- Deterministic tests cover token consumption, exact expiry, translated RTL markup, cancellation, double submission, typed confirmation, and dismissal on another message.
- Requested KO suites: 9 files passed, 68 tests passed. TypeScript and ESLint pass.
- Sandbox gates: release audit cannot spawn `git` (`EPERM`); production build cannot fetch Alexandria, Changa, or Manrope from Google Fonts.
- Full native-loader/thread suite: 399 files passed, 1 failed; 2,781 tests passed, 1 failed. `src/lib/perf-budget.test.ts` references a missing `.next` chunk after the font-blocked build; left out-of-scope tooling unchanged.
