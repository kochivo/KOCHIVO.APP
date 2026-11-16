import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { KochivoDB } from '../../src/core/offline/db';
import { flushOutbox } from '../../src/core/offline/sync';
import { stableId } from '../../src/core/offline/ids';
import { startSession, logSet, finishSession } from '../../src/features/workout/data/log-set';
import { setMealEaten } from '../../src/features/nutrition/data/log-meal';
import { localDate } from '../../src/lib/dates';
import { asUser, createTestDb, TEST_NOW } from './harness';
import { createFleet, fleetId } from './fleet-player-fixture';
import { playerContent } from './fleet-player-content';

let db: PGlite;
let fleet: Awaited<ReturnType<typeof createFleet>>;
const now = Date.parse(TEST_NOW);
beforeAll(async () => { db = await createTestDb(); fleet = await createFleet(db); });
afterAll(async () => { await db?.close(); });

it('seeds 30 captains, every tier, empty and 50-player rosters, joins and package states', () => {
  expect(fleet.captains).toHaveLength(30);
  expect(new Set(fleet.captains.map(c => c.tier))).toEqual(new Set(['entry', 'champion', 'legend', 'empire']));
  expect(fleet.captains.some(c => c.players.length === 50)).toBe(true);
  expect(fleet.captains.some(c => c.players.length === 0)).toBe(true);
  expect(fleet.captains.filter(c => c.status === 'pending')).toHaveLength(3);
  expect(fleet.captains.filter(c => c.status === 'rejected')).toHaveLength(1);
  expect(fleet.captains.filter(c => c.suspended)).toHaveLength(1);
  expect(new Set(fleet.players.map(p => p.state))).toEqual(new Set(['active', 'pending', 'frozen', 'expired']));
  expect(new Set(fleet.players.map(p => p.joinedBy))).toEqual(new Set(['invite', 'request']));
  for (const c of fleet.captains) expect(c.players.length).toBe(Math.min(c.requested, c.limit));
});

it('starts offline, queues sets and meals, completes and replays without duplicate rows or deductions across captains', async () => {
  let workouts = 0, ptWorkouts = 0;
  const journeys = fleet.captains.filter(c => c.status === 'approved' && !c.suspended).flatMap(captain =>
    (['days', 'sessions'] as const).flatMap(kind => {
      const player = captain.players.find(p => p.state === 'active' && p.kind === kind);
      return player ? [{ captain, player }] : [];
    }));
  for (const { captain, player } of journeys) {
    const content = await playerContent(db, player);
    const local = new KochivoDB(`fleet-${player.id}`);
    const send = async (table: string, rows: object[]) => {
      await asUser(db, player.id, tx => tx.query(`select public.sync_${table}($1::jsonb)`, [JSON.stringify(rows)]));
    };
    try {
      const today = localDate(new Date(now));
      const session = await startSession(local, { id: content.day }, today, now);
      expect(await startSession(local, { id: content.day }, today, now)).toEqual(session);
      await logSet(local, { session_id: session.id, program_exercise_id: content.item,
        exercise_id: content.exercise, set_index: 1, weight_kg: 60, reps: 8 }, now + 1000);
      expect(await local.set_logs.count()).toBe(1);
      expect((await db.query('select id from set_logs where session_id=$1', [session.id])).rows).toHaveLength(0);
      expect((await flushOutbox(local, send, now + 1000)).failed).toBe(0);
      await finishSession(local, session.id, now + 2000);
      await setMealEaten(local, { mealId: content.meal, logDate: today, eaten: true,
        swaps: { [content.mealItem]: content.alternative } }, now + 3000);
      expect((await flushOutbox(local, send, now + 3000)).failed).toBe(0);
      const sessions = await local.workout_sessions.toArray();
      await send('workout_sessions', sessions); await send('workout_sessions', sessions);
      await send('set_logs', await local.set_logs.toArray());
      await send('meal_logs', await local.meal_logs.toArray());
      const result = await asUser(db, player.id, tx => tx.query(`select
        (select count(*)::int from workout_sessions) as sessions,
        (select count(*)::int from set_logs) as sets,(select count(*)::int from meal_logs) as meals`));
      expect(result.rows).toEqual([{ sessions: 1, sets: 1, meals: 1 }]);
      expect((await db.query('select sessions_left from coach_clients where id=$1', [player.link])).rows)
        .toEqual([{ sessions_left: player.kind === 'sessions' ? 2 : null }]);
      workouts++;
      if (player.kind === 'sessions') ptWorkouts++;
      const stranger = fleet.players.find(p => p.captain !== captain.id);
      if (!stranger) throw new Error('Missing cross-captain player');
      expect((await asUser(db, stranger.id, tx => tx.query('select id from set_logs where session_id=$1', [session.id]))).rows).toEqual([]);
    } finally { await local.delete(); }
  }
  expect(workouts).toBeGreaterThan(20);
  expect(ptWorkouts).toBeGreaterThan(0);
});

it('late completion from before a PT renewal still uses the carried-over balance', async () => {
  const player = fleet.players.find(p => p.state === 'active' && p.kind === 'sessions');
  if (!player) throw new Error('Missing PT player');
  const id = await stableId('fleet-late', player.id);
  const pkg = await fleetId('renewed-pt');
  await asUser(db, player.captain, tx => tx.query(`insert into captain_packages(id,captain_id,name,price_egp,days,kind,sessions)
    values ($1,$2,'PT renewal',100,30,'sessions',5)`, [pkg, player.captain]));
  const before = (await db.query<{ sessions_left: number }>('select sessions_left from coach_clients where id=$1', [player.link])).rows[0];
  if (!before) throw new Error('Missing PT balance');
  await asUser(db, player.captain, tx => tx.query('select renew_player($1,p_package=>$2)', [player.id, pkg]));
  const renewedBalance = before.sessions_left + 5;
  expect((await db.query('select sessions_left from coach_clients where id=$1', [player.link])).rows).toEqual([{ sessions_left: renewedBalance }]);
  const row = { id, training_date: '2026-11-02', started_at: '2026-11-02T08:00:00Z',
    completed_at: '2026-11-02T09:00:00Z', client_updated_at: TEST_NOW };
  await asUser(db, player.id, tx => tx.query('select sync_workout_sessions($1)', [JSON.stringify([row])]));
  // Renewal carries the old balance forward, so an offline workout from before it must still be paid for once.
  expect((await db.query('select sessions_left from coach_clients where id=$1', [player.link])).rows).toEqual([{ sessions_left: renewedBalance - 1 }]);
  expect((await db.query('select session_id from session_deductions where session_id=$1', [id])).rows).toEqual([{ session_id: id }]);
  const fresh = await stableId('fleet-after-renewal', player.id);
  const freshRow = { id: fresh, training_date: '2026-11-03', started_at: '2026-11-03T10:01:00Z',
    completed_at: '2026-11-03T11:00:00Z', client_updated_at: '2026-11-03T11:00:00Z' };
  for (let replay = 0; replay < 2; replay++) {
    await asUser(db, player.id, tx => tx.query('select sync_workout_sessions($1)', [JSON.stringify([freshRow])]));
  }
  expect((await db.query('select sessions_left from coach_clients where id=$1', [player.link])).rows)
    .toEqual([{ sessions_left: renewedBalance - 2 }]);
  expect((await db.query('select session_id from session_deductions where session_id=$1', [fresh])).rows)
    .toEqual([{ session_id: fresh }]);
});

it('a session from before the original billing period never consumes PT balance', async () => {
  const player = fleet.players.find(p => p.state === 'active' && p.kind === 'sessions');
  if (!player) throw new Error('Missing PT player');
  const before = (await db.query('select sessions_left from coach_clients where id=$1', [player.link])).rows;
  const id = await stableId('fleet-pre-billing', player.id);
  await asUser(db, player.id, tx => tx.query('select sync_workout_sessions($1)', [JSON.stringify([{ id,
    training_date: '2026-10-31', started_at: '2026-10-31T08:00:00Z',
    completed_at: '2026-10-31T09:00:00Z', client_updated_at: TEST_NOW }])]));
  expect((await db.query('select sessions_left from coach_clients where id=$1', [player.link])).rows).toEqual(before);
  expect((await db.query('select session_id from session_deductions where session_id=$1', [id])).rows).toEqual([]);
});

it('keeps meal swaps on the Cairo day at 23:30 UTC and rejects delayed older changes', async () => {
  const player = fleet.players.find(p => p.state === 'active');
  if (!player) throw new Error('Missing active player');
  const meal = await fleetId('meal', player.id);
  const at = Date.parse('2026-11-03T23:30:00Z');
  const date = localDate(new Date(at));
  expect(date).toBe('2026-11-04');
  const local = new KochivoDB('fleet-cairo-meals');
  try {
    const mealItem = await fleetId('meal-item', player.id), alternative = await fleetId('alternative', player.id);
    await setMealEaten(local, { mealId: meal, logDate: date, eaten: true, swaps: { [mealItem]: alternative } }, at);
    const rows = await local.meal_logs.toArray();
    const sync = (payload: object[]) => asUser(db, player.id, tx => tx.query('select sync_meal_logs($1)', [JSON.stringify(payload)]));
    await sync(rows); await sync(rows);
    await sync(rows.map(row => ({ ...row, swaps: {}, client_updated_at: TEST_NOW })));
    expect((await asUser(db, player.id, tx => tx.query('select log_date::text,swaps from meal_logs where id=$1', [rows[0]?.id]))).rows)
      .toEqual([{ log_date: date, swaps: { [mealItem]: alternative } }]);
  } finally { await local.delete(); }
});
