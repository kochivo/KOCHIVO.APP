# Player Guide Implementation Plan

> **For agentic workers:** Execute inline in this session. User authorization is to make the guide, with on-screen text only; no additional approval gate is needed.

**Goal:** A silent Egyptian Arabic player guide covering invitation through daily use.

**Architecture:** A standalone browser canvas timeline under `docs/creative/player-guide/`, following the existing reel toolchain. Read-only demo screenshots and labeled illustrations, captions separated in `messages.ts`, native playback and chapter controls. No Remotion dependency is needed.

**Tech Stack:** Existing Node, Playwright, Canvas and CSS.

**Spec:** `docs/tasks/T-player-guide-video.md`.

## Global Constraints
- No dependencies, application edits, real client data, commits or branches.
- All visible text belongs in `messages.ts`; use existing palette and local Arabic fonts.
- Only task-card files may be written.

## Review Focus
- Seeking exactly at chapter boundaries must select the following chapter.
- Long Arabic captions must wrap without clipping or tiny text.
- Mobile view must have no horizontal overflow and usable controls.
- Setup illustrations must remain distinguishable from actual screenshots.
- Playback must end cleanly and support replay without audio.

### Task 1: Silent guide preview

Files: All files listed in the task card.

- [x] Write deterministic tests for timeline boundaries, invalid seek times, caption timing and time formatting; run and observe failure.
- [x] Implement text, timing, readable scene rendering and player controls.
- [x] Use fresh demo screenshots if the normal demo entry is available, otherwise use the supplied sample captures and label their provenance.
- [x] Verify every scene and controls with Playwright; inspect a storyboard and representative full-size frames.
- [x] Run timeline tests, `npm run check`, `npm run build`, and report exact outcomes.

No commits or dependency installation.

## Verification notes
- Timeline tests: 4 passed. Browser QA: 34 scenes, 68 captions, local fonts, mobile fit, 48px controls, chapter navigation, playback/pause/replay passed.
- `npm run check`: typecheck, lint and release audit passed; 3 existing app tests failed (rank and leaderboard loading boundaries, rank celebration sheet surface). 2952 tests passed, 1 skipped. No `src/` changes were made for this task.
- `npm run build`: passed; compiled successfully and generated 57/57 static pages.
