import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });
it('defaults to automatic and permits only the owner to save a valid style', async () => {
  const owner = await createUser(db, 'player');
  const other = await createUser(db, 'player');
  expect((await db.query('select arabic_style from profiles where id=$1', [owner])).rows).toEqual([{ arabic_style: null }]);
  for (const style of ['egyptian', 'standard', null]) {
    await asUser(db, owner, tx => tx.query('update profiles set arabic_style=$2 where id=$1', [owner, style]));
    expect((await db.query('select arabic_style from profiles where id=$1', [owner])).rows).toEqual([{ arabic_style: style }]);
  }
  await expect(asUser(db, owner, tx => tx.query("update profiles set arabic_style='invalid' where id=$1", [owner]))).rejects.toThrow();
  expect((await asUser(db, other, tx => tx.query("update profiles set arabic_style='standard' where id=$1 returning id", [owner]))).rows).toEqual([]);
  expect((await db.query("select has_column_privilege('anon','profiles','arabic_style','update') as allowed")).rows).toEqual([{ allowed: false }]);
});
