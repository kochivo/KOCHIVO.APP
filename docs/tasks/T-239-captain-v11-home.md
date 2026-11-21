# T-239 — Captain v11: home

**Phase:** captain v11 fidelity · **Depends on:** T-238 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first. It is part of this card.

## Goal
`/captain` matches the mockup `home` screen exactly.

## Files
- `src/features/dashboard/components/workspace-home.tsx`
- `src/features/dashboard/home/*` (new files allowed there)
- `src/features/dashboard/data/*`, read-only queries only
- `src/features/dashboard/home/messages.ts`
- tests in `src/features/dashboard/`

## Requirements
1. **Top bar** (`header`):
   - the greeting «صباح الخير يا كابتن <first name>», which keeps the existing time-of-day logic;
   - the date as a subtitle;
   - the bell, and the lime «ضيف لاعب» button, which opens the existing invite.
2. **KO hero** (`hero2`):
   - a ring showing today's task progress;
   - the «KO · ملخص الصبح» tag;
   - a sentence with the task count and the estimated minutes (3 minutes per task, as in the mockup), plus the two most urgent tasks named;
   - the big number with «مهام النهارده»;
   - a lime «ابدأ المهام» button that opens the tasks page (T-240).
   - When there are no tasks, show «خلصت كل مهام النهارده. فريقك ماشي تمام.» and hide the button.
3. **Four ring tiles** (`g4`):
   - التزام الأسبوع: percent, plus the week-on-week change on desktop;
   - اتمرنوا النهارده: count of players who trained today out of active players;
   - مهام مستنياك: opens the tasks page;
   - جنيه الشهر ده: confirmed payments this month, opens billing.
4. **Left column** (`g21`):
   - The «المهام» card lists the first 5 task rows (`taskRow` compact), with the count and a «كلها» link.
5. **Right column:**
   - «تمارين الفريق»: a bar chart of the sessions the team logged per day this week, Saturday to Friday. Days that have passed are lime.
   - «مستني منك تأكيد»: a row for payments to confirm, with names and count, linking to billing; and a row for join requests, with names and count, linking to join requests.
6. Reuse the existing loaders (`loadHomeSummary`, `loadHomeFollowup`, `homeNeeds`, the dues), and the task model from T-240 if it lands first. Otherwise build one shared task list in `dashboard/home/` that T-240 reuses.
7. Mobile follows the mockup:
   - the hero stacks;
   - the tiles show 2 per row;
   - the columns stack.

## Acceptance
- [ ] Desktop and 390px match the mockup `home`.
- [ ] Every number is real. There are tests for the task estimate, the week chart days and the empty hero.
- [ ] `npm run check` and `npm run build` pass, and `/captain` stays within 310 KiB.

## Out of scope
- The tasks page (T-240), and the shell (T-238).
