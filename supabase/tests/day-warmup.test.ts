import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let program: string;
let day: string;
const empty = { items: [], ramp: false };
const warmup = { items: [{ id: '019ab800-0000-7000-8000-000000000001', name: 'Walk', amount: 5, unit: 'min' }], ramp: true };

async function seed(database: PGlite) {
  ({ captain, player } = await createCaptainWithPlayer(database));
  program = (await database.query<{ id: string }>(`insert into public.programs(captain_id,player_id,title)
    values($1,$2,'Warm-up') returning id`, [captain, player])).rows[0]?.id ?? '';
  day = (await database.query<{ id: string }>(`insert into public.program_days(program_id,position,title)
    values($1,1,'Training') returning id`, [program])).rows[0]?.id ?? '';
}
beforeAll(async () => {
  let seeded = false;
  db = await createTestDb(async (file, database) => {
    if (file === '0098_day_warmup.sql') { await seed(database); seeded = true; }
  });
  if (!seeded) await seed(db);
});
afterAll(async () => { await db?.close(); });

async function readWarmup(id: string) {
  return (await db.query('select warmup from public.program_days where program_id=$1 order by position', [id])).rows;
}
it('gives pre-migration and newly inserted days the empty default', async () => {
  expect(await readWarmup(program)).toEqual([{ warmup: empty }]);
  const row = await db.query(`insert into public.program_days(program_id,position) values($1,2) returning warmup`, [program]);
  expect(row.rows).toEqual([{ warmup: empty }]);
  await db.query('delete from public.program_days where program_id=$1 and position=2', [program]);
});

it('round-trips insert/update, template save, duplication and assignment without shared data', async () => {
  const draft = { id: program, player_id: player, title: 'Warm-up', days: [{ id: day, program_id: program,
    title: 'Training', position: 1, exercises: [], cardio: [], warmup }] };
  await asUser(db, captain, tx => tx.query('select public.save_weekly_program($1)', [JSON.stringify(draft)]));
  expect(await readWarmup(program)).toEqual([{ warmup }]);
  const template = await asUser(db, captain, tx => tx.query<{ id: string }>(
    "select public.program_to_template($1,'Warm-up template') as id", [program]));
  const copy = await asUser(db, captain, tx => tx.query<{ id: string }>(
    "select public.copy_template('program',$1,'Warm-up copy') as id", [template.rows[0]?.id]));
  const assigned = await asUser(db, captain, tx => tx.query<{ id: string }>(
    'select public.assign_program_template($1,$2) as id', [copy.rows[0]?.id, player]));
  for (const id of [template.rows[0]?.id, copy.rows[0]?.id, assigned.rows[0]?.id]) {
    expect(await readWarmup(id ?? '')).toEqual([{ warmup }]);
  }
  draft.days = draft.days.map(row => ({ ...row, warmup: empty }));
  await asUser(db, captain, tx => tx.query('select public.save_weekly_program($1)', [JSON.stringify(draft)]));
  expect(await readWarmup(program)).toEqual([{ warmup: empty }]);
  expect(await readWarmup(template.rows[0]?.id ?? '')).toEqual([{ warmup }]);
  const newDay = '019ab800-0000-7000-8000-000000000002';
  await asUser(db, captain, tx => tx.query('select public.save_weekly_program($1)', [JSON.stringify({ ...draft,
    days: [{ ...draft.days[0], id: newDay, warmup }] })]));
  expect(await readWarmup(program)).toEqual([{ warmup }]);
  await asUser(db, captain, tx => tx.query('select public.save_weekly_program($1)', [JSON.stringify({ ...draft,
    days: [{ id: newDay, program_id: program, title: 'Legacy', position: 1, exercises: [], cardio: [] }] })]));
  expect(await readWarmup(program)).toEqual([{ warmup: empty }]);
});

it('rejects malformed top-level shapes and accepts twelve items', async () => {
  for (const invalid of [[], null, {}, { items: [], ramp: 'true' }, { items: [], ramp: null },
    { items: null, ramp: false }, { items: {}, ramp: false },
    { items: Array.from({ length: 13 }, () => ({})), ramp: false }]) {
    await expect(db.query('update public.program_days set warmup=$1 where program_id=$2',
      [JSON.stringify(invalid), program])).rejects.toMatchObject({ code: '23514' });
  }
  await db.query('update public.program_days set warmup=$1 where program_id=$2',
    [JSON.stringify({ items: Array.from({ length: 12 }, () => ({})), ramp: false }), program]);
});

it('copies starter JSON through new captains and both demo workspace paths', async () => {
  await db.query(`update security_private.starter_templates set payload=jsonb_set(payload,'{days}',
    (select jsonb_agg(d || jsonb_build_object('warmup',$1::jsonb)) from jsonb_array_elements(payload->'days') d))
    where payload->>'kind'='workout'`, [JSON.stringify(warmup)]);
  const owner = await createUser(db, 'captain');
  const demoCaptain = await createUser(db, 'player');
  await asUser(db, demoCaptain, tx => tx.query('select public.create_demo_workspace()'), true);
  const demoPlayer = (await db.query<{ id: string }>(`insert into auth.users(id,is_anonymous)
    values('019ab800-0000-7000-8000-000000000003',true) returning id`)).rows[0]?.id ?? '';
  await asUser(db, demoPlayer, tx => tx.query('select public.create_demo_player_workspace()'), true);
  for (const [column, id] of [['captain_id', owner], ['captain_id', demoCaptain], ['player_id', demoPlayer]]) {
    const rows = await db.query<{ warmup: unknown }>(`select d.warmup from public.program_days d
      join public.programs p on p.id=d.program_id where p.${column}=$1`, [id]);
    expect(rows.rows.length).toBeGreaterThan(0);
    for (const row of rows.rows) expect(row.warmup).toEqual(warmup);
  }
});
