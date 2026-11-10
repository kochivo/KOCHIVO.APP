import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser, makeAdmin, TEST_NOW } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let admin: string;
const insert = (caller: string, owner: string, role: string, anonymous = false) => asUser(db, caller,
  tx => tx.query('insert into public.ko_waitlist(user_id, role) values ($1, $2)', [owner, role]), anonymous);
const read = (user: string) => asUser(db, user, tx => tx.query('select * from public.ko_waitlist'));
beforeAll(async () => {
  db = await createTestDb();
  captain = await createUser(db, 'captain');
  player = await createUser(db, 'player');
  admin = await createUser(db, 'captain');
  await makeAdmin(db, admin);
});
afterAll(async () => { await db?.close(); });

it('refuses role spoofing and inserting for someone else', async () => {
  await expect(insert(captain, captain, 'player')).rejects.toMatchObject({ code: '42501' });
  await expect(insert(captain, player, 'player')).rejects.toMatchObject({ code: '42501' });
});
it('allows own insert once and uses the database clock', async () => {
  await insert(captain, captain, 'captain');
  await expect(insert(captain, captain, 'captain')).rejects.toMatchObject({ code: '23505' });
  const { rows } = await read(captain);
  expect(rows).toEqual([{ user_id: captain, role: 'captain', created_at: new Date(TEST_NOW) }]);
});
it('hides others and lets admins read all', async () => {
  expect((await read(player)).rows).toEqual([]);
  await insert(player, player, 'player');
  expect((await read(player)).rows).toHaveLength(1);
  expect((await read(admin)).rows).toHaveLength(2);
});
it('denies anonymous sessions, anonymous role, and suspended callers', async () => {
  const user = await createUser(db, 'player');
  await expect(insert(user, user, 'player', true)).rejects.toMatchObject({ code: '42501' });
  await expect(db.transaction(async tx => {
    await tx.exec('set local role anon');
    return tx.query('select * from public.ko_waitlist');
  })).rejects.toMatchObject({ code: '42501' });
  await db.query('update public.profiles set suspended_at = now() where id = $1', [user]);
  await expect(insert(user, user, 'player')).rejects.toMatchObject({ code: '42501' });
  await db.query('update public.profiles set suspended_at = now() where id = $1', [captain]);
  expect((await read(captain)).rows).toEqual([]);
});
it('grants no updates or deletes, even to admins', async () => {
  for (const sql of ['update public.ko_waitlist set role = role', 'delete from public.ko_waitlist']) {
    await expect(asUser(db, admin, tx => tx.query(sql))).rejects.toMatchObject({ code: '42501' });
  }
});
