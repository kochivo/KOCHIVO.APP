# T-365: Refined look for tasks, inbox, players, player file, join and leaderboard

**Migration:** none. **Read first:** `AGENTS.md`, `docs/tasks/REFINED-LOOK.md`, then mockups `c02`–`c07` in `docs/mockups/refined/`.

## Files
Edit only these:
- `src/features/captain-workspace/queue/**`
- `src/features/captain-workspace/player-file/**`
- `src/features/captain-workspace/components/**`
- `src/features/captain-workspace/light-day/**`
- `src/features/captain-workspace/pain/**`
- `src/features/inbox/**`
- `src/features/roster/**`, **except** these, which T-363 owns:
  - `captain-frame-*`
  - `captain-nav*`
  - `captain-workspace-frame*`
  - `captain-more-sheet*`
  - `captain-top-bar*`
  - `captain-search-palette*`
- `src/features/player-profile/**`
- `src/features/coach-page/**` (captain join screen only)
- `src/features/rank-review/**`
- their tests, and their messages

## c02: Tasks (`captain-workspace/queue`)
- A StatStrip of the counts the queue already has (all, overdue, today, done).
- One `glass` card holding a `Segmented` filter in the header and 58px rows. Each row has:
  - an avatar;
  - the player name;
  - the task text;
  - a `tone-*` tag for the type;
  - one secondary row action.
- Only the page's main action is lime.

## c03: Inbox (`inbox`)
- A two-pane layout: the conversations list on the start side and the open thread beside it.
- List rows show:
  - an avatar;
  - the name;
  - the last-message preview;
  - the time;
  - an unread badge as a soft lime pill.
- The thread uses `glass` bubbles: the captain's are lime-soft, the player's are neutral.
- The composer is pinned at the bottom.
- Mobile shows the list, then the thread, as today.
- No KO suggested reply unless it already exists.

## c04: Players (`roster`)
- A StatStrip with total, active, needs attention and new this month, from data the roster already has.
- A search and filter row.
- Then one `glass` card. Each row has:
  - an avatar with a status ring;
  - the name and program;
  - the last workout;
  - the commitment % with a thin bar;
  - a tag;
  - a chevron.

## c05: Player file (`captain-workspace/player-file`, `player-profile`)
- Header card with:
  - an avatar;
  - the name;
  - tags;
  - actions (only one lime).
- A StatStrip of the player's key numbers.
- Tabs as `Segmented`.
- The tab content uses `glass` cards and the mockup's two-column layout.
- Pain and light-day keep working and use `tone-danger` and `tone-warn`.

## c06: Join (`coach-page` captain join screen)
- The requests list as rows, with approve as the one lime button per row group and reject as secondary.
- The invite link card with copy and share.
- No invite-link stats unless they already exist.

## c07: Leaderboard (`rank-review`)
- The top 3 in a podium row. First place uses `glass-featured` and an `engraved` rank number.
- Then ranked rows with points in tabular numbers and the change as a tag.
- No «النقط بتيجي منين» panel unless the data already exists.

## Done when
- The screens match the mockups at 1440×900 and collapse cleanly under 760px.
- `npm run check` and `npm run build` pass.
- Final message follows AGENTS.md section 8, with Notes listing every mockup element left out.
