import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { TEST_NOW, asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite, player: string, captain: string;
const id = (n: number) => `00000348-0000-7000-8000-${String(n).padStart(12, '0')}`;
beforeAll(async () => {
  db = await createTestDb();
  ({ player, captain } = await createCaptainWithPlayer(db));
  await db.query(`insert into exercises(id,name_en,body_part,orphaned_at,archived_at) values
    ($1,'Orphan','back',now(),now()),($2,'Global','back',null,null)`, [id(1), id(2)]);
  await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,client_updated_at)
    values($1,$2,'2026-11-03',$3,$3)`, [id(3), player, TEST_NOW]);
});
afterAll(async () => { await db?.close(); });
const row = (n: number, exercise = id(1)) => ({ id: id(n), session_id: id(3), exercise_id: exercise,
  set_index: n, weight_kg: 50, reps: 8, completed_at: TEST_NOW, client_updated_at: TEST_NOW });
const sync = (rows: object[]) => asUser(db, player, tx => tx.query('select sync_set_logs($1)', [JSON.stringify(rows)]));

it('refuses a forged orphan reference through RPC and direct insert', async () => {
  await expect(sync([row(10)])).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, player, tx => tx.query(`insert into set_logs
    (id,session_id,exercise_id,set_index,completed_at,client_updated_at) values($1,$2,$3,11,$4,$4)`,
  [id(11), id(3), id(1), TEST_NOW]))).rejects.toMatchObject({ code: '42501' });
  expect((await asUser(db, player, tx => tx.query('select id from exercises where id=$1', [id(1)]))).rows).toEqual([]);
});

it('refuses changing a legitimate log to an orphan through RPC and direct update', async () => {
  await sync([row(12, id(2))]);
  await expect(sync([{ ...row(12), client_updated_at: '2026-11-03T11:00:00Z' }])).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, player, tx => tx.query('update set_logs set exercise_id=$1 where id=$2', [id(1), id(12)])))
    .rejects.toMatchObject({ code: '42501' });
});

it('ignores stale inaccessible exercise payloads without blocking later legitimate rows', async () => {
  await sync([row(13, id(2))]);
  await sync([{ ...row(13), client_updated_at: '2026-11-03T09:00:00Z' }, row(14, id(2))]);
  expect((await db.query('select exercise_id from set_logs where id=$1', [id(13)])).rows)
    .toEqual([{ exercise_id: id(2) }]);
});

it('keeps historical orphan retries, drop indices and timestamp conflict handling', async () => {
  await db.query(`insert into set_logs(id,session_id,player_id,exercise_id,set_index,drop_index,completed_at,client_updated_at)
    values($1,$2,$3,$4,20,1,$5,$5)`, [id(20), id(3), player, id(1), TEST_NOW]);
  await sync([{ ...row(20), drop_index: 1, reps: 10, client_updated_at: '2026-11-03T11:00:00Z' }]);
  await sync([{ ...row(20), drop_index: 1, reps: 2 }]);
  expect((await db.query('select reps,drop_index from set_logs where id=$1', [id(20)])).rows)
    .toEqual([{ reps: 10, drop_index: 1 }]);
});

it('allows current captain exercises and alternatives copied from an older captain', async () => {
  await db.query(`insert into exercises(id,owner_id,name_en,body_part) values($1,$2,'Captain lift','back')`, [id(30), captain]);
  await sync([{ ...row(31, id(30)), set_index: 1 }]);
  await db.query(`insert into exercises(id,owner_id,name_en,body_part) values($1,$2,'Alternative','back')`, [id(36), captain]);
  await db.query(`insert into programs(id,captain_id,player_id,title) values($1,$2,$3,'Plan')`, [id(32), captain, player]);
  await db.query('insert into program_days(id,program_id,position) values($1,$2,0)', [id(33), id(32)]);
  await db.query(`insert into program_exercises(id,day_id,exercise_id,alternatives,position,sets,reps_min)
    values($1,$2,$3,array[$4::uuid],0,1,8)`, [id(34), id(33), id(2), id(36)]);
  // Simulate a copied library exercise whose former owner has since been purged.
  await db.query('update exercises set owner_id=null,orphaned_at=now(),archived_at=now() where id=$1', [id(36)]);
  await sync([{ ...row(35, id(36)), set_index: 2, program_exercise_id: id(34), drop_index: 1 }]);
  await db.query('delete from programs where id=$1', [id(32)]);
  await sync([{ ...row(35, id(36)), set_index: 2, program_exercise_id: id(34), drop_index: 1,
    reps: 12, client_updated_at: '2026-11-03T12:00:00Z' }]);
  expect((await db.query('select reps,program_exercise_id from set_logs where id=$1', [id(35)])).rows)
    .toEqual([{ reps: 12, program_exercise_id: null }]);
});

it('checks logical conflicts and does not borrow another player historical permission', async () => {
  const other = await createUser(db, 'player');
  await db.query(`insert into exercises(id,name_en,body_part,orphaned_at,archived_at)
    values($1,'Other history','back',now(),now())`, [id(40)]);
  await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,client_updated_at)
    values($1,$2,'2026-11-03',$3,$3)`, [id(41), other, TEST_NOW]);
  await db.query(`insert into set_logs(id,session_id,player_id,exercise_id,set_index,completed_at,client_updated_at)
    values($1,$2,$3,$4,1,$5,$5)`, [id(42), id(41), other, id(40), TEST_NOW]);
  await expect(sync([{ ...row(43, id(40)), set_index: 1 }])).rejects.toMatchObject({ code: '42501' });
  await db.query(`insert into programs(id,captain_id,player_id,title) values($1,$2,$3,'Conflict plan')`, [id(44), captain, player]);
  await db.query('insert into program_days(id,program_id,position) values($1,$2,0)', [id(45), id(44)]);
  await db.query(`insert into program_exercises(id,day_id,exercise_id,position,sets,reps_min)
    values($1,$2,$3,0,1,8)`, [id(46), id(45), id(2)]);
  await sync([{ ...row(47, id(2)), program_exercise_id: id(46), set_index: 1 }]);
  await expect(sync([{ ...row(48, id(40)), program_exercise_id: id(46), set_index: 1,
    client_updated_at: '2026-11-03T12:00:00Z' }])).rejects.toMatchObject({ code: '42501' });
  await sync([{ ...row(48, id(40)), program_exercise_id: id(46), set_index: 1,
    client_updated_at: '2026-11-03T09:00:00Z' }]);
  expect((await db.query('select exercise_id from set_logs where id=$1', [id(47)])).rows)
    .toEqual([{ exercise_id: id(2) }]);
});

it('allows an owned session captain exercise after a transfer', async () => {
  const nextCaptain = await createUser(db, 'captain');
  await db.query(`insert into exercises(id,owner_id,name_en,body_part) values($1,$2,'Session captain','back')`, [id(50), captain]);
  await db.query('update workout_sessions set program_day_id=$1 where id=$2', [id(45), id(3)]);
  await db.query('update coach_clients set archived_at=now() where player_id=$1', [player]);
  await db.query(`insert into coach_clients(captain_id,player_id,access_until) values($1,$2,'2026-12-31')`, [nextCaptain, player]);
  await sync([{ ...row(51, id(50)), set_index: 1 }]);
  expect((await db.query('select exercise_id from set_logs where id=$1', [id(51)])).rows)
    .toEqual([{ exercise_id: id(50) }]);
});
