import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser } from './harness';

let db: PGlite;
async function anonymous(createdAt = 'now()') {
  const row = (await db.query<{ id: string }>(
    `insert into auth.users (id, is_anonymous, created_at) values (gen_random_uuid(), true, ${createdAt}) returning id`)).rows[0];
  if (!row) throw new Error('Missing anonymous user');
  return row.id;
}
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

it('an anonymous account cannot confirm a real role', async () => {
  const user = await anonymous();
  for (const role of ['captain', 'player']) {
    await expect(asUser(db, user, tx => tx.query('select public.confirm_role($1)', [role]), true))
      .rejects.toMatchObject({ code: '42501', message: 'anonymous accounts are demo only' });
  }
  expect((await db.query('select role_confirmed from public.profiles where id = $1', [user])).rows)
    .toEqual([{ role_confirmed: false }]);
});

it('an anonymous account cannot redeem an invite', async () => {
  const captain = await createUser(db, 'captain');
  await db.query("insert into public.coach_invites (code, captain_id, access_until) values ('ANON-1', $1, current_date + 30)", [captain]);
  const user = await anonymous();
  await expect(asUser(db, user, tx => tx.query("select public.redeem_invite('ANON-1')"), true))
    .rejects.toMatchObject({ code: '42501', message: 'anonymous accounts are demo only' });
  expect((await db.query('select * from public.coach_clients where player_id = $1', [user])).rows).toEqual([]);
});

it('the demo still confirms its anonymous captain and real sign-ups are untouched', async () => {
  const user = await anonymous();
  await asUser(db, user, tx => tx.query('select public.create_demo_workspace()'), true);
  expect((await db.query('select role, role_confirmed from public.profiles where id = $1', [user])).rows)
    .toEqual([{ role: 'captain', role_confirmed: true }]);
  const real = await createUser(db, 'player');
  expect((await db.query('select role_confirmed from public.profiles where id = $1', [real])).rows)
    .toEqual([{ role_confirmed: true }]);
});

it('purge removes day-old anonymous accounts without a workspace and keeps fresh ones', async () => {
  const stale = await anonymous("now() - interval '25 hours'");
  const fresh = await anonymous();
  const demo = await anonymous("now() - interval '25 hours'");
  await asUser(db, demo, tx => tx.query('select public.create_demo_workspace()'), true);
  await db.query('select security_private.purge_demo_workspaces()');
  const left = (await db.query<{ id: string }>('select id from auth.users where id = any($1::uuid[])', [[stale, fresh, demo]])).rows.map(r => r.id);
  expect(left.sort()).toEqual([fresh, demo].sort());
});
