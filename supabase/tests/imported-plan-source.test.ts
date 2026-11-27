import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser, makeAdmin } from './harness';

let db: PGlite;
let admin: string;
let captain: string;
let player: string;
let other: string;
const id = '019ab901-1000-7000-8000-000000000015';
const source = { fileName: 'Training.xlsx', sheets: [
  { name: 'Week 1', rows: [['Torso A'], ['Press', '2', '8–10']] },
  { name: 'Progress', rows: [['Top load', '90 lb'], ['Note', 'Previous entry']] },
] };
const plan = { fingerprint: 'a'.repeat(64), source, days: [{
  id: '019ab901-1000-7000-8000-000000000016', name: 'Torso A', exercises: [{
    id: '019ab901-1000-7000-8000-000000000017', exerciseId: '019ab901-1000-7000-8000-000000000018',
    name: 'Press', bodyPart: 'chest', sets: 1, repsMin: 8, repsMax: 10, rest: 90,
    setPlan: [{ reps_min: 8, reps_max: 10, rir: 1 }],
  }],
}] };

beforeAll(async () => {
  db = await createTestDb();
  admin = await createUser(db, 'captain', 'Operator');
  captain = await createUser(db, 'captain', 'Coach');
  other = await createUser(db, 'captain', 'Other');
  player = await createUser(db, 'player');
  await makeAdmin(db, admin);
  await asUser(db, admin, tx => tx.query('select public.admin_import_plan($1,$2,$3,$4,$5)',
    [id, captain, 'training', 'Example', JSON.stringify(plan)]));
});
afterAll(async () => { await db?.close(); });

it('retains all submitted tabs and limits the source to the receiving coach', async () => {
  const lookup = (actor: string) => asUser(db, actor, tx => tx.query(
    'select source from public.imported_plan_sources where id = $1', [id]));
  expect((await lookup(captain)).rows).toEqual([{ source }]);
  expect((await asUser(db, captain, tx => tx.query(
    'select source from public.imported_plan_sources where id = $1', [id]), true)).rows).toEqual([]);
  const withoutSessionKind = await asUser(db, captain, async tx => {
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: captain, role: 'authenticated' })]);
    return tx.query('select source from public.imported_plan_sources where id = $1', [id]);
  });
  expect(withoutSessionKind.rows).toEqual([]);
  for (const actor of [admin, other, player]) expect((await lookup(actor)).rows).toEqual([]);
  await expect(asUser(db, captain, tx => tx.query(
    'update public.imported_plan_sources set source = $1 where id = $2', ['{}', id]))).rejects.toMatchObject({ code: '42501' });
});

it('locates the source from the coach’s assigned program', async () => {
  await db.query("insert into public.coach_clients (captain_id, player_id, access_until) values ($1, $2, now() + interval '1 day')",
    [captain, player]);
  const assigned = await asUser(db, captain, tx => tx.query<{ id: string }>(
    'select public.assign_program_template($1,$2) as id', [id, player]));
  const importedId = assigned.rows[0]?.id;
  expect(importedId).toBeDefined();
  const find = (actor: string) => asUser(db, actor, tx => tx.query(
    "select public.captain_plan_source_id($1,'training') as id", [importedId]));
  expect((await find(captain)).rows).toEqual([{ id }]);
  expect((await find(player)).rows).toEqual([{ id: null }]);
});

it('deletes the source with its template', async () => {
  await asUser(db, captain, tx => tx.query('delete from public.programs where id = $1', [id]));
  expect((await db.query('select id from public.imported_plan_sources where id = $1', [id])).rows).toEqual([]);
});
