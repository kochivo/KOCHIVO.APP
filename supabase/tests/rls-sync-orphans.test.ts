import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let owner: { captain: string; player: string };
let other: { captain: string; player: string };
let sequence = 0;
const id = () => `01900000-0000-8000-8000-${String(++sequence).padStart(12, '0')}`;
const NOW = '2026-11-03T08:00:00.000Z';
const OLDER = '2026-11-03T07:00:00.000Z';
const RPCS = ['sync_workout_sessions', 'sync_set_logs', 'sync_meal_logs'] as const;

beforeAll(async () => {
  db = await createTestDb();
  owner = await createCaptainWithPlayer(db);
  other = await createCaptainWithPlayer(db);
});
afterAll(async () => { await db.close(); });

async function fixture(user = owner) {
  await db.query(`update public.programs set status = 'archived' where player_id = $1`, [user.player]);
  await db.query(`update public.nutrition_plans set status = 'archived' where player_id = $1`, [user.player]);
  const [exercise, program, day, item, plan, meal] = [id(), id(), id(), id(), id(), id()] as const;
  await db.query(`insert into public.exercises (id, name_en, body_part) values ($1, 'squat', 'legs')`, [exercise]);
  await db.query(`insert into public.programs (id, captain_id, player_id, title, status)
    values ($1, $2, $3, 'Plan', 'active')`, [program, user.captain, user.player]);
  await db.query(`insert into public.program_days (id, program_id, position) values ($1, $2, 0)`, [day, program]);
  await db.query(`insert into public.program_exercises (id, day_id, exercise_id, position, sets, reps_min)
    values ($1, $2, $3, 0, 3, 8)`, [item, day, exercise]);
  await db.query(`insert into public.nutrition_plans (id, captain_id, player_id, title, status)
    values ($1, $2, $3, 'Plan', 'active')`, [plan, user.captain, user.player]);
  await db.query(`insert into public.meals (id, plan_id, position, name) values ($1, $2, 0, 'Meal')`, [meal, plan]);
  const session = { id: id(), program_day_id: day, training_date: '2026-11-03',
    started_at: OLDER, completed_at: NOW, client_updated_at: NOW };
  const set = { id: id(), session_id: session.id, program_exercise_id: item, exercise_id: exercise,
    set_index: 2, weight_kg: 62.5, reps: 8, completed_at: NOW, client_updated_at: NOW, deleted_at: OLDER };
  const log = { id: id(), meal_id: meal, log_date: '2026-11-03', swaps: { food: 125 },
    completed_at: NOW, client_updated_at: NOW, deleted_at: OLDER };
  return { day, item, meal, session, set, log };
}

async function sync(f: Awaited<ReturnType<typeof fixture>>) {
  await asUser(db, owner.player, async (tx) => {
    for (const [index, row] of [f.session, f.set, f.log].entries()) {
      await tx.query(`select public.${RPCS[index]}($1)`, [JSON.stringify([row])]);
    }
  });
}

async function stored(table: string, rowId: string) {
  const { rows } = await asUser(db, owner.player, (tx) => tx.query<{ row: Record<string, unknown> }>(
    `select to_jsonb(t) - 'server_updated_at' as row from public.${table} t where id = $1`, [rowId],
  ));
  // jsonb timestamps use the PostgreSQL offset format, unlike the offline ISO strings.
  return JSON.parse(JSON.stringify(rows[0]?.row).replaceAll('+00:00', '.000Z'));
}

async function expectLogs(f: Awaited<ReturnType<typeof fixture>>, refs = {
  day: f.day as string | null, item: f.item as string | null, meal: f.meal as string | null,
}) {
  expect(await stored('workout_sessions', f.session.id)).toEqual({
    ...f.session, player_id: owner.player, program_day_id: refs.day, session_rpe: null, player_note: null,
  });
  expect(await stored('set_logs', f.set.id)).toEqual({
    ...f.set, player_id: owner.player, program_exercise_id: refs.item,
  });
  expect(await stored('meal_logs', f.log.id)).toEqual({
    ...f.log, player_id: owner.player, meal_id: refs.meal,
  });
}

describe('orphan-safe sync (0023)', () => {
  it.each(['exercise', 'day', 'meal'] as const)('keeps offline fields after the captain deletes the %s', async (target) => {
    const f = await fixture();
    const table = { exercise: 'program_exercises', day: 'program_days', meal: 'meals' }[target];
    const rowId = { exercise: f.item, day: f.day, meal: f.meal }[target];
    await asUser(db, owner.captain, (tx) => tx.query(`delete from public.${table} where id = $1`, [rowId]));
    await sync(f);
    await expectLogs(f, { day: target === 'day' ? null : f.day,
      item: target === 'meal' ? f.item : null, meal: target === 'meal' ? null : f.meal });
  });

  it('nulls forged references to another player while retaining the logs', async () => {
    const f = await fixture();
    const foreign = await fixture(other);
    f.session.program_day_id = foreign.day;
    f.set.program_exercise_id = foreign.item;
    f.log.meal_id = foreign.meal;
    await sync(f);
    await expectLogs(f, { day: null, item: null, meal: null });
  });

  it('keeps live references and ignores older edits in all three RPCs', async () => {
    const f = await fixture();
    await sync(f);
    await expectLogs(f);
    await sync({ ...f,
      session: { ...f.session, completed_at: OLDER, client_updated_at: OLDER },
      set: { ...f.set, weight_kg: 10, reps: 1, completed_at: OLDER, client_updated_at: OLDER, deleted_at: NOW },
      log: { ...f.log, swaps: { food: 10 }, completed_at: OLDER, client_updated_at: OLDER, deleted_at: NOW },
    });
    await expectLogs(f);
  });

  it.each(RPCS)('denies anonymous execution of %s', async (rpc) => {
    await expect(db.transaction(async (tx) => {
      await tx.exec('set local role anon');
      await tx.query(`select public.${rpc}('[]'::jsonb)`);
    })).rejects.toThrow(/permission denied for function/);
  });
});
