import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { asUser, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
async function googleUser() {
  const result = await db.query<{ id: string }>('insert into auth.users (id) values (gen_random_uuid()) returning id');
  return result.rows[0]?.id ?? '';
}
const confirm = (id: string, role: string) => asUser(db, id, (tx) => tx.query('select public.confirm_role($1)', [role]));

describe('role confirmation', () => {
  it.each(['captain', 'player'])('confirms %s only once', async (role) => {
    const id = await googleUser();
    await confirm(id, role);
    expect((await db.query('select role, role_confirmed from profiles where id = $1', [id])).rows)
      .toEqual([{ role, role_confirmed: true }]);
    await expect(confirm(id, role)).rejects.toMatchObject({ code: '42501' });
  });
  it('rejects at and after one hour', async () => {
    const id = await googleUser();
    await db.query("update profiles set created_at = now() - interval '1 hour' where id = $1", [id]);
    await expect(confirm(id, 'captain')).rejects.toMatchObject({ code: '42501' });
  });
  it('confirms metadata roles immediately', async () => {
    const id = await createUser(db, 'captain');
    await expect(confirm(id, 'player')).rejects.toMatchObject({ code: '42501' });
  });
  it('prevents direct flag/role edits', async () => {
    const id = await googleUser();
    await expect(asUser(db, id, (tx) => tx.query('update profiles set role_confirmed = true where id = $1', [id])))
      .rejects.toMatchObject({ code: '42501' });
    await expect(asUser(db, id, (tx) => tx.query("update profiles set role = 'captain' where id = $1", [id])))
      .rejects.toMatchObject({ code: '42501' });
    await expect(asUser(db, id, (tx) => tx.query('update profiles set created_at = now() where id = $1', [id])))
      .rejects.toMatchObject({ code: '42501' });
  });
});

describe('anonymous invite preview', () => {
  it('returns only first name and validity, with indistinguishable expired/unknown output', async () => {
    const captain = await createUser(db, 'captain', 'محمد علي');
    await db.query(`insert into coach_invites (captain_id, code, access_until, expires_at) values
      ($1, 'preview-valid', current_date + 30, now() + interval '1 day'),
      ($1, 'preview-expired', current_date + 30, now() - interval '1 day')`, [captain]);
    const preview = (code: string) => db.transaction(async (tx) => {
      await tx.exec('set local role anon');
      return (await tx.query('select * from public.invite_preview($1)', [code])).rows;
    });
    expect(await preview('preview-valid')).toEqual([{ captain_name: 'محمد', valid: true }]);
    expect(await preview('preview-expired')).toEqual([{ captain_name: null, valid: false }]);
    expect(await preview('preview-unknown')).toEqual(await preview('preview-expired'));
  });
});
