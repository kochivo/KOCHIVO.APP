# Player guide video — on-screen text only

## Request
Make an Egyptian Arabic player guide from receiving the captain's invitation through signup and the available player screens. The owner chose on-screen text only, with no voiceover.

## Files
- `docs/superpowers/plans/2026-11-10-player-guide.md`
- `docs/creative/player-guide/README.md`
- `docs/creative/player-guide/messages.ts`
- `docs/creative/player-guide/timeline.mjs`
- `docs/creative/player-guide/timeline.test.mjs`
- `docs/creative/player-guide/index.html`
- `docs/creative/player-guide/styles.css`
- `docs/creative/player-guide/draw.mjs`
- `docs/creative/player-guide/illustrations.mjs`
- `docs/creative/player-guide/scenes.mjs`
- `docs/creative/player-guide/player.mjs`
- `docs/creative/player-guide/server.mjs`
- `docs/creative/player-guide/capture.mjs`
- `docs/creative/player-guide/verify.mjs`
- Generated demo-only images in `docs/creative/player-guide/assets/` and QA artifacts in `docs/creative/player-guide/review/`.

## Requirements
- Silent, portrait 1080×1920 guided video preview with readable captions and chapter seeking.
- Use existing browser, Node and Playwright tools; no dependencies or app changes.
- Read source screenshots, fonts and palette without modifying them.
- Invitation, verification and setup illustrations must be explicitly labeled; never imply a real signup was recorded.
- Current ranks use the monthly crown, not the earlier Unique concept.
- Offline guidance distinguishes local set/meal logging from online signup, uploads and sending check-ins.
- Verify timeline boundaries, every scene, text fit, mobile controls and playback.
- Run `npm run check` and `npm run build` before delivery.

## Out of scope
Production accounts, real invitations or OTPs, app/database changes, publishing, dependencies, commits and branches.
