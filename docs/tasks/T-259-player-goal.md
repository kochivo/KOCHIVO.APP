# T-259 — Player goal

**Phase:** data gaps · **Depends on:** none · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 7.

## Goal
Each player has one goal:
- `muscle` (زيادة عضل)
- `fat_loss` (تنشيف)
- `strength` (زيادة قوة)
- `fitness` (لياقة)

The player picks it during intake, and the captain can change it from the player file. The goal shows under the player's name in the player list and the file, which replaces the current empty spot.

## Files
- `supabase/migrations/<next>_player_goal.sql`:
  - `player_intake.goal text`, with a check on the four keys, nullable.
  - Captain update through a `security definer` RPC `set_player_goal(player_id, goal)` that checks the captain owns the player.
  - The player sets it through the existing intake save path.
- `supabase/tests/player-goal.test.ts`
- `src/features/onboarding/`: a goal step, using the existing `chip-group`.
- `src/features/captain-workspace/player-file/` and the players list: goal chips and the subtitle.
- The form question `maps_to` list: add `goal`, so a captain form can map to it.

## Requirements
1. Nullable. Old players show nothing in that spot until it is set.
2. Changing the goal from the file is optimistic, with an undo toast.

## Acceptance
- [ ] Intake saves the goal.
- [ ] The captain changes it, and it shows in the list and the file.
- [ ] RLS: only that player's captain can change it.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Program suggestions by goal.
