import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string, player: string, other: string, program: string, item: string;
let source: string, target: string, unsafe: string, different: string;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec('delete from public.coach_clients; delete from public.programs where not is_template;');
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = (await createCaptainWithPlayer(db)).captain;
  const exercises = await db.query<{ id: string }>(`insert into public.exercises(name_en,body_part)
    values ('Source','legs'),('Target','legs'),('Unsafe','legs'),('Different','legs') returning id`);
  [source, target, unsafe, different] = exercises.rows.map(row => row.id) as [string, string, string, string];
  await db.query(`insert into public.exercise_generator_tags(exercise_id,pattern,kind,equipment,stress,min_level)
    values ($1,'hinge','compound','bodyweight','{lower_back}','beginner'),
      ($2,'hinge','compound','bodyweight','{}','beginner'),
      ($3,'hinge','compound','bodyweight','{knee}','beginner'),
      ($4,'squat','compound','bodyweight','{}','beginner')`, [source, target, unsafe, different]);
  const p = await db.query<{ id: string }>(`insert into public.programs(captain_id,player_id,title,status)
    values ($1,$2,'Plan','active') returning id`, [captain, player]);
  program = p.rows[0]?.id ?? '';
  const day = await db.query<{ id: string }>(`insert into public.program_days(program_id,position,title)
    values ($1,0,'Day') returning id`, [program]);
  const ex = await db.query<{ id: string }>(`insert into public.program_exercises
    (day_id,exercise_id,position,sets,reps_min,reps_max,rest_seconds,rpe,tempo,notes,superset_group)
    values ($1,$2,0,3,8,12,120,7,'3010','Keep',1) returning id`, [day.rows[0]?.id, source]);
  item = ex.rows[0]?.id ?? '';
});
const request = (caller = player, to = target, injury = 'knee') => asUser(db, caller,
  tx => tx.query<{ id: string }>('select public.request_exercise_swap($1,$2,$3) as id', [item, to, injury]));
const decide = (id: string, caller = captain, approve = true) => asUser(db, caller,
  tx => tx.query('select public.decide_exercise_swap($1,$2)', [id, approve]));
async function requestId() { return (await request()).rows[0]?.id ?? ''; }

it('allows only the owner of an active assigned program and never writes the program on request', async () => {
  await expect(request(other)).rejects.toThrow();
  await expect(request(captain)).rejects.toThrow();
  await request();
  expect((await db.query('select exercise_id from public.program_exercises where id=$1', [item])).rows)
    .toEqual([{ exercise_id: source }]);
  await db.query("update public.programs set status='archived' where id=$1", [program]);
  await expect(request()).rejects.toThrow();
});
it('enforces pattern, injury, target difference and valid injury values', async () => {
  await expect(request(player, unsafe)).rejects.toThrow();
  await expect(request(player, different)).rejects.toThrow();
  await expect(request(player, source)).rejects.toThrow();
  await expect(request(player, target, 'elbow')).rejects.toThrow();
  await expect(request(player, target, 'lower_back')).resolves.toBeDefined();
});
it('replaces a pending request and permits only linked parties to read with no direct writes', async () => {
  const old = await requestId();
  const fresh = await requestId();
  expect(fresh).not.toBe(old);
  const read = (caller: string) => asUser(db, caller, tx => tx.query('select id from public.exercise_swap_requests'));
  expect((await read(player)).rows).toEqual([{ id: fresh }]);
  expect((await read(captain)).rows).toEqual([{ id: fresh }]);
  expect((await read(other)).rows).toEqual([]);
  await expect(asUser(db, player, tx => tx.query("update public.exercise_swap_requests set status='approved'"))).rejects.toThrow();
  await expect(asUser(db, captain, tx => tx.query('delete from public.exercise_swap_requests'))).rejects.toThrow();
  await expect(asUser(db, player, tx => tx.query(`insert into public.exercise_swap_requests
    (player_id,captain_id,program_exercise_id,from_exercise_id,to_exercise_id,injury)
    values ($1,$2,$3,$4,$5,'knee')`, [player, captain, item, source, target]))).rejects.toThrow();
});
it('only the linked captain decides once, preserving every field except exercise_id', async () => {
  const id = await requestId();
  const before = (await db.query<Record<string, unknown>>('select * from public.program_exercises where id=$1', [item])).rows[0];
  await expect(decide(id, other)).rejects.toThrow();
  await expect(decide(id, player)).rejects.toThrow();
  await decide(id);
  expect((await db.query('select * from public.program_exercises where id=$1', [item])).rows[0])
    .toEqual({ ...before, exercise_id: target });
  await expect(decide(id)).rejects.toThrow();
});
it('declines without altering the exercise and rejects stale approval', async () => {
  await decide(await requestId(), captain, false);
  expect((await db.query('select exercise_id from public.program_exercises where id=$1', [item])).rows)
    .toEqual([{ exercise_id: source }]);
  const id = await requestId();
  await db.query('update public.program_exercises set exercise_id=$2 where id=$1', [item, different]);
  await expect(decide(id)).rejects.toThrow();
});
it('rechecks active ownership and target safety when approving', async () => {
  const id = await requestId();
  await db.query("update public.exercise_generator_tags set stress='{knee}' where exercise_id=$1", [target]);
  await expect(decide(id)).rejects.toThrow();
  await db.query("update public.exercise_generator_tags set stress='{}' where exercise_id=$1", [target]);
  await db.query("update public.programs set status='archived' where id=$1", [program]);
  await expect(decide(id)).rejects.toThrow();
});
it('blocks suspended players and captains in RPCs and reads', async () => {
  const id = await requestId();
  await db.query('update public.profiles set suspended_at=now() where id=$1', [player]);
  await expect(request()).rejects.toThrow();
  expect((await asUser(db, player, tx => tx.query('select * from public.exercise_swap_requests'))).rows).toEqual([]);
  await db.query('update public.profiles set suspended_at=now() where id=$1', [captain]);
  await expect(decide(id)).rejects.toThrow();
});
it('shows an urgent request only to its captain and removes it after a decision', async () => {
  const id = await requestId();
  const feed = (caller: string) => asUser(db, caller, tx => tx.query<{ kind: string; data: object }>('select * from public.ko_feed()'));
  expect((await feed(captain)).rows).toContainEqual(expect.objectContaining({ kind: 'swap_requested',
    data: { request_id: id, from: { ar: null, en: 'Source' }, to: { ar: null, en: 'Target' }, injury: 'knee' } }));
  expect((await feed(player)).rows.some(row => row.kind === 'swap_requested')).toBe(false);
  expect((await feed(other)).rows.some(row => row.kind === 'swap_requested')).toBe(false);
  await decide(id, captain, false);
  expect((await feed(captain)).rows.some(row => row.kind === 'swap_requested')).toBe(false);
});
