import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser, makeAdmin } from './harness';

let db: PGlite;
let player: string;
let captain: string;
beforeAll(async () => {
  db = await createTestDb();
  player = await createUser(db, 'player');
  captain = await createUser(db, 'captain');
  await makeAdmin(db, captain);
  await db.query('update public.profiles set role_confirmed = true where id = $1', [captain]);
});
afterAll(async () => { await db?.close(); });

it('returns only the caller profile and current admin membership without accepting a target id', async () => {
  expect((await asUser(db, player, tx => tx.query('select * from public.my_route_profile()'))).rows)
    .toEqual([{ role: 'player', role_confirmed: true, suspended_at: null, is_admin: false }]);
  expect((await asUser(db, captain, tx => tx.query('select * from public.my_route_profile()'))).rows)
    .toEqual([{ role: 'captain', role_confirmed: true, suspended_at: null, is_admin: true }]);
});

it('still returns suspension so the proxy can redirect a suspended caller', async () => {
  await db.query('update public.profiles set suspended_at = now() where id = $1', [player]);
  const result = await asUser(db, player, tx => tx.query<{ suspended_at: string }>('select * from public.my_route_profile()'));
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0]?.suspended_at).not.toBeNull();
});

it('returns no row without an identity and denies the anon role', async () => {
  expect((await db.query('select * from public.my_route_profile()')).rows).toEqual([]);
  await expect(db.transaction(async tx => {
    await tx.exec('set local role anon');
    return tx.query('select * from public.my_route_profile()');
  })).rejects.toMatchObject({ code: '42501' });
});
