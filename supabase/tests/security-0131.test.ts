import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });
const id = (n: number) => `00000328-0000-7000-8000-${String(n).padStart(12, '0')}`;

async function program(captain: string, player: string, n: number) {
  await db.query("update programs set status='archived' where player_id=$1", [player]);
  await db.query(`insert into exercises(id,owner_id,name_en,body_part) values($1,$2,'Squat','upper legs')`, [id(n), captain]);
  await db.query(`insert into programs(id,captain_id,player_id,title,status) values($1,$2,$3,'Plan','active')`, [id(n + 1), captain, player]);
  await db.query(`insert into program_days(id,program_id,position,title) values($1,$2,0,'Day')`, [id(n + 2), id(n + 1)]);
  await db.query(`insert into program_exercises(id,day_id,exercise_id,position,sets,reps_min)
    values($1,$2,$3,0,3,8)`, [id(n + 3), id(n + 2), id(n)]);
  return { exercise: id(n), item: id(n + 3) };
}

async function transfer(player: string, captain: string) {
  await db.query('update coach_clients set archived_at=now() where player_id=$1', [player]);
  await db.query(`insert into coach_clients(captain_id,player_id,started_on,access_until)
    values($1,$2,'2026-11-01','2026-12-01')`, [captain, player]);
}

it('rejects an old captain exercise after transfer, including without a program exercise id', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const next = await createUser(db, 'captain');
  const old = await program(captain, player, 10);
  const current = await program(next, player, 20);
  await transfer(player, next);
  const insert = (exercise: string | null) => asUser(db, player, tx => tx.query(`insert into pain_reports
    (id,captain_id,exercise_id,area,side_view,severity,kind)
    values(gen_random_uuid(),$1,$2,'knee_r','front',3,'strain')`, [next, exercise]));
  await expect(insert(old.exercise)).rejects.toMatchObject({ code: '42501' });
  await insert(current.exercise);
  await insert(null);
  await db.query(`insert into exercises(id,owner_id,name_en,body_part) values($1,$2,'Leg press','upper legs')`, [id(25), next]);
  await db.query('update program_exercises set alternatives=array[$1::uuid] where id=$2', [id(25), current.item]);
  await asUser(db, player, tx => tx.query(`insert into pain_reports
    (id,captain_id,program_exercise_id,exercise_id,area,side_view,severity,kind)
    values(gen_random_uuid(),$1,$2,$3,'knee_r','front',3,'strain')`, [next, current.item, id(25)]));
});

it('purges the old captain and an unrelated overdue account while retaining the report', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const next = await createUser(db, 'captain');
  const unrelated = await createUser(db, 'player');
  const old = await program(captain, player, 30);
  await db.query('delete from programs where id=$1', [id(31)]);
  await transfer(player, next);
  // Represents a report accepted before the new policy; the current captain owns it.
  await db.query(`insert into pain_reports(id,player_id,captain_id,exercise_id,area,side_view,severity,kind)
    values($1,$2,$3,$4,'knee_r','front',3,'strain')`, [id(39), player, next, old.exercise]);
  await db.query(`update profiles set deletion_requested_at=now()-interval '8 days' where id=any($1::uuid[])`, [[captain, unrelated]]);
  expect((await db.query('select public.purge_deleted_accounts() n')).rows).toEqual([{ n: 2 }]);
  expect((await db.query('select id from auth.users where id=any($1::uuid[])', [[captain, unrelated]])).rows).toEqual([]);
  expect((await db.query('select exercise_id from pain_reports where id=$1', [id(39)])).rows).toEqual([{ exercise_id: null }]);
});

it('isolates hints by program owner and coaching history while keeping the player history', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const next = await createUser(db, 'captain');
  const old = await program(captain, player, 40);
  const current = await program(next, player, 50);
  const before = await program(next, player, 60);
  await transfer(player, next);
  for (const [item, since] of [[old.item, '2026-11-02'], [current.item, '2026-11-02'], [before.item, '2026-10-31']]) {
    await db.query(`insert into pain_load_hints(player_id,program_exercise_id,factor,until,since)
      values($1,$2,0.8,'2026-11-15',$3)`, [player, item, since]);
  }
  const read = (user: string) => asUser(db, user, tx => tx.query('select program_exercise_id from pain_load_hints where player_id=$1', [player]));
  expect((await read(next)).rows).toEqual([{ program_exercise_id: current.item }]);
  expect((await read(captain)).rows).toEqual([]);
  expect((await read(player)).rows).toHaveLength(3);
});

it('shares an atomic bounded counter per user, cleans old windows and denies anonymous access', async () => {
  const first = await createUser(db, 'player');
  const second = await createUser(db, 'player');
  const take = (user: string) => asUser(db, user, tx => tx.query('select public.ko_rate_take(12,60) allowed'));
  await db.query(`insert into security_private.ko_rate_hits values($1,now()-interval '2 minutes',2)`, [first]);
  for (let i = 0; i < 12; i++) expect((await take(first)).rows).toEqual([{ allowed: true }]);
  expect((await take(first)).rows).toEqual([{ allowed: false }]);
  expect((await take(second)).rows).toEqual([{ allowed: true }]);
  expect((await db.query('select hits from security_private.ko_rate_hits where user_id=$1', [first])).rows).toEqual([{ hits: 12 }]);
  await expect(asUser(db, first, tx => tx.query('select * from security_private.ko_rate_hits'))).rejects.toMatchObject({ code: '42501' });
  await expect(db.transaction(async tx => {
    await tx.exec('set local role anon');
    return tx.query('select public.ko_rate_take(12,60)');
  })).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, first, tx => tx.query('select public.ko_rate_take(12,60)'), true)).rejects.toMatchObject({ code: '42501' });
});

it('prevents direct RPC callers from changing the window or increasing the model budget', async () => {
  const player = await createUser(db, 'player');
  for (const [limit, seconds] of [[13, 60], [12, 1], [12, 61], [0, 60], [12, null]]) {
    await expect(asUser(db, player, tx => tx.query('select public.ko_rate_take($1,$2)', [limit, seconds])))
      .rejects.toMatchObject({ code: '22023' });
  }
});
