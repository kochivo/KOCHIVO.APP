import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { stableId, uuidv7 } from '../../src/core/offline/ids';
import { validateSet } from '../../src/features/workout/set-validation';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';

const now = Date.parse(TEST_NOW);
const id = () => uuidv7(now);
let db: PGlite;
let captain: string, player: string, sibling: string, stranger: string;
let template: string, copy: string, day: string;
let exercises: { id: string; exercise_id: string }[];
let session: Record<string, unknown>;
let sets: Record<string, unknown>[];
const rpc = (user: string, name: 'sync_workout_sessions' | 'sync_set_logs', rows: Record<string, unknown>[], demo = false) =>
  asUser(db, user, tx => tx.query(`select public.${name}($1)`, [JSON.stringify(rows)]), demo);

describe('coach to player V1 journey', () => {
  beforeAll(async () => {
    db = await createTestDb();
    ({ captain, player } = await createCaptainWithPlayer(db));
    sibling = await createUser(db, 'player');
    stranger = await createUser(db, 'captain');
    await db.query(`insert into public.coach_clients(captain_id,player_id,access_until)
      values($1,$2,'2026-12-03')`, [captain, sibling]);
    template = id();
    await asUser(db, captain, tx => tx.query(`insert into public.programs(id,captain_id,player_id,is_template,title)
      values($1,$2,null,true,'Journey')`, [template, captain]));
  });
  afterAll(async () => { await db?.close(); });

  it('saves a template with a null player through the weekly editor RPC', async () => {
    const templateDay = id();
    const library = await db.query<{ id: string }>(`insert into public.exercises(name_en,body_part)
      values('Journey press','chest'),('Journey row','back') returning id`);
    const draft = { id: template, player_id: null, title: 'Journey', repeatWeekly: true, days: [{
      id: templateDay, program_id: template, position: 1, title: 'Journey day', weekday: null,
      is_rest_day: false, cardio: [], exercises: library.rows.map((exercise, index) => ({
        id: id(), day_id: templateDay, exercise_id: exercise.id, position: index + 1,
        sets: index === 0 ? 2 : 1, reps_min: 8, reps_max: 12, rest_seconds: 90, superset_group: null,
      })),
    }] };
    await asUser(db, captain, tx => tx.query('select public.save_weekly_program($1)', [JSON.stringify(draft)]));
    expect((await db.query('select player_id,is_template from public.programs where id=$1', [template])).rows)
      .toEqual([{ player_id: null, is_template: true }]);
  });

  it('assigns an independent copy visible only to its player and coach', async () => {
    const assigned = await asUser(db, captain, tx => tx.query<{ id: string }>(
      'select public.assign_program_template($1,$2) as id', [template, player]));
    copy = assigned.rows[0]?.id ?? '';
    const days = await asUser(db, player, tx => tx.query<{ id: string; title: string }>(
      'select id,title from public.program_days where program_id=$1', [copy]));
    expect(days.rows).toHaveLength(1);
    expect(days.rows[0]?.title).toBe('Journey day');
    day = days.rows[0]?.id ?? '';
    exercises = (await asUser(db, player, tx => tx.query<{ id: string; exercise_id: string }>(
      'select id,exercise_id from public.program_exercises where day_id=$1 order by position', [day]))).rows;
    expect(exercises).toHaveLength(2);
    for (const user of [sibling, stranger]) {
      expect((await asUser(db, user, tx => tx.query('select id from public.programs where id=$1', [copy]))).rows).toEqual([]);
      expect((await asUser(db, user, tx => tx.query('select id from public.program_days where id=$1', [day]))).rows).toEqual([]);
      expect((await asUser(db, user, tx => tx.query('select id from public.program_exercises where day_id=$1', [day]))).rows).toEqual([]);
    }
    const originals = await db.query<{ id: string }>(`select e.id from public.program_exercises e
      join public.program_days d on d.id=e.day_id where d.program_id=$1`, [template]);
    expect(exercises.every(row => !originals.rows.some(original => original.id === row.id))).toBe(true);
  });

  it('syncs three sets, completes the session, replays safely and rejects stale updates', async () => {
    const sessionId = await stableId(player, day, '2026-11-03');
    session = { id: sessionId, program_day_id: day, training_date: '2026-11-03',
      started_at: TEST_NOW, completed_at: null, client_updated_at: TEST_NOW };
    await rpc(player, 'sync_workout_sessions', [session]);
    sets = await Promise.all([0, 1, 2].map(async index => {
      const exercise = exercises[index === 2 ? 1 : 0];
      if (!exercise) throw new Error('Assigned exercise missing');
      const setIndex = index === 2 ? 1 : index + 1;
      return { id: await stableId(sessionId, exercise.id, String(setIndex)), session_id: sessionId,
        program_exercise_id: exercise.id, exercise_id: exercise.exercise_id, set_index: setIndex,
        weight_kg: 60 + index * 2.5, reps: 8 + index, completed_at: TEST_NOW,
        client_updated_at: TEST_NOW, deleted_at: null };
    }));
    await rpc(player, 'sync_set_logs', sets);
    session = { ...session, completed_at: '2026-11-03T10:30:00Z', client_updated_at: '2026-11-03T10:30:00Z' };
    await rpc(player, 'sync_workout_sessions', [session]);
    await rpc(player, 'sync_workout_sessions', [session]);
    await rpc(player, 'sync_set_logs', sets);
    await rpc(player, 'sync_workout_sessions', [{ ...session, completed_at: null, client_updated_at: TEST_NOW }]);
    await rpc(player, 'sync_set_logs', sets.map(row => ({ ...row, reps: 1, client_updated_at: '2026-11-03T09:00:00Z' })));
    for (const user of [player, captain]) {
      expect((await asUser(db, user, tx => tx.query(`select id,program_day_id,training_date::text,
        to_char(started_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as started_at,
        to_char(completed_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as completed_at,
        to_char(client_updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as client_updated_at
        from public.workout_sessions where id=$1`, [sessionId]))).rows).toEqual([session]);
      const logged = await asUser(db, user, tx => tx.query(`select id,session_id,program_exercise_id,exercise_id,
        set_index,weight_kg::float,reps,deleted_at,
        to_char(completed_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as completed_at,
        to_char(client_updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as client_updated_at
        from public.set_logs where session_id=$1 order by weight_kg`, [sessionId]));
      expect(logged.rows).toEqual(sets);
    }
    for (const user of [sibling, stranger]) {
      for (const table of ['workout_sessions', 'set_logs']) {
        expect((await asUser(db, user, tx => tx.query(`select id from public.${table} where player_id=$1`, [player]))).rows).toEqual([]);
      }
    }
  });

  it.each([{ weight_kg: -5 }, { weight_kg: 1000.01 }, { reps: 0 }])('rejects invalid completed sets: %j', async patch => {
    await expect(rpc(player, 'sync_set_logs', [{ ...sets[0], id: id(), set_index: 3, ...patch }]))
      .rejects.toMatchObject({ code: '23514' });
  });

  it('documents nullable reps in SQL and verifies the app guard rejects absent reps', async () => {
    const nullable = { ...sets[0], id: id(), set_index: 4, reps: null };
    await rpc(player, 'sync_set_logs', [nullable]);
    expect((await db.query('select reps from public.set_logs where id=$1', [nullable.id])).rows).toEqual([{ reps: null }]);
    expect(validateSet({ weight: 60, reps: Number(null), bodyweight: false })).toBe('reps');
  });

  it('rejects a sibling writing into the real player session', async () => {
    await expect(rpc(sibling, 'sync_set_logs', [{ ...sets[0], id: id(), set_index: 5 }]))
      .rejects.toMatchObject({ code: '42501' });
  });

  it('documents that off-program exercises are retained as history with no programme reference', async () => {
    const library = await db.query<{ id: string }>(`insert into public.exercises(name_en,body_part)
      values('Unassigned exercise','chest') returning id`);
    const row = { ...sets[0], id: id(), set_index: 6, exercise_id: library.rows[0]?.id, program_exercise_id: id() };
    await rpc(player, 'sync_set_logs', [row]);
    expect((await db.query('select exercise_id,program_exercise_id from public.set_logs where id=$1', [row.id])).rows)
      .toEqual([{ exercise_id: row.exercise_id, program_exercise_id: null }]);
  });

  it('rejects a suspended player and anonymous demo caller', async () => {
    await db.query('update public.profiles set suspended_at=$1 where id=$2', [TEST_NOW, player]);
    try {
      await expect(rpc(player, 'sync_set_logs', [{ ...sets[0], id: id(), set_index: 7 }]))
        .rejects.toMatchObject({ code: '42501' });
      await expect(rpc(player, 'sync_workout_sessions', [{ ...session, id: id() }]))
        .rejects.toMatchObject({ code: '42501' });
    } finally { await db.query('update public.profiles set suspended_at=null where id=$1', [player]); }
    const demo = await createUser(db, 'player');
    await db.query('update auth.users set is_anonymous=true where id=$1', [demo]);
    await expect(rpc(demo, 'sync_set_logs', [{ ...sets[0], id: id(), set_index: 8 }], true))
      .rejects.toMatchObject({ code: '42501' });
  });
});
