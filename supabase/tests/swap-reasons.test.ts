import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string, player: string, other: string, item: string, source: string, target: string, wrong: string;
let legacy: string;
beforeAll(async () => {
  db = await createTestDb(async (file, database) => {
    if (file !== '0089_swap_reasons.sql') return;
    ({ captain, player } = await createCaptainWithPlayer(database));
    other = (await createCaptainWithPlayer(database)).captain;
    const exercises = await database.query<{ id: string }>(`insert into public.exercises(name_en,body_part)
      values ('Source','legs'),('Target','legs'),('Wrong','chest') returning id`);
    [source, target, wrong] = exercises.rows.map(row => row.id) as [string, string, string];
    await database.query(`insert into public.exercise_generator_tags(exercise_id,pattern,kind,equipment,stress,min_level)
      values ($1,'hinge','compound','gym','{}','beginner'),
        ($2,'hinge','compound','bodyweight','{}','beginner'), ($3,'h_push','compound','gym','{}','beginner')`, [source, target, wrong]);
    const program = await database.query<{ id: string }>(`insert into public.programs(captain_id,player_id,title,status)
      values ($1,$2,'Plan','active') returning id`, [captain, player]);
    const day = await database.query<{ id: string }>(`insert into public.program_days(program_id,position,title)
      values ($1,0,'Day') returning id`, [program.rows[0]?.id]);
    const row = await database.query<{ id: string }>(`insert into public.program_exercises(day_id,exercise_id,position,sets,reps_min,rest_seconds)
      values ($1,$2,0,3,8,90) returning id`, [day.rows[0]?.id, source]);
    item = row.rows[0]?.id ?? '';
    legacy = (await asUser(database, player, tx => tx.query<{ id: string }>(
      'select public.request_exercise_swap($1,$2,$3) as id', [item, target, 'knee']))).rows[0]?.id ?? '';
  });
});
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  if (!db) return;
  await db.query('update public.program_exercises set exercise_id=$2 where id=$1', [item, source]);
  await db.query('update public.profiles set suspended_at=null where id=any($1::uuid[])', [[player, captain]]);
  await db.query("update public.exercise_generator_tags set stress='{}' where exercise_id=$1", [target]);
});
const request = (reason = 'discomfort', injury: string | null = null, caller = player, to = target) =>
  asUser(db, caller, tx => tx.query<{ id: string }>('select public.request_exercise_swap($1,$2,$3,$4) as id', [item, to, injury, reason]));
const decide = (id: string, caller = captain, approve = true) =>
  asUser(db, caller, tx => tx.query('select public.decide_exercise_swap($1,$2)', [id, approve]));
const feed = (caller: string) => asUser(db, caller, tx => tx.query<{ kind: string; data: Record<string, unknown> }>('select * from public.ko_feed()'));

it('backfills existing injury requests and preserves the legacy three-argument call', async () => {
  expect((await db.query('select reason,injury from public.exercise_swap_requests where id=$1', [legacy])).rows)
    .toEqual([{ reason: 'injury', injury: 'knee' }]);
  const result = await asUser(db, player, tx => tx.query<{ id: string }>('select public.request_exercise_swap($1,$2,$3) as id', [item, target, 'shoulder']));
  expect((await db.query('select reason,injury from public.exercise_swap_requests where id=$1', [result.rows[0]?.id])).rows)
    .toEqual([{ reason: 'injury', injury: 'shoulder' }]);
});
it('requests discomfort without changing the plan, exposes the reason only to the captain, and approves permanently', async () => {
  const before = (await db.query<Record<string, unknown>>('select * from public.program_exercises where id=$1', [item])).rows[0];
  const id = (await request()).rows[0]?.id ?? '';
  expect((await db.query('select * from public.program_exercises where id=$1', [item])).rows[0]).toEqual(before);
  expect((await db.query('select reason,injury from public.exercise_swap_requests where id=$1', [id])).rows)
    .toEqual([{ reason: 'discomfort', injury: null }]);
  expect((await feed(captain)).rows).toContainEqual(expect.objectContaining({ kind: 'swap_requested', data: expect.objectContaining({ reason: 'discomfort', injury: null }) }));
  for (const caller of [player, other]) {
    expect((await feed(caller)).rows.some(row => row.kind === 'swap_requested')).toBe(false);
    await expect(decide(id, caller)).rejects.toThrow();
  }
  await decide(id);
  expect((await db.query('select * from public.program_exercises where id=$1', [item])).rows[0]).toEqual({ ...before, exercise_id: target });
  await expect(decide(id)).rejects.toThrow();
});
it('rejects busy writes, invalid reasons, missing injury and wrong-pattern discomfort', async () => {
  for (const reason of ['busy', 'unknown', 'injury']) await expect(request(reason)).rejects.toThrow();
  await expect(request('injury', 'elbow')).rejects.toThrow();
  await expect(request('discomfort', null, player, wrong)).rejects.toThrow();
  for (const caller of [captain, other]) await expect(request('discomfort', null, caller)).rejects.toThrow();
});
it('enforces reason and body-part consistency in storage', async () => {
  const id = (await request()).rows[0]?.id;
  await expect(db.query("update public.exercise_swap_requests set reason='unknown' where id=$1", [id])).rejects.toThrow();
  await expect(db.query("update public.exercise_swap_requests set reason='injury' where id=$1", [id])).rejects.toThrow();
  await expect(db.query("update public.exercise_swap_requests set injury='knee' where id=$1", [id])).rejects.toThrow();
});
it('preserves injury safety checks and rechecks discomfort pattern and stale plans on approval', async () => {
  await db.query("update public.exercise_generator_tags set stress='{knee}' where exercise_id=$1", [target]);
  await expect(request('injury', 'knee')).rejects.toThrow();
  const id = (await request()).rows[0]?.id ?? '';
  await db.query('update public.program_exercises set exercise_id=$2 where id=$1', [item, wrong]);
  await expect(decide(id)).rejects.toThrow();
  await db.query('update public.program_exercises set exercise_id=$2 where id=$1', [item, source]);
  await db.query("update public.exercise_generator_tags set pattern='h_push' where exercise_id=$1", [target]);
  await expect(decide(id)).rejects.toThrow();
  await db.query("update public.exercise_generator_tags set pattern='hinge' where exercise_id=$1", [target]);
  await decide(id, captain, false);
  expect((await db.query('select exercise_id from public.program_exercises where id=$1', [item])).rows).toEqual([{ exercise_id: source }]);
});
it('keeps RLS, direct-write restrictions and suspension checks for discomfort', async () => {
  const id = (await request()).rows[0]?.id ?? '';
  expect((await asUser(db, other, tx => tx.query('select * from public.exercise_swap_requests'))).rows).toEqual([]);
  await expect(asUser(db, player, tx => tx.query("update public.exercise_swap_requests set reason='busy'"))).rejects.toThrow();
  await db.query('update public.profiles set suspended_at=now() where id=$1', [player]);
  await expect(request()).rejects.toThrow();
  await db.query('update public.profiles set suspended_at=now() where id=$1', [captain]);
  await expect(decide(id)).rejects.toThrow();
  expect((await feed(captain)).rows).toEqual([]);
});
