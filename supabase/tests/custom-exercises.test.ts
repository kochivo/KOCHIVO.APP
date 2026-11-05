import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let other: string;
const run = (user: string, sql: string, params: unknown[] = []) => asUser(db, user, tx => tx.query(sql, params));
const insert = (user: string, url: string | null = null) => run(user,
  `insert into public.exercises (owner_id,name_en,name_ar,body_part,video_url)
   values ($1,'Press','Press','chest',$2) returning id`, [user, url]);
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
});
afterAll(async () => { await db?.close(); });
it('allows own CRUD and player reads while isolating other captains', async () => {
  const row = (await insert(captain, 'https://example.com/video')).rows[0] as { id: string };
  expect((await run(player, 'select id from public.exercises where id=$1', [row.id])).rows).toHaveLength(1);
  expect((await run(other, 'select id from public.exercises where id=$1', [row.id])).rows).toEqual([]);
  expect((await run(other, "update public.exercises set name_en='Other' where id=$1 returning id", [row.id])).rows).toEqual([]);
  expect((await run(other, 'delete from public.exercises where id=$1 returning id', [row.id])).rows).toEqual([]);
  expect((await run(captain, "update public.exercises set name_en='Updated' where id=$1 returning name_en", [row.id])).rows).toEqual([{ name_en: 'Updated' }]);
  expect((await run(captain, 'delete from public.exercises where id=$1 returning id', [row.id])).rows).toHaveLength(1);
});
it('rejects player inserts and unsafe or oversized video URLs', async () => {
  await expect(insert(player)).rejects.toThrow(/row-level security/);
  for (const url of ['http://example.com', 'javascript:alert(1)', `https://${'a'.repeat(500)}`]) {
    await expect(insert(captain, url)).rejects.toThrow(/check constraint/);
  }
});
it('keeps program references intact when deleting an exercise in use', async () => {
  const row = (await insert(captain)).rows[0] as { id: string };
  const program = await db.query<{ id: string }>(
    "insert into public.programs (captain_id,player_id,title) values ($1,$2,'Plan') returning id", [captain, player]);
  const day = await db.query<{ id: string }>(
    "insert into public.program_days (program_id,title,position) values ($1,'Day',1) returning id", [program.rows[0]?.id]);
  await db.query('insert into public.program_exercises (day_id,exercise_id,position,sets,reps_min) values ($1,$2,1,3,8)',
    [day.rows[0]?.id, row.id]);
  await expect(run(captain, 'delete from public.exercises where id=$1', [row.id])).rejects.toThrow(/foreign key constraint/);
  expect((await run(player, 'select id from public.exercises where id=$1', [row.id])).rows).toHaveLength(1);
});
it('blocks suspended captains from inserting, editing and deleting', async () => {
  const row = (await insert(captain)).rows[0] as { id: string };
  await db.query('update public.profiles set suspended_at=now() where id=$1', [captain]);
  await expect(insert(captain)).rejects.toThrow(/row-level security|account suspended/);
  await expect(run(captain, "update public.exercises set name_en='Blocked' where id=$1 returning id", [row.id])).rejects.toThrow(/account suspended/);
  await expect(run(captain, 'delete from public.exercises where id=$1 returning id', [row.id])).rejects.toThrow(/account suspended/);
});
