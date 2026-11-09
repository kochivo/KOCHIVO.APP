import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser, makeAdmin } from './harness';

let db: PGlite;
let captain: string;
let other: string;
let admin: string;
const intake = { current_tool: 'whatsapp_excel', main_challenge: 'time_on_tables', players_range: '1-10' };
const run = (id: string, sql: string, params: unknown[] = []) => asUser(db, id, tx => tx.query(sql, params));
beforeAll(async () => {
  db = await createTestDb();
  captain = await createUser(db, 'captain');
  other = await createUser(db, 'captain');
  admin = await createUser(db, 'captain');
  await makeAdmin(db, admin);
  await db.query("update public.profiles set captain_status = 'pending' where id = $1", [captain]);
  await db.query('update auth.users set email_confirmed_at=now() where id=$1', [captain]);
});
afterAll(async () => { await db?.close(); });
it('lets a pending captain save their own intake and contact details', async () => {
  const result = await run(captain, `update public.profiles set captain_intake = $1, full_name = 'Coach',
    social = '{"whatsapp":"+201012345678","instagram":"coach"}' where id = $2 returning captain_intake`, [intake, captain]);
  expect(result.rows).toEqual([{ captain_intake: intake }]);
});
it('rejects missing keys, extra keys, null values and invalid values', async () => {
  for (const value of [{}, [], { ...intake, extra: 'x' }, { ...intake, current_tool: null },
    { ...intake, current_tool: 'invalid' }, { ...intake, main_challenge: 'invalid' }, { ...intake, players_range: 10 }]) {
    await expect(run(captain, 'update public.profiles set captain_intake = $1 where id = $2', [value, captain]))
      .rejects.toMatchObject({ code: '23514' });
  }
});
it('prevents another user from changing the intake', async () => {
  expect((await run(other, 'update public.profiles set captain_intake = null where id = $1 returning id', [captain])).rows).toEqual([]);
  expect((await db.query('select captain_intake from public.profiles where id = $1', [captain])).rows)
    .toEqual([{ captain_intake: intake }]);
});
it('returns contacts and intake to admins only', async () => {
  expect((await run(admin, 'select full_name, whatsapp, instagram, captain_intake from public.admin_pending_captains()')).rows)
    .toEqual([{ full_name: 'Coach', whatsapp: '+201012345678', instagram: 'coach', captain_intake: intake }]);
  for (const user of [captain, other]) {
    await expect(run(user, 'select * from public.admin_pending_captains()')).rejects.toMatchObject({ code: '42501' });
  }
});
