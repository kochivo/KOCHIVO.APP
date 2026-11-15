import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
const uuid = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`;
beforeAll(async () => {
  db = await createTestDb();
  captain = await createUser(db, 'captain');
  await db.query(`insert into public.exercises(id,owner_id,name_en,body_part)
    values ($1,null,'Primary','legs'),($2,$4,'Alternative','legs'),($3,$4,'Unused','legs')`,
  [uuid(1), uuid(2), uuid(3), captain]);
  await db.query(`insert into public.programs(id,captain_id,title,is_template)
    values ($1,$2,'Template',true)`, [uuid(4), captain]);
  await db.query("insert into public.program_days(id,program_id,title,position) values ($1,$2,'Legs',1)", [uuid(5), uuid(4)]);
  await db.query(`insert into public.program_exercises(id,day_id,exercise_id,position,sets,reps_min,alternatives)
    values ($1,$2,$3,1,2,8,array[$4::uuid])`, [uuid(6), uuid(5), uuid(1), uuid(2)]);
});
afterAll(async () => db?.close());

it('raises 23503 for an alternative-only reference so archive fallback keeps the program editable', async () => {
  await expect(asUser(db, captain, tx => tx.query('delete from public.exercises where id=$1', [uuid(2)])))
    .rejects.toMatchObject({ code: '23503' });
  await asUser(db, captain, tx => tx.query('update public.exercises set archived_at=now() where id=$1', [uuid(2)]));
  await expect(asUser(db, captain, tx => tx.query('update public.program_exercises set reps_min=9 where id=$1', [uuid(6)])))
    .resolves.toMatchObject({ affectedRows: 1 });
});
it('allows deletion of an unreferenced custom exercise', async () => {
  await asUser(db, captain, tx => tx.query('delete from public.exercises where id=$1', [uuid(3)]));
  expect((await db.query('select id from public.exercises where id=$1', [uuid(3)])).rows).toEqual([]);
});
it('purges a due captain whose custom exercise is an alternative', async () => {
  await db.query("update public.profiles set deletion_requested_at=now()-interval '8 days' where id=$1", [captain]);
  await expect(asUser(db, captain, tx => tx.query('delete from public.exercises where id=$1', [uuid(2)])))
    .rejects.toMatchObject({ code: '23503' });
  expect((await db.query('select public.purge_deleted_accounts() as n')).rows).toEqual([{ n: 1 }]);
  expect((await db.query('select id from auth.users where id=$1', [captain])).rows).toEqual([]);
  expect((await db.query('select id from public.exercises where owner_id=$1', [captain])).rows).toEqual([]);
  expect((await db.query('select id from public.program_exercises where id=$1', [uuid(6)])).rows).toEqual([]);
});
