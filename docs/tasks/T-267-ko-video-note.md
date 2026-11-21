# T-267 — KO note on performance videos

**Phase:** data gaps · **Depends on:** none · **Status:** draft (needs owner OK on the video-analysis approach and cost)
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 15.

## Goal
When a player sends a performance video, KO writes a short private note for the captain: what it sees and one suggestion. The note shows on the video task. The captain decides what to reply, and KO never replies to the player.

## Files
- `supabase/migrations/<next>_form_check_ko_note.sql`:
  - `form_checks.ko_note text` (≤500, nullable);
  - `form_checks.ko_noted_at timestamptz`.
  - Written only by the server, with the service role. The captain of that player can read it. The player cannot.
- `supabase/tests/form-check-ko-note.test.ts`: the player cannot read `ko_note`.
- A server job that, after upload, samples frames and calls the existing KO model integration. Codex must find the current KO server entry first and reuse it; no new dependency.
- `src/features/captain-workspace/queue/`: the KO box on the video task, as on the board.

## Requirements
1. If analysis fails or is off, nothing shows. No placeholder text.
2. Never show the note to the player.
3. Cost guard: one analysis per video, and a per-captain daily cap (the owner sets the number).

## Acceptance
- [ ] A video gets a note within the cap.
- [ ] The captain sees it and the player does not.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- KO replying to players.
- Live form tracking.

## Owner decision needed
The model choice, the cost per video and the daily cap. Keep this card in draft until those are decided.
